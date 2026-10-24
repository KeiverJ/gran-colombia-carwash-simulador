/**
 * Formateo de números y tiempos para la interfaz.
 *
 * Todo lo que se ve va en español de Colombia: coma para los decimales. Está
 * en un solo lugar para no repetir `toLocaleString` en cada componente y para
 * poder probarlo una vez.
 */

/**
 * Un número con coma decimal y los decimales pedidos.
 *
 * @param {number} valor
 * @param {number} [decimales] cuántos decimales mostrar (por defecto, hasta 2)
 * @returns {string}
 */
export function comoNumero(valor, decimales = 2) {
  if (!Number.isFinite(valor)) {
    return '—'
  }
  return valor.toLocaleString('es-CO', {
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
  })
}

/**
 * Un porcentaje a partir de una proporción entre 0 y 1.
 *
 * @param {number} proporcion
 * @param {number} [decimales]
 * @returns {string}
 */
export function comoPorcentaje(proporcion, decimales = 1) {
  return `${comoNumero(proporcion * 100, decimales)} %`
}

/**
 * El reloj de la simulación, en horas y minutos.
 * Los segundos no se muestran: el lavadero se mide en minutos.
 *
 * @param {number} minutos
 * @returns {string}
 */
export function comoReloj(minutos) {
  if (!Number.isFinite(minutos) || minutos < 0) {
    return '0 min'
  }
  const totalMinutos = Math.floor(minutos)
  const horas = Math.floor(totalMinutos / 60)
  const resto = totalMinutos % 60
  if (horas === 0) {
    return `${resto} min`
  }
  return `${horas} h ${resto} min`
}
