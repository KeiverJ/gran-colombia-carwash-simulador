import {
  BoxGeometry,
  ConeGeometry,
  CylinderGeometry,
  MeshStandardMaterial,
  SphereGeometry,
} from 'three'

import { COLOR_DE_PLAN } from '../estilos/colores.js'
import { MOTO } from './posiciones.js'

/**
 * Las figuras y los colores de las motos, creados **una sola vez** y
 * compartidos entre todas las que se dibujan.
 *
 * Con cinco piezas por moto y cuarenta motos a la vez, crearlos por moto serían
 * doscientas geometrías y doscientos materiales en lugar de un puñado, y
 * además se crearían mientras la simulación corre.
 *
 * Viven aparte de `Moto.jsx` porque no son componentes: mezclarlos en el mismo
 * archivo rompe el recargado en caliente.
 */

/** Gris oscuro de ruedas y manubrio. No es un color con significado. */
const COLOR_DE_PIEZA = '#3a4348'
/** Gris del asiento, un punto más claro que las ruedas. */
const COLOR_DE_ASIENTO = '#5a6368'

export const RADIO_DE_RUEDA = 0.28

// Las ruedas marcan los extremos: así lo dibujado mide lo que dice `MOTO`,
// que es con lo que se comprueba que no se monta sobre nada.
export const EJE_DE_RUEDA = MOTO.largo / 2 - RADIO_DE_RUEDA

/** Alto al que va el indicador del plan, por encima del manubrio. */
export const ALTO_DE_LA_MARCA = 1.3

/**
 * Crea las figuras y los colores que comparten todas las motos.
 * Quien lo llame se encarga de soltarlos con `liberarRecursosDeMoto`.
 */
export function crearRecursosDeMoto() {
  const geometrias = {
    rueda: new CylinderGeometry(RADIO_DE_RUEDA, RADIO_DE_RUEDA, 0.16, 14),
    cuerpo: new BoxGeometry(0.42, 0.36, 1),
    asiento: new BoxGeometry(0.4, 0.14, 0.5),
    manubrio: new BoxGeometry(MOTO.ancho, 0.08, 0.08),
  }
  // La marca del plan: cada uno con su forma, para que no dependa del color.
  const marcas = {
    1: new SphereGeometry(0.22, 14, 10),
    2: new BoxGeometry(0.36, 0.36, 0.36),
    3: new ConeGeometry(0.24, 0.46, 14),
  }
  const materiales = {
    1: new MeshStandardMaterial({ color: COLOR_DE_PLAN[1] }),
    2: new MeshStandardMaterial({ color: COLOR_DE_PLAN[2] }),
    3: new MeshStandardMaterial({ color: COLOR_DE_PLAN[3] }),
    pieza: new MeshStandardMaterial({ color: COLOR_DE_PIEZA, roughness: 0.8 }),
    asiento: new MeshStandardMaterial({ color: COLOR_DE_ASIENTO, roughness: 0.9 }),
  }
  return { geometrias, marcas, materiales }
}

/** Suelta lo que creó `crearRecursosDeMoto`. */
export function liberarRecursosDeMoto({ geometrias, marcas, materiales }) {
  for (const geometria of Object.values(geometrias)) geometria.dispose()
  for (const geometria of Object.values(marcas)) geometria.dispose()
  for (const material of Object.values(materiales)) material.dispose()
}

/**
 * Pinta una moto ya dibujada con el color y la forma de su plan.
 *
 * Conoce en qué orden monta `Moto` sus piezas, para que quien la use no tenga
 * que conocerlo. Si cambia el montaje, cambia aquí.
 */
export function pintarMoto(grupo, plan, recursos) {
  const [, , cuerpo, , , marca] = grupo.children
  cuerpo.material = recursos.materiales[plan]
  marca.material = recursos.materiales[plan]
  marca.geometry = recursos.marcas[plan]
}
