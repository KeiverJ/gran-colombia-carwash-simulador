import { BOTONES_DE_VISTA, vistaDeLaClave } from './camara.js'
import { OJOS_SENTADOS } from './cafeteria.js'
import { puntosDeLosCaminos } from './charcos.js'
import { colocacionDelLetreroDeLaPared } from './logoEnLaEscena.js'
import {
  AVENIDAS,
  COLUMNAS_DEL_TECHO,
  cuantasMotosCabenEnLaFila,
  CURVAS_DE_ENTRADA,
  LOCAL,
  MOTO,
  PARED_DEL_FONDO,
  posicionDePlaca,
  posicionDePuesto,
  posicionEnFila,
  SERVIDOR,
} from './posiciones.js'
import { tramosConHuecos } from './geometriasDelEntorno.js'

/**
 * Comprobar con rayos que algo de la escena no tapa lo que importa. JavaScript
 * puro: lanza un rayo desde la cámara de cada vista hacia cada punto clave del
 * lavadero (placas y puestos, las dos filas, los caminos de las motos, las bocas
 * y el letrero de la pared) y dice cuáles cruzan una caja.
 *
 * Es lo que decide **dónde va la cafetería** (y, en la parte 3, los árboles y los
 * detalles de calle): no se pone a ojo, se prueba.
 */

/** Los dos tamaños de pantalla con los que se comprueba: una horizontal y un celular vertical. */
export const PANTALLAS_DE_LA_PRUEBA = [
  { nombre: '1366 × 768', ancho: 1366, alto: 768 },
  { nombre: '390 × 844', ancho: 390, alto: 844 },
]

/** Las claves de las cuatro vistas de la cámara. */
export const CLAVES_DE_LAS_VISTAS = BOTONES_DE_VISTA.map(({ clave }) => clave)

/** La posición de la cámara de una vista para una pantalla. */
export function camaraDeLaVista(clave, { ancho, alto }) {
  return vistaDeLaClave(clave, ancho / alto).posicion
}

/**
 * ¿El segmento de `origen` a `destino` cruza la caja `{ min, max }`?
 * (Método de las losas: se recorta el segmento contra los tres pares de planos.)
 */
export function rayoCruzaCaja(origen, destino, { min, max }) {
  let desde = 0
  let hasta = 1
  for (let eje = 0; eje < 3; eje += 1) {
    const direccion = destino[eje] - origen[eje]
    if (Math.abs(direccion) < 1e-12) {
      if (origen[eje] < min[eje] || origen[eje] > max[eje]) return false
    } else {
      let t0 = (min[eje] - origen[eje]) / direccion
      let t1 = (max[eje] - origen[eje]) / direccion
      if (t0 > t1) [t0, t1] = [t1, t0]
      desde = Math.max(desde, t0)
      hasta = Math.min(hasta, t1)
      if (desde > hasta) return false
    }
  }
  return true
}

/**
 * Los puntos que tienen que verse, con su nombre: la cara de arriba y la moto de
 * cada placa y de cada puesto, el sitio de cada moto de las dos filas, los caminos
 * de las motos (a ras del piso), las bocas y las esquinas del letrero de la pared.
 *
 * @returns {Array<{ nombre: string, punto: number[] }>}
 */
export function puntosClave(placas, puestos) {
  const puntos = []
  const sobreLaLosa = (nombre, [x, , z]) => {
    puntos.push({ nombre: `${nombre} (losa)`, punto: [x, SERVIDOR.altoOcupado, z] })
    puntos.push({ nombre: `${nombre} (moto)`, punto: [x, SERVIDOR.altoOcupado + MOTO.alto * 0.7, z] })
  }
  for (let i = 0; i < placas; i += 1) sobreLaLosa(`placa ${i + 1}`, posicionDePlaca(i, placas))
  for (let i = 0; i < puestos; i += 1) sobreLaLosa(`puesto ${i + 1}`, posicionDePuesto(i, puestos))

  for (const etapa of ['lavado', 'acabado']) {
    const cuantas = Math.min(cuantasMotosCabenEnLaFila(etapa), 8)
    for (let k = 0; k < cuantas; k += 1) {
      const [x, , z] = posicionEnFila(k, etapa)
      puntos.push({ nombre: `fila de ${etapa}, lugar ${k + 1}`, punto: [x, MOTO.alto * 0.5, z] })
    }
  }

  // Los caminos de las motos, un punto cada metro, a un palmo del piso.
  puntosDeLosCaminos(placas, puestos).forEach(([x, z], i) => {
    if (i % 4 === 0) puntos.push({ nombre: 'camino de las motos', punto: [x, 0.3, z] })
  })

  for (const avenida of Object.values(AVENIDAS)) {
    puntos.push({ nombre: `boca de la ${avenida.nombre}`, punto: [avenida.posicion[0], 1, avenida.posicion[2]] })
  }
  for (const [clave, curva] of Object.entries(CURVAS_DE_ENTRADA)) {
    curva.forEach(([x, , z], i) => puntos.push({ nombre: `curva de entrada ${clave} ${i}`, punto: [x, 0.3, z] }))
  }

  const huecos = PARED_DEL_FONDO.aberturas.map(({ centroX, ancho }) => ({ centro: centroX, ancho }))
  const macizos = tramosConHuecos(-LOCAL.ancho / 2, LOCAL.ancho / 2, huecos)
  const [desde, hasta] = macizos.reduce((mejor, tramo) => (tramo[1] - tramo[0] > mejor[1] - mejor[0] ? tramo : mejor))
  const letrero = colocacionDelLetreroDeLaPared({ z: PARED_DEL_FONDO.z, grosor: PARED_DEL_FONDO.grosor }, desde, hasta)
  for (const lado of [-1, 1]) {
    for (const dy of [-1, 1]) {
      puntos.push({
        nombre: 'letrero de la pared',
        punto: [letrero.position[0] + (lado * letrero.ancho) / 2, letrero.position[1] + (dy * letrero.alto) / 2, letrero.position[2]],
      })
    }
  }
  puntos.push(...COLUMNAS_DEL_TECHO.map(([x, , z]) => ({ nombre: 'columna', punto: [x, 1.5, z] })))
  return puntos
}

/**
 * Los puntos que una caja tapa vistos desde `origen`: devuelve los nombres (sin
 * repetir) de los puntos cuyo rayo cruza alguna de las `cajas`, con el nombre de la caja.
 *
 * @param {number[]} origen
 * @param {Array<{ nombre: string, punto: number[] }>} puntos
 * @param {Array<{ nombre: string, min: number[], max: number[] }>} cajas
 * @returns {string[]} «<punto> tapado por <caja>»
 */
export function puntosTapados(origen, puntos, cajas) {
  const tapados = new Set()
  for (const { nombre, punto } of puntos) {
    for (const caja of cajas) {
      if (rayoCruzaCaja(origen, punto, caja)) tapados.add(`${nombre} tapado por ${caja.nombre}`)
    }
  }
  return [...tapados]
}

/** Los ojos de una persona sentada en un asiento `{ x, y, z }`. */
export const ojosDelAsiento = ({ x, y, z }) => [x, y + OJOS_SENTADOS, z]
