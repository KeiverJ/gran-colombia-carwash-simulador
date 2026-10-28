/**
 * Formateo de números y tiempos para la interfaz.
 *
 * Todo lo que se ve va en español de Colombia: coma para los decimales. Está
 * en un solo lugar para no repetir `toLocaleString` en cada componente y para
 * poder probarlo una vez.
 */

import { HORA_BASE_VISITA, INICIO_OBSERVACION_MIN } from '../data/visita.js'

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
  return `${comoNumero(proporcion * 100, decimales)} %`
}

/** Desde cuántas horas simuladas el reloj deja de mostrar los minutos. */
export const HORAS_PARA_MOSTRAR_SOLO_HORAS = 100

/**
 * El reloj de la simulación, en horas y minutos.
 * Los segundos no se muestran: el lavadero se mide en minutos.
 *
 * Desde 100 horas simuladas (por ejemplo, tras una corrida larga) muestra solo
 * las horas, "1000 h": con cifras tan grandes los minutos ya no aportan y la
 * barra del celular no cabría en una línea.
 *
 * @param {number} minutos
 * @returns {string}
 */
export function comoReloj(minutos) {
  if (!Number.isFinite(minutos) || minutos < 0) {
    return '0 min'
  }
  const totalMinutos = Math.floor(minutos)
  const horas = Math.floor(totalMinutos / 60)
  const resto = totalMinutos % 60
  if (horas === 0) {
    return `${resto} min`
  }
  if (horas >= HORAS_PARA_MOSTRAR_SOLO_HORAS) {
    return `${horas} h`
  }
  return `${horas} h ${resto} min`
}

/**
 * La hora de la tarde de la visita, a partir de los minutos que llevan
 * transcurridos desde que empezó la observación, a las 3:10 p. m.
 * Los segundos no se muestran, como en `comoReloj`.
 *
 * @param {number} minutosDesdeElInicio 0 son las 3:10 p. m.
 * @returns {string} por ejemplo "4:11 p. m."
 */
export function comoHoraDeLaTarde(minutosDesdeElInicio) {
  const transcurridos =
    Number.isFinite(minutosDesdeElInicio) && minutosDesdeElInicio > 0
      ? Math.floor(minutosDesdeElInicio)
      : 0
  const desdeMedianoche =
    HORA_BASE_VISITA.minutosDesdeMedianoche + INICIO_OBSERVACION_MIN + transcurridos
  const hora24 = Math.floor(desdeMedianoche / 60) % 24
  const minutos = desdeMedianoche % 60
  const hora12 = hora24 % 12 === 0 ? 12 : hora24 % 12
  const jornada = hora24 < 12 ? 'a. m.' : 'p. m.'
  return `${hora12}:${String(minutos).padStart(2, '0')} ${jornada}`
}
