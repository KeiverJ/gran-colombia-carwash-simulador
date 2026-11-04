import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import { ACABADO_PLAN_MIN, LAVADO_MIN, LLEGADAS_POR_HORA, PROPORCION_PLAN_EXACTA } from '../data/parametros.js'
import { acabadoPromedioDeLosParametros } from './plan.js'
import { correrReplica, motorDe, numerosDeLasMetricas } from './corrida.js'

const parametros = (cambios = {}) => ({
  llegadasPorHora: LLEGADAS_POR_HORA,
  lavadoMin: LAVADO_MIN,
  acabadoPlanMin: { ...ACABADO_PLAN_MIN },
  proporcionPlan: { ...PROPORCION_PLAN_EXACTA },
  placas: 6,
  puestos: 3,
  modoAcabado: 'por-plan',
  ...cambios,
})

const trabajo = (cambios = {}) => ({
  semilla: 1,
  parametros: parametros(),
  horas: 200,
  calentamientoHoras: 20,
  ...cambios,
})

describe('una réplica', () => {
  it('con la misma semilla da exactamente lo mismo', () => {
    expect(correrReplica(trabajo())).toEqual(correrReplica(trabajo()))
  })

  it('con otra semilla cambia', () => {
    expect(correrReplica(trabajo({ semilla: 2 })).lavado.lq).not.toBe(correrReplica(trabajo()).lavado.lq)
  })

  it('sus métricas son las del motor corrido a mano de una vez', () => {
    const p = trabajo()
    const motor = motorDe(p.parametros, p.semilla, p.calentamientoHoras)
    motor.correrHoras(p.horas)
    const { filas: _filas, semilla, ...metricas } = correrReplica(p)
    expect(semilla).toBe(1)
    expect(metricas).toEqual(numerosDeLasMetricas(motor.metricas()))
  })

  it('anota las filas a la mitad y al final', () => {
    const { filas } = correrReplica(trabajo({ parametros: parametros({ puestos: 3 }), horas: 400 }))
    // Con 3 puestos el acabado se satura: la fila 2 crece.
    expect(filas.final.acabado).toBeGreaterThan(filas.mitad.acabado)
    expect(filas.final.lavado).toBeGreaterThanOrEqual(0)
  })

  it('el acabado promedio del motor es el de los parámetros', () => {
    // M/M/s usa E[S₂]: la corrida corre con el promedio de los planes.
    const p = parametros({ modoAcabado: 'M/M/s', puestos: 5 })
    expect(acabadoPromedioDeLosParametros(p)).toBeCloseTo(15.8696, 3)
    expect(correrReplica(trabajo({ parametros: p })).acabado.rho).toBeGreaterThan(0.5)
  })
})

describe('el módulo es JavaScript puro', () => {
  it('ningún archivo importa React, Zustand, el DOM ni el store', () => {
    const carpeta = new URL('.', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/u, '$1')
    const fuentes = readdirSync(carpeta).filter((n) => n.endsWith('.js') && !n.endsWith('.test.js'))
    expect(fuentes.length).toBeGreaterThan(2)
    for (const nombre of fuentes) {
      const texto = readFileSync(join(carpeta, nombre), 'utf8')
      const importaciones = [...texto.matchAll(/^import .* from '([^']+)'/gmu)].map((m) => m[1])
      for (const ruta of importaciones) {
        expect(ruta, `${nombre} importa ${ruta}`).not.toMatch(/react|zustand|three|recharts|\/store\/(?!rangos\.js)|components/u)
      }
      expect(texto, nombre).not.toMatch(/\b(document|window|localStorage)\./u)
    }
  })
})
