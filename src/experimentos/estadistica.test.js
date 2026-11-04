import { describe, expect, it } from 'vitest'

import {
  cuantilT,
  desviacion,
  distribucionT,
  intervaloContiene,
  promedio,
  resumirMuestra,
} from './estadistica.js'

describe('cuantil de la t de Student', () => {
  it('coincide con los valores conocidos de la tabla (0,975)', () => {
    expect(cuantilT(0.975, 1)).toBeCloseTo(12.706, 3)
    expect(cuantilT(0.975, 4)).toBeCloseTo(2.776, 3)
    expect(cuantilT(0.975, 9)).toBeCloseTo(2.262, 3)
    expect(cuantilT(0.975, 29)).toBeCloseTo(2.045, 3)
    expect(cuantilT(0.975, 99)).toBeCloseTo(1.984, 3)
  })

  it('tiende a la normal con muchos grados de libertad', () => {
    expect(cuantilT(0.975, 100000)).toBeCloseTo(1.96, 2)
  })

  it('es simétrico y la mediana es 0', () => {
    expect(cuantilT(0.5, 7)).toBe(0)
    expect(cuantilT(0.025, 4)).toBeCloseTo(-2.776, 3)
  })

  it('es el inverso de la distribución', () => {
    for (const gl of [2, 5, 19, 49]) {
      expect(distribucionT(cuantilT(0.9, gl), gl)).toBeCloseTo(0.9, 10)
    }
  })

  it('rechaza grados de libertad y probabilidades que no sirven', () => {
    expect(() => cuantilT(0.975, 0)).toThrow(RangeError)
    expect(() => cuantilT(0.975, 2.5)).toThrow(RangeError)
    expect(() => cuantilT(1, 5)).toThrow(RangeError)
  })
})

describe('promedio, desviación e intervalo', () => {
  it('calcula a mano 2, 4, 4, 4, 5, 5, 7, 9', () => {
    const datos = [2, 4, 4, 4, 5, 5, 7, 9]
    expect(promedio(datos)).toBe(5)
    // Suma de cuadrados = 32; muestral: raíz de 32 / 7.
    expect(desviacion(datos)).toBeCloseTo(Math.sqrt(32 / 7), 12)
  })

  it('el intervalo es promedio ± t · s / √n', () => {
    const datos = [10, 12, 9, 11, 13]
    const r = resumirMuestra(datos)
    const s = desviacion(datos)
    const semiancho = (2.776445105 * s) / Math.sqrt(5)
    expect(r.n).toBe(5)
    expect(r.promedio).toBe(11)
    expect(r.semiancho).toBeCloseTo(semiancho, 6)
    expect(r.inferior).toBeCloseTo(11 - semiancho, 6)
    expect(r.superior).toBeCloseTo(11 + semiancho, 6)
  })

  it('con menos de 2 valores solo hay promedio', () => {
    const uno = resumirMuestra([3.5])
    expect(uno).toEqual({ n: 1, promedio: 3.5, desviacion: null, semiancho: null, inferior: null, superior: null })
    expect(desviacion([])).toBeNull()
    expect(intervaloContiene(uno, 3.5)).toBeNull()
  })

  it('dice si un valor cae dentro del intervalo', () => {
    const r = resumirMuestra([10, 12, 9, 11, 13])
    expect(intervaloContiene(r, 11)).toBe(true)
    expect(intervaloContiene(r, 20)).toBe(false)
  })

  it('una muestra sin variación tiene intervalo de ancho 0', () => {
    const r = resumirMuestra([2, 2, 2, 2])
    expect(r.desviacion).toBe(0)
    expect(r.semiancho).toBe(0)
  })
})
