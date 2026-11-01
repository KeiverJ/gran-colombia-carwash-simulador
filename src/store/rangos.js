/**
 * Los rangos de cada valor que se puede cambiar y la validación que los hace
 * cumplir. JavaScript puro: lo usan el store (que es la guardia: todo valor
 * pasa por aquí antes de llegar al motor), los campos de Ajustes y el
 * deslizador de la velocidad, y no hay otros rangos.
 *
 * El generador aleatorio trabaja con 32 bits (`Math.trunc(semilla) >>> 0`),
 * así que una semilla de 4 294 967 296 o más repetiría la de otra más chica:
 * 4 294 967 296 daría exactamente la corrida de la semilla 0.
 */

import { MODO_MMS, MODO_POR_PLAN } from '../engine/simulador.js'

export const RANGOS = {
  llegadas: { minimo: 1, maximo: 200, paso: 0.0001, unidad: 'motos/h' },
  lavado: { minimo: 0.5, maximo: 120, paso: 0.1, unidad: 'min' },
  acabado: { minimo: 0.5, maximo: 120, paso: 0.1, unidad: 'min' },
  proporcion: { minimo: 0, maximo: 100, paso: 0.1, unidad: '%' },
  placas: { minimo: 1, maximo: 14, paso: 1, entero: true },
  puestos: { minimo: 1, maximo: 7, paso: 1, entero: true },
  semilla: { minimo: 0, maximo: 4294967295, entero: true },
  velocidad: { minimo: 0.25, maximo: 120, paso: 0.25, unidad: 'min/s' },
}

/** Las horas que puede durar la corrida larga: solo estas tres. */
export const HORAS_DE_LA_CORRIDA_LARGA_POSIBLES = [100, 1000, 5000]

/** Las proporciones se guardan como fracción (0 a 1) y se muestran en % (0 a 100). */
const RANGO_DE_LA_PROPORCION_GUARDADA = { minimo: 0, maximo: 1 }

/** Los planes de acabado que existen. */
const PLANES = [1, 2, 3]

/** Qué rango tiene cada parámetro del lavadero, por su nombre en el store. */
const RANGO_DEL_PARAMETRO = {
  llegadasPorHora: RANGOS.llegadas,
  lavadoMin: RANGOS.lavado,
  placas: RANGOS.placas,
  puestos: RANGOS.puestos,
}

const NO_VALIDO = Object.freeze({ valido: false })

/**
 * ¿Es un número que sirve? Solo cuenta un `number` de verdad: ni texto (aunque
 * parezca número), ni `NaN`, ni infinito, ni fuera del rango, ni con decimales
 * donde se pide un entero.
 */
function numeroEnElRango(valor, { minimo, maximo, entero = false }) {
  if (typeof valor !== 'number' || !Number.isFinite(valor)) {
    return NO_VALIDO
  }
  if (valor < minimo || valor > maximo) {
    return NO_VALIDO
  }
  if (entero && !Number.isInteger(valor)) {
    return NO_VALIDO
  }
  return { valido: true, valor }
}

/**
 * Valida un valor antes de que llegue al motor.
 *
 * `nombre` es el del parámetro en el store: `llegadasPorHora`, `lavadoMin`,
 * `placas`, `puestos`, `modoAcabado`, `acabadoPlanMin` (un tiempo de acabado),
 * `proporcionPlan` (una fracción de 0 a 1), `semilla`, `velocidad` o
 * `horasDeLaCorridaLarga`. Un nombre que no existe no es válido.
 *
 * @param {string} nombre
 * @param {unknown} valor
 * @returns {{ valido: true, valor: any } | { valido: false }}
 */
export function validarParametro(nombre, valor) {
  if (Object.hasOwn(RANGO_DEL_PARAMETRO, nombre)) {
    return numeroEnElRango(valor, RANGO_DEL_PARAMETRO[nombre])
  }
  switch (nombre) {
    case 'acabadoPlanMin':
      return numeroEnElRango(valor, RANGOS.acabado)
    case 'proporcionPlan':
      return numeroEnElRango(valor, RANGO_DE_LA_PROPORCION_GUARDADA)
    case 'semilla':
      return numeroEnElRango(valor, RANGOS.semilla)
    case 'velocidad':
      return numeroEnElRango(valor, RANGOS.velocidad)
    case 'modoAcabado':
      return valor === MODO_POR_PLAN || valor === MODO_MMS ? { valido: true, valor } : NO_VALIDO
    case 'horasDeLaCorridaLarga':
      return HORAS_DE_LA_CORRIDA_LARGA_POSIBLES.includes(valor) ? { valido: true, valor } : NO_VALIDO
    default:
      return NO_VALIDO
  }
}

/** ¿Es 1, 2 o 3? Un número de plan de acabado. */
export function esUnPlan(plan) {
  return PLANES.includes(plan)
}
