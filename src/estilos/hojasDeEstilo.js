import { readdirSync, readFileSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join, relative } from 'node:path'

/**
 * Ayuda de las pruebas que leen las hojas de estilo como texto
 * (`sinAdornos.test.js`, `sinValoresSueltos.test.js`): encuentra todas las
 * hojas de la aplicación menos `tema.css`, donde viven los valores, y quita los
 * comentarios (conservando los saltos de línea) para no contar lo que explican.
 */
export const RAIZ = fileURLToPath(new URL('..', import.meta.url))
export const TEMA = join(RAIZ, 'estilos', 'tema.css')

function buscar(carpeta) {
  return readdirSync(carpeta).flatMap((nombre) => {
    const ruta = join(carpeta, nombre)
    if (statSync(ruta).isDirectory()) {
      return buscar(ruta)
    }
    return ruta.endsWith('.css') ? [ruta] : []
  })
}

/** Sin comentarios, dejando cada comentario como espacios y saltos de línea. */
export const sinComentarios = (css) =>
  css.replace(/\/\*[\s\S]*?\*\//g, (comentario) => comentario.replace(/[^\n]/g, ' '))

/** Las hojas de los componentes y de la escena (todas menos el tema), con su texto. */
export function hojasDeLaAplicacion() {
  return buscar(RAIZ)
    .filter((ruta) => ruta !== TEMA)
    .map((ruta) => ({
      nombre: relative(RAIZ, ruta),
      css: sinComentarios(readFileSync(ruta, 'utf8')),
    }))
}

export function textoDelTema() {
  return sinComentarios(readFileSync(TEMA, 'utf8'))
}
