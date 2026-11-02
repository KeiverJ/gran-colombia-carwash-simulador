import { BoxGeometry, PlaneGeometry } from 'three'

import {
  centroDelEdificio,
  colorConNiebla,
  distanciaAlCentro,
  EDIFICIOS,
  letreroDelEdificio,
  piezasDelEdificio,
} from './edificios.js'
import { conColor, juntar } from './geometriasDelEntorno.js'

/**
 * Las formas de todos los edificios de las manzanas vecinas, **fusionadas en una sola
 * geometría de color de vértice**: una sola llamada de dibujo para las once fachadas, con
 * sus ventanas, marcos, rejas, balcones, toldos y techos. Cada pieza ya lleva su color
 * mezclado con el del horizonte según su distancia al centro del terreno (`colorConNiebla`):
 * solo lo más lejano se desvanece, y sin tocar el resto de la escena. Medidas en el mundo.
 */
export function geometriaDeLosEdificios(edificios = EDIFICIOS) {
  const cajas = []
  for (const edificio of edificios) {
    for (const { x0, x1, y0, y1, z0, z1, color } of piezasDelEdificio(edificio)) {
      const caja = new BoxGeometry(x1 - x0, y1 - y0, z1 - z0).translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2)
      cajas.push(conColor(caja, colorConNiebla(color, distanciaAlCentro((x0 + x1) / 2, (z0 + z1) / 2))))
    }
  }
  return juntar(cajas)
}

/**
 * Los letreros pintados de todos los edificios en **una sola geometría**: un plano por
 * edificio, pegado a su fachada, con las coordenadas de textura de su fila en el atlas de
 * letreros (la fila `i` es la del edificio `i`; ver `texturasDeLosEdificios.js`).
 */
export function geometriaDeLosLetreros(edificios = EDIFICIOS) {
  const filas = edificios.length
  const planos = edificios.map((edificio, i) => {
    const { x, y, z, ancho, alto, giro } = letreroDelEdificio(edificio)
    const plano = new PlaneGeometry(ancho, alto)
    const uv = plano.getAttribute('uv')
    for (let k = 0; k < uv.count; k += 1) uv.setY(k, (filas - 1 - i + uv.getY(k)) / filas)
    return plano.rotateY(giro).translate(x, y, z)
  })
  return juntar(planos)
}

/** El centro de un edificio y su distancia al centro del terreno, para quien necesite dónde queda. */
export const dondeQueda = (edificio) => {
  const [x, z] = centroDelEdificio(edificio)
  return { x, z, distancia: distanciaAlCentro(x, z) }
}
