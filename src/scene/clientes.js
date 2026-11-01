import { ASIENTOS_OCUPADOS, CLIENTES_DE_LA_CAJA } from './cafeteria.js'
import { POSTURAS } from './personas.js'

/**
 * Los clientes de la cafetería: dos o tres sentados en la sala de espera y, junto
 * a la caja, unos de pie. Todo decorativo y sin azar: la ropa y la postura de cada
 * uno salen de su número (ver `ropaDeLaPersona`), nunca del generador del motor.
 */

/** Dónde se pone la multitud (el modelo «crowd» con tres figuras) junto a la caja, mirando al mostrador (+Z). */
export const LUGAR_DE_LA_MULTITUD = { x: CLIENTES_DE_LA_CAJA.x, z: CLIENTES_DE_LA_CAJA.z, rumbo: 0 }

/**
 * Las personas sentadas en la sala de espera, una por asiento ocupado, mirando
 * hacia el lavadero (−Z). Sus números son 1, 2 y 3.
 */
export function clientesSentados() {
  return ASIENTOS_OCUPADOS.map((asiento, i) => ({
    tipo: 'cliente',
    postura: POSTURAS.sentada,
    numero: i + 1,
    x: asiento.x,
    y: 0,
    z: asiento.z,
    rumbo: Math.PI,
  }))
}

/**
 * Un par de clientes de pie hechos en código, junto a la caja, para cuando el
 * modelo «crowd» no carga. Miran al mostrador (+Z).
 */
export function clientesDePieDeRespaldo() {
  return [-0.45, 0.45].map((dx, i) => ({
    tipo: 'cliente',
    postura: POSTURAS.dePie,
    numero: 4 + i,
    x: CLIENTES_DE_LA_CAJA.x + dx,
    y: 0,
    z: CLIENTES_DE_LA_CAJA.z,
    rumbo: 0,
  }))
}
