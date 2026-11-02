import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

import { CREDITO_DE_INTER, CREDITOS_DE_FUENTES, LICENCIA_DE_LAS_FUENTES } from './creditosDeFuentes.js'

describe('los créditos de las fuentes del logo', () => {
  it('son Anton y Pacifico', () => {
    expect(CREDITOS_DE_FUENTES.map((f) => f.nombre)).toEqual(['Anton', 'Pacifico'])
  })

  it.each(CREDITOS_DE_FUENTES.map((f) => [f.nombre, f]))('%s tiene autor, licencia y enlaces https', (_n, fuente) => {
    expect(fuente.autor.length).toBeGreaterThan(0)
    expect(fuente.licencia).toBe(LICENCIA_DE_LAS_FUENTES.nombre)
    expect(fuente.url).toMatch(/^https:\/\//)
    expect(fuente.urlDeLaLicencia).toBe(LICENCIA_DE_LAS_FUENTES.url)
    expect(fuente.urlDeLaLicencia).toMatch(/^https:\/\//)
  })

  it('la licencia es la OFL con su enlace', () => {
    expect(LICENCIA_DE_LAS_FUENTES.nombre).toContain('Open Font License')
    expect(LICENCIA_DE_LAS_FUENTES.url).toMatch(/^https:\/\//)
  })
})

describe('el crédito de Inter', () => {
  it('tiene autor, licencia y enlaces https, y no se mezcla con las fuentes del logo', () => {
    expect(CREDITO_DE_INTER.nombre).toBe('Inter')
    expect(CREDITO_DE_INTER.autor.length).toBeGreaterThan(0)
    expect(CREDITO_DE_INTER.licencia).toBe(LICENCIA_DE_LAS_FUENTES.nombre)
    expect(CREDITO_DE_INTER.url).toMatch(/^https:\/\//)
    expect(CREDITO_DE_INTER.urlDeLaLicencia).toBe(LICENCIA_DE_LAS_FUENTES.url)
    expect(CREDITOS_DE_FUENTES.map((f) => f.nombre)).not.toContain('Inter')
  })

  it('coincide con el OFL.txt que viaja con la fuente', () => {
    const licencia = readFileSync('public/fuentes/OFL.txt', 'utf8')
    expect(licencia).toContain(CREDITO_DE_INTER.autor)
    expect(licencia).toContain(CREDITO_DE_INTER.url)
    expect(licencia).toContain('SIL OPEN FONT LICENSE Version 1.1')
  })
})

describe('el README', () => {
  const readme = readFileSync('README.md', 'utf8')

  it('tiene una sección de créditos con las dos fuentes y su licencia', () => {
    expect(readme).toMatch(/^## Créditos/m)
    for (const { nombre, autor } of CREDITOS_DE_FUENTES) {
      expect(readme, nombre).toContain(nombre)
      expect(readme, autor).toContain(autor)
    }
    expect(readme).toContain(LICENCIA_DE_LAS_FUENTES.nombre)
    expect(readme).toContain(LICENCIA_DE_LAS_FUENTES.url)
  })

  it('aclara que el texto del logo ya viene en trazos', () => {
    expect(readme).toMatch(/trazos/)
  })
})
