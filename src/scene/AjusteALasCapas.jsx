import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'

import { categoriaDeAncho, useInterfaz } from '../store/interfaz.js'
import { encuadreParaLasCapas } from './camara.js'

/**
 * Las capas de Ajustes y de Resultados flotan encima del lienzo 3D y no lo
 * achican. Este componente, que vive dentro del lienzo y no dibuja nada, hace
 * que la imagen se acomode a lo que ellas dejan libre.
 *
 * En cada cuadro mide con `getBoundingClientRect` cuánto del lienzo tapa cada
 * capa. Ese rectángulo incluye el `transform` de la animación CSS de la capa,
 * así que el encuadre se mueve con su misma duración y su misma curva, sin
 * temporizadores propios; y con "reducir movimiento" la capa aparece de
 * golpe y el encuadre también.
 *
 * Con esa medida pide a la cámara un `setViewOffset` (ver `camara.js`): no
 * mueve la cámara ni la gira, solo decide en qué parte del lienzo se dibuja el
 * cuadro. Lo que la persona haya girado o acercado a mano no se toca, y los
 * botones de vista siguen llevando a las mismas posiciones.
 *
 * También escribe `--capa-izquierda` y `--capa-derecha` (los píxeles que cubre
 * cada capa en ese instante) en el contenedor del lienzo, para que los botones
 * de cámara, la leyenda, la pantalla completa y los indicadores se muevan y se
 * centren en el área libre a la vez que la imagen.
 *
 * En celular no hay capas encima (la hoja inferior no tapa la escena): no se
 * hace nada y se limpia lo que hubiera. A pantalla completa las capas no se
 * ven, así que tampoco cuentan.
 */

const CAPA_DE_LA_IZQUIERDA = 'capa-de-ajustes'
const CAPA_DE_LA_DERECHA = 'capa-de-resultados'

/** Con menos que esto de diferencia (en píxeles) no vale la pena volver a calcular. */
const DIFERENCIA_MINIMA_PX = 0.25

/** Cuántos píxeles del lienzo tapa una capa ahora mismo, con su animación a medias incluida. */
function cuantoTapa(id, lado, lienzo) {
  const capa = document.getElementById(id)
  if (!capa) {
    return 0
  }
  const caja = capa.getBoundingClientRect()
  if (caja.width === 0) {
    return 0
  }
  const tapado = lado === 'izquierda' ? caja.right - lienzo.left : lienzo.right - caja.left
  return Math.min(Math.max(tapado, 0), lienzo.width)
}

const cambio = (anterior, actual) => anterior === null || Math.abs(anterior - actual) >= DIFERENCIA_MINIMA_PX

export function AjusteALasCapas() {
  const aplicado = useRef(null)
  const variables = useRef({ izquierda: null, derecha: null })

  useFrame(({ camera, gl }) => {
    const lienzo = gl.domElement
    const contenedor = lienzo.closest('.lienzo-3d')
    const caja = lienzo.getBoundingClientRect()
    if (!contenedor || caja.width === 0 || caja.height === 0) {
      return
    }

    const enCelular = categoriaDeAncho(useInterfaz.getState().ancho) === 'celular'
    const aPantallaCompleta = Boolean(document.fullscreenElement) || Boolean(lienzo.closest('.escena--expandida'))
    const hayCapas = !enCelular && !aPantallaCompleta
    const izquierda = hayCapas ? cuantoTapa(CAPA_DE_LA_IZQUIERDA, 'izquierda', caja) : 0
    const derecha = hayCapas ? cuantoTapa(CAPA_DE_LA_DERECHA, 'derecha', caja) : 0

    if (cambio(variables.current.izquierda, izquierda)) {
      variables.current.izquierda = izquierda
      contenedor.style.setProperty('--capa-izquierda', `${izquierda}px`)
    }
    if (cambio(variables.current.derecha, derecha)) {
      variables.current.derecha = derecha
      contenedor.style.setProperty('--capa-derecha', `${derecha}px`)
    }

    if (enCelular) {
      if (aplicado.current !== null) {
        aplicado.current = null
        camera.clearViewOffset()
      }
      return
    }

    const encuadre = encuadreParaLasCapas({ ancho: caja.width, alto: caja.height, izquierda, derecha })
    if (!encuadre) {
      return
    }
    const anterior = aplicado.current
    const igual =
      anterior !== null &&
      !cambio(anterior.fullWidth, encuadre.fullWidth) &&
      !cambio(anterior.fullHeight, encuadre.fullHeight) &&
      !cambio(anterior.offsetX, encuadre.offsetX) &&
      !cambio(anterior.offsetY, encuadre.offsetY) &&
      anterior.width === encuadre.width &&
      anterior.height === encuadre.height
    if (igual) {
      return
    }
    aplicado.current = encuadre
    camera.setViewOffset(
      encuadre.fullWidth,
      encuadre.fullHeight,
      encuadre.offsetX,
      encuadre.offsetY,
      encuadre.width,
      encuadre.height,
    )
  })

  return null
}

export default AjusteALasCapas
