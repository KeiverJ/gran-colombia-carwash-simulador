import { readFileSync, statSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

/**
 * Los archivos del logo (`public/logo-gran-colombia.svg` y `public/favicon.svg`)
 * se abren como texto: la escena depende de que tengan exactamente los
 * elementos que su tabla de capas espera, y de que no traigan nada que pida
 * recursos a internet o que `SVGLoader` no sepa dibujar.
 */
const LOGO = readFileSync('public/logo-gran-colombia.svg', 'utf8')
const FAVICON = readFileSync('public/favicon.svg', 'utf8')
const LETRERO = readFileSync('public/logo-gran-colombia-horizontal.svg', 'utf8')

// Topes de tamaño, un poco por encima de lo que pesan hoy. Antes se comparaban con los originales
// de `docs/referencias/`, que git no sube; así la prueba pasa también en un clon limpio.
const TOPE_DEL_LOGO = 28_000
const TOPE_DEL_LETRERO = 24_000

/** Los elementos que dibujan, en orden, con sus atributos. */
function elementosDelSvg(texto) {
  return [...texto.matchAll(/<(ellipse|circle|path|polygon|rect)\b([^>]*?)\/?>/g)].map(([, nombre, resto]) => {
    const atributos = Object.fromEntries([...resto.matchAll(/([\w:-]+)="([^"]*)"/g)].map(([, k, v]) => [k, v]))
    return { nombre, ...atributos }
  })
}

/** Lo que el logo debe dibujar, en su orden: elemento, relleno y contorno. */
const ESPERADO = [
  ['ellipse', '#ffffff', '#0B1F4D'],
  ['ellipse', '#1F3FA6', undefined],
  ...Array.from({ length: 6 }, () => ['circle', 'none', '#ffffff']),
  ['path', 'none', '#ffffff'],
  ['path', '#FFD21F', '#0B1F4D'],
  ['polygon', '#ffffff', '#0B1F4D'],
  ['path', '#ffffff', '#0B1F4D'],
  ['path', '#E11D2A', undefined],
  ['path', '#E11D2A', undefined],
]

describe('public/logo-gran-colombia.svg', () => {
  it('es un SVG de 600 × 400 sin nada que no dibuje', () => {
    expect(LOGO).toMatch(/^<svg [^>]*viewBox="0 0 600 400"/)
    expect(LOGO.trimEnd()).toMatch(/<\/svg>$/)
    for (const prohibido of ['<metadata', '<text', '<image', '<linearGradient', '<radialGradient', '<style', '<script', '<use']) {
      expect(LOGO, prohibido).not.toContain(prohibido)
    }
  })

  it('no pide nada a internet', () => {
    expect(LOGO).not.toMatch(/href\s*=/i)
    expect(LOGO).not.toMatch(/url\(/i)
    // El único https:// permitido sería el espacio de nombres del propio SVG.
    expect(LOGO.replace('http://www.w3.org/2000/svg', '')).not.toMatch(/https?:\/\//)
  })

  it('dibuja 2 elipses, 6 círculos, 5 trazados y 1 polígono', () => {
    const cuenta = (nombre) => elementosDelSvg(LOGO).filter((e) => e.nombre === nombre).length
    expect([cuenta('ellipse'), cuenta('circle'), cuenta('path'), cuenta('polygon')]).toEqual([2, 6, 5, 1])
  })

  it('los elementos van en el orden y con los colores que espera la escena', () => {
    const real = elementosDelSvg(LOGO).map((e) => [e.nombre, e.fill, e.stroke])
    expect(real).toEqual(ESPERADO)
  })

  it('sigue siendo ligero: no pasa de los 28 000 caracteres (hoy pesa 26 404 bytes)', () => {
    expect(LOGO.length).toBeLessThan(TOPE_DEL_LOGO)
  })
})

describe('public/favicon.svg', () => {
  it('es el logo sin texto: óvalo, burbujas y línea del carro', () => {
    const elementos = elementosDelSvg(FAVICON)
    expect(elementos.map((e) => e.nombre)).toEqual([
      'ellipse',
      'ellipse',
      ...Array(6).fill('circle'),
      'path',
    ])
    expect(FAVICON).not.toContain('<text')
    expect(FAVICON).not.toContain('<polygon')
  })

  it('pesa menos de 4 KB y no pide nada a internet', () => {
    expect(statSync('public/favicon.svg').size).toBeLessThan(4096)
    expect(FAVICON).not.toMatch(/href\s*=|url\(/i)
  })

  it('index.html lo enlaza con una ruta que Vite resuelve con la base', () => {
    const html = readFileSync('index.html', 'utf8')
    expect(html).toMatch(/<link rel="icon" type="image\/svg\+xml" href="\/favicon\.svg"/)
  })
})

/** Lo que dibuja el logo horizontal, en su orden: elemento, relleno y contorno. */
const ESPERADO_DEL_LETRERO = [
  ['rect', '#ffffff', '#0B1F4D'],
  ['rect', '#1F3FA6', undefined],
  ...Array.from({ length: 5 }, () => ['circle', 'none', '#ffffff']),
  ['path', '#FFD21F', '#0B1F4D'],
  ['polygon', '#ffffff', '#0B1F4D'],
  ['path', '#ffffff', '#0B1F4D'],
  ['path', '#E11D2A', undefined],
  ['path', '#E11D2A', undefined],
]

describe('public/logo-gran-colombia-horizontal.svg', () => {
  it('es un SVG de 880 × 210 sin nada que no dibuje', () => {
    expect(LETRERO).toMatch(/^<svg [^>]*viewBox="0 0 880 210"/)
    expect(LETRERO.trimEnd()).toMatch(/<\/svg>$/)
    for (const prohibido of ['<metadata', '<text', '<image', '<linearGradient', '<radialGradient', '<style', '<script', '<use', '<g ', 'transform=']) {
      expect(LETRERO, prohibido).not.toContain(prohibido)
    }
  })

  it('no pide nada a internet', () => {
    expect(LETRERO).not.toMatch(/href\s*=/i)
    expect(LETRERO).not.toMatch(/url\(/i)
    expect(LETRERO.replace('http://www.w3.org/2000/svg', '')).not.toMatch(/https?:\/\//)
  })

  it('dibuja 2 rectángulos, 5 círculos, 4 trazados y 1 polígono', () => {
    const cuenta = (nombre) => elementosDelSvg(LETRERO).filter((e) => e.nombre === nombre).length
    expect([cuenta('rect'), cuenta('circle'), cuenta('path'), cuenta('polygon')]).toEqual([2, 5, 4, 1])
  })

  it('los elementos van en el orden y con los colores que espera la escena, los mismos del logo', () => {
    const real = elementosDelSvg(LETRERO).map((e) => [e.nombre, e.fill, e.stroke])
    expect(real).toEqual(ESPERADO_DEL_LETRERO)
    // Mismos colores que el logo redondo.
    const coloresDe = (texto) => new Set(elementosDelSvg(texto).flatMap((e) => [e.fill, e.stroke]).filter((c) => c && c !== 'none'))
    expect(coloresDe(LETRERO)).toEqual(coloresDe(LOGO))
  })

  it('sigue siendo ligero: no pasa de los 24 000 caracteres (hoy pesa 22 462 bytes)', () => {
    expect(LETRERO.length).toBeLessThan(TOPE_DEL_LETRERO)
  })
})
