/**
 * La curva de una transición de CSS (`cubic-bezier(x1, y1, x2, y2)`) como una
 * función de JavaScript, para que lo que se mueve con JavaScript (la cámara)
 * use la misma curva que lo que se mueve con CSS (las capas).
 */

/** Lee los cuatro números de un `cubic-bezier(...)`; si no los entiende, `null`. */
export function numerosDeLaCurva(texto) {
  const partes = /^\s*cubic-bezier\(\s*([^,]+),\s*([^,]+),\s*([^,]+),\s*([^)]+)\)\s*$/.exec(String(texto ?? ''))
  if (!partes) {
    return null
  }
  const numeros = partes.slice(1).map(Number)
  const validos = numeros.every(Number.isFinite) && numeros[0] >= 0 && numeros[0] <= 1 && numeros[2] >= 0 && numeros[2] <= 1
  return validos ? numeros : null
}

/**
 * Devuelve `(progreso) => avance`, con los dos entre 0 y 1. Con una curva que
 * no entiende, avanza en línea recta.
 *
 * @param {string} texto por ejemplo "cubic-bezier(0, 0, 0.2, 1)"
 */
export function funcionDeLaCurva(texto) {
  const numeros = numerosDeLaCurva(texto)
  if (!numeros) {
    return (progreso) => Math.min(1, Math.max(0, progreso))
  }
  const [x1, y1, x2, y2] = numeros
  const coordenada = (t, a, b) => 3 * (1 - t) * (1 - t) * t * a + 3 * (1 - t) * t * t * b + t * t * t

  return (progreso) => {
    if (progreso <= 0) return 0
    if (progreso >= 1) return 1
    // Se busca el t cuya x vale el progreso (la x crece con t), por bisección.
    let bajo = 0
    let alto = 1
    for (let i = 0; i < 24; i += 1) {
      const medio = (bajo + alto) / 2
      if (coordenada(medio, x1, x2) < progreso) {
        bajo = medio
      } else {
        alto = medio
      }
    }
    return coordenada((bajo + alto) / 2, y1, y2)
  }
}
