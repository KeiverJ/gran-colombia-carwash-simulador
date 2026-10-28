import { readdirSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

/**
 * La escena no pide nada a internet: ni modelos, ni luces, ni fuentes.
 *
 * Tres cosas de las librerías lo harían sin avisar:
 * - `useGLTF` de drei decodifica con Draco, cuyo decodificador se descarga por
 *   defecto de `gstatic.com`;
 * - `DRACOLoader` hace lo mismo;
 * - `Environment` de drei con `preset` o `files` descarga un mapa de luz de un
 *   servidor externo (con `Lightformers` de hijos, que es lo que se usa, no).
 * Y cualquier URL `http` escrita en el código sería una petición externa.
 */

const CARPETA = 'src/scene'

/** El código de un archivo sin sus comentarios (donde sí se pueden nombrar estas cosas). */
function sinComentarios(texto) {
  return texto
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|\s)\/\/.*$/gm, '$1')
}

const archivos = readdirSync(CARPETA).filter(
  (nombre) => /\.(js|jsx)$/.test(nombre) && !/\.test\./.test(nombre),
)

describe('src/scene no usa nada que pida recursos a internet', () => {
  it('hay archivos que revisar', () => {
    expect(archivos.length).toBeGreaterThan(5)
  })

  it.each([
    ['useGLTF de drei', /\buseGLTF\b/],
    ['DRACOLoader', /\bDRACOLoader\b/],
    ['draco', /draco/i],
    ['un Environment con preset', /\bpreset\s*=/],
    ['un Environment con archivos (files=)', /\bfiles\s*=/],
    ['una URL http(s)', /https?:\/\//],
  ])('ningún archivo usa %s', (_nombre, patron) => {
    for (const nombre of archivos) {
      const codigo = sinComentarios(readFileSync(`${CARPETA}/${nombre}`, 'utf8'))
      expect(codigo, nombre).not.toMatch(patron)
    }
  })

  it('el cargador de modelos usa el GLTFLoader y el decodificador Meshopt de three', () => {
    const codigo = readFileSync(`${CARPETA}/cargaDeModelos.js`, 'utf8')
    expect(codigo).toMatch(/from 'three\/examples\/jsm\/loaders\/GLTFLoader\.js'/)
    expect(codigo).toMatch(/from 'three\/examples\/jsm\/libs\/meshopt_decoder\.module\.js'/)
  })
})
