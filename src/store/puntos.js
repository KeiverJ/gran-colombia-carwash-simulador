/**
 * Los puntos que dibuja la gráfica de las dos filas.
 *
 * La gráfica cubre toda la corrida, del minuto 0 al reloj de ahora, pero con un
 * tope de puntos: si guardara uno por cada cuadro de animación, una corrida
 * larga llenaría la memoria y el dibujo se volvería lento. Al llegar al tope no
 * se tiran los más viejos: se deja uno de cada dos y se anotan los siguientes
 * más espaciados, así la curva conserva su forma de punta a punta. Cada punto
 * es un estado real del lavadero; nunca se promedian ni se inventan.
 *
 * Está aparte para poder probar la reducción con Node.
 */

/** Cuántos puntos se guardan como mucho. Al pasarse, se aclara el arreglo. */
export const MAXIMO_DE_PUNTOS = 300

/**
 * Lo más seguido que se anota un punto: cada cuánto tiempo simulado, mientras la
 * gráfica cubre poco. Con más duración, el intervalo crece (ver
 * `intervaloDeMuestreoMin`).
 *
 * Se muestrea por tiempo simulado y no por cuadros para que el eje horizontal
 * quede parejo aunque se cambie la velocidad a mitad de camino.
 */
export const INTERVALO_DE_MUESTREO_MIN = 1

/**
 * Deja uno de cada dos puntos, siempre el primero y el último. No modifica el
 * arreglo que recibe.
 *
 * @param {Array} puntos
 * @returns {Array} un arreglo nuevo, de más o menos la mitad de largo
 */
export function aclarar(puntos) {
  if (puntos.length < 3) {
    return [...puntos]
  }
  const ultimo = puntos.length - 1
  const quedan = puntos.filter((_punto, i) => i % 2 === 0)
  if (ultimo % 2 !== 0) {
    quedan.push(puntos[ultimo])
  }
  return quedan
}

/**
 * Añade un punto al final. Si con él se pasa del tope, aclara el arreglo (ver
 * `aclarar`). No modifica el arreglo que recibe.
 *
 * @param {Array} puntos
 * @param {object} nuevo
 * @param {number} [maximo]
 * @returns {Array} un arreglo nuevo
 */
export function agregarPunto(puntos, nuevo, maximo = MAXIMO_DE_PUNTOS) {
  if (!Number.isInteger(maximo) || maximo < 2) {
    throw new RangeError(
      `El tope de puntos debe ser un entero mayor o igual que 2; se recibió ${maximo}.`,
    )
  }
  const conElNuevo = [...puntos, nuevo]
  return conElNuevo.length > maximo ? aclarar(conElNuevo) : conElNuevo
}

/**
 * Cada cuánto tiempo simulado toca anotar el próximo punto: el que ya tienen
 * entre sí los puntos de la gráfica, que es la duración que cubre dividida entre
 * la mitad del tope (lo que queda tras aclarar). Se deriva del propio arreglo y
 * así no hay que guardar nada más: tras una corrida larga, seguir simulando
 * anota puntos tan espaciados como los que ya hay.
 *
 * @param {Array} puntos
 * @param {number} [maximo]
 * @returns {number} minutos simulados, nunca menos que `INTERVALO_DE_MUESTREO_MIN`
 */
export function intervaloDeMuestreoMin(puntos, maximo = MAXIMO_DE_PUNTOS) {
  if (puntos.length < 2) {
    return INTERVALO_DE_MUESTREO_MIN
  }
  const duracionMin = puntos[puntos.length - 1].minuto - puntos[0].minuto
  return Math.max(INTERVALO_DE_MUESTREO_MIN, duracionMin / (maximo / 2))
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
