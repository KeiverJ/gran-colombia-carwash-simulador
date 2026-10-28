import {
  BoxGeometry,
  CylinderGeometry,
  Euler,
  Matrix4,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Quaternion,
  RingGeometry,
  Vector3,
} from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

import { COLOR_DE_PLAN } from '../estilos/colores.js'
import { medirPiezas } from './medidaDeMoto.js'
import { MOTO } from './posiciones.js'

/**
 * Lo que comparten todas las motos dibujadas, creado **una sola vez**: el
 * aro de cada plan, y la figura de respaldo (la moto armada con
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

/**
 * El aro de piso: de qué radio a qué radio va, en metros. Los tres planes caben
 * en él; lo que cambia de uno a otro es el trazo (ver `TRAZOS_DE_ARO`).
 */
export const ARO = { interior: 0.78, exterior: 0.95 }

/**
 * El trazo del aro de cada plan, para que se distingan por la forma y no solo
 * por el color (también en escala de grises y para quien no distingue colores):
 * el plan 1 es un aro sólido, el 2 un aro en segmentos (punteado) y el 3 un aro
 * doble, de dos anillos finos.
 */
export const TRAZOS_DE_ARO = {
  1: 'solido',
  2: 'segmentos',
  3: 'doble',
}

/** Cuántos segmentos tiene el aro del plan 2 y qué parte del círculo ocupan. */
export const SEGMENTOS_DEL_ARO = { cuantos: 12, relleno: 0.58 }

/** El grosor de cada anillo del aro doble, en metros. */
export const GROSOR_DE_LOS_ANILLOS = 0.06

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

/** Plano sobre el piso: `RingGeometry` nace de pie, mirando a +Z. */
const acostada = (geometria) => geometria.rotateX(-Math.PI / 2)

/** Plan 1: un aro sólido. */
function aroSolido() {
  return acostada(new RingGeometry(ARO.interior, ARO.exterior, 48))
}

/** Plan 2: un aro en segmentos, con huecos entre ellos. */
function aroEnSegmentos() {
  const { cuantos, relleno } = SEGMENTOS_DEL_ARO
  const paso = (Math.PI * 2) / cuantos
  const arcos = Array.from(
    { length: cuantos },
    (_, i) => new RingGeometry(ARO.interior, ARO.exterior, 4, 1, i * paso, paso * relleno),
  )
  const unido = mergeGeometries(arcos)
  arcos.forEach((arco) => arco.dispose())
  return acostada(unido)
}

/** Plan 3: un aro doble, dos anillos finos con un hueco en medio. */
function aroDoble() {
  const anillos = [
    new RingGeometry(ARO.interior - GROSOR_DE_LOS_ANILLOS * 0.5, ARO.interior + GROSOR_DE_LOS_ANILLOS, 48),
    new RingGeometry(ARO.exterior - GROSOR_DE_LOS_ANILLOS, ARO.exterior, 48),
  ]
  const unido = mergeGeometries(anillos)
  anillos.forEach((anillo) => anillo.dispose())
  return acostada(unido)
}

/**
 * Crea las figuras y los colores que comparten todas las motos.
 * Quien lo llame se encarga de soltarlos con `liberarRecursosDeMoto`.
 *
 * - `aros`: la forma plana del aro de piso de cada plan, con su trazo.
 * - `materialesDeAro`: el color de cada plan, tomado de `COLOR_DE_PLAN`.
 * - `respaldo`: las piezas de la moto simple, `{ geometry, material, local }`,
 *   y `medidaDelRespaldo`, su centro y su altura.
 */
export function crearRecursosDeMoto() {
  const aros = { 1: aroSolido(), 2: aroEnSegmentos(), 3: aroDoble() }

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
    aros,
    materialesDeAro,
    respaldo,
    medidaDelRespaldo: medirPiezas(respaldo),
    geometriasDeRespaldo,
    materialesDeRespaldo,
  }
}

/** Suelta lo que creó `crearRecursosDeMoto`. */
export function liberarRecursosDeMoto({
  aros,
  materialesDeAro,
  geometriasDeRespaldo,
  materialesDeRespaldo,
}) {
  for (const geometria of Object.values(aros)) geometria.dispose()
  for (const geometria of Object.values(geometriasDeRespaldo)) geometria.dispose()
  for (const material of [
    ...Object.values(materialesDeAro),
    ...Object.values(materialesDeRespaldo),
  ]) {
    material.dispose()
  }
}
