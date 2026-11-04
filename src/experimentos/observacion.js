/**
 * La corrida de observación: una corrida sin calentamiento que anota, en unos
 * 200 puntos repartidos a lo largo de las horas, las métricas acumuladas de las
 * dos etapas. Con ella se dibuja la media acumulada de una métrica para ver dónde
 * se estabiliza. Cambiar de métrica o de etapa no necesita correr nada: la serie
 * trae todas.
 *
 * Sin calentamiento, el acumulado del motor empieza en el instante 0 y deja ver
 * justo el tramo inicial que las métricas de los lotes descartan. JavaScript puro.
 */

import { motorDe, numerosDeLasMetricas } from './corrida.js'

/** Cuántos puntos de control tiene la serie. */
export const PUNTOS_DE_LA_OBSERVACION = 200

/**
 * @param {{ semilla: number, parametros: object, horas: number }} trabajo
 * @param {number} [puntos]
 * @returns {Array<{ horas: number, lavado: object, acabado: object, total: object }>}
 */
export function correrObservacion(trabajo, puntos = PUNTOS_DE_LA_OBSERVACION) {
  const motor = motorDe(trabajo.parametros, trabajo.semilla, 0)
  const horasPorPunto = trabajo.horas / puntos
  const serie = []
  for (let j = 1; j <= puntos; j += 1) {
    motor.correrHoras(horasPorPunto)
    serie.push({ horas: j * horasPorPunto, ...numerosDeLasMetricas(motor.metricas()) })
  }
  return serie
}

/**
 * Los puntos de una métrica de una etapa para la gráfica. Los promedios por moto
 * (W y Wq) no existen mientras ninguna moto ha salido de la etapa: ese tramo se omite.
 *
 * @param {Array<object>} serie
 * @param {'lavado' | 'acabado' | 'total'} etapa
 * @param {string} clave rho, lq, wqMin, wMin o l
 * @returns {Array<{ horas: number, valor: number }>}
 */
export function puntosDeLaMedia(serie, etapa, clave) {
  return serie
    .filter((punto) => !(clave === 'wMin' || clave === 'wqMin') || punto[etapa].motosContadas > 0)
    .map((punto) => ({ horas: punto.horas, valor: punto[etapa][clave] }))
}
