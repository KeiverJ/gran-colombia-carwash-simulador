import { describe, expect, it } from 'vitest'

import {
  ACABADO_PLAN_MIN,
  CONTEO_PLANES,
  PROPORCION_PLAN,
  PROPORCION_PLAN_EXACTA,
  TOTAL_MOTOS_CONTADAS,
} from './parametros.js'
import { ESTADO_INICIAL, MOTOS_VISITA } from './visita.js'

describe('parámetros por defecto', () => {
  it('las proporciones de los tres planes suman 1', () => {
    const suma = PROPORCION_PLAN[1] + PROPORCION_PLAN[2] + PROPORCION_PLAN[3]
    expect(suma).toBeCloseTo(1, 4)
  })

  it('cada plan tiene un tiempo de acabado positivo', () => {
    for (const plan of [1, 2, 3]) {
      expect(ACABADO_PLAN_MIN[plan]).toBeGreaterThan(0)
    }
  })
})

describe('conteos de planes y proporciones exactas', () => {
  it('los conteos son los de la visita y suman las 23 motos', () => {
    expect(CONTEO_PLANES).toEqual({ 1: 0, 2: 19, 3: 4 })
    const total = CONTEO_PLANES[1] + CONTEO_PLANES[2] + CONTEO_PLANES[3]
    expect(total).toBe(TOTAL_MOTOS_CONTADAS)
    expect(TOTAL_MOTOS_CONTADAS).toBe(23)
  })

  it('las proporciones exactas suman 1 sin necesidad de tolerancia', () => {
    const suma =
      PROPORCION_PLAN_EXACTA[1] + PROPORCION_PLAN_EXACTA[2] + PROPORCION_PLAN_EXACTA[3]
    expect(suma).toBe(1)
  })

  it('las exactas salen de dividir los conteos por el total', () => {
    for (const plan of [1, 2, 3]) {
      expect(PROPORCION_PLAN_EXACTA[plan]).toBe(CONTEO_PLANES[plan] / TOTAL_MOTOS_CONTADAS)
    }
  })

  it('coinciden con las redondeadas del documento dentro de 0,0001', () => {
    for (const plan of [1, 2, 3]) {
      expect(Math.abs(PROPORCION_PLAN_EXACTA[plan] - PROPORCION_PLAN[plan])).toBeLessThan(
        0.0001,
      )
    }
  })
})

describe('datos de la visita del 17 de octubre', () => {
  it('registra las 23 motos observadas, numeradas de la 1 a la 23', () => {
    expect(MOTOS_VISITA).toHaveLength(23)
    expect(MOTOS_VISITA.map((moto) => moto.n)).toEqual(
      Array.from({ length: 23 }, (_, i) => i + 1),
    )
  })

  it('ninguna moto empieza una etapa antes de terminar la anterior', () => {
    for (const moto of MOTOS_VISITA) {
      const horas = [
        moto.llegadaMin,
        moto.entraPlacaMin,
        moto.salePlacaMin,
        moto.inicioAcabadoMin,
        moto.finAcabadoMin,
      ]
      expect(
        horas.every((hora, i) => i === 0 || horas[i - 1] <= hora),
        `las horas de la moto ${moto.n} no van en orden: ${horas.join(' ≤ ')}`,
      ).toBe(true)
    }
  })

  it('cada moto usa una placa de la 1 a la 6 y un plan de 1 a 3', () => {
    for (const moto of MOTOS_VISITA) {
      expect(moto.placa).toBeGreaterThanOrEqual(1)
      expect(moto.placa).toBeLessThanOrEqual(6)
      expect([1, 2, 3]).toContain(moto.plan)
    }
  })

  it('el estado inicial es el observado a las 3:10 p. m.', () => {
    expect(ESTADO_INICIAL).toEqual({
      placasOcupadas: 0,
      motosEnCola1: 2,
      puestosAcabadoOcupados: 1,
    })
  })
})
