import { readFileSync } from 'node:fs'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { hojasDeLaAplicacion } from '../estilos/hojasDeEstilo.js'
import { RUTA_DEL_LOGO } from '../data/logo.js'
import BarraSuperior from './BarraSuperior.jsx'
import { ContenidoDeLaAyuda, EncabezadoDeLaAyuda } from './RecuadroDeAyuda.jsx'

describe('el logo en la barra superior', () => {
  const html = renderToStaticMarkup(<BarraSuperior />)

  it('va a la izquierda del nombre, dentro del bloque de la marca', () => {
    const marca = html.slice(html.indexOf('class="marca"'))
    expect(marca.indexOf('<img')).toBeGreaterThan(-1)
    expect(marca.indexOf('<img')).toBeLessThan(marca.indexOf('<h1'))
  })

  it('es decorativo (sin texto alternativo) y sale del propio sitio', () => {
    const imagen = html.match(/<img [^>]*>/)[0]
    expect(imagen).toContain('alt=""')
    expect(imagen).toContain(`src="${RUTA_DEL_LOGO}"`)
    expect(RUTA_DEL_LOGO).not.toMatch(/^https?:/)
    expect(RUTA_DEL_LOGO.startsWith(import.meta.env.BASE_URL)).toBe(true)
  })

  it('el nombre de la aplicación se lee una sola vez', () => {
    expect(html.match(/Gran Colombia Car Wash Express/g)).toHaveLength(1)
  })

  it('el nombre usa el azul marino y la imagen no cambia el alto de la barra', () => {
    const hoja = hojasDeLaAplicacion().find((h) => h.nombre.includes('interfaz')).css
    expect(hoja).toMatch(/\.marca h1\s*\{[^}]*color:\s*var\(--marca-azul-marino\)/)
    expect(hoja).toMatch(/\.logo-de-marca\s*\{[^}]*height:\s*2rem/)
  })
})

describe('el logo en la Ayuda', () => {
  const html = renderToStaticMarkup(<EncabezadoDeLaAyuda onCerrar={() => {}} />)

  it('el encabezado lleva el logo junto a «Ayuda»', () => {
    expect(html).toContain('Ayuda')
    expect(html.indexOf('<img')).toBeGreaterThan(-1)
    expect(html.indexOf('<img')).toBeLessThan(html.indexOf('<h2'))
    expect(html.match(/<img [^>]*>/)[0]).toContain('alt=""')
  })

  it('el único botón del encabezado es Cerrar, así que sigue recibiendo el foco primero', () => {
    const botones = html.match(/<button[ >]/g)
    expect(botones).toHaveLength(1)
    expect(html.match(/<button[^>]*>[\s\S]*?<\/button>/)[0]).toContain('Cerrar')
  })

  it('la sección «Créditos» acredita Anton, Pacifico y la licencia OFL, además de los modelos', () => {
    const html = renderToStaticMarkup(<ContenidoDeLaAyuda />)
    const creditos = html.slice(html.indexOf('Créditos'))
    for (const palabra of ['Anton', 'Pacifico', 'SIL Open Font License 1.1', 'trazos', 'Poly Pizza', 'CC-BY 3.0']) {
      expect(creditos, palabra).toContain(palabra)
    }
  })
})

describe('el favicon y el index.html', () => {
  it('index.html no tiene el ícono de la plantilla ni pide el logo a otro sitio', () => {
    const html = readFileSync('index.html', 'utf8')
    expect(html).toContain('href="/favicon.svg"')
    expect(readFileSync('public/favicon.svg', 'utf8')).not.toContain('863bff')
  })
})
