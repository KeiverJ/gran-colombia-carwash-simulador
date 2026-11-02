import { CanvasTexture, LinearFilter, SRGBColorSpace } from 'three'

import { COLOR_DE_ESCENA } from '../estilos/colores.js'
import { colorConNiebla, distanciaAlCentro, EDIFICIOS, centroDelEdificio, letreroDelEdificio, LETRERO } from './edificios.js'

/**
 * El atlas de los letreros pintados: una sola imagen con una fila por edificio (el
 * fondo de su color y el nombre del negocio en letras gruesas), dibujada en un lienzo
 * 2D. Como los demás rótulos de la escena, usa la fuente del sistema y no pide nada a
 * internet. Una sola textura y una sola malla para los once letreros.
 */

/** Los píxeles de una fila: tienen la proporción del letrero (ancho × alto). */
const ALTO_DE_LA_FILA = 128
const ANCHO_DEL_ATLAS = ALTO_DE_LA_FILA * LETRERO.proporcion
const FAMILIA = "system-ui, 'Segoe UI', Roboto, sans-serif"

/** Dibuja el atlas de los letreros de estos edificios y lo devuelve como textura (hay que llamarlo en el navegador). */
export function crearAtlasDeLetreros(edificios = EDIFICIOS) {
  const lienzo = document.createElement('canvas')
  lienzo.width = ANCHO_DEL_ATLAS
  lienzo.height = ALTO_DE_LA_FILA * edificios.length
  const ctx = lienzo.getContext('2d')
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  edificios.forEach((edificio, i) => {
    const [cx, cz] = centroDelEdificio(edificio)
    const distancia = distanciaAlCentro(cx, cz)
    const { texto, fondo, color } = letreroDelEdificio(edificio)
    const arriba = i * ALTO_DE_LA_FILA
    ctx.fillStyle = colorConNiebla(fondo, distancia)
    ctx.fillRect(0, arriba, ANCHO_DEL_ATLAS, ALTO_DE_LA_FILA)
    // Un filete claro del color del texto, como el borde de un letrero pintado a mano.
    ctx.strokeStyle = colorConNiebla(color, distancia)
    ctx.lineWidth = 5
    ctx.strokeRect(8, arriba + 8, ANCHO_DEL_ATLAS - 16, ALTO_DE_LA_FILA - 16)
    let tamano = ALTO_DE_LA_FILA * 0.56
    ctx.font = `bold ${tamano}px ${FAMILIA}`
    const disponible = ANCHO_DEL_ATLAS - 70
    const medido = ctx.measureText(texto).width
    if (medido > disponible) {
      tamano = (tamano * disponible) / medido
      ctx.font = `bold ${tamano}px ${FAMILIA}`
    }
    ctx.fillStyle = colorConNiebla(color, distancia)
    ctx.fillText(texto, ANCHO_DEL_ATLAS / 2, arriba + ALTO_DE_LA_FILA / 2 + tamano * 0.04)
  })

  const textura = new CanvasTexture(lienzo)
  textura.colorSpace = SRGBColorSpace
  textura.minFilter = LinearFilter
  textura.anisotropy = 4
  return textura
}

/** El color del texto por defecto de los letreros, del tema (para quien lo quiera comprobar). */
export const COLOR_DEL_TEXTO_DE_LOS_LETREROS = COLOR_DE_ESCENA.textoDeLetrero
