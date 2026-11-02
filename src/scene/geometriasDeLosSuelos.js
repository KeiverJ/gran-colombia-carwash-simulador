import { BoxGeometry, PlaneGeometry } from 'three'

import { COLOR_DE_ESCENA } from '../estilos/colores.js'
import { conColor, juntar } from './geometriasDelEntorno.js'
import { ALTURA_DEL_SUELO, BORDILLO, bordillosDelSuelo, colorDelSuelo, rayasDelParqueadero, SUELOS } from './suelos.js'

/** Un rectángulo acostado (visto desde arriba) a la altura `y`, de un solo color. */
function rectangulo({ x0, x1, z0, z1 }, y, color) {
  const plano = new PlaneGeometry(x1 - x0, z1 - z0).rotateX(-Math.PI / 2).translate((x0 + x1) / 2, y, (z0 + z1) / 2)
  return conColor(plano, color)
}

/**
 * Todo el suelo de las manzanas vecinas —pasto, tierra, parqueaderos y sus rayas— en **una
 * sola geometría** de color de vértice: una llamada de dibujo.
 */
export function geometriaDeLosSuelos(suelos = SUELOS) {
  const piezas = suelos.map((suelo) => rectangulo(suelo, ALTURA_DEL_SUELO, colorDelSuelo(suelo)))
  for (const suelo of suelos.filter(({ tipo }) => tipo === 'parqueadero')) {
    for (const raya of rayasDelParqueadero(suelo)) piezas.push(rectangulo(raya, ALTURA_DEL_SUELO + 0.004, COLOR_DE_ESCENA.pinturaVial))
  }
  // El borde de cada suelo que lo lleva: un bordillo bajo alrededor (una caja por lado).
  for (const suelo of suelos.filter(({ borde }) => borde)) {
    for (const { x0, x1, z0, z1 } of bordillosDelSuelo(suelo)) {
      const caja = new BoxGeometry(x1 - x0, BORDILLO.alto, z1 - z0).translate((x0 + x1) / 2, ALTURA_DEL_SUELO + BORDILLO.alto / 2, (z0 + z1) / 2)
      piezas.push(conColor(caja, COLOR_DE_ESCENA.bordillo))
    }
  }
  return juntar(piezas)
}
