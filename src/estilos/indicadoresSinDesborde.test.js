import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

/**
 * El panel de indicadores no debe salirse de su contenedor. Sin navegador no se puede medir,
 * así que aquí se comprueban las reglas de la hoja que lo evitan; la medida real se hizo en
 * Edge (ver el cambio `publicar`).
 *
 * La causa de antes: a 768 px de ancho, con la capa de Ajustes abierta, el panel solo tenía
 * 336 px de espacio y sus tres grupos (Lavado, Acabado y Salieron) en una fila necesitaban
 * 348,5 px con cifras cortas y bastante más con cifras largas (una corrida de 5000 h con 3
 * puestos deja «14.250» motos en la fila 2): el panel se salía de su contenedor y su borde
 * derecho pasaba del de la ventana. Con más espacio (900 px o más, o sin capa abierta) el
 * panel cabe sin ayuda.
 * La corrección: el contenedor de los indicadores es un contenedor de consulta y, con 46 rem o
 * menos de espacio, en pantallas de 768 px o más, los grupos pasan a la fila siguiente si no
 * caben, con los rellenos y separaciones del celular (`--espacio-2`).
 */
const RAIZ = fileURLToPath(new URL('..', import.meta.url))
const css = readFileSync(join(RAIZ, 'scene', 'escena.css'), 'utf8')

/** El cuerpo de la primera regla con ese selector exacto, a nivel de la hoja. */
function regla(selector) {
  const escapado = selector.replace(/[.+]/g, '\\$&')
  const inicio = css.search(new RegExp(`^${escapado}\\s*\\{`, 'm'))
  expect(inicio, `no hay una regla ${selector}`).toBeGreaterThanOrEqual(0)
  return css.slice(css.indexOf('{', inicio) + 1, css.indexOf('}', inicio))
}

/** El bloque de un @container (con sus reglas dentro). */
function bloqueContainer(consulta) {
  const inicio = css.indexOf(`@container ${consulta}`)
  expect(inicio, `no hay @container ${consulta}`).toBeGreaterThanOrEqual(0)
  let hondura = 0
  for (let i = css.indexOf('{', inicio); i < css.length; i += 1) {
    if (css[i] === '{') hondura += 1
    if (css[i] === '}') {
      hondura -= 1
      if (hondura === 0) return css.slice(css.indexOf('{', inicio) + 1, i)
    }
  }
  throw new Error('bloque sin cerrar')
}

describe('el panel de indicadores no se sale de su contenedor', () => {
  it('el contenedor de los indicadores mide su propio espacio con una consulta de contenedor', () => {
    expect(regla('.indicadores')).toMatch(/container-type:\s*inline-size/)
  })

  it('el panel no ocupa más que su contenedor ni se estira', () => {
    expect(regla('.indicadores-panel')).toMatch(/max-width:\s*100%/)
  })

  it('con 46 rem o menos de espacio y desde 768 px los grupos pueden pasar a otra fila', () => {
    expect(css, 'la consulta de contenedor va dentro de @media (min-width: 768px)').toMatch(
      /@media \(min-width: 768px\) \{\s*@container \(max-width: 46rem\)/,
    )
    const bloque = bloqueContainer('(max-width: 46rem)')
    expect(bloque).toMatch(/\.indicadores-panel\s*\{[^}]*flex-wrap:\s*wrap/)
    expect(bloque).toMatch(/\.indicadores-panel\s*\{[^}]*gap:\s*var\(--espacio-2\)/)
    expect(bloque).toMatch(/\.indicadores-panel\s*\{[^}]*padding:\s*var\(--espacio-2\)/)
    expect(bloque).toMatch(/\.medidas\s*\{[^}]*gap:\s*var\(--espacio-2\)/)
    expect(bloque).toMatch(/\.medida-valor\s*\{[^}]*font-size:\s*var\(--letra-titulo\)/)
  })

  it('al pasar a otra fila no quedan líneas verticales sueltas', () => {
    const bloque = bloqueContainer('(max-width: 46rem)')
    const separador = /\.indicadores-grupo \+ \.indicadores-grupo\s*\{([^}]*)\}/.exec(bloque)?.[1] ?? ''
    expect(separador).toMatch(/margin-left:\s*0/)
    expect(separador).toMatch(/padding-left:\s*0/)
    expect(separador).toMatch(/border-left:\s*0/)
  })

  it('el umbral cubre el espacio de 336 px que queda a 768 px con Ajustes abierto', () => {
    const umbral = Number(/@container \(max-width:\s*([\d.]+)rem\)/.exec(css)?.[1])
    expect(umbral * 16).toBeGreaterThanOrEqual(336)
  })

  it('los grupos pueden encogerse y las cifras no se parten', () => {
    expect(regla('.indicadores-grupo')).toMatch(/min-width:\s*0/)
    expect(regla('.medida')).toMatch(/min-width:\s*0/)
    expect(regla('.medida-valor')).toMatch(/white-space:\s*nowrap/)
  })
})
