import { BOQUILLA } from './gotas.js'
import { entreDe } from './hashPropio.js'
import { MOTO, POSTE_DE_LOSA, posteDeLaPlaca, RETRANQUEO_EN_LA_LOSA, SERVIDOR } from './posiciones.js'

/**
 * El chorro de la manguera y las burbujas de una placa con la moto encima.
 * JavaScript puro y sin azar: cada posición sale de `k` (qué punto o burbuja es) y
 * de `t` (los segundos de animación, que avanzan con el reloj simulado y se quedan
 * quietos en pausa), con el hash propio de la escena, nunca el generador del motor.
 *
 * Todo se mide desde el centro de la placa, a ras del piso (+Z es el frente).
 */

/** Cuántos puntos lleva el chorro de cada placa. */
export const PUNTOS_DEL_CHORRO = 10

/** Cuántas burbujas lleva cada placa. */
export const BURBUJAS_POR_PLACA = 6

/** Segundos que tarda un punto del chorro en ir de la boquilla a la moto. */
const SEGUNDOS_DEL_CHORRO = 0.55

/** Segundos que tarda una burbuja en subir de la moto hasta que se va. */
const SEGUNDOS_DE_LA_BURBUJA = 3.2

/** Cuánto se levanta el chorro a mitad de camino, en metros: lo que lo hace un arco. */
const ARCO_DEL_CHORRO = 0.2

/** Cuánto se abre el chorro a los lados (metros) al llegar a la moto. */
const ABERTURA_DEL_CHORRO = 0.05

/** La semilla del reparto de las burbujas (no es la de la simulación). */
const SEMILLA_DE_LAS_BURBUJAS = 4409

/** Hasta dónde sobresalen las burbujas de la caja de la moto, a los lados. */
const MARGEN_DE_LAS_BURBUJAS = 0.12

/** De qué altura sobre la placa parten las burbujas y cuánto suben. */
const ALTURA_DE_LAS_BURBUJAS = { desde: 0.35, sube: 0.85 }

/** El radio de una burbuja, de la más chica a la más grande. */
const RADIO_DE_LA_BURBUJA = { minimo: 0.045, maximo: 0.085 }

/**
 * La boquilla de la manguera de la placa `indice`, medida desde el centro de su
 * losa. Con las losas muy juntas (7 por fila) el poste se acerca a la losa y se
 * encoge, y la boquilla con él: la misma cuenta que usa `Servidores.jsx`.
 *
 * @returns {{ x: number, y: number, z: number }}
 */
export function boquillaDeLaPlaca(indice, total) {
  const poste = posteDeLaPlaca(indice, total)
  return { x: poste.x + (BOQUILLA.x - POSTE_DE_LOSA.x) * poste.escala, y: BOQUILLA.y, z: poste.z }
}

/** A qué parte de la moto llega el chorro: su costado de la manguera, a media altura. */
export const OBJETIVO_DEL_CHORRO = {
  x: -MOTO.ancho / 2 + 0.12,
  y: SERVIDOR.altoOcupado + 0.55,
  z: -RETRANQUEO_EN_LA_LOSA + 0.1,
}

/**
 * Dónde está el punto `k` del chorro en el instante `t`: sale de la boquilla,
 * sube un poco y baja hasta la moto, y al llegar vuelve a salir. Los puntos van
 * escalonados, así que a cualquier instante se ve el chorro entero.
 *
 * @param {number} k de 0 a `PUNTOS_DEL_CHORRO - 1`
 * @param {number} t segundos de animación
 * @param {{ x: number, y: number, z: number }} boquilla la de `boquillaDeLaPlaca`
 * @returns {[number, number, number]}
 */
export function posicionDelChorro(k, t, boquilla) {
  const fase = (t / SEGUNDOS_DEL_CHORRO + k / PUNTOS_DEL_CHORRO) % 1
  const lado = (entreDe(SEMILLA_DE_LAS_BURBUJAS, 200 + k, -1, 1) * ABERTURA_DEL_CHORRO) * fase
  return [
    boquilla.x + (OBJETIVO_DEL_CHORRO.x - boquilla.x) * fase + lado,
    boquilla.y + (OBJETIVO_DEL_CHORRO.y - boquilla.y) * fase + ARCO_DEL_CHORRO * 4 * fase * (1 - fase),
    boquilla.z + (OBJETIVO_DEL_CHORRO.z - boquilla.z) * fase + lado,
  ]
}

/** La caja, en X y Z, dentro de la que suben las burbujas: la de la moto con un margen corto. */
export const CAJA_DE_LAS_BURBUJAS = {
  x: MOTO.ancho / 2 + MARGEN_DE_LAS_BURBUJAS,
  z: MOTO.largo / 2 + MARGEN_DE_LAS_BURBUJAS,
  centroZ: -RETRANQUEO_EN_LA_LOSA,
}

/**
 * La burbuja `k` en el instante `t`: nace sobre la moto, sube con un pequeño
 * vaivén a los lados, crece al nacer y se encoge al irse. `radio` ya trae esa
 * escala (0 al nacer y al irse).
 *
 * @param {number} k de 0 a `BURBUJAS_POR_PLACA - 1`
 * @param {number} t segundos de animación
 * @returns {{ x: number, y: number, z: number, radio: number }}
 */
export function posicionDeLaBurbuja(k, t) {
  const { x, z, centroZ } = CAJA_DE_LAS_BURBUJAS
  // Cada burbuja arranca en un momento distinto de su subida (sin azar: sale de `k`).
  const fase = (t / SEGUNDOS_DE_LA_BURBUJA + entreDe(SEMILLA_DE_LAS_BURBUJAS, k * 5 + 4, 0, 1)) % 1
  const vaiven = 0.04 * Math.sin(2 * Math.PI * (fase * 2 + k / BURBUJAS_POR_PLACA))
  const escala = Math.min(1, fase / 0.15, (1 - fase) / 0.2)
  const { desde, sube } = ALTURA_DE_LAS_BURBUJAS
  return {
    x: Math.max(-x, Math.min(x, entreDe(SEMILLA_DE_LAS_BURBUJAS, k * 5 + 1, -x, x) + vaiven)),
    y: SERVIDOR.altoOcupado + desde + sube * fase,
    z: centroZ + entreDe(SEMILLA_DE_LAS_BURBUJAS, k * 5 + 2, -z, z),
    radio: entreDe(SEMILLA_DE_LAS_BURBUJAS, k * 5 + 3, RADIO_DE_LA_BURBUJA.minimo, RADIO_DE_LA_BURBUJA.maximo) * escala,
  }
}
