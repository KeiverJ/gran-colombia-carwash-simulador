/**
 * Los puntos que dibuja la gráfica de las dos filas.
 *
 * La gráfica muestra una ventana de lo más reciente: si guardara un punto por
 * cada cuadro de animación, una corrida larga llenaría la memoria y el dibujo
 * se volvería lento. Está aparte para poder probar el recorte con Node.
 */

/** Cuántos puntos se guardan como mucho. Al pasarse, se tiran los más viejos. */
export const MAXIMO_DE_PUNTOS = 300

/**
 * Cada cuánto tiempo simulado se anota un punto.
 *
 * Se muestrea por tiempo simulado y no por cuadros para que el eje horizontal
 * quede parejo aunque se cambie la velocidad a mitad de camino.
 */
export const INTERVALO_DE_MUESTREO_MIN = 1

/**
 * Añade un punto al final y descarta los más viejos si se pasa del tope.
 * No modifica el arreglo que recibe.
 *
 * @param {Array} puntos
 * @param {object} nuevo
 * @param {number} [maximo]
 * @returns {Array} un arreglo nuevo
 */
export function agregarPunto(puntos, nuevo, maximo = MAXIMO_DE_PUNTOS) {
  if (!Number.isInteger(maximo) || maximo < 1) {
    throw new RangeError(
      `El tope de puntos debe ser un entero mayor o igual que 1; se recibió ${maximo}.`,
    )
  }
  const conElNuevo = [...puntos, nuevo]
  return conElNuevo.length > maximo ? conElNuevo.slice(conElNuevo.length - maximo) : conElNuevo
}

/**
 * ¿Toca anotar un punto ya, o todavía no ha pasado el intervalo?
 *
 * @param {number} relojMin reloj de la simulación
 * @param {number|null} ultimoMin reloj del último punto anotado
 * @param {number} [intervaloMin]
 */
export function tocaAnotar(relojMin, ultimoMin, intervaloMin = INTERVALO_DE_MUESTREO_MIN) {
  if (ultimoMin === null || ultimoMin === undefined) {
    return true
  }
  return relojMin - ultimoMin >= intervaloMin
}
