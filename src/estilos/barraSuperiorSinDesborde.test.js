import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

/**
 * La barra superior no debe ensanchar la página. Sin navegador no se puede medir
 * `scrollWidth <= clientWidth`, así que aquí se comprueban las reglas de la hoja
 * que lo evitan; la medida real (a 390, 768, 1024, 1100, 1199, 1200, 1280 y 1440 px, con
 * 14 placas, 7 puestos y 4999 h en el reloj) se hizo en el navegador.
 *
 * La causa de antes: entre 768 y 1199 px la caja de la velocidad medía 4,5 rem, pero
 * su texto («Velocidad 120,00 min/s», sin partir) medía más y se salía por la derecha.
 */
const RAIZ = fileURLToPath(new URL('..', import.meta.url))
const css = readFileSync(join(RAIZ, 'components', 'interfaz.css'), 'utf8')

/** El cuerpo de la primera regla que empieza con ese selector, a nivel de la hoja. */
function regla(selector) {
  const inicio = css.search(new RegExp(`^${selector.replace(/[.]/g, '\\.')}\\s*\\{`, 'm'))
  expect(inicio, `no hay una regla ${selector}`).toBeGreaterThanOrEqual(0)
  return css.slice(css.indexOf('{', inicio) + 1, css.indexOf('}', inicio))
}

/** El bloque de un @media (con sus reglas dentro). */
function bloqueMedia(consulta) {
  const inicio = css.indexOf(`@media ${consulta}`)
  expect(inicio, `no hay @media ${consulta}`).toBeGreaterThanOrEqual(0)
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

describe('la barra superior no ensancha la página', () => {
  it('lo que ocupa la barra no se encoge y lo que cede es el título', () => {
    for (const selector of ['.barra-derecha', '.selector-de-modo', '.velocidad']) {
      expect(regla(selector), selector).toMatch(/flex:\s*none/)
    }
    expect(regla('.marca')).toMatch(/min-width:\s*0/)
    expect(regla('.marca h1')).toMatch(/text-overflow:\s*ellipsis/)
  })

  it('entre 768 y 1199 px la caja de la velocidad deja sitio al valor entero', () => {
    const compacto = bloqueMedia('(max-width: 1199px)')
    const ancho = compacto.match(/\.velocidad\s*\{[^}]*width:\s*([\d.]+)rem/)
    expect(ancho, 'la regla de .velocidad en el bloque compacto').not.toBeNull()
    // «120,00 min/s» a 12 px mide unos 5,5 rem; con menos se sale de la caja.
    expect(Number(ancho[1])).toBeGreaterThanOrEqual(5.5)
    // y la palabra «Velocidad» se queda solo para las ayudas técnicas
    expect(compacto).toMatch(/\.velocidad-nombre\s*\{[^}]*position:\s*absolute/)
  })

  it('el reloj no se parte ni se encoge', () => {
    expect(regla('.reloj-de-la-barra')).toMatch(/white-space:\s*nowrap/)
  })
})
