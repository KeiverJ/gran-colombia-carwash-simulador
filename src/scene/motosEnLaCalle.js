/**
 * Las motos que la escena acaba de dibujar, para que las lea el tráfico de
 * ambiente en el mismo cuadro (los carros esperan cuando una moto entra o sale
 * por una boca).
 *
 * Igual que `losasPublicadas.js`: `Motos` lo publica cada cuadro y quien lo lee
 * mira cuáles están sobre la calzada de cada avenida (ver `trafico.js`). No lleva
 * ningún dato del motor: solo dónde están las motos en la escena.
 */

let publicadas = []

/** Lo publica `Motos`: las motos del cuadro (`{ punto: [x, y, z] }`), o `null` si no hay ninguna animada. */
export function publicarLasMotosEnLaCalle(motos) {
  publicadas = motos ?? []
}

/** Las motos del último cuadro: lista vacía si no había ninguna. */
export const motosEnLaCalle = () => publicadas
