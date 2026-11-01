import { BoxGeometry } from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

import { TECHO } from './posiciones.js'
import { medidasDelTecho } from './techo.js'

/**
 * Dónde va el logo del local en la escena y qué se dibuja en cada estado.
 *
 * Todo en metros. El logo se construye de 1 m de ancho (ver `logoDelLocal.js`) y
 * cada copia lo escala a su `ancho`; su cara de atrás está en z = 0 del grupo y
 * la de adelante mira a +Z, hacia la cámara de la vista general.
 */

/** El ancho del logo del techo y del de la pared, en metros (el alto es 2/3). */
export const ANCHO_DEL_LOGO = { techo: 4.2, pared: 2.4 }

/** A qué altura del piso queda el borde de abajo del logo de la pared: bajo, porque el borde del techo tapa la parte de arriba de la pared en la vista general. */
export const BORDE_DE_ABAJO_DEL_LOGO_DE_LA_PARED = 0.15

/** Cuánto se separa el logo de la losa del techo: lo que mide la parte baja de los soportes. */
export const ALTURA_DE_LOS_SOPORTES = 0.15

/** Cuánto se mete el logo desde el borde delantero del techo, para que sus soportes pisen la losa. */
export const RETIRO_DEL_BORDE = 0.35

/** Cuánto se separa de la pared el logo de la pared, para no solaparse con ella. */
export const SEPARACION_DE_LA_PARED = 0.02

/** Lo que mide el SVG de ancho y de alto: la proporción del logo es la de su dibujo. */
const PROPORCION = 400 / 600

/** El alto de un logo de ese ancho. */
export const altoDelLogo = (ancho) => ancho * PROPORCION

/**
 * Qué se dibuja según el estado del logo (ver `useLogoDelLocal`).
 *
 * - cargando: nada. Así el letrero negro no parpadea antes de dar paso al logo.
 * - listo: el logo en la pared y en el borde del techo.
 * - fallo: el letrero de texto de siempre en la pared, y nada en el techo.
 */
export function queSeDibujaDelLogo(estado) {
  if (estado === 'listo') return { pared: 'logo', techo: true }
  if (estado === 'fallo') return { pared: 'letrero', techo: false }
  return { pared: 'nada', techo: false }
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

/**
 * Dónde va el logo de la pared, en el tramo macizo que va de `desde` a `hasta`
 * (en x), a ras de abajo de la pared.
 */
export function colocacionDelLogoDeLaPared({ z, grosor }, desde, hasta) {
  const ancho = Math.min(ANCHO_DEL_LOGO.pared, hasta - desde - 1)
  return {
    ancho,
    alto: altoDelLogo(ancho),
    position: [
      (desde + hasta) / 2,
      BORDE_DE_ABAJO_DEL_LOGO_DE_LA_PARED + altoDelLogo(ancho) / 2,
      z + grosor / 2 + SEPARACION_DE_LA_PARED,
    ],
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
