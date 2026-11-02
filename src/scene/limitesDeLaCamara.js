import { BOTONES_DE_VISTA, distanciaDe, LIMITES_DE_CAMARA, vistaPlanta } from './camara.js'
import { TERRENO } from './posiciones.js'

/**
 * Los límites del desplazamiento de la cámara (el «pan» del clic derecho, o de dos dedos
 * en el celular). JavaScript puro y sin Three.js, para poder comprobarlos con pruebas.
 *
 * El control de órbita mueve a la vez la cámara y el punto al que mira. Estos límites se
 * aplican después de cada movimiento:
 * - **El punto al que mira no se sale del terreno**: queda dentro de un círculo de
 *   `RADIO_DEL_OBJETIVO` metros alrededor del centro del terreno (más allá el velo ya lo
 *   disolvió en el cielo), y no baja del piso ni sube más de `ALTURA_MAXIMA_DEL_OBJETIVO`.
 * - **La cámara no baja del piso**: queda al menos a `ALTURA_MINIMA_DE_LA_CAMARA` metros.
 * - **No se aleja más que la vista «Planta»** (la más lejana de las cuatro): ver
 *   `distanciaMaximaDeLaCamara`.
 *
 * Los botones de vista siguen llevando la cámara a su posición: cada vista cumple estos límites.
 */

/** Hasta dónde puede irse el punto al que mira, desde el centro del terreno, en metros. */
export const RADIO_DEL_OBJETIVO = 60

/** Lo más alto que puede quedar el punto al que mira, en metros. */
export const ALTURA_MAXIMA_DEL_OBJETIVO = 8

/** Lo más bajo que puede quedar la cámara, en metros: a la altura de los ojos de una persona. */
export const ALTURA_MINIMA_DE_LA_CAMARA = 1.2

/**
 * Lo más lejos que puede estar la cámara de su punto: lo que se aleja la vista «Planta»
 * con esa proporción del lienzo (y nunca más que el tope general de `LIMITES_DE_CAMARA`).
 * Es también lo que dejan las demás vistas, que son más cercanas.
 */
export function distanciaMaximaDeLaCamara(aspecto) {
  const lejana = Math.max(...BOTONES_DE_VISTA.map(({ calcular }) => distanciaDe(calcular(aspecto))), distanciaDe(vistaPlanta(aspecto)))
  return Math.min(LIMITES_DE_CAMARA.distanciaMaxima, lejana)
}

/**
 * Corrige la posición de la cámara y su objetivo para que cumplan los límites.
 *
 * @param {{ posicion: number[], objetivo: number[] }} camara
 * @returns {{ posicion: number[], objetivo: number[], cambio: boolean }} lo corregido; `cambio` dice si hubo que moverlo
 */
export function acotarLaCamara({ posicion, objetivo }) {
  const [cx, , cz] = TERRENO.centro
  let [ox, oy, oz] = objetivo
  const original = [ox, oy, oz]

  // El objetivo dentro del círculo del terreno, y entre el piso y su altura máxima.
  const dx = ox - cx
  const dz = oz - cz
  const lejos = Math.hypot(dx, dz)
  if (lejos > RADIO_DEL_OBJETIVO) {
    ox = cx + (dx * RADIO_DEL_OBJETIVO) / lejos
    oz = cz + (dz * RADIO_DEL_OBJETIVO) / lejos
  }
  oy = Math.min(ALTURA_MAXIMA_DEL_OBJETIVO, Math.max(0, oy))

  // La cámara va con el objetivo: se desplaza lo mismo (así no cambia cómo se mira)...
  const desplazamiento = [ox - original[0], oy - original[1], oz - original[2]]
  const nueva = posicion.map((c, i) => c + desplazamiento[i])
  // ...y no baja de la altura mínima.
  nueva[1] = Math.max(ALTURA_MINIMA_DE_LA_CAMARA, nueva[1])

  const cambio = nueva.some((c, i) => Math.abs(c - posicion[i]) > 1e-9) || desplazamiento.some((c) => Math.abs(c) > 1e-9)
  return { posicion: nueva, objetivo: [ox, oy, oz], cambio }
}
