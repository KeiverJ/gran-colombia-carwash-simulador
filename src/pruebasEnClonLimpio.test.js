import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Ninguna prueba debe leer archivos que git no sube. `docs/`, `openspec/`,
 * `modelos-candidatos/`, `.claude/` y `CLAUDE.md` están excluidos del repositorio
 * (`.git/info/exclude`): una prueba que los lea falla, o se omite sin avisar, en
 * un clon limpio. Lo que una prueba necesite comparar debe estar en `src/`,
 * `public/` o `package.json`.
 *
 * Se revisa el código de cada archivo de prueba sin sus comentarios: mencionar
 * `docs/especificacion_simulador.md` para explicar de dónde sale un dato está bien.
 */
const PROHIBIDAS = [
  { ruta: 'docs/', patron: /(^|[^\w-])docs\//u },
  { ruta: 'openspec/', patron: /(^|[^\w-])openspec\//u },
  { ruta: 'modelos-candidatos', patron: /modelos-candidatos/u },
  { ruta: '.claude/', patron: /\.claude\//u },
  { ruta: 'CLAUDE.md', patron: /CLAUDE\.md/u },
]

const ESTE_ARCHIVO = join('src', 'pruebasEnClonLimpio.test.js')

/**
 * Pruebas que nombran estas carpetas sin leerlas: la del README comprueba que el README
 * NO las mencione, así que tiene que escribir sus nombres.
 */
const EXENTAS = [join('src', 'components', 'creditosEnElReadme.test.js')]

/** Todos los archivos de prueba de `src/`. */
function archivosDePrueba(carpeta) {
  return readdirSync(carpeta).flatMap((nombre) => {
    const ruta = join(carpeta, nombre)
    if (statSync(ruta).isDirectory()) return archivosDePrueba(ruta)
    return /\.test\.jsx?$/u.test(nombre) ? [ruta] : []
  })
}

/** El código del archivo sin comentarios de bloque ni de línea. */
function sinComentarios(texto) {
  return texto.replace(/\/\*[\s\S]*?\*\//gu, '').replace(/(^|[^:])\/\/.*$/gmu, '$1')
}

/** Las rutas prohibidas que aparecen en el código de un texto, con su línea. */
export function lecturasProhibidas(texto) {
  const encontradas = []
  sinComentarios(texto)
    .split(/\r?\n/u)
    .forEach((linea, i) => {
      for (const { ruta, patron } of PROHIBIDAS) {
        if (patron.test(linea)) encontradas.push(`línea ${i + 1}: ${ruta}`)
      }
    })
  return encontradas
}

describe('las pruebas pasan en un clon limpio', () => {
  const archivos = archivosDePrueba('src').filter((ruta) => ruta !== ESTE_ARCHIVO && !EXENTAS.includes(ruta))

  it('revisa de verdad los archivos de prueba del proyecto', () => {
    expect(archivos.length).toBeGreaterThan(50)
  })

  it('ninguna prueba lee docs/, openspec/, modelos-candidatos/, .claude/ ni CLAUDE.md', () => {
    const problemas = archivos.flatMap((ruta) =>
      lecturasProhibidas(readFileSync(ruta, 'utf8')).map((cual) => `${ruta} (${cual})`),
    )
    expect(problemas, `Pruebas que leen archivos que git no sube:\n${problemas.join('\n')}`).toEqual([])
  })

  it('la prueba exenta no lee ninguna de esas carpetas con funciones de archivos', () => {
    for (const ruta of EXENTAS) {
      const codigo = readFileSync(ruta, 'utf8')
      const lectura = /(?:readFileSync|existsSync|readdirSync|statSync)\(\s*['"`][^'"`]*(?:docs\/|openspec\/|modelos-candidatos|\.claude\/|CLAUDE\.md)/
      expect(codigo).not.toMatch(lectura)
    }
  })

  it('detecta una lectura prohibida en el código', () => {
    expect(lecturasProhibidas("readFileSync('docs/referencias/logo.svg', 'utf8')")).toHaveLength(1)
    expect(lecturasProhibidas("existsSync('modelos-candidatos/enlaces.txt')")).toHaveLength(1)
    expect(lecturasProhibidas("readFileSync(join(raiz, 'CLAUDE.md'))")).toHaveLength(1)
    expect(lecturasProhibidas("readFileSync('.claude/settings.json')")).toHaveLength(1)
    expect(lecturasProhibidas("readFileSync('openspec/config.yaml')")).toHaveLength(1)
  })

  it('no se asusta con una mención en un comentario', () => {
    expect(lecturasProhibidas('// sale de docs/especificacion_simulador.md\nconst a = 1')).toEqual([])
    expect(lecturasProhibidas('/* ver docs/modelos/creditos.md */\nconst a = 1')).toEqual([])
    expect(lecturasProhibidas(" * Copiado de docs/x.md\nconst a = 1".replace(' * ', '// '))).toEqual([])
  })
})
