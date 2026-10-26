/**
 * Las vistas de la cámara y sus límites.
 *
 * Están aparte y sin nada de Three.js para poder comprobarlas con pruebas: la
 * altura de la vista inicial no es un número puesto a ojo, sino uno que supera
 * la altura mínima que hace falta para ver la fila de atrás por encima de la
 * de adelante, y eso se calcula aquí.
 */

import { COLUMNAS_DEL_TECHO, LOCAL, MOTO, RETRANQUEO_EN_LA_LOSA, SERVIDOR } from './posiciones.js'

/** Hasta dónde llega una moto posada en una losa ocupada. */
const ALTO_DE_MOTO_POSADA = SERVIDOR.altoOcupado + MOTO.alto

/** Hasta qué altura de la moto de atrás queremos verle el cuerpo, no solo la punta. */
const ALTURA_QUE_SE_QUIERE_VER = SERVIDOR.altoOcupado + 0.9

/**
 * Altura mínima de la cámara para que las motos de la fila de adelante no
 * tapen las de atrás, mirando de frente desde la distancia dada.
 *
 * La moto de adelante tapa con su borde de arriba más cercano a la cámara. Se
 * pide que el rayo que va de la cámara al cuerpo de la moto de atrás pase por
 * encima de ese borde; de ahí sale la altura.
 */
export function alturaParaVerLaFilaDeAtras(distancia) {
  const zDeAdelante = LOCAL.zPlacasAdelante - RETRANQUEO_EN_LA_LOSA + MOTO.largo / 2
  const zDeAtras = LOCAL.zPlacasAtras - RETRANQUEO_EN_LA_LOSA
  const separacion = zDeAdelante - zDeAtras
  const cuantoFalta = ALTO_DE_MOTO_POSADA - ALTURA_QUE_SE_QUIERE_VER
  return ALTURA_QUE_SE_QUIERE_VER + (cuantoFalta * (distancia - zDeAtras)) / separacion
}

/** Ángulo de visión vertical de la cámara, en grados. */
export const CAMPO_DE_VISION = 48

/**
 * Qué medio alto del mundo abarca la cámara a una distancia dada.
 * Sirve para saber si una vista deja ver el local entero.
 */
export function medioAltoVisible(distancia) {
  return distancia * Math.tan((CAMPO_DE_VISION / 2) * (Math.PI / 180))
}

/** A qué distancia del centro se mira el local en la vista inicial. */
const DISTANCIA_INICIAL = 19

/**
 * Las tres vistas a las que se puede volver con un botón.
 *
 * "Como en la foto" es baja y de frente, como se ve el lavadero desde la
 * acera, pero no a ras de suelo: su altura está por encima de la que calcula
 * `alturaParaVerLaFilaDeAtras`, así que se ve también la fila de atrás.
 */
export const VISTAS = {
  comoEnLaFoto: {
    nombre: 'Como en la foto',
    posicion: [0, 5, DISTANCIA_INICIAL],
    // Se mira al medio del local, no a su borde de delante: así no sobra
    // calle en primer plano y entra la zona de acabado del fondo.
    objetivo: [0, 0.8, -2],
  },
  desdeArriba: {
    nombre: 'Desde arriba (plano)',
    posicion: [0, 32, 0.6],
    objetivo: [0, 0, 0],
  },
}

/** La vista con la que arranca la escena. */
export const VISTA_INICIAL = VISTAS.comoEnLaFoto

/** A qué distancia de su objetivo está la cámara en una vista. */
export function distanciaDe({ posicion, objetivo }) {
  return Math.hypot(
    posicion[0] - objetivo[0],
    posicion[1] - objetivo[1],
    posicion[2] - objetivo[2],
  )
}

/**
 * Volver a encuadrar el local sin cambiar desde dónde se mira.
 *
 * Recentrar no es lo mismo que volver a la vista de la foto: conserva el
 * ángulo que el usuario eligió y solo arregla lo que se le fue —el centro y,
 * si se había acercado de más, la distancia—. Nunca acerca más de lo que
 * estaba: solo aleja lo justo para que el local vuelva a entrar.
 */
export function vistaRecentrada(posicionCamara) {
  const objetivo = VISTA_INICIAL.objetivo
  const hacia = [
    posicionCamara[0] - objetivo[0],
    posicionCamara[1] - objetivo[1],
    posicionCamara[2] - objetivo[2],
  ]
  const distanciaActual = Math.hypot(...hacia)
  if (distanciaActual < 1e-6) {
    return { posicion: [...VISTA_INICIAL.posicion], objetivo: [...objetivo] }
  }
  const distancia = Math.max(distanciaActual, distanciaDe(VISTA_INICIAL))
  return {
    nombre: 'Recentrar',
    posicion: hacia.map((componente, i) => objetivo[i] + (componente / distanciaActual) * distancia),
    objetivo: [...objetivo],
  }
}

/**
 * Hasta dónde deja moverse el control.
 *
 * El ángulo polar se mide desde arriba: 90° sería a ras de suelo, así que algo
 * menos impide meterse por debajo del piso. Las distancias acotan el
 * acercamiento por los dos lados.
 */
export const LIMITES_DE_CAMARA = {
  distanciaMinima: 10,
  distanciaMaxima: 60,
  anguloPolarMaximo: 1.45,
}

/** La diagonal del local, para saber si una distancia lo deja ver entero. */
export const DIAGONAL_DEL_LOCAL = Math.hypot(LOCAL.ancho, LOCAL.fondo)

/* ------------------------------------------------------------------------- *
 * Encuadre con las capas abiertas
 *
 * Las capas laterales flotan encima del lienzo y no lo achican. Para que el
 * local se vea completo y centrado en lo que queda libre, la cámara dibuja
 * en un "cuadro virtual" más chico que el lienzo y lo coloca en el centro del
 * área libre (`camera.setViewOffset`). No cambia la posición ni la
 * orientación de la cámara: solo qué parte del cuadro cae en el lienzo.
 * ------------------------------------------------------------------------- */

/**
 * El alto del techo del local (el de las columnas de `Local.jsx`). Es el
 * único número de aquí que no sale de `posiciones.js`.
 */
export const ALTO_DEL_TECHO = 4.2

/**
 * Las ocho esquinas de lo que se llama "el local": la caja que forman las
 * columnas del techo, del suelo al techo.
 */
export const ESQUINAS_DEL_LOCAL = (() => {
  const xs = COLUMNAS_DEL_TECHO.map(([x]) => x)
  const zs = COLUMNAS_DEL_TECHO.map(([, , z]) => z)
  const esquinas = []
  for (const x of [Math.min(...xs), Math.max(...xs)]) {
    for (const z of [Math.min(...zs), Math.max(...zs)]) {
      for (const y of [0, ALTO_DEL_TECHO]) {
        esquinas.push([x, y, z])
      }
    }
  }
  return esquinas
})()

/** Qué parte del área libre se deja vacía, a lo ancho (total, repartida a los dos lados). */
const MARGEN_A_LO_ANCHO = 0.1

/** Y a lo alto: arriba van los botones y la leyenda, y abajo los indicadores. */
const MARGEN_A_LO_ALTO = 0.22

/**
 * Dónde cae un punto del mundo en la imagen de una cámara, en coordenadas
 * normalizadas: de -1 a 1 en los dos ejes, con (0, 0) en el centro y la x
 * hacia la derecha y la y hacia arriba. Devuelve `null` si el punto queda
 * detrás de la cámara.
 *
 * @param {number[]} punto
 * @param {{ posicion: number[], objetivo: number[] }} vista
 * @param {number} aspecto ancho / alto de la imagen
 */
export function proyectarPunto(punto, { posicion, objetivo }, aspecto) {
  const resta = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
  const producto = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
  const cruz = (a, b) => [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ]
  const unitario = (a) => {
    const largo = Math.hypot(...a)
    return a.map((componente) => componente / largo)
  }

  const adelante = unitario(resta(objetivo, posicion))
  const derecha = unitario(cruz(adelante, [0, 1, 0]))
  const arriba = cruz(derecha, adelante)
  const v = resta(punto, posicion)
  const profundidad = producto(v, adelante)
  if (profundidad <= 1e-6) {
    return null
  }
  const medioAlto = Math.tan((CAMPO_DE_VISION / 2) * (Math.PI / 180))
  return [
    producto(v, derecha) / (profundidad * medioAlto * aspecto),
    producto(v, arriba) / (profundidad * medioAlto),
  ]
}

/**
 * El rectángulo que ocupa el local en la imagen de una vista, en coordenadas
 * normalizadas (ver `proyectarPunto`).
 */
export function cajaDelLocalEnPantalla(vista, aspecto) {
  const puntos = ESQUINAS_DEL_LOCAL.map((esquina) => proyectarPunto(esquina, vista, aspecto)).filter(Boolean)
  const xs = puntos.map(([x]) => x)
  const ys = puntos.map(([, y]) => y)
  return { minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) }
}

/**
 * Cómo colocar el cuadro virtual de la cámara para que el local entero quepa,
 * centrado, en el área que dejan libre las capas.
 *
 * La escala sale de las dos vistas que tienen botón (la de la foto y la de
 * plano) y no de dónde esté la cámara ahora: así, si la persona se acerca a
 * mano, no se le contrarresta. Nunca pasa de 1 (no agranda). El resultado se
 * entrega en los términos de `PerspectiveCamera.setViewOffset`.
 *
 * @param {object} medidas
 * @param {number} medidas.ancho ancho del lienzo en píxeles
 * @param {number} medidas.alto alto del lienzo en píxeles
 * @param {number} medidas.izquierda píxeles del lienzo que tapa la capa de la izquierda
 * @param {number} medidas.derecha píxeles que tapa la de la derecha
 * @returns {{ escala: number, fullWidth: number, fullHeight: number, offsetX: number,
 *   offsetY: number, width: number, height: number } | null} `null` si el lienzo no tiene tamaño
 */
export function encuadreParaLasCapas({ ancho, alto, izquierda, derecha }) {
  if (!(ancho > 0) || !(alto > 0)) {
    return null
  }
  const tapa = (valor) => (Number.isFinite(valor) ? Math.min(Math.max(valor, 0), ancho) : 0)
  const izq = tapa(izquierda)
  const der = tapa(derecha)
  // Con las dos capas tapando casi todo se deja al menos un píxel: sin NaN.
  const libre = Math.max(ancho - izq - der, 1)
  const aspecto = ancho / alto

  const cajas = Object.values(VISTAS).map((vista) => cajaDelLocalEnPantalla(vista, aspecto))
  const fraccionAncha = Math.max(...cajas.map((c) => (c.maxX - c.minX) / 2))
  const fraccionAlta = Math.max(...cajas.map((c) => (c.maxY - c.minY) / 2))
  const escala = Math.min(
    1,
    (libre * (1 - MARGEN_A_LO_ANCHO)) / (ancho * fraccionAncha),
    ((1 - MARGEN_A_LO_ALTO) * alto) / (alto * fraccionAlta),
  )

  // El local de la vista inicial es el que se centra: queda a `centroDelLocal`
  // (en normalizadas) del centro del cuadro virtual.
  const caja = cajaDelLocalEnPantalla(VISTA_INICIAL, aspecto)
  const centroDelLocal = (caja.minX + caja.maxX) / 2
  const fullWidth = ancho * escala
  const fullHeight = alto * escala
  const centroLibre = izq + libre / 2
  const centroDelCuadro = centroLibre - centroDelLocal * (fullWidth / 2)

  return {
    escala,
    fullWidth,
    fullHeight,
    offsetX: fullWidth / 2 - centroDelCuadro,
    offsetY: (fullHeight - alto) / 2,
    width: ancho,
    height: alto,
  }
}
