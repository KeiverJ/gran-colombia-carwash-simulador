import { POSTE_DE_LOSA } from './posiciones.js'

/** Gotas por placa ocupada. */
export const GOTAS_POR_PLACA = 14
/** Cuántas placas puede haber como máximo (el rango de Ajustes es 5-7). */
export const PLACAS_COMO_MAXIMO = 7

/** Dónde sale el agua, respecto del centro de la placa: bajo la boquilla de la manguera. */
export const BOQUILLA = { x: POSTE_DE_LOSA.x + 0.95, y: 0.85, z: POSTE_DE_LOSA.z }

/** Segundos que tarda una gota en caer de la boquilla a la losa. */
const SEGUNDOS_DE_CAIDA = 0.8

/** Un número entre 0 y 1 que depende solo de `k`: reparte las gotas sin azar. */
const reparto = (k) => {
  const x = Math.sin(k * 12.9898) * 43758.5453
  return x - Math.floor(x)
}

/**
 * Posición de la gota `k` de una placa en el instante `t`: cae de la boquilla
 * hacia la cara de arriba de la losa, con un poco de dispersión a los lados.
 * Es una función pura y sin azar: `t` y `k` bastan para saber dónde está.
 */
export function posicionDeLaGota(k, t, altoDeLaLosa) {
  const fase = (t / SEGUNDOS_DE_CAIDA + k / GOTAS_POR_PLACA) % 1
  const caida = fase * fase // acelera como cae el agua
  return [
    BOQUILLA.x + (reparto(k) - 0.5) * 0.25 * fase,
    BOQUILLA.y - (BOQUILLA.y - altoDeLaLosa) * caida,
    BOQUILLA.z + (reparto(k + 50) - 0.5) * 0.25 * fase,
  ]
}

