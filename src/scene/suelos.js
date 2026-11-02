import { COLOR_DE_ESCENA } from '../estilos/colores.js'

/**
 * El suelo de las manzanas vecinas: sobre la arena clara y cálida del terreno van franjas de
 * pasto frente a las casas, un lote de tierra y un parqueadero con sus rayas, para que lo
 * que queda alrededor del lavadero no sea una sola superficie. JavaScript puro: rectángulos
 * `{ nombre, tipo, x0, x1, z0, z1 }` vistos desde arriba, en metros. Son planos pegados al
 * piso (no tapan nada, no reciben clics) y no pisan las calzadas, las aceras, el local ni
 * los edificios (lo comprueba `suelos.test.js`). La calzada sigue por entre los edificios.
 */

/** Qué color de la escena lleva cada tipo de suelo. */
export const COLOR_DEL_SUELO = { pasto: 'pasto', tierra: 'tierraDeLote', parqueadero: 'parqueadero' }

/** A qué altura quedan sobre el terreno (que está en −0,02): bajo el asfalto, las aceras y el piso del local. */
export const ALTURA_DEL_SUELO = -0.01

export const SUELOS = [
  // Frente a las casas del otro lado de la Av. Guaimaral: una franja de pasto entre la acera y las fachadas
  { nombre: 'antejardín de la Guaimaral', tipo: 'pasto', x0: -21.7, x1: -19.1, z0: -8.5, z1: 44 },
  // Detrás, entre la acera de la Gran Colombia y las fachadas, a los dos lados de la Guaimaral
  { nombre: 'antejardín del fondo, al oeste', tipo: 'pasto', x0: -48, x1: -22, z0: -22.9, z1: -20.1 },
  { nombre: 'antejardín del fondo, al este', tipo: 'pasto', x0: -7, x1: 31, z0: -22.9, z1: -20.1 },
  // A la derecha del lavadero, entre su franja de espera y las casas
  { nombre: 'franja de pasto junto a la fila', tipo: 'pasto', x0: 16.1, x1: 17.4, z0: -9.5, z1: 3.2 },
  { nombre: 'parqueadero de los locales de la derecha', tipo: 'parqueadero', x0: 17.5, x1: 41.5, z0: 2.6, z1: 9 },
  { nombre: 'lote de tierra', tipo: 'tierra', x0: 17.5, x1: 33, z0: 9.6, z1: 22 },
  // Al frente, a un lado de la cafetería
  { nombre: 'parqueadero del frente', tipo: 'parqueadero', x0: -1, x1: 15, z0: 17, z1: 34 },
  { nombre: 'franja de pasto del frente', tipo: 'pasto', x0: -1, x1: 15, z0: 14.6, z1: 16.4 },
]

/** El ancho de una raya del parqueadero y cada cuántos metros va, en metros. */
export const RAYAS_DEL_PARQUEADERO = { ancho: 0.12, cada: 2.6 }

/**
 * Las rayas pintadas de un parqueadero: rectángulos del mismo tipo que los suelos,
 * a lo largo de su fondo (en Z), una cada `cada` metros desde su borde, sin llegar a los bordes.
 */
export function rayasDelParqueadero({ x0, x1, z0, z1 }) {
  const { ancho, cada } = RAYAS_DEL_PARQUEADERO
  const rayas = []
  for (let x = x0 + cada; x < x1 - 0.5; x += cada) {
    rayas.push({ x0: x - ancho / 2, x1: x + ancho / 2, z0: z0 + 0.4, z1: z1 - 0.4 })
  }
  return rayas
}

/** El color (hex) de un suelo. */
export const colorDelSuelo = (suelo) => COLOR_DE_ESCENA[COLOR_DEL_SUELO[suelo.tipo]]
