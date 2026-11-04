import { describe, expect, it } from 'vitest'

import { ACABADO_PLAN_MIN, LAVADO_MIN, LLEGADAS_POR_HORA, PROPORCION_PLAN_EXACTA } from '../data/parametros.js'
import { metricasMMs } from '../engine/formulas.js'
import { acabadoPromedioDe } from '../store/simulacion.js'
import { acabadoPromedioDeLosParametros } from './plan.js'
import { formulasDe, resumirMuestras, resumirReplicas } from './resumen.js'

const parametros = (cambios = {}) => ({
  llegadasPorHora: LLEGADAS_POR_HORA,
  lavadoMin: LAVADO_MIN,
  acabadoPlanMin: { ...ACABADO_PLAN_MIN },
  proporcionPlan: { ...PROPORCION_PLAN_EXACTA },
  placas: 6,
  puestos: 3,
  modoAcabado: 'M/M/s',
  ...cambios,
})

/** Una réplica inventada solo para probar la aritmética del resumen. */
const replicaFalsa = (semilla, desvio, lavado, acabado) => ({
  semilla,
  lavado: { rho: 0.42 + desvio, lq: 0.04 + desvio, wqMin: 0.16 + desvio, wMin: 10.9 + desvio, l: 2.58 + desvio, ...lavado },
  acabado: { rho: 0.75 + desvio, lq: 1.4 + desvio, wqMin: 5.9 + desvio, wMin: 21.8 + desvio, l: 5.15 + desvio, ...acabado },
  total: { wMin: 32.7 + desvio, l: 7.7 + desvio },
  filas: { mitad: { lavado: 0, acabado: 10 }, final: { lavado: 1, acabado: 40 } },
})

describe('las fórmulas de un lote', () => {
  it('E[S₂] es el mismo que calcula el store', () => {
    const p = parametros()
    expect(acabadoPromedioDeLosParametros(p)).toBe(acabadoPromedioDe(p))
    const otro = parametros({ acabadoPlanMin: { 1: 8, 2: 12, 3: 20 }, proporcionPlan: { 1: 0.2, 2: 0.5, 3: 0.3 } })
    expect(acabadoPromedioDeLosParametros(otro)).toBeCloseTo(acabadoPromedioDe(otro), 12)
  })

  it('usa μ₂ = 60 / E[S₂], con la tabla de la especificación', () => {
    const f = formulasDe(parametros({ puestos: 5 }))
    expect(f.acabado.rho).toBeCloseTo(0.7508, 4)
    expect(f.acabado.lq).toBeCloseTo(1.4, 1)
    expect(f.lavado.rho).toBeCloseTo(0.4234, 4)
    expect(f.lavado.lq).toBeCloseTo(0.0372, 3)
  })

  it('el total es W₁ + W₂ y L₁ + L₂ si las dos etapas son estables', () => {
    const f = formulasDe(parametros({ puestos: 5 }))
    expect(f.total.estable).toBe(true)
    expect(f.total.wMin).toBeCloseTo(f.lavado.wMin + f.acabado.wMin, 12)
    expect(f.total.l).toBeCloseTo(f.lavado.l + f.acabado.l, 12)
  })

  it('con 3 puestos el acabado y el total son inestables', () => {
    const f = formulasDe(parametros())
    expect(f.acabado.estable).toBe(false)
    expect(f.acabado.rho).toBeCloseTo(1.2514, 4)
    expect(f.total.estable).toBe(false)
    expect(f.lavado.estable).toBe(true)
  })

  it('coincide con metricasMMs sin tocarla', () => {
    const p = parametros({ puestos: 4 })
    const directo = metricasMMs({ llegadasPorHora: p.llegadasPorHora, servicioPorHora: 60 / acabadoPromedioDe(p), servidores: 4 })
    expect(formulasDe(p).acabado).toEqual(directo)
  })
})

describe('el resumen de las réplicas', () => {
  const replicas = [-0.02, -0.01, 0, 0.01, 0.02].map((d, i) => replicaFalsa(i + 1, d))

  it('trae promedio, desviación, intervalo y fórmulas en cada métrica de una etapa estable', () => {
    const r = resumirReplicas(replicas, parametros({ puestos: 5 }))
    expect(r.n).toBe(5)
    const rho2 = r.acabado.metricas.rho
    expect(rho2.resumen.promedio).toBeCloseTo(0.75, 12)
    expect(rho2.resumen.desviacion).toBeCloseTo(Math.sqrt(0.001 / 4), 10)
    expect(rho2.formula).toBeCloseTo(0.7508, 4)
    expect(rho2.dentro).toBe(true)
    expect(r.lavado.metricas.l.formula).toBeGreaterThan(2)
    expect(r.total.metricas.wMin.formula).toBeGreaterThan(30)
  })

  it('«dentro» es falso si las fórmulas caen fuera del intervalo', () => {
    const lejos = [0, 0.001, -0.001, 0.002, -0.002].map((d, i) => replicaFalsa(i + 1, d, {}, { rho: 0.9 + d }))
    const r = resumirReplicas(lejos, parametros({ puestos: 5 }))
    expect(r.acabado.metricas.rho.dentro).toBe(false)
  })

  it('una etapa inestable no lleva intervalo ni fórmulas y trae las filas', () => {
    const r = resumirReplicas(replicas, parametros())
    expect(r.acabado.estable).toBe(false)
    for (const metrica of Object.values(r.acabado.metricas)) {
      expect(metrica.resumen).toBeNull()
      expect(metrica.formula).toBeNull()
      expect(metrica.dentro).toBeNull()
      expect(Number.isFinite(metrica.promedio)).toBe(true)
    }
    expect(r.acabado.filas).toEqual({ antes: 10, despues: 40 })
    expect(r.total.estable).toBe(false)
    expect(r.total.metricas.wMin.resumen).toBeNull()
  })

  it('la etapa de lavado conserva sus intervalos aunque el acabado sea inestable', () => {
    const r = resumirReplicas(replicas, parametros())
    expect(r.lavado.estable).toBe(true)
    expect(r.lavado.metricas.rho.resumen.inferior).not.toBeNull()
  })

  it('avisa que la comparación es aproximada solo en el modo por plan', () => {
    expect(resumirReplicas(replicas, parametros({ puestos: 5, modoAcabado: 'por-plan' })).acabado.aproximada).toBe(true)
    expect(resumirReplicas(replicas, parametros({ puestos: 5, modoAcabado: 'por-plan' })).lavado.aproximada).toBe(false)
    expect(resumirReplicas(replicas, parametros({ puestos: 5 })).acabado.aproximada).toBe(false)
  })

  it('con una sola réplica solo hay promedio', () => {
    const r = resumirReplicas([replicas[0]], parametros({ puestos: 5 }))
    expect(r.acabado.metricas.rho.resumen.inferior).toBeNull()
    expect(r.acabado.metricas.rho.dentro).toBeNull()
  })

  it('resumirMuestras sirve para cualquier lista de valores', () => {
    const muestras = {
      lavado: { rho: [0.4, 0.43], lq: [0, 0.1], wqMin: [0, 0.3], wMin: [10, 11], l: [2, 3] },
      acabado: { rho: [0.7, 0.8], lq: [1, 2], wqMin: [5, 6], wMin: [20, 22], l: [5, 6] },
      total: { wMin: [30, 33], l: [7, 9] },
    }
    const r = resumirMuestras({ muestras, parametros: parametros({ puestos: 5 }) })
    expect(r.lavado.filas).toBeNull()
    expect(r.lavado.metricas.rho.resumen.n).toBe(2)
  })
})
