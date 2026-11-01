import { existsSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

import {
  CANTIDAD_DE_MODELOS,
  CREDITOS_DE_AMBIENTE,
  CREDITOS_DE_MODELOS,
  LICENCIA_CC0,
  LICENCIA_DE_LOS_MODELOS,
  lineaDeCredito,
} from './creditosDeModelos.js'

const ENLACES = 'modelos-candidatos/enlaces.txt'
const GLB = (n) => `public/modelos/moto-${n}.glb`
const GLB_DE_AMBIENTE = (clave) => `public/modelos/ambiente/${clave}.glb`

/**
 * Parte una línea de `enlaces.txt` en título, autor y enlace de Poly Pizza.
 * Las líneas son «Título by Autor [LICENCIA] (url de la licencia) via Poly Pizza
 * (enlace)» y, en las de dominio público, «Título by Autor (enlace)» o con
 * «[CC0]» pero sin enlace de licencia: por eso la licencia no se compara.
 */
const partirLinea = (linea) => {
  const url = /\((https:\/\/poly\.pizza\/m\/[^)]+)\)\s*$/.exec(linea)?.[1]
  const resto = linea
    .replace(/\(https:\/\/poly\.pizza\/m\/[^)]+\)\s*$/, '')
    .replace(/\s*via Poly Pizza\s*$/, '')
    .replace(/\s*\(https:\/\/creativecommons\.org[^)]*\)\s*$/, '')
    .replace(/\s*\[[^\]]+\]\s*$/, '')
    .trim()
  const corte = resto.indexOf(' by ')
  return { titulo: resto.slice(0, corte), autor: resto.slice(corte + 4), url }
}

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

// `modelos-candidatos/` no se sube a GitHub: la comparación solo corre donde
// está la carpeta. Se compara cada modelo con la línea de `enlaces.txt` que tiene
// su mismo enlace de Poly Pizza, por título y autor (no el texto de la licencia,
// que no sale igual en todas). El archivo trae también los modelos descartados
// (sin crédito en la aplicación): «Truck» de sugamo.
const DESCARTADOS = ['https://poly.pizza/m/fbDxapxkwY9']

describe.skipIf(!existsSync(ENLACES))('modelos-candidatos/enlaces.txt', () => {
  const lineas = existsSync(ENLACES)
    ? readFileSync(ENLACES, 'utf8')
        .split(/\r?\n/)
        .map((linea) => linea.trim())
        .filter(Boolean)
    : []
  const esperados = [...CREDITOS_DE_MODELOS, ...CREDITOS_DE_AMBIENTE]

  it('tiene una línea por modelo (6 motos y 15 de ambiente) más los descartados', () => {
    expect(esperados).toHaveLength(21)
    expect(lineas).toHaveLength(21 + DESCARTADOS.length)
  })

  it('las seis motos son las primeras líneas, tal como las da Poly Pizza', () => {
    expect(CREDITOS_DE_MODELOS.map(lineaDeCredito)).toEqual(lineas.slice(0, CANTIDAD_DE_MODELOS))
  })

  it('cada modelo coincide en título, autor y enlace con su línea', () => {
    esperados.forEach(({ titulo, autor, url }) => {
      const linea = lineas.find((l) => l.includes(`(${url})`))
      expect(linea, `no hay línea con el enlace ${url}`).toBeDefined()
      expect(partirLinea(linea), `línea: ${linea}`).toEqual({ titulo, autor, url })
    })
  })

  it('las líneas de enlaces.txt que no tienen crédito son solo las descartadas', () => {
    const sinCredito = lineas.filter((l) => !esperados.some(({ url }) => l.includes(`(${url})`)))
    expect(sinCredito.map((l) => partirLinea(l).url)).toEqual(DESCARTADOS)
  })

  it('POS Machine aparece una sola vez y Can Fridge con su autor y su enlace', () => {
    expect(lineas.filter((l) => l.startsWith('POS Machine'))).toHaveLength(1)
    expect(lineas.filter((l) => l.startsWith('Can Fridge by Quaternius'))).toHaveLength(1)
    expect(lineas.find((l) => l.startsWith('Can Fridge'))).toContain('https://poly.pizza/m/8OHbykvREu')
  })
})
