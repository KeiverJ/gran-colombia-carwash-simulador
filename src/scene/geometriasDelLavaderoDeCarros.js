import { BoxGeometry } from 'three'

import { COLOR_DE_ESCENA } from '../estilos/colores.js'
import { conColor, juntar, posteConManguera } from './geometriasDelEntorno.js'
import {
  bahiasDeLosCarros,
  COLUMNAS,
  COLUMNAS_DE_LOS_CARROS,
  ALCANCE_DE_LA_MANGUERA,
  LAVADERO_DE_CARROS,
  manguerasDelLavadero,
  rejillaDeLaBahia,
  techosDelLavadero,
  TECHOS,
} from './lavaderoDeCarros.js'

/** Una caja entre dos esquinas `[x0, y0, z0]` y `[x1, y1, z1]`, de un color de la escena. */
function caja([x0, y0, z0], [x1, y1, z1], color) {
  const g = new BoxGeometry(x1 - x0, y1 - y0, z1 - z0).translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2)
  return conColor(g, COLOR_DE_ESCENA[color])
}

/**
 * Todo lo fijo del lavado de carros **en una sola geometría** de color de vértice (una
 * llamada de dibujo): el piso con las dos bahías marcadas, las rejillas de desagüe, las
 * seis columnas, los dos techos (naranja y gris) y los postes con manguera.
 */
export function geometriaDelLavaderoDeCarros() {
  const { x0, x1, z0, z1 } = LAVADERO_DE_CARROS
  const alturaDelPiso = COLUMNAS.alturaDelPiso
  const piezas = [caja([x0, 0, z0], [x1, alturaDelPiso, z1], 'piso')]

  // Las bahías: el piso mojado marcado con una línea blanca alrededor, y su rejilla de desagüe.
  const linea = 0.12
  for (const bahia of bahiasDeLosCarros()) {
    const y = alturaDelPiso
    piezas.push(caja([bahia.x0, y, bahia.z0], [bahia.x1, y + 0.01, bahia.z1], 'pisoMojado'))
    piezas.push(
      caja([bahia.x0, y, bahia.z0], [bahia.x1, y + 0.025, bahia.z0 + linea], 'pinturaDeEspera'),
      caja([bahia.x0, y, bahia.z1 - linea], [bahia.x1, y + 0.025, bahia.z1], 'pinturaDeEspera'),
      caja([bahia.x0, y, bahia.z0], [bahia.x0 + linea, y + 0.025, bahia.z1], 'pinturaDeEspera'),
      caja([bahia.x1 - linea, y, bahia.z0], [bahia.x1, y + 0.025, bahia.z1], 'pinturaDeEspera'),
    )
    const r = rejillaDeLaBahia(bahia)
    piezas.push(caja([r.x0, y, r.z0], [r.x1, y + 0.03, r.z1], 'placaDeMetal'))
    for (let i = 1; i <= 8; i += 1) {
      const x = r.x0 + (i * (r.x1 - r.x0)) / 9
      piezas.push(caja([x - 0.04, y + 0.03, r.z0 + 0.06], [x + 0.04, y + 0.045, r.z1 - 0.06], 'metal'))
    }
  }

  // Las columnas y los dos techos.
  for (const [x, z] of COLUMNAS_DE_LOS_CARROS) {
    const l = COLUMNAS.lado / 2
    piezas.push(caja([x - l, alturaDelPiso, z - l], [x + l, TECHOS.alto, z + l], 'metal'))
  }
  for (const { color, x0: a0, x1: a1, z0: b0, z1: b1, y } of techosDelLavadero()) {
    piezas.push(caja([a0, y, b0], [a1, y + TECHOS.grosor, b1], color))
  }

  // Los postes con manguera, al frente de cada bahía.
  for (const { x, z } of manguerasDelLavadero()) {
    piezas.push(posteConManguera({ alto: 1.55, alcance: ALCANCE_DE_LA_MANGUERA }).translate(x, alturaDelPiso, z))
  }
  return juntar(piezas)
}
