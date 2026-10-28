import { COLUMNAS_DEL_TECHO, TECHO } from './posiciones.js'

/**
 * El techo se aparta cuando la cámara mira desde arriba.
 *
 * Una losa sobre las columnas no tapa nada mirando de frente, casi a ras, pero
 * sí en cuanto la cámara sube: tapa las placas, los puestos y las motos que
 * hay debajo. Por eso es opaco con la cámara baja, se vuelve transparente
 * cuando sube y desaparece del todo por encima de cierta elevación (en
 * «Planta» no existe).
 *
 * La elevación se mide desde el centro del suelo cubierto: es el ángulo con el
 * que se miran las motos que están debajo del techo. Los números salen de
 * trazar el rayo de la cámara de frente a un puesto del fondo: hasta unos 16°
 * pasa por debajo del borde de delante del techo; hacia los 20° ya lo cruza.
 */
export const ELEVACION_DEL_TECHO = { opaco: 16, invisible: 26 }

/** El punto al que se apunta para medir la elevación: el centro del suelo cubierto. */
export const CENTRO_DEL_SUELO_CUBIERTO = (() => {
  const xs = COLUMNAS_DEL_TECHO.map(([x]) => x)
  const zs = COLUMNAS_DEL_TECHO.map(([, , z]) => z)
  return [(Math.min(...xs) + Math.max(...xs)) / 2, 0.5, (Math.min(...zs) + Math.max(...zs)) / 2]
})()

/**
 * Cuánto se ve el techo (de 0 a 1) para una cámara en `posicion`.
 * Baja suavemente entre `ELEVACION_DEL_TECHO.opaco` y `.invisible`.
 */
export function opacidadDelTecho(posicion) {
  const elevacion = elevacionSobreElSuelo(posicion)
  const { opaco, invisible } = ELEVACION_DEL_TECHO
  const t = Math.min(1, Math.max(0, (invisible - elevacion) / (invisible - opaco)))
  return t * t * (3 - 2 * t)
}

/** Elevación, en grados, de una cámara vista desde el centro del suelo cubierto. */
export function elevacionSobreElSuelo(posicion) {
  const [cx, cy, cz] = CENTRO_DEL_SUELO_CUBIERTO
  const horizontal = Math.hypot(posicion[0] - cx, posicion[2] - cz)
  return (Math.atan2(posicion[1] - cy, horizontal) * 180) / Math.PI
}

/** Las medidas y el centro de la losa del techo, a partir de las columnas. */
export function medidasDelTecho() {
  const xs = COLUMNAS_DEL_TECHO.map(([x]) => x)
  const zs = COLUMNAS_DEL_TECHO.map(([, , z]) => z)
  const ancho = Math.max(...xs) - Math.min(...xs) + 2 * TECHO.vuelo
  const fondo = Math.max(...zs) - Math.min(...zs) + 2 * TECHO.vuelo
  return {
    ancho,
    fondo,
    centro: [CENTRO_DEL_SUELO_CUBIERTO[0], TECHO.alto + TECHO.grosor / 2, CENTRO_DEL_SUELO_CUBIERTO[2]],
  }
}
