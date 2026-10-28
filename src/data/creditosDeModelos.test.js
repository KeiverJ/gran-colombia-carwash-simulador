import { existsSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

import {
  CANTIDAD_DE_MODELOS,
  CREDITOS_DE_MODELOS,
  lineaDeCredito,
} from './creditosDeModelos.js'

const ENLACES = 'modelos-candidatos/enlaces.txt'
const GLB = (n) => `public/modelos/moto-${n}.glb`

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

  // `modelos-candidatos/` no se sube a GitHub: la comparación solo corre
  // donde está la carpeta.
  it.skipIf(!existsSync(ENLACES))(
    'coinciden, en el mismo orden, con las líneas de modelos-candidatos/enlaces.txt',
    () => {
      const lineas = readFileSync(ENLACES, 'utf8')
        .split(/\r?\n/)
        .map((linea) => linea.trim())
        .filter(Boolean)
      expect(CREDITOS_DE_MODELOS.map(lineaDeCredito)).toEqual(lineas)
    },
  )
})
