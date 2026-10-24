import { useEffect, useMemo } from 'react'
import { CanvasTexture, LinearFilter, SRGBColorSpace } from 'three'

/**
 * Un rótulo dentro de la escena, dibujado como una textura.
 *
 * Por qué no se usa el componente `Html` de Drei: con varios rótulos, alguno
 * no llega a montarse —medido, de catorce rótulos aparecían trece, y el que
 * faltaba era el de una avenida—, porque cada `Html` monta su propia raíz de
 * React y la carrera entre montajes pierde alguna. Y por qué tampoco `Text`:
 * descargaría la tipografía de un CDN en tiempo de ejecución.
 *
 * Dibujar el texto en un lienzo 2D no tiene ninguno de los dos problemas: usa
 * la fuente del sistema, no pide nada a la red y vive dentro de la escena. Al
 * ser un `sprite`, además mira siempre a la cámara.
 */

const ESCALA = 4 // se dibuja en grande y se reduce, para que no se vea borroso
const ALTO_CSS = 26
const FUENTE = `${15 * ESCALA}px system-ui, 'Segoe UI', Roboto, sans-serif`

function crearTextura(texto, { color, fondo, borde }) {
  const lienzo = document.createElement('canvas')
  const ctx = lienzo.getContext('2d')

  ctx.font = FUENTE
  const anchoTexto = ctx.measureText(texto).width
  lienzo.width = Math.ceil(anchoTexto + 20 * ESCALA)
  lienzo.height = ALTO_CSS * ESCALA

  // Cambiar el tamaño del lienzo borra el contexto: hay que volver a ponerlo.
  ctx.font = FUENTE
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

  const textura = new CanvasTexture(lienzo)
  textura.colorSpace = SRGBColorSpace
  textura.minFilter = LinearFilter
  textura.anisotropy = 4
  return { textura, ancho: lienzo.width / lienzo.height }
}

/**
 * @param {object} props
 * @param {[number, number, number]} props.position
 * @param {string} props.children el texto del rótulo
 * @param {number} [props.alto] alto en unidades del mundo
 */
export function Rotulo({ position, children, alto = 0.8, color = '#0f1c26', fondo = 'rgba(255,255,255,0.9)', borde = '#d9e6ec' }) {
  // Los hijos pueden venir partidos ("+", el número, " motos más"): unirlos
  // con String() metería las comas del arreglo en medio del rótulo.
  const texto = Array.isArray(children) ? children.join('') : String(children)
  const { textura, ancho } = useMemo(
    () => crearTextura(texto, { color, fondo, borde }),
    [texto, color, fondo, borde],
  )

  // La textura la creamos nosotros, así que nos toca soltarla.
  useEffect(() => () => textura.dispose(), [textura])

  return (
    <sprite position={position} scale={[alto * ancho, alto, 1]}>
      <spriteMaterial map={textura} transparent depthWrite={false} />
    </sprite>
  )
}

export default Rotulo
