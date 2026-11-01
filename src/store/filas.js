/**
 * Cuántas motos de cada fila lleva la foto que el store pide al motor.
 *
 * Con λ = 200 y 3 puestos la fila del acabado llega a cientos de miles de motos en
 * 5000 horas, y copiarla entera en cada foto (varias veces por segundo) no tiene
 * sentido: la escena solo dibuja las primeras (`TOPE_DE_MOTOS_DIBUJADAS`) y el resto
 * se cuenta. Por eso la foto trae la cabeza de la fila con un margen, y el largo
 * verdadero va aparte (`largoColaLavado`, `largoColaAcabado`).
 */

import { TOPE_DE_MOTOS_DIBUJADAS } from '../scene/posiciones.js'

/** Las que dibuja la escena, más un margen por si una fila cambia entre dos cuadros. */
export const MOTOS_EN_LA_FOTO = Math.max(TOPE_DE_MOTOS_DIBUJADAS.lavado, TOPE_DE_MOTOS_DIBUJADAS.acabado) + 20

/** La foto del motor con las filas recortadas a la cabeza. El reproductor de la visita no recorta. */
export const fotoDe = (motor) => motor.estado({ maxEnFila: MOTOS_EN_LA_FOTO })

/**
 * Cuántas motos esperan en cada fila. La foto recortada trae el largo verdadero
 * aparte; una foto entera (la visita) lo da su propia lista.
 */
export const largoDeLasFilas = (foto) => ({
  lavado: foto.largoColaLavado ?? foto.colaLavado.length,
  acabado: foto.largoColaAcabado ?? foto.colaAcabado.length,
})
