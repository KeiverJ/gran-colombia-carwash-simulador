import { BoxGeometry, ConeGeometry, CylinderGeometry } from 'three'

import { COLOR_DE_ESCENA } from '../estilos/colores.js'
import { conColor, juntar } from './geometriasDelEntorno.js'

/**
 * Los detalles de la calle y de la cafetería que no tienen modelo y se hacen en
 * código, con formas facetadas y colores planos (el estilo de las motos): la
 * caneca, la banca y la sombrilla. Cada una se dibuja con su pie en el origen y
 * mirando a +Z; `geometriaDeLosDetalles` las pone en sus sitios y las junta todas
 * en **una sola geometría de color de vértice** (una llamada de dibujo).
 */

/** Una caja con su centro en (x, y, z). */
const cajaEn = (ancho, alto, fondo, x, y, z, color) => conColor(new BoxGeometry(ancho, alto, fondo).translate(x, y, z), color)

/** La caneca: un tarro facetado con tapa, de metal. */
function caneca() {
  return [
    conColor(new CylinderGeometry(0.22, 0.19, 0.7, 8).translate(0, 0.35, 0), COLOR_DE_ESCENA.metal),
    conColor(new CylinderGeometry(0.24, 0.24, 0.08, 8).translate(0, 0.74, 0), COLOR_DE_ESCENA.sillaDeCafeteria),
  ]
}

/** La banca: asiento y respaldo de tablas de madera sobre dos patas de metal; mira a +Z. */
function banca() {
  return [
    cajaEn(1.6, 0.06, 0.45, 0, 0.45, 0, COLOR_DE_ESCENA.mesaDeCafeteria),
    cajaEn(1.6, 0.38, 0.05, 0, 0.74, -0.2, COLOR_DE_ESCENA.mesaDeCafeteria),
    ...[-0.7, 0.7].map((x) => cajaEn(0.06, 0.45, 0.45, x, 0.225, 0, COLOR_DE_ESCENA.metal)),
  ]
}

/** La sombrilla: un palo con su base y un toldo cónico facetado. */
function sombrilla() {
  return [
    conColor(new CylinderGeometry(0.2, 0.24, 0.05, 8).translate(0, 0.025, 0), COLOR_DE_ESCENA.metal),
    conColor(new CylinderGeometry(0.035, 0.035, 2.35, 6).translate(0, 1.175, 0), COLOR_DE_ESCENA.metal),
    conColor(new ConeGeometry(1.1, 0.4, 8).translate(0, 2.45, 0), COLOR_DE_ESCENA.sombrilla),
  ]
}

const PIEZAS = { caneca, banca, sombrilla }

/** Los roles que se hacen en código. */
export const ROLES_EN_CODIGO = Object.keys(PIEZAS)

/**
 * Todo lo hecho en código de estos sitios (`{ rol, x, y, z, giro, escala }`) en una sola
 * geometría. Los sitios de roles con modelo se ignoran.
 */
export function geometriaDeLosDetalles(sitios) {
  const piezas = []
  for (const { rol, x, y, z, giro, escala } of sitios) {
    if (!PIEZAS[rol]) continue
    for (const pieza of PIEZAS[rol]()) {
      piezas.push(pieza.scale(escala, escala, escala).rotateY(giro).translate(x, y, z))
    }
  }
  return piezas.length > 0 ? juntar(piezas) : null
}
