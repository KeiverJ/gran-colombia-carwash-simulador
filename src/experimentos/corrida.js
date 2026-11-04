/**
 * Una corrida del motor para un experimento: arma el simulador con los
 * parámetros y la semilla del trabajo, lo corre las horas pedidas y devuelve
 * solo números sencillos (cabe en un `postMessage`).
 *
 * El motor se usa tal cual: aquí no se cambia nada de `src/engine/`.
 * JavaScript puro, sin React ni DOM.
 */

import { crearSimulador } from '../engine/simulador.js'
import { acabadoPromedioDeLosParametros } from './plan.js'

/** El motor con los parámetros de un lote, la semilla y el calentamiento dados. */
export function motorDe(parametros, semilla, calentamientoHoras) {
  return crearSimulador({
    semilla,
    llegadasPorHora: parametros.llegadasPorHora,
    lavadoMin: parametros.lavadoMin,
    acabadoPlanMin: parametros.acabadoPlanMin,
    acabadoPromedioMin: acabadoPromedioDeLosParametros(parametros),
    proporcionPlan: parametros.proporcionPlan,
    placas: parametros.placas,
    puestos: parametros.puestos,
    modoAcabado: parametros.modoAcabado,
    calentamientoHoras,
  })
}

/** Las métricas de una etapa sin las listas por servidor. */
function deLaEtapa({ rho, l, lq, wMin, wqMin, motosContadas }) {
  return { rho, l, lq, wMin, wqMin, motosContadas }
}

/** Las métricas del motor reducidas a números simples. */
export function numerosDeLasMetricas(metricas) {
  return {
    lavado: deLaEtapa(metricas.lavado),
    acabado: deLaEtapa(metricas.acabado),
    total: { l: metricas.total.l, wMin: metricas.total.wMin, motosContadas: metricas.total.motosContadas },
  }
}

/** Cuántas motos esperan en cada fila ahora, sin copiar las filas. */
export function largosDeLasFilas(motor) {
  const { largoColaLavado, largoColaAcabado } = motor.estado({ maxEnFila: 0 })
  return { lavado: largoColaLavado, acabado: largoColaAcabado }
}

/**
 * Corre una réplica: las horas completas con el calentamiento del trabajo.
 * Además de las métricas, anota cuántas motos esperaban en cada fila a la mitad
 * y al final de la corrida, para ver si una etapa inestable crece con el tiempo.
 *
 * @param {{ semilla: number, parametros: object, horas: number, calentamientoHoras: number }} trabajo
 */
export function correrReplica(trabajo) {
  const motor = motorDe(trabajo.parametros, trabajo.semilla, trabajo.calentamientoHoras)
  motor.correrHoras(trabajo.horas / 2)
  const mitad = largosDeLasFilas(motor)
  motor.correrHoras(trabajo.horas / 2)
  const final = largosDeLasFilas(motor)
  return {
    semilla: trabajo.semilla,
    ...numerosDeLasMetricas(motor.metricas()),
    filas: { mitad, final },
  }
}
