import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader.js'

import { RUTA_DEL_LOGO } from '../data/logo.js'
import { TOPE_DE_TRIANGULOS, construirLogo, liberarLogo } from './logoDelLocal.js'

/**
 * Carga del logo del local (`public/logo-gran-colombia.svg`).
 *
 * Todo sale de la propia aplicación, sin pedir nada a internet:
 * - el lector es el `SVGLoader` de `three`;
 * - la ruta parte de la base de Vite, así que funciona también en GitHub Pages.
 *
 * Un logo que no carga no es un error: se devuelve `null` y la escena usa el
 * letrero de texto de la pared, sin avisar en pantalla.
 */

export { RUTA_DEL_LOGO }

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

/** La promesa del logo: se pide una sola vez en toda la vida de la página. */
let promesaDelLogo = null

/** El logo, pedido una sola vez; si falló, sigue siendo `null` sin reintentar. */
export function cargarLogoUnaVez(leer = leerLogo) {
  if (!promesaDelLogo) promesaDelLogo = Promise.resolve().then(leer).catch(() => null)
  return promesaDelLogo
}

/** Olvida el logo pedido (para las pruebas). */
export function olvidarElLogo() {
  promesaDelLogo = null
}
