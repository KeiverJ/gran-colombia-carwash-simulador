import { describe, expect, it } from 'vitest'

import { RANGOS } from '../store/rangos.js'
import { ESCENARIOS } from './escenarios.js'
import { PLACAS_LAVADO, PUESTOS_ACABADO } from './parametros.js'

describe('escenarios predefinidos', () => {
  it('son cinco, con los nombres de la especificación y en ese orden', () => {
    expect(ESCENARIOS.map((escenario) => escenario.nombre)).toEqual([
      'Situación actual (6 placas, 3 puestos)',
      '4 puestos de acabado',
      '5 puestos de acabado',
      '5 placas',
      '7 placas',
    ])
  })

  it('fijan placas y puestos: 6/3, 6/4, 6/5, 5/3 y 7/3', () => {
    expect(ESCENARIOS.map(({ placas, puestos }) => [placas, puestos])).toEqual([
      [6, 3],
      [6, 4],
      [6, 5],
      [5, 3],
      [7, 3],
    ])
  })

  it('el primero es el lavadero real', () => {
    expect(ESCENARIOS[0]).toMatchObject({ placas: PLACAS_LAVADO, puestos: PUESTOS_ACABADO })
  })

  it('todos caben en lo que el panel deja elegir', () => {
    for (const { placas, puestos } of ESCENARIOS) {
      expect(placas).toBeGreaterThanOrEqual(RANGOS.placas.minimo)
      expect(placas).toBeLessThanOrEqual(RANGOS.placas.maximo)
      expect(puestos).toBeGreaterThanOrEqual(RANGOS.puestos.minimo)
      expect(puestos).toBeLessThanOrEqual(RANGOS.puestos.maximo)
    }
  })

  it('los identificadores no se repiten', () => {
    const ids = ESCENARIOS.map((escenario) => escenario.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})
