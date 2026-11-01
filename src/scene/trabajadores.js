import { cajasDeLosa, postesDeLasLosas, puntosDeLosCaminos } from './charcos.js'
import { estaLevantada } from './losasVisuales.js'
import { COLUMNAS_DEL_TECHO, posicionDePlaca, posicionDePuesto, repartoDePlacas, SERVIDOR } from './posiciones.js'

/**
 * Los trabajadores de la escena: **solo visuales**. La especificación dice que
 * hay 5 trabajadores sin tarea fija (3 casi siempre en el acabado y 2 sobre todo
 * en el lavado), y la escena los muestra junto a lo que está ocupado: hasta 2 en
 * el lavado (con manguera) y hasta 3 en el acabado (con trapo). El modelo NO los
 * toma como servidores: aquí no hay ningún dato del motor, solo qué losas están
 * ocupadas según lo que se ve (`estadoDeLasLosas`).
 *
 * Es JavaScript puro. De las losas ocupadas se toman las de menor número (las dos
 * placas y los tres puestos). Cada trabajador se pone a un costado del lado por
 * donde cabe —el del frente en las placas de adelante y el de atrás en las placas
 * de atrás y en los puestos—, hacia la derecha del eje por donde entra la moto, para
 * no estorbar su camino. Un trabajador de pie no se pone delante del número (la
 * tarjeta del poste) de otra losa: con 7 placas por fila, el de una placa de
 * adelante taparía el de su vecina, y ese no se dibuja. Los sitios que no quedan libres
 * (por una columna, una losa, una rampa, un poste o un camino de las motos, con las
 * filas muy apretadas) se descartan: ese trabajador no se dibuja, nunca se mete
 * entre las losas ni sobre una rampa.
 */

/** Cuántos trabajadores hay como máximo en cada etapa. */
export const TRABAJADORES_COMO_MAXIMO = { lavado: 2, acabado: 3 }

/** Cuánto se separa del eje de su losa, hacia la derecha, y del borde, hacia afuera, en metros. */
export const DESPLAZAMIENTO_DEL_TRABAJADOR = { alLado: 0.95, delBorde: 0.45 }

/** El radio que ocupa un trabajador de pie, y lo que se deja libre alrededor, en metros. */
const RADIO_DEL_TRABAJADOR = 0.3
const HOLGURA = 0.15
const RADIO_DE_LA_COLUMNA = 0.16

/** La distancia mínima entre dos trabajadores, en metros. */
const SEPARACION_ENTRE_TRABAJADORES = 0.7

/** Lo que se aparta, a lo ancho, de la tarjeta de un número: la mitad de la tarjeta, la mitad del cuerpo y un margen. */
const ANCHO_DE_LA_TARJETA = 0.75

/** Hacia dónde mira: +Z (rumbo 0) en el lado de atrás y −Z (medio giro) en el de adelante, siempre hacia la losa. */
const RUMBO_HACIA_ATRAS = 0
const RUMBO_HACIA_ADELANTE = Math.PI

/** Distancia de un punto a una caja `{ x0, x1, z0, z1 }` (0 si está dentro). */
const distanciaALaCaja = (x, z, c) => Math.hypot(Math.max(c.x0 - x, 0, x - c.x1), Math.max(c.z0 - z, 0, z - c.z1))

/** ¿Queda libre este sitio? Lejos de las losas, las rampas, los postes, las columnas y los caminos de las motos. */
function estaLibre(x, z, { cajas, postes, puntos }, delFrente) {
  if (cajas.some((caja) => distanciaALaCaja(x, z, caja) < RADIO_DEL_TRABAJADOR)) return false
  if (postes.some(([px, pz]) => Math.hypot(x - px, z - pz) < RADIO_DEL_TRABAJADOR + 0.2)) return false
  // Delante de la tarjeta con el número de otra losa (más cerca de la cámara que ella) la taparía.
  if (delFrente && postes.some(([px, pz]) => Math.abs(x - px) < ANCHO_DE_LA_TARJETA && pz < z)) return false
  if (COLUMNAS_DEL_TECHO.some(([cx, , cz]) => Math.hypot(x - cx, z - cz) < RADIO_DEL_TRABAJADOR + RADIO_DE_LA_COLUMNA)) return false
  return !puntos.some(([px, pz]) => Math.hypot(x - px, z - pz) < RADIO_DEL_TRABAJADOR + HOLGURA)
}

/** Dónde se pone el trabajador de la losa con centro `centro`, del lado de `delFrente`; sin comprobar si queda libre. */
function sitioCandidato(centro, delFrente, haciaLaDerecha = true) {
  const lado = delFrente ? 1 : -1
  return {
    x: centro[0] + (haciaLaDerecha ? 1 : -1) * DESPLAZAMIENTO_DEL_TRABAJADOR.alLado,
    z: centro[2] + lado * (SERVIDOR.fondo / 2 + DESPLAZAMIENTO_DEL_TRABAJADOR.delBorde),
    rumbo: delFrente ? RUMBO_HACIA_ADELANTE : RUMBO_HACIA_ATRAS,
  }
}

const sitiosGuardados = new Map()

/**
 * El sitio del trabajador de cada placa y cada puesto con esa configuración
 * (`null` donde no cabe). Se calcula una vez por configuración.
 *
 * @returns {{ placas: Array<object|null>, puestos: Array<object|null> }}
 */
export function sitiosDeLosTrabajadores(placas, puestos) {
  const clave = `${placas}/${puestos}`
  if (!sitiosGuardados.has(clave)) {
    const contexto = {
      cajas: cajasDeLosa(placas, puestos),
      postes: postesDeLasLosas(placas, puestos),
      puntos: puntosDeLosCaminos(placas, puestos),
    }
    const { adelante } = repartoDePlacas(placas)
    // Primero a la derecha del eje de la losa; si ahí no cabe (una columna, otra losa), a la izquierda.
    // Los de número menor eligen primero, y ningún sitio queda a menos de un cuerpo de otro.
    const elegidos = []
    const elegir = (centro, delFrente) => {
      for (const haciaLaDerecha of [true, false]) {
        const sitio = sitioCandidato(centro, delFrente, haciaLaDerecha)
        const pisaA = elegidos.some((otro) => Math.hypot(otro.x - sitio.x, otro.z - sitio.z) < SEPARACION_ENTRE_TRABAJADORES)
        if (!pisaA && estaLibre(sitio.x, sitio.z, contexto, delFrente)) {
          elegidos.push(sitio)
          return sitio
        }
      }
      return null
    }
    sitiosGuardados.set(clave, {
      placas: Array.from({ length: placas }, (_, i) => elegir(posicionDePlaca(i, placas), i < adelante)),
      puestos: Array.from({ length: puestos }, (_, i) => elegir(posicionDePuesto(i, puestos), false)),
    })
    // Solo se guardan unas pocas configuraciones (el panel cambia poco).
    if (sitiosGuardados.size > 12) sitiosGuardados.delete(sitiosGuardados.keys().next().value)
  }
  return sitiosGuardados.get(clave)
}

/**
 * Los trabajadores que hay que dibujar con lo que se ve ahora.
 *
 * @param {object} datos
 * @param {number} datos.placas cuántas placas hay
 * @param {number} datos.puestos cuántos puestos hay
 * @param {string[]} datos.estados el estado visual de cada losa (`estadoDeLasLosas`): primero las placas, luego los puestos
 * @returns {Array<{ numero: number, etapa: 'lavado'|'acabado', indice: number, herramienta: 'manguera'|'trapo', x: number, z: number, rumbo: number }>}
 *   `numero` es estable: el de su losa (+20 en el acabado)
 */
export function trabajadoresDeLasLosas({ placas, puestos, estados }) {
  const sitios = sitiosDeLosTrabajadores(placas, puestos)
  const ocupadas = (desde, cuantas) => Array.from({ length: cuantas }, (_, i) => i).filter((i) => estaLevantada(estados[desde + i]))
  const trabajadores = []

  for (const indice of ocupadas(0, placas).slice(0, TRABAJADORES_COMO_MAXIMO.lavado)) {
    const sitio = sitios.placas[indice]
    if (sitio) trabajadores.push({ numero: indice, etapa: 'lavado', indice, herramienta: 'manguera', ...sitio })
  }
  for (const indice of ocupadas(placas, puestos).slice(0, TRABAJADORES_COMO_MAXIMO.acabado)) {
    const sitio = sitios.puestos[indice]
    if (sitio) trabajadores.push({ numero: 20 + indice, etapa: 'acabado', indice, herramienta: 'trapo', ...sitio })
  }
  return trabajadores
}
