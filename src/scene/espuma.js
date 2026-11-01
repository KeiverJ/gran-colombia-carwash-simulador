import { entreDe } from './hashPropio.js'
import { MOTO, RETRANQUEO_EN_LA_LOSA, SERVIDOR } from './posiciones.js'

/**
 * La espuma que cubre a la moto mientras se lava. JavaScript puro.
 *
 * **No usa ningún dato del motor.** La cobertura `c` (de 0 a 1) crece con los
 * minutos simulados que la moto lleva posada en la placa:
 *
 *     c = 1 − e^(−t / τ)        con τ = la mitad del tiempo medio de lavado
 *
 * Así a mitad del lavado media espuma y al llegar al tiempo medio ya casi toda
 * (87 %). Al salir la moto, `c` vuelve a 0. Si la escena se recoloca con la moto
 * ya en la placa (reiniciar, cambiar de escenario…) se desconoce cuánto lleva
 * lavándose: arranca en la mitad, `COBERTURA_AL_RECOLOCAR`.
 */

/** Los blobs de espuma que lleva cada placa. */
export const BLOBS_POR_PLACA = 18

/** La cobertura con la que arranca una moto que ya estaba en la placa al recolocar la escena. */
export const COBERTURA_AL_RECOLOCAR = 0.5

/** Cuántas placas puede haber como máximo (el rango de Ajustes es de 1 a 14). */
export const PLACAS_CON_ESPUMA_COMO_MAXIMO = 14

/** τ: la mitad del tiempo medio de lavado, en minutos simulados. */
export const tauDeLaEspuma = (lavadoMin) => Math.max(lavadoMin, 1e-6) / 2

/** La cobertura de espuma después de `minutos` simulados de lavado. */
export function coberturaDeLaEspuma(minutos, tau) {
  return 1 - Math.exp(-Math.max(0, minutos) / tau)
}

/** Los minutos de lavado que corresponden a una cobertura `c` (la inversa). */
export const minutosParaLaCobertura = (c, tau) => -tau * Math.log(1 - Math.min(c, 0.999999))

/** El estado de la espuma de una placa: cuántos minutos lleva con la moto encima (0 si no hay moto). */
export const crearEspuma = () => ({ minutos: 0 })

/**
 * Avanza la espuma de una placa un cuadro y devuelve su cobertura.
 *
 * @param {{ minutos: number }} espuma el estado de la placa (se actualiza)
 * @param {object} cuadro
 * @param {boolean} cuadro.conMoto hay una moto en servicio encima
 * @param {number} cuadro.minutos minutos simulados que pasaron desde el cuadro anterior (0 en pausa)
 * @param {boolean} cuadro.recolocar la escena se recolocó en este cuadro
 * @param {number} cuadro.tau
 * @returns {number} la cobertura, de 0 a 1
 */
export function avanzarLaEspuma(espuma, { conMoto, minutos, recolocar, tau }) {
  if (!conMoto) {
    espuma.minutos = 0
  } else if (recolocar) {
    espuma.minutos = minutosParaLaCobertura(COBERTURA_AL_RECOLOCAR, tau)
  } else {
    espuma.minutos += minutos
  }
  return coberturaDeLaEspuma(espuma.minutos, tau)
}

/** Cuánto antes de su turno empieza a crecer un blob, en cobertura (para que aparezcan de a poco, no de golpe). */
const ANCHO_DE_LA_APARICION = 0.12

/** La caja que ocupa la moto sobre la placa (donde se reparten los blobs), en metros desde el centro de la placa. */
export const CAJA_DE_LA_ESPUMA = {
  x: MOTO.ancho / 2 + 0.05,
  z: MOTO.largo / 2 - 0.05,
  centroZ: -RETRANQUEO_EN_LA_LOSA,
  desde: 0.18,
  hasta: 0.95,
}

/** El tamaño (radio) de un blob, de más chico a más grande. */
const RADIO_DEL_BLOB = { minimo: 0.1, maximo: 0.19 }

/** La semilla del reparto de los blobs (no es la de la simulación). */
const SEMILLA_DE_LA_ESPUMA = 7919

/**
 * Los blobs de una placa, siempre los mismos: `{ x, y, z, radio, turno }` con
 * `y` medida desde la cara de arriba de la placa levantada. `turno` es la
 * cobertura a partir de la cual el blob empieza a verse (de 0 a 1, repartidos
 * parejos y en un orden mezclado).
 */
export const BLOBS_DE_LA_ESPUMA = Array.from({ length: BLOBS_POR_PLACA }, (_, i) => {
  const { x, z, centroZ, desde, hasta } = CAJA_DE_LA_ESPUMA
  return {
    x: entreDe(SEMILLA_DE_LA_ESPUMA, i * 5 + 1, -x, x),
    y: entreDe(SEMILLA_DE_LA_ESPUMA, i * 5 + 2, desde, hasta),
    z: centroZ + entreDe(SEMILLA_DE_LA_ESPUMA, i * 5 + 3, -z, z),
    radio: entreDe(SEMILLA_DE_LA_ESPUMA, i * 5 + 4, RADIO_DEL_BLOB.minimo, RADIO_DEL_BLOB.maximo),
    // El orden de aparición: un blob por tramo de cobertura, mezclado con el hash.
    turno: 0,
  }
})
{
  // Se reparten los turnos en un orden determinista y mezclado (Fisher-Yates con el hash propio).
  const orden = Array.from({ length: BLOBS_POR_PLACA }, (_, i) => i)
  for (let i = orden.length - 1; i > 0; i -= 1) {
    const j = Math.floor(entreDe(SEMILLA_DE_LA_ESPUMA, 100 + i, 0, i + 1))
    ;[orden[i], orden[j]] = [orden[j], orden[i]]
  }
  orden.forEach((blob, lugar) => {
    BLOBS_DE_LA_ESPUMA[blob].turno = (lugar + 0.5) / BLOBS_POR_PLACA
  })
}

/**
 * Cuánto de su tamaño tiene el blob de turno `turno` con la cobertura `c`: 0 si
 * todavía no le toca, 1 cuando la cobertura ya lo pasó, y entre medio crece
 * suave. Con cobertura 0 no se ve ninguno y con 1 se ven todos completos.
 */
export function crecimientoDelBlob(c, turno) {
  const empieza = turno * (1 - ANCHO_DE_LA_APARICION)
  const t = Math.min(1, Math.max(0, (c - empieza) / ANCHO_DE_LA_APARICION))
  return t * t * (3 - 2 * t)
}

/** Altura sobre el piso de la cara de arriba de una placa con moto. */
export const ALTURA_DE_LA_PLACA_CON_MOTO = SERVIDOR.altoOcupado
