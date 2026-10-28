import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

import { CANTIDAD_DE_MODELOS } from '../data/creditosDeModelos.js'
import { modeloDeLaMoto } from './modelosDeMoto.js'
import { entradaDeLaMoto } from './posiciones.js'

const motos = (hasta) => Array.from({ length: hasta }, (_, i) => i + 1)

/** Cuántas motos de `lista` lleva cada modelo. */
const cuentas = (lista) => {
  const c = Array(CANTIDAD_DE_MODELOS).fill(0)
  for (const n of lista) c[modeloDeLaMoto(n)] += 1
  return c
}

describe('modeloDeLaMoto', () => {
  it('es siempre el mismo para la misma moto', () => {
    const primera = motos(100).map(modeloDeLaMoto)
    const segunda = motos(100).map(modeloDeLaMoto)
    expect(segunda).toEqual(primera)
    // y no depende del orden en que se pregunte
    expect([...motos(100)].reverse().map(modeloDeLaMoto)).toEqual([...primera].reverse())
  })

  it('devuelve siempre un modelo que existe', () => {
    for (const n of motos(500)) {
      const modelo = modeloDeLaMoto(n)
      expect(Number.isInteger(modelo)).toBe(true)
      expect(modelo).toBeGreaterThanOrEqual(0)
      expect(modelo).toBeLessThan(CANTIDAD_DE_MODELOS)
    }
  })

  it('en cada grupo de 12 motos usa los seis modelos dos veces cada uno', () => {
    for (const grupo of [0, 1, 2, 7, 40]) {
      const lista = motos(12).map((i) => grupo * 12 + i)
      expect(cuentas(lista)).toEqual(Array(CANTIDAD_DE_MODELOS).fill(2))
    }
  })

  it('en cada grupo, cada avenida lleva los seis modelos una vez', () => {
    for (const grupo of [0, 1, 2, 7, 40]) {
      const lista = motos(12).map((i) => grupo * 12 + i)
      for (const avenida of ['granColombia', 'guaimaral']) {
        const deEsaAvenida = lista.filter((n) => entradaDeLaMoto(n).clave === avenida)
        expect(cuentas(deEsaAvenida)).toEqual(Array(CANTIDAD_DE_MODELOS).fill(1))
      }
    }
  })

  it('las 23 motos de la visita ven los seis modelos por cada avenida', () => {
    for (const avenida of ['granColombia', 'guaimaral']) {
      const deEsaAvenida = motos(23).filter((n) => entradaDeLaMoto(n).clave === avenida)
      expect(new Set(deEsaAvenida.map(modeloDeLaMoto)).size).toBe(CANTIDAD_DE_MODELOS)
    }
  })

  it('el reparto es parejo en total: nunca se separa en más de uno', () => {
    for (const hasta of [23, 40, 60, 100, 250]) {
      const c = cuentas(motos(hasta))
      expect(Math.max(...c) - Math.min(...c)).toBeLessThanOrEqual(2)
    }
  })

  it('el orden cambia de un grupo a otro', () => {
    const ordenes = new Set(
      [0, 1, 2, 3, 4, 5].map((g) => motos(12).map((i) => modeloDeLaMoto(g * 12 + i)).join(',')),
    )
    expect(ordenes.size).toBeGreaterThan(1)
  })

  it('rechaza números que no son de una moto', () => {
    for (const malo of [0, -1, 1.5, NaN, '3', undefined]) {
      expect(() => modeloDeLaMoto(malo)).toThrow(RangeError)
    }
  })

  it('no usa el azar ni nada del motor: solo el número de la moto', () => {
    const fuente = readFileSync('src/scene/modelosDeMoto.js', 'utf8')
    expect(fuente).not.toMatch(/Math\.random/)
    expect(fuente).not.toMatch(/engine/)
    expect(fuente).not.toMatch(/useSimulacion/)
  })
})
