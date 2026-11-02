import { readFileSync } from 'node:fs'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import Capa from './Capa.jsx'
import { IconoDeAjustes } from './iconos.jsx'
import { EncabezadoDeLaAyuda } from './RecuadroDeAyuda.jsx'

/**
 * Los encabezados de Ajustes, Resultados y Ayuda llevan un ícono sencillo delante del
 * título. Es decorativo: una ayuda técnica sigue leyendo solo el título, y el foco de la
 * Ayuda (que va al primer botón del recuadro) no cambia.
 */

/** Lo que lee una ayuda técnica de un trozo de HTML: el texto, sin los SVG marcados como ocultos. */
const textoLeido = (html) =>
  html
    .replace(/<svg[^>]*aria-hidden="true"[\s\S]*?<\/svg>/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim()

const titulo = (html) => html.match(/<h2[^>]*>[\s\S]*?<\/h2>/)[0]

describe('el encabezado de Ajustes', () => {
  const html = renderToStaticMarkup(
    <Capa id="capa-de-ajustes" lado="izquierda" titulo="Ajustes" Icono={IconoDeAjustes} fase="visible" alCerrar={() => {}} />,
  )

  it('lleva el ícono delante del título, oculto para las ayudas técnicas', () => {
    const h2 = titulo(html)
    expect(h2).toMatch(/^<h2[^>]*><svg[^>]*aria-hidden="true"[^>]*focusable="false"/)
    expect(textoLeido(h2)).toBe('Ajustes')
  })

  it('la capa sigue llamándose «Ajustes» para las ayudas técnicas', () => {
    expect(html).toContain('aria-label="Ajustes"')
  })

  it('sin ícono, el título queda como antes', () => {
    const sin = renderToStaticMarkup(
      <Capa id="x" lado="izquierda" titulo="Otra" fase="visible" alCerrar={() => {}} />,
    )
    expect(titulo(sin)).not.toContain('<svg')
    expect(textoLeido(titulo(sin))).toBe('Otra')
  })
})

describe('el encabezado de la Ayuda', () => {
  const html = renderToStaticMarkup(<EncabezadoDeLaAyuda onCerrar={() => {}} />)

  it('lleva el ícono delante de «Ayuda» y el título conserva su id', () => {
    const h2 = titulo(html)
    expect(h2).toContain('id="ayuda-titulo"')
    expect(h2).toMatch(/<svg[^>]*aria-hidden="true"/)
    expect(textoLeido(h2)).toBe('Ayuda')
  })

  it('el primer botón del encabezado sigue siendo «Cerrar» (donde se pone el foco al abrir)', () => {
    const primerBoton = html.match(/<button[\s\S]*?<\/button>/)[0]
    expect(textoLeido(primerBoton)).toBe('Cerrar')
    // y el ícono no es una parada de foco
    expect(html.match(/<svg[^>]*>/g).every((svg) => svg.includes('focusable="false"'))).toBe(true)
  })
})

describe('el encabezado de Resultados', () => {
  const fuente = readFileSync('src/components/PanelDeResultados.jsx', 'utf8')

  it('lleva el ícono de resultados delante del título, y el panel sigue llamándose «Resultados»', () => {
    expect(fuente).toMatch(/<h2 className="titulo-con-icono">\s*<IconoDeResultados \/>\s*Resultados\s*<\/h2>/)
    expect(fuente).toContain('aria-label="Resultados"')
  })
})
