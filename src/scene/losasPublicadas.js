/**
 * El estado visual de las losas que la escena de las motos acaba de calcular, para
 * que lo lean las piezas que dibujan las losas y las gotas de agua en el mismo
 * cuadro (ver `losasVisuales.js`).
 *
 * `Motos` lo publica cada cuadro; quien lo lee comprueba que corresponda a la
 * foto y a la generación de ahora. Si no (la corrida larga, o el primer cuadro
 * tras un cambio), usa el estado del motor, que es el correcto cuando la escena
 * acaba de recolocarse.
 */

import { estadoSegunElMotor } from './losasVisuales.js'

let publicadas = null

/** Lo publica `Motos` (o `null` cuando no hay nada animado). */
export function publicarLasLosas(losas) {
  publicadas = losas
}

/**
 * El estado visual de todas las losas, en el orden de la foto: las placas y luego
 * los puestos. Si lo publicado no es de este cuadro, el del motor.
 *
 * @param {{ foto: object, generacion: number }} estado el del store
 * @returns {string[]} `'libre'`, `'reservada'` u `'ocupada'` de cada losa
 */
export function estadoDeLasLosas({ foto, generacion }) {
  const { placas, puestos } = foto
  const vigente =
    publicadas !== null &&
    publicadas.generacion === generacion &&
    publicadas.relojMin === foto.relojMin &&
    publicadas.placas.length === placas.length &&
    publicadas.puestos.length === puestos.length
  return vigente
    ? [...publicadas.placas, ...publicadas.puestos]
    : [...placas, ...puestos].map(estadoSegunElMotor)
}
