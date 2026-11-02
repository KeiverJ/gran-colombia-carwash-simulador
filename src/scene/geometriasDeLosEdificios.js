import { BoxGeometry } from 'three'

import { colorConNiebla, distanciaAlCentro, piezasDelEdificio } from './edificios.js'
import { conColor, juntar } from './geometriasDelEntorno.js'

/**
 * La forma de un edificio de la esquina: todas sus cajas (cuerpo, techo, vitrina, puerta,
 * ventanas y tablero) juntas en **una sola geometría de color de vértice**, una llamada de
 * dibujo por edificio. Cada pieza ya lleva su color mezclado con el del horizonte según su
 * distancia al centro del terreno (`colorConNiebla`): así los edificios lejanos se funden con
 * el cielo sin tocar el resto de la escena. Medidas en el mundo.
 */
export function geometriaDelEdificio(edificio) {
  return juntar(
    piezasDelEdificio(edificio).map(({ x0, x1, y0, y1, z0, z1, color }) => {
      const caja = new BoxGeometry(x1 - x0, y1 - y0, z1 - z0).translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2)
      return conColor(caja, colorConNiebla(color, distanciaAlCentro((x0 + x1) / 2, (z0 + z1) / 2)))
    }),
  )
}
