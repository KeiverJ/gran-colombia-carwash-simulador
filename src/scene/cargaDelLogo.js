import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader.js'

import { RUTA_DEL_LETRERO, RUTA_DEL_LOGO } from '../data/logo.js'
import {
  CAPAS_DEL_LETRERO,
  MEDIDA_DEL_LETRERO,
  REBAJA_DEL_CONTORNO_DEL_LETRERO,
  TOPE_DE_TRIANGULOS,
  construirLogo,
  liberarLogo,
} from './logoDelLocal.js'

/**
 * Carga del logo del local (`public/logo-gran-colombia.svg`) y de su versión
 * horizontal, el letrero de la pared (`public/logo-gran-colombia-horizontal.svg`).
 *
 * Todo sale de la propia aplicación, sin pedir nada a internet:
 * - el lector es el `SVGLoader` de `three`;
 * - la ruta parte de la base de Vite, así que funciona también en GitHub Pages.
 *
 * Un logo que no carga no es un error: se devuelve `null` y la escena sigue sin
 * él (el techo sin logo; la pared con su letrero de texto), sin avisar en pantalla.
 */

export { RUTA_DEL_LETRERO, RUTA_DEL_LOGO }

/**
 * Lee el SVG y construye el logo (de 1 m de ancho: la escena lo escala).
 * Devuelve `null` si el archivo no se puede pedir o leer, si no trae lo que la
 * tabla de capas espera o si tiene más triángulos que el tope.
 *
 * @param {string} [ruta]
 * @param {{ loadAsync: (ruta: string) => Promise<{ paths: Array }> }} [cargador]
 * @param {object} [opciones] se pasan a `construirLogo` (`capas`, `medida`) y `tope`
 */
export async function leerLogo(ruta = RUTA_DEL_LOGO, cargador = new SVGLoader(), opciones = {}) {
  const { tope = TOPE_DE_TRIANGULOS, ...paraConstruir } = opciones
  try {
    const { paths } = await cargador.loadAsync(ruta)
    const logo = construirLogo(paths, { ...paraConstruir, ancho: 1 })
    if (logo.triangulos > tope) {
      liberarLogo(logo)
      throw new Error(`El logo tiene ${logo.triangulos} triángulos y el tope es ${tope}`)
    }
    return logo
  } catch (error) {
    if (import.meta.env.DEV) console.warn(`No se pudo cargar el logo ${ruta}:`, error)
    return null
  }
}

/**
 * Lee la versión horizontal del logo y construye el letrero de la pared, de 1 m
 * de ancho. Igual que `leerLogo`, devuelve `null` si algo falla.
 *
 * @param {string} [ruta]
 * @param {{ loadAsync: (ruta: string) => Promise<{ paths: Array }> }} [cargador]
 * @param {object} [opciones] se pasan a `leerLogo` (`capas`, `medida`, `rebaja`, `tope`)
 */
export function leerLetrero(ruta = RUTA_DEL_LETRERO, cargador = new SVGLoader(), opciones = {}) {
  return leerLogo(ruta, cargador, {
    capas: CAPAS_DEL_LETRERO,
    medida: MEDIDA_DEL_LETRERO,
    rebaja: REBAJA_DEL_CONTORNO_DEL_LETRERO,
    ...opciones,
  })
}

/** Las promesas pedidas: cada archivo se pide una sola vez en toda la vida de la página. */
const pedidos = new Map()

function unaSolaVez(clave, leer) {
  if (!pedidos.has(clave)) pedidos.set(clave, Promise.resolve().then(leer).catch(() => null))
  return pedidos.get(clave)
}

/** El logo, pedido una sola vez; si falló, sigue siendo `null` sin reintentar. */
export function cargarLogoUnaVez(leer = leerLogo) {
  return unaSolaVez('logo', leer)
}

/** El letrero horizontal de la pared, pedido una sola vez; si falló, sigue siendo `null`. */
export function cargarLetreroUnaVez(leer = leerLetrero) {
  return unaSolaVez('letrero', leer)
}

/** Olvida lo pedido (para las pruebas). */
export function olvidarElLogo() {
  pedidos.clear()
}
