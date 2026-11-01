import { BoxGeometry } from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

import { TECHO } from './posiciones.js'
import { medidasDelTecho } from './techo.js'

/**
 * Dónde va el logo del local en la escena (sobre el techo) y cuándo se dibuja.
 *
 * Todo en metros. El logo se construye de 1 m de ancho (ver `logoDelLocal.js`) y
 * la escena lo escala a su `ancho`; su cara de atrás está en z = 0 del grupo y
 * la de adelante mira a +Z, hacia la cámara de la vista general.
 */

/** El ancho del logo del techo, en metros (el alto es 2/3). */
export const ANCHO_DEL_LOGO = { techo: 4.2 }

/** Cuánto se separa el logo de la losa del techo: lo que mide la parte baja de los soportes. */
export const ALTURA_DE_LOS_SOPORTES = 0.15

/** Cuánto se mete el logo desde el borde delantero del techo, para que sus soportes pisen la losa. */
export const RETIRO_DEL_BORDE = 0.35

/** Lo que mide el SVG de ancho y de alto: la proporción del logo es la de su dibujo. */
const PROPORCION = 400 / 600

/** El alto de un logo de ese ancho. */
export const altoDelLogo = (ancho) => ancho * PROPORCION

/**
 * Qué se dibuja según el estado del logo (ver `useLogoDelLocal`).
 *
 * El logo va solo sobre el techo, y la pared del fondo lleva siempre el letrero
 * de texto. Mientras el logo carga, o si no carga, no se dibuja nada en el techo.
 */
export function queSeDibujaDelLogo(estado) {
  return { techo: estado === 'listo' }
}

/**
 * Dónde va el logo del techo: de pie sobre la losa, pegado a su borde delantero
 * y centrado a lo ancho. `position` es el centro del logo.
 */
export function colocacionDelLogoDelTecho(ancho = ANCHO_DEL_LOGO.techo) {
  const { centro, fondo } = medidasDelTecho()
  const alto = altoDelLogo(ancho)
  const arribaDeLaLosa = TECHO.alto + TECHO.grosor
  return {
    ancho,
    alto,
    arribaDeLaLosa,
    position: [centro[0], arribaDeLaLosa + ALTURA_DE_LOS_SOPORTES + alto / 2, centro[2] + fondo / 2 - RETIRO_DEL_BORDE],
  }
}

/** Cuánto sube el borde de abajo del óvalo al alejarse `x` del centro (es una elipse). */
function subidaDelOvalo(x, ancho, alto) {
  const t = Math.min(1, Math.abs(x) / (ancho / 2))
  return (alto / 2) * (1 - Math.sqrt(1 - t * t))
}

/**
 * Los dos soportes del logo del techo, en una sola geometría: dos tacos que
 * suben desde la losa hasta tocar el borde de abajo del óvalo. Medidos desde la
 * losa (y = 0) y centrados en x = 0, con el fondo del logo en z = 0.
 */
export function geometriaDeLosSoportes(ancho = ANCHO_DEL_LOGO.techo) {
  const alto = altoDelLogo(ancho)
  const x = ancho * 0.28
  const grosor = 0.12
  const piezas = [-x, x].map((cx) => {
    const altura = ALTURA_DE_LOS_SOPORTES + subidaDelOvalo(cx, ancho, alto) + 0.02
    return new BoxGeometry(grosor, altura, grosor).translate(cx, altura / 2, grosor / 2 - 0.02)
  })
  const juntas = mergeGeometries(piezas)
  piezas.forEach((g) => g.dispose())
  return juntas
}
