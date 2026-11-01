/**
 * La mezcla de bits propia de la escena: una función de hash de enteros que no
 * usa ni consume el generador aleatorio del motor (`src/engine/aleatorio.js`).
 *
 * Con ella se reparte lo decorativo de manera **determinista**: el modelo de
 * cada moto (`modelosDeMoto.js`), los charcos del piso, los árboles, el momento en
 * que pasa la patrulla… La misma entrada da siempre la misma salida, en cualquier
 * corrida, y elegir lo decorativo no puede cambiar ningún resultado de la simulación.
 */

/** Mezcla los bits de un entero (rondas de multiplicación y desplazamiento). */
export function mezclar(entero) {
  let x = entero >>> 0
  x = Math.imul(x ^ (x >>> 16), 0x45d9f3b)
  x = Math.imul(x ^ (x >>> 16), 0x45d9f3b)
  return (x ^ (x >>> 16)) >>> 0
}

/** Un número de 0 (incluido) a 1 (excluido) que depende solo de `semilla` y de `indice`. */
export function fraccionDe(semilla, indice = 0) {
  return mezclar(mezclar(semilla) + Math.imul(indice + 1, 0x9e3779b9)) / 4294967296
}

/** Un número de `desde` a `hasta` que depende solo de `semilla` y de `indice`. */
export function entreDe(semilla, indice, desde, hasta) {
  return desde + fraccionDe(semilla, indice) * (hasta - desde)
}
