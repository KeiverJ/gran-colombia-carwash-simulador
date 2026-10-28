import {
  BoxGeometry,
  ConeGeometry,
  CylinderGeometry,
  Euler,
  Matrix4,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Quaternion,
  RingGeometry,
  SphereGeometry,
  Vector3,
} from 'three'

import { COLOR_DE_PLAN } from '../estilos/colores.js'
import { medirPiezas } from './medidaDeMoto.js'
import { MOTO } from './posiciones.js'

/**
 * Lo que comparten todas las motos dibujadas, creado **una sola vez**: el
 * marcador y el aro de cada plan, y la figura de respaldo (la moto armada con
 * piezas simples) que se usa si un modelo 3D no carga.
 *
 * Los modelos 3D de las motos no están aquí: los carga `cargaDeModelos.js`.
 *
 * Viven aparte de `Motos.jsx` porque no son componentes: mezclarlos en el mismo
 * archivo rompe el recargado en caliente.
 */

/** Gris oscuro de ruedas y manubrio de la figura de respaldo. */
const COLOR_DE_PIEZA = '#3a4348'
/** Gris del asiento de la figura de respaldo, un punto más claro que las ruedas. */
const COLOR_DE_ASIENTO = '#5a6368'
/** Gris azulado del cuerpo de la figura de respaldo: sin color de plan, igual que los modelos. */
const COLOR_DE_CUERPO = '#6b7a82'

export const RADIO_DE_RUEDA = 0.28

// Las ruedas marcan los extremos: así lo dibujado mide lo que dice `MOTO`,
// que es con lo que se comprueba que no se monta sobre nada.
export const EJE_DE_RUEDA = MOTO.largo / 2 - RADIO_DE_RUEDA

/** El tamaño del marcador respecto del primero que se probó (se redujo a un 70 %). */
const ESCALA_DE_LA_MARCA = 0.7

/**
 * Cuánto se separa la base del marcador del punto más alto de **su** moto, en
 * metros. Cada moto lleva su marcador a su propia altura (`medirPiezas`).
 */
export const SEPARACION_DE_LA_MARCA = 0.25

/** El aro de piso: de qué radio a qué radio va, en metros. */
export const ARO = { interior: 0.78, exterior: 0.95 }

/**
 * A qué altura va el aro sobre la superficie en que se apoya la moto. Algo
 * más que la rejilla de desagüe (6 cm) para que no quede tapado ni parpadee.
 */
export const ALTO_DEL_ARO = 0.075

const PLANES = [1, 2, 3]

const aPorPlan = (crear) => Object.fromEntries(PLANES.map((plan) => [plan, crear(plan)]))

/** Una pieza de la figura de respaldo: forma, material y dónde va dentro de la moto. */
function pieza(geometry, material, posicion, giro = [0, 0, 0]) {
  const local = new Matrix4().compose(
    new Vector3(...posicion),
    new Quaternion().setFromEuler(new Euler(...giro)),
    new Vector3(1, 1, 1),
  )
  return { geometry, material, local }
}

/**
 * Crea las figuras y los colores que comparten todas las motos.
 * Quien lo llame se encarga de soltarlos con `liberarRecursosDeMoto`.
 *
 * - `marcas`: la forma del plan que va encima de la moto (esfera, cubo, cono).
 * - `aro`: la forma plana del aro de piso, igual para los tres planes.
 * - `materialesDeMarca` y `materialesDeAro`: el color de cada plan, tomado de
 *   `COLOR_DE_PLAN`.
 * - `respaldo`: las piezas de la moto simple, `{ geometry, material, local }`,
 *   y `medidaDelRespaldo`, su centro y su altura.
 */
export function crearRecursosDeMoto() {
  // Cada marcador tiene su base en y = 0: así queda a `SEPARACION_DE_LA_MARCA`
  // sobre la moto sea cual sea su forma.
  const marca = (geometria, alto) => geometria.translate(0, alto / 2, 0)
  const e = ESCALA_DE_LA_MARCA
  const marcas = {
    1: marca(new SphereGeometry(0.22 * e, 14, 10), 0.44 * e),
    2: marca(new BoxGeometry(0.36 * e, 0.36 * e, 0.36 * e), 0.36 * e),
    3: marca(new ConeGeometry(0.24 * e, 0.46 * e, 14), 0.46 * e),
  }
  // Plano sobre el piso: `RingGeometry` nace de pie, mirando a +Z.
  const aro = new RingGeometry(ARO.interior, ARO.exterior, 48).rotateX(-Math.PI / 2)

  const materialesDeMarca = aPorPlan(
    (plan) => new MeshStandardMaterial({ color: COLOR_DE_PLAN[plan] }),
  )
  // Sin luz y sin tonos: el aro tiene que ser exactamente el color del plan.
  const materialesDeAro = aPorPlan(
    (plan) =>
      new MeshBasicMaterial({
        color: COLOR_DE_PLAN[plan],
        toneMapped: false,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2,
      }),
  )

  const geometriasDeRespaldo = {
    rueda: new CylinderGeometry(RADIO_DE_RUEDA, RADIO_DE_RUEDA, 0.16, 14),
    cuerpo: new BoxGeometry(0.42, 0.36, 1),
    asiento: new BoxGeometry(0.4, 0.14, 0.5),
    manubrio: new BoxGeometry(MOTO.ancho, 0.08, 0.08),
  }
  const materialesDeRespaldo = {
    pieza: new MeshStandardMaterial({ color: COLOR_DE_PIEZA, roughness: 0.8 }),
    asiento: new MeshStandardMaterial({ color: COLOR_DE_ASIENTO, roughness: 0.9 }),
    cuerpo: new MeshStandardMaterial({ color: COLOR_DE_CUERPO, roughness: 0.7 }),
  }
  const { rueda, cuerpo, asiento, manubrio } = geometriasDeRespaldo
  const { pieza: gris, asiento: tapizado, cuerpo: carroceria } = materialesDeRespaldo
  const respaldo = [
    pieza(rueda, gris, [0, RADIO_DE_RUEDA, EJE_DE_RUEDA], [0, 0, Math.PI / 2]),
    pieza(rueda, gris, [0, RADIO_DE_RUEDA, -EJE_DE_RUEDA], [0, 0, Math.PI / 2]),
    pieza(cuerpo, carroceria, [0, 0.52, 0]),
    pieza(asiento, tapizado, [0, 0.74, -0.25]),
    pieza(manubrio, gris, [0, 0.88, MOTO.largo / 2 - 0.43]),
  ]

  return {
    marcas,
    aro,
    materialesDeMarca,
    materialesDeAro,
    respaldo,
    medidaDelRespaldo: medirPiezas(respaldo),
    geometriasDeRespaldo,
    materialesDeRespaldo,
  }
}

/** Suelta lo que creó `crearRecursosDeMoto`. */
export function liberarRecursosDeMoto({
  marcas,
  aro,
  materialesDeMarca,
  materialesDeAro,
  geometriasDeRespaldo,
  materialesDeRespaldo,
}) {
  for (const geometria of Object.values(marcas)) geometria.dispose()
  aro.dispose()
  for (const geometria of Object.values(geometriasDeRespaldo)) geometria.dispose()
  for (const material of [
    ...Object.values(materialesDeMarca),
    ...Object.values(materialesDeAro),
    ...Object.values(materialesDeRespaldo),
  ]) {
    material.dispose()
  }
}
