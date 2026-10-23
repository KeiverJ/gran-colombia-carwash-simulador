/**
 * El azar del simulador, con semilla para poder repetir una corrida.
 *
 * Todo lo que sortea el motor sale de aquí: los tiempos entre llegadas, los
 * tiempos de servicio y el plan de cada moto. Misma semilla y mismos
 * parámetros, mismos resultados.
 *
 * JavaScript puro: no importa nada de la interfaz y corre con Node.
 */

/** Diferencia máxima con 1 que se acepta al sumar las proporciones de los planes. */
const TOLERANCIA_SUMA = 1e-9

/**
 * Generador uniforme en [0, 1) a partir de una semilla entera (mulberry32).
 * Corto, determinista y suficiente para una simulación de colas: solo se le
 * pide que sea repetible y que reparta bien (no sirve para criptografía).
 *
 * @param {number} semilla
 * @returns {() => number} función que devuelve el siguiente número uniforme
 */
export function crearGenerador(semilla) {
  if (!Number.isFinite(semilla)) {
    throw new RangeError(`La semilla debe ser un número; se recibió ${semilla}.`)
  }
  let estado = Math.trunc(semilla) >>> 0
  return function siguiente() {
    estado = (estado + 0x6d2b79f5) >>> 0
    let t = estado
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Tiempo exponencial con la media indicada, en minutos.
 *
 * Se usa `1 − u` y no `u` porque `u` puede valer 0 y `ln(0)` es infinito,
 * mientras que `1 − u` queda siempre en (0, 1].
 *
 * @param {() => number} uniforme
 * @param {number} mediaMin
 * @returns {number} minutos
 */
export function tiempoExponencial(uniforme, mediaMin) {
  if (!Number.isFinite(mediaMin) || mediaMin <= 0) {
    throw new RangeError(
      `La media de un tiempo exponencial debe ser mayor que 0 minutos; se recibió ${mediaMin}.`,
    )
  }
  return -mediaMin * Math.log(1 - uniforme())
}

/**
 * Comprueba que las proporciones de los planes sumen 1.
 *
 * La comparación es por diferencia y no por igualdad exacta: en aritmética de
 * punto flotante hay repartos perfectamente válidos cuya suma da
 * 0,9999999999999999 (por ejemplo 0,06 + 0,57 + 0,37).
 *
 * @param {Record<number, number>} proporcionPlan
 */
export function exigirProporcionesValidas(proporcionPlan) {
  const planes = Object.keys(proporcionPlan)
  for (const plan of planes) {
    const valor = proporcionPlan[plan]
    if (!Number.isFinite(valor) || valor < 0) {
      throw new RangeError(
        `La proporción del plan ${plan} debe ser un número mayor o igual que 0; se recibió ${valor}.`,
      )
    }
  }
  const suma = planes.reduce((total, plan) => total + proporcionPlan[plan], 0)
  if (Math.abs(suma - 1) >= TOLERANCIA_SUMA) {
    throw new RangeError(
      `Las proporciones de los planes deben sumar 1; suman ${suma}.`,
    )
  }
}

/**
 * Sorteo del plan de una moto según las proporciones.
 *
 * Usa proporciones acumuladas: un plan con proporción 0 ocupa un tramo de
 * ancho 0 y por eso nunca sale, sin necesidad de ningún caso especial. El
 * respaldo es el último plan con proporción mayor que 0 —no el primero de la
 * lista— para que un número aleatorio pegado a 1 no caiga justamente en un
 * plan de proporción 0 cuando el acumulado se queda en 0,9999999999999999.
 *
 * @param {Record<number, number>} proporcionPlan
 * @returns {(uniforme: () => number) => number} función que sortea un plan
 */
export function crearSorteoDePlan(proporcionPlan) {
  exigirProporcionesValidas(proporcionPlan)

  const planes = Object.keys(proporcionPlan)
    .map(Number)
    .sort((a, b) => a - b)
  const acumuladas = []
  let acumulado = 0
  for (const plan of planes) {
    acumulado += proporcionPlan[plan]
    acumuladas.push({ plan, hasta: acumulado })
  }

  const conProporcion = planes.filter((plan) => proporcionPlan[plan] > 0)
  if (conProporcion.length === 0) {
    throw new RangeError('Al menos un plan debe tener proporción mayor que 0.')
  }
  const ultimoConProporcion = conProporcion[conProporcion.length - 1]

  return function sortearPlan(uniforme) {
    const u = uniforme()
    for (const { plan, hasta } of acumuladas) {
      if (proporcionPlan[plan] > 0 && u < hasta) {
        return plan
      }
    }
    return ultimoConProporcion
  }
}

/**
 * Las tres corrientes de azar del motor, derivadas de una sola semilla.
 *
 * Son independientes a propósito: así, cambiar el número de placas o el modo
 * de acabado no mueve la secuencia de llegadas ni de planes, y dos escenarios
 * se pueden comparar sobre la misma tarde simulada.
 *
 * @param {number} semilla
 * @returns {{ llegadas: () => number, planes: () => number, servicios: () => number }}
 */
export function crearCorrientes(semilla) {
  if (!Number.isFinite(semilla)) {
    throw new RangeError(`La semilla debe ser un número; se recibió ${semilla}.`)
  }
  const base = Math.trunc(semilla)
  return {
    llegadas: crearGenerador(base),
    planes: crearGenerador(base + 0x9e3779b9),
    servicios: crearGenerador(base + 0x85ebca6b),
  }
}
