import { existsSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

import { CREDITOS_DE_AMBIENTE, CREDITOS_DE_MODELOS } from '../data/creditosDeModelos.js'

const README = readFileSync('README.md', 'utf8')

describe('los créditos del README', () => {
  it('nombran a los 15 modelos de ambiente con su autor, su licencia y su enlace', () => {
    for (const { titulo, autor, licencia, url } of CREDITOS_DE_AMBIENTE) {
      expect(README, `${titulo} de ${autor}`).toContain(`[${titulo}](${url}) de ${autor} ([${licencia}]`)
    }
  })

  it('siguen nombrando a las seis motos', () => {
    for (const { titulo, autor, url } of CREDITOS_DE_MODELOS) {
      expect(README, `${titulo} de ${autor}`).toContain(`[${titulo}](${url}) de ${autor}`)
    }
  })

  it('no dicen «por confirmar» ni nombran los modelos que no se usan', () => {
    expect(README.toLowerCase()).not.toContain('por confirmar')
    expect(README).not.toContain('fbDxapxkwY9')
    expect(README.toLowerCase()).not.toContain('macross')
  })

  it('coinciden con la Ayuda: los mismos 21 enlaces de Poly Pizza', () => {
    const enlaces = README.match(/https:\/\/poly\.pizza\/m\/[\w-]+/g) ?? []
    expect(new Set(enlaces).size).toBe(CREDITOS_DE_MODELOS.length + CREDITOS_DE_AMBIENTE.length)
  })
})

describe('los archivos de los modelos', () => {
  it('existen los de las motos y los de ambiente', () => {
    for (const { archivo } of CREDITOS_DE_MODELOS) expect(existsSync(`public/modelos/${archivo}`)).toBe(true)
    for (const { archivo } of CREDITOS_DE_AMBIENTE) expect(existsSync(`public/modelos/ambiente/${archivo}`)).toBe(true)
  })
})
