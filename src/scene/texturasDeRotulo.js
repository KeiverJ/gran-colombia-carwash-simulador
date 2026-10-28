import { CanvasTexture, LinearFilter, SRGBColorSpace } from 'three'

import { COLOR_DE_ESCENA } from '../estilos/colores.js'

/**
 * Las texturas de los rótulos y los letreros, dibujadas en un lienzo 2D.
 *
 * Por qué no se usa el componente `Html` de Drei: con varios rótulos, alguno
 * no llega a montarse —medido, de catorce rótulos aparecían trece, y el que
 * faltaba era el de una avenida—, porque cada `Html` monta su propia raíz de
 * React y la carrera entre montajes pierde alguna. Y por qué tampoco `Text`:
 * descargaría la tipografía de un CDN en tiempo de ejecución.
 *
 * Dibujar el texto en un lienzo 2D no tiene ninguno de los dos problemas: usa
 * la fuente del sistema, no pide nada a la red y vive dentro de la escena.
 */

const ESCALA = 4 // se dibuja en grande y se reduce, para que no se vea borroso
const ALTO_CSS = 26
const FAMILIA = "system-ui, 'Segoe UI', Roboto, sans-serif"

/** Los colores de un rótulo corriente (texto oscuro sobre una tarjeta blanca), del tema. */
export const COLORES_DE_ROTULO = {
  color: COLOR_DE_ESCENA.rotuloTexto,
  fondo: COLOR_DE_ESCENA.rotuloFondo,
  borde: COLOR_DE_ESCENA.rotuloBorde,
}

function aTextura(lienzo) {
  const textura = new CanvasTexture(lienzo)
  textura.colorSpace = SRGBColorSpace
  textura.minFilter = LinearFilter
  textura.anisotropy = 4
  return textura
}

/**
 * Un rótulo: texto en una tarjeta de esquinas redondas.
 *
 * @param {string} texto
 * @param {object} estilo
 * @param {string} estilo.color color del texto
 * @param {string} estilo.fondo color de la tarjeta
 * @param {string} estilo.borde color del borde
 * @param {number} [estilo.relleno] espacio a los lados del texto, en píxeles CSS
 * @param {boolean} [estilo.negrita]
 * @returns {{ textura: import('three').CanvasTexture, ancho: number }} `ancho` es la proporción ancho / alto
 */
export function crearTextura(texto, { color, fondo, borde, relleno = 20, negrita = false }) {
  const lienzo = document.createElement('canvas')
  const ctx = lienzo.getContext('2d')
  const fuente = `${negrita ? 'bold ' : ''}${15 * ESCALA}px ${FAMILIA}`

  ctx.font = fuente
  const anchoTexto = ctx.measureText(texto).width
  lienzo.width = Math.ceil(anchoTexto + relleno * ESCALA)
  lienzo.height = ALTO_CSS * ESCALA

  // Cambiar el tamaño del lienzo borra el contexto: hay que volver a ponerlo.
  ctx.font = fuente
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  const radio = 6 * ESCALA
  ctx.beginPath()
  ctx.roundRect(1, 1, lienzo.width - 2, lienzo.height - 2, radio)
  ctx.fillStyle = fondo
  ctx.fill()
  ctx.lineWidth = 2
  ctx.strokeStyle = borde
  ctx.stroke()

  ctx.fillStyle = color
  ctx.fillText(texto, lienzo.width / 2, lienzo.height / 2 + 2)

  return { textura: aTextura(lienzo), ancho: lienzo.width / lienzo.height }
}

/**
 * La cara de un letrero: un fondo liso con un marco fino y el texto centrado
 * en negrita, del tamaño más grande que cabe. La proporción es la del letrero.
 */
export function crearTexturaDeLetrero(texto, { color, fondo, proporcion }) {
  const lienzo = document.createElement('canvas')
  lienzo.width = 1024
  lienzo.height = Math.round(1024 / proporcion)
  const ctx = lienzo.getContext('2d')

  ctx.fillStyle = fondo
  ctx.fillRect(0, 0, lienzo.width, lienzo.height)

  const margen = lienzo.height * 0.1
  ctx.lineWidth = lienzo.height * 0.035
  ctx.strokeStyle = color
  ctx.strokeRect(margen, margen, lienzo.width - 2 * margen, lienzo.height - 2 * margen)

  // El texto más grande que cabe dentro del marco.
  let tamano = lienzo.height * 0.5
  ctx.font = `bold ${tamano}px ${FAMILIA}`
  const disponible = lienzo.width - 4 * margen
  const medido = ctx.measureText(texto).width
  if (medido > disponible) {
    tamano = (tamano * disponible) / medido
    ctx.font = `bold ${tamano}px ${FAMILIA}`
  }
  ctx.fillStyle = color
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(texto, lienzo.width / 2, lienzo.height / 2 + tamano * 0.04)

  return aTextura(lienzo)
}
