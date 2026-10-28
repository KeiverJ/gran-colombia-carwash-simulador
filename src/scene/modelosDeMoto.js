import { CANTIDAD_DE_MODELOS } from '../data/creditosDeModelos.js'

/**
 * Qué modelo 3D lleva cada moto.
 *
 * Sale solo del **número de la moto**: la misma moto tiene siempre el mismo
 * modelo, en cualquier corrida y en cualquier orden de llegada. No usa ni
 * consume el generador aleatorio de la simulación (esta mezcla de bits es
 * propia y fija), así que elegir modelos no puede cambiar ningún resultado.
 *
 * Reparto: las motos se agrupan de 12 en 12. En cada grupo, las seis que
 * entran por una avenida llevan los seis modelos, una vez cada uno y en un
 * orden que cambia de grupo a grupo; y las otras seis, igual. Así el reparto es
 * parejo en total y **en cada avenida**. Con `n % 6` sobre el número, en cambio,
 * todas las motos de una avenida tendrían modelos de la misma paridad.
 *
 * La avenida de cada moto sale de la paridad de su número
 * (`entradaDeLaMoto`, en `posiciones.js`); aquí se usa esa misma paridad.
 */

/** Cuántas motos forman un grupo: las de cada avenida son la mitad. */
const MOTOS_POR_GRUPO = 2 * CANTIDAD_DE_MODELOS

/** Mezcla los bits de un entero (rondas de multiplicación y desplazamiento). */
function mezclar(entero) {
  let x = entero >>> 0
  x = Math.imul(x ^ (x >>> 16), 0x45d9f3b)
  x = Math.imul(x ^ (x >>> 16), 0x45d9f3b)
  return (x ^ (x >>> 16)) >>> 0
}

/** Un orden de los modelos que depende solo de `semilla` (Fisher-Yates). */
function ordenDeLosModelos(semilla) {
  const orden = Array.from({ length: CANTIDAD_DE_MODELOS }, (_, i) => i)
  let estado = mezclar(semilla)
  for (let i = orden.length - 1; i > 0; i -= 1) {
    estado = mezclar(estado + Math.imul(i, 0x9e3779b9))
    const j = estado % (i + 1)
    ;[orden[i], orden[j]] = [orden[j], orden[i]]
  }
  return orden
}

/**
 * El modelo de la moto número `n`, de 0 a `CANTIDAD_DE_MODELOS - 1`
 * (el modelo `i` es `public/modelos/moto-<i + 1>.glb`).
 *
 * @param {number} n número de la moto, entero desde 1
 */
export function modeloDeLaMoto(n) {
  if (!Number.isInteger(n) || n < 1) {
    throw new RangeError(`El número de la moto debe ser un entero desde 1; se recibió ${n}.`)
  }
  const grupo = Math.floor((n - 1) / MOTOS_POR_GRUPO)
  const dentro = (n - 1) % MOTOS_POR_GRUPO
  const paridad = n % 2
  const orden = ordenDeLosModelos(grupo * 2 + paridad + 1)
  // De las 12 motos del grupo, las de una misma paridad ocupan los lugares 0, 2, 4…
  // o 1, 3, 5…: dividir entre 2 da su turno de 0 a 5.
  return orden[Math.floor(dentro / 2)]
}
