import { COLOR_DE_ESCENA } from '../estilos/colores.js'

/**
 * El suelo de las manzanas vecinas y del frente del lavadero: sobre la arena clara y cálida
 * del terreno van franjas de pasto frente a las casas, un lote de tierra, parqueaderos con
 * sus rayas y su borde, y la acera de concreto cálido de la cafetería, para que lo que queda
 * alrededor del lavadero no sea una sola superficie. JavaScript puro: rectángulos
 * `{ nombre, tipo, x0, x1, z0, z1, borde? }` vistos desde arriba, en metros. Son planos
 * pegados al piso (no tapan nada, no reciben clics) y no pisan las calzadas, las aceras de las
 * avenidas, el local ni los edificios (lo comprueba `suelos.test.js`). La calzada sigue por
 * entre los edificios. Todo lo que es pasto, tierra o parqueadero lleva su borde (un bordillo
 * bajo): no hay franjas sueltas.
 */

/** Qué color de la escena lleva cada tipo de suelo. */
export const COLOR_DEL_SUELO = { pasto: 'pasto', tierra: 'tierraDeLote', parqueadero: 'parqueadero', acera: 'acera' }

/** A qué altura quedan sobre el terreno (que está en −0,02): bajo el asfalto, las aceras de las avenidas y el piso del local. */
export const ALTURA_DEL_SUELO = -0.01

/** El borde de un suelo: lo ancho y lo alto que es el bordillo, en metros. */
export const BORDILLO = { ancho: 0.15, alto: 0.12 }

export const SUELOS = [
  // Frente a las casas del otro lado de la Av. Guaimaral: una franja de pasto entre la acera y las fachadas
  { nombre: 'antejardín de la Guaimaral', tipo: 'pasto', x0: -21.7, x1: -19.1, z0: -8.5, z1: 44, borde: true },
  // Detrás, entre la acera de la Gran Colombia y las fachadas, a los dos lados de la Guaimaral
  { nombre: 'antejardín del fondo, al oeste', tipo: 'pasto', x0: -48, x1: -22, z0: -22.9, z1: -20.1, borde: true },
  { nombre: 'antejardín del fondo, al este', tipo: 'pasto', x0: -7, x1: 31, z0: -22.9, z1: -20.1, borde: true },
  // A la derecha del lavadero, entre su franja de espera y las casas
  { nombre: 'franja de pasto junto a la fila', tipo: 'pasto', x0: 16.1, x1: 17.4, z0: -9.5, z1: 3.2, borde: true },
  { nombre: 'parqueadero de los locales de la derecha', tipo: 'parqueadero', x0: 17.5, x1: 41.5, z0: 2.6, z1: 9, borde: true },
  { nombre: 'lote de tierra', tipo: 'tierra', x0: 17.5, x1: 33, z0: 9.6, z1: 22, borde: true },
  // El frente del lavadero: la acera de concreto a lo largo del local, la plaza de la cafetería y su parqueadero
  { nombre: 'acera del frente del local', tipo: 'acera', x0: -10.8, x1: 14.5, z0: 12.05, z1: 14.2 },
  { nombre: 'plaza de la cafetería', tipo: 'acera', x0: -10.8, x1: 0.3, z0: 14.2, z1: 28.5 },
  { nombre: 'parqueadero de la cafetería', tipo: 'parqueadero', x0: 0.9, x1: 13.6, z0: 16, z1: 30, borde: true },
]

/** El ancho de una raya del parqueadero y cada cuántos metros va, y el fondo de un puesto de parqueo, en metros. */
export const RAYAS_DEL_PARQUEADERO = { ancho: 0.12, cada: 2.6, fondoDelPuesto: 5.2, margen: 0.4 }

/** Los tramos (en Z) donde van los puestos de un parqueadero: una fila si es angosto y dos, a los lados de un pasillo, si es hondo. */
export function filasDelParqueadero({ z0, z1 }) {
  const { fondoDelPuesto, margen } = RAYAS_DEL_PARQUEADERO
  return z1 - z0 >= 2 * fondoDelPuesto + 2 * margen + 2
    ? [[z0 + margen, z0 + margen + fondoDelPuesto], [z1 - margen - fondoDelPuesto, z1 - margen]]
    : [[z0 + margen, z1 - margen]]
}

/**
 * Las rayas pintadas de un parqueadero: rectángulos del mismo tipo que los suelos, una cada
 * `cada` metros desde su borde en X, a lo largo del fondo de cada fila de puestos y sin llegar a los bordes.
 */
export function rayasDelParqueadero(parqueadero) {
  const { ancho, cada } = RAYAS_DEL_PARQUEADERO
  const rayas = []
  for (const [desde, hasta] of filasDelParqueadero(parqueadero)) {
    for (let x = parqueadero.x0 + cada; x < parqueadero.x1 - 0.5; x += cada) {
      rayas.push({ x0: x - ancho / 2, x1: x + ancho / 2, z0: desde, z1: hasta })
    }
  }
  return rayas
}

/** Los cuatro lados del bordillo de un suelo, como rectángulos `{ x0, x1, z0, z1 }` dentro de él. */
export function bordillosDelSuelo({ x0, x1, z0, z1 }) {
  const { ancho } = BORDILLO
  return [
    { x0, x1, z0, z1: z0 + ancho },
    { x0, x1, z0: z1 - ancho, z1 },
    { x0, x1: x0 + ancho, z0: z0 + ancho, z1: z1 - ancho },
    { x0: x1 - ancho, x1, z0: z0 + ancho, z1: z1 - ancho },
  ]
}

/** Los puestos de un parqueadero (los espacios entre rayas de cada fila): `{ x, z }` del centro de cada uno. */
export function puestosDelParqueadero(parqueadero) {
  const { cada } = RAYAS_DEL_PARQUEADERO
  const puestos = []
  for (const [desde, hasta] of filasDelParqueadero(parqueadero)) {
    for (let x = parqueadero.x0 + cada / 2; x < parqueadero.x1 - cada / 2 + 0.01; x += cada) {
      puestos.push({ x, z: (desde + hasta) / 2 })
    }
  }
  return puestos
}

/** El color (hex) de un suelo. */
export const colorDelSuelo = (suelo) => COLOR_DE_ESCENA[COLOR_DEL_SUELO[suelo.tipo]]

/** El parqueadero de la cafetería. */
export const PARQUEADERO_DE_LA_CAFETERIA = SUELOS.find(({ nombre }) => nombre === 'parqueadero de la cafetería')

/**
 * Los carros estacionados en el parqueadero de la cafetería, quietos, de frente a −Z (hacia el
 * lavadero): el modelo (los modelos de carros que ya hay), su sitio y su giro sobre Y. Van en
 * dos puestos de la primera fila.
 */
export function carrosDelParqueadero() {
  const puestos = puestosDelParqueadero(PARQUEADERO_DE_LA_CAFETERIA)
  return [
    { modelo: 'mazda', puesto: 1, giro: Math.PI + 0.03 },
    { modelo: 'deportivo', puesto: 3, giro: Math.PI - 0.04 },
  ].map(({ modelo, puesto, giro }) => ({ modelo, giro, puesto, x: puestos[puesto].x, z: puestos[puesto].z }))
}
