import { existsSync, readdirSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

import {
  CANTIDAD_DE_MODELOS,
  CREDITOS_DE_AMBIENTE,
  CREDITOS_DE_MODELOS,
  LICENCIA_CC0,
  LICENCIA_DE_LOS_MODELOS,
  lineaDeCredito,
} from './creditosDeModelos.js'

const GLB = (n) => `public/modelos/moto-${n}.glb`
const GLB_DE_AMBIENTE = (clave) => `public/modelos/ambiente/${clave}.glb`

describe('créditos de los modelos 3D', () => {
  it('hay seis, numerados del 1 al 6, cada uno con su archivo', () => {
    expect(CANTIDAD_DE_MODELOS).toBe(6)
    expect(CREDITOS_DE_MODELOS.map((c) => c.n)).toEqual([1, 2, 3, 4, 5, 6])
    for (const { n, archivo } of CREDITOS_DE_MODELOS) {
      expect(archivo).toBe(`moto-${n}.glb`)
    }
  })

  it('todos nombran al autor, la licencia CC-BY 3.0 y un enlace a Poly Pizza', () => {
    for (const c of CREDITOS_DE_MODELOS) {
      expect(c.autor.length).toBeGreaterThan(0)
      expect(c.licencia).toBe('CC-BY 3.0')
      expect(c.url).toMatch(/^https:\/\/poly\.pizza\/m\/[\w-]+$/)
      expect(c.urlDeLaLicencia).toBe('https://creativecommons.org/licenses/by/3.0/')
    }
  })

  it('cada modelo tiene su archivo en public/modelos', () => {
    for (const { n } of CREDITOS_DE_MODELOS) {
      expect(existsSync(GLB(n)), GLB(n)).toBe(true)
    }
  })
})

describe('créditos de los modelos de ambiente', () => {
  it('hay 15, sin repetidos', () => {
    expect(CREDITOS_DE_AMBIENTE).toHaveLength(15)
    for (const campo of ['clave', 'archivo', 'url']) {
      const valores = CREDITOS_DE_AMBIENTE.map((c) => c[campo])
      expect(new Set(valores).size, campo).toBe(15)
    }
  })

  it('cada uno tiene su archivo en public/modelos/ambiente', () => {
    for (const { clave, archivo } of CREDITOS_DE_AMBIENTE) {
      expect(archivo).toBe(`${clave}.glb`)
      expect(existsSync(GLB_DE_AMBIENTE(clave)), GLB_DE_AMBIENTE(clave)).toBe(true)
    }
  })

  it('nombran autor, licencia y un enlace a Poly Pizza', () => {
    for (const c of CREDITOS_DE_AMBIENTE) {
      expect(c.titulo.length).toBeGreaterThan(0)
      expect(c.autor.length).toBeGreaterThan(0)
      expect(c.url).toMatch(/^https:\/\/poly\.pizza\/m\/[\w-]+$/)
      expect([LICENCIA_DE_LOS_MODELOS.nombre, LICENCIA_CC0.nombre]).toContain(c.licencia)
    }
  })

  it('los de Quaternius y Kay Lousberg son CC0 y el resto CC-BY 3.0', () => {
    const cc0 = CREDITOS_DE_AMBIENTE.filter((c) => c.licencia === 'CC0').map((c) => c.titulo)
    expect(cc0.sort()).toEqual(['Can Fridge', 'Police Car', 'Sports Car', 'Streetlight'])
    for (const c of CREDITOS_DE_AMBIENTE.filter((x) => x.licencia === 'CC0')) {
      expect(['Quaternius', 'Kay Lousberg']).toContain(c.autor)
      expect(c.urlDeLaLicencia).toBe(LICENCIA_CC0.url)
    }
    for (const c of CREDITOS_DE_AMBIENTE.filter((x) => x.licencia !== 'CC0')) {
      expect(c.licencia).toBe('CC-BY 3.0')
    }
  })

  it('no hay créditos «por confirmar»', () => {
    for (const c of CREDITOS_DE_AMBIENTE) expect(c).not.toHaveProperty('porConfirmar')
  })
})

// Los créditos son los datos de este repositorio: no se comparan con ningún archivo que git no
// suba. Se comprueba que cada modelo de `public/modelos/` tenga su crédito y viceversa.
const archivosGlb = (carpeta) =>
  readdirSync(carpeta)
    .filter((nombre) => nombre.endsWith('.glb'))
    .sort()

describe('cada modelo publicado tiene su crédito', () => {
  it('las motos de public/modelos son exactamente las seis acreditadas', () => {
    expect(archivosGlb('public/modelos')).toEqual(CREDITOS_DE_MODELOS.map((c) => c.archivo).sort())
  })

  it('los modelos de public/modelos/ambiente son exactamente los 15 acreditados', () => {
    expect(archivosGlb('public/modelos/ambiente')).toEqual(CREDITOS_DE_AMBIENTE.map((c) => c.archivo).sort())
  })

  it('no hay dos créditos con el mismo enlace de Poly Pizza entre motos y ambiente', () => {
    const enlaces = [...CREDITOS_DE_MODELOS, ...CREDITOS_DE_AMBIENTE].map((c) => c.url)
    expect(new Set(enlaces).size).toBe(21)
  })
})

describe('la línea de crédito', () => {
  it('tiene el formato que da Poly Pizza: título, autor, licencia, enlace de la licencia y enlace del modelo', () => {
    expect(lineaDeCredito(CREDITOS_DE_MODELOS[0])).toBe(
      'Vespa by Jasmine Roberts [CC-BY] (https://creativecommons.org/licenses/by/3.0/) via Poly Pizza (https://poly.pizza/m/blGLclvvdEM)',
    )
  })

  it('en los de dominio público dice CC0', () => {
    const patrulla = CREDITOS_DE_AMBIENTE.find((c) => c.clave === 'patrulla')
    expect(lineaDeCredito(patrulla)).toBe(
      'Police Car by Quaternius [CC0] (https://creativecommons.org/publicdomain/zero/1.0/) via Poly Pizza (https://poly.pizza/m/BwwnUrWGmV)',
    )
  })
})
