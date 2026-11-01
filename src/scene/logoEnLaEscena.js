import { BoxGeometry } from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

import { TECHO } from './posiciones.js'
import { medidasDelTecho } from './techo.js'

/**
 * Dónde van el logo del local (sobre el techo) y su versión horizontal (el letrero
 * de la pared) en la escena, y cuándo se dibuja cada uno.
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
 * Qué lleva la pared del fondo según el estado del letrero horizontal.
 *
 * - cargando: nada, para que el letrero de texto no parpadee antes de dar paso al logo.
 * - listo: el letrero horizontal en 3D.
 * - fallo: el letrero de texto de siempre.
 */
export function queSeDibujaEnLaPared(estado) {
  if (estado === 'listo') return 'letrero-3d'
  if (estado === 'fallo') return 'letrero-de-texto'
  return 'nada'
}

/**
 * Cómo se ajusta el letrero horizontal a la franja de pared que se ve en la vista
 * general: la que queda entre los puestos y el borde de adelante del techo, que
 * tapa lo de arriba. Mide cerca de 1 m de alto, así que el alto manda y el ancho
 * sale de la proporción del dibujo (880 × 210). El centro va en el del tramo
 * macizo de la pared, donde estaba el letrero de texto.
 */
export const LETRERO_DE_LA_PARED = { alto: 1, bordeDeAbajo: 0.6, separacion: 0.02 }

/** La proporción del letrero horizontal: 880 × 210. */
const PROPORCION_DEL_LETRERO = 880 / 210

/**
 * Dónde va el letrero horizontal en el tramo macizo de la pared que va de `desde`
 * a `hasta` (en x). `position` es el centro del letrero y `ancho` lo que mide.
 */
export function colocacionDelLetreroDeLaPared({ z, grosor }, desde, hasta) {
  const { alto, bordeDeAbajo, separacion } = LETRERO_DE_LA_PARED
  const ancho = Math.min(alto * PROPORCION_DEL_LETRERO, hasta - desde - 1)
  const altoReal = ancho / PROPORCION_DEL_LETRERO
  return {
    ancho,
    alto: altoReal,
    position: [(desde + hasta) / 2, bordeDeAbajo + altoReal / 2, z + grosor / 2 + separacion],
  }
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
