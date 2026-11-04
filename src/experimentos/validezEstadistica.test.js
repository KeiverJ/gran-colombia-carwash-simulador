import { describe, expect, it } from 'vitest'

import { ACABADO_PLAN_MIN, LAVADO_MIN, LLEGADAS_POR_HORA, PROPORCION_PLAN_EXACTA } from '../data/parametros.js'
import { acumuladoVacio, acumularEvento, armarResultados, ejecutarLote } from './lote.js'
import { MODO_BARRIDO, MODO_ESCENARIOS, MODO_REPLICAS } from './plan.js'
import { formulasDe, inestabilidadDelBarrido } from './resumen.js'

const parametros = (cambios = {}) => ({
  llegadasPorHora: LLEGADAS_POR_HORA,
  lavadoMin: LAVADO_MIN,
  acabadoPlanMin: { ...ACABADO_PLAN_MIN },
  proporcionPlan: { ...PROPORCION_PLAN_EXACTA },
  placas: 6,
  puestos: 5,
  modoAcabado: 'M/M/s',
  ...cambios,
})

const solicitud = (cambios = {}) => ({
  modo: MODO_REPLICAS,
  parametros: parametros(),
  semillaBase: 1,
  horas: 1000,
  calentamientoPct: 10,
  replicas: 30,
  lotes: 30,
  mediaAcumulada: false,
  barrido: { parametro: 'puestos', inicio: 3, fin: 5, paso: 1 },
  ...cambios,
})

function correr(pedido) {
  let acumulado = acumuladoVacio()
  ejecutarLote(pedido, { alAvanzar: (e) => { acumulado = acumularEvento(acumulado, e) } })
  return armarResultados(pedido, acumulado)
}

/** ¿Cuántas métricas estables cayeron dentro del intervalo? */
function cuantasDentro(resumen) {
  let dentro = 0
  let total = 0
  for (const nombre of ['lavado', 'acabado', 'total']) {
    for (const metrica of Object.values(resumen[nombre].metricas)) {
      if (metrica.dentro !== null) {
        total += 1
        if (metrica.dentro) dentro += 1
      }
    }
  }
  return { dentro, total }
}

describe('con 6 placas y 5 puestos (todo estable), en modo M/M/s', () => {
  it('el valor de las fórmulas cae dentro del intervalo en la gran mayoría', () => {
    let dentro = 0
    let total = 0
    for (const semillaBase of [1, 101, 201, 301]) {
      const { resumen } = correr(solicitud({ semillaBase }))
      expect(resumen.lavado.estable).toBe(true)
      expect(resumen.acabado.estable).toBe(true)
      const cuenta = cuantasDentro(resumen)
      dentro += cuenta.dentro
      total += cuenta.total
    }
    // 4 corridas × 12 métricas; con un 95 % se espera caer fuera 1 de cada 20.
    expect(total).toBe(48)
    expect(dentro / total).toBeGreaterThanOrEqual(0.9)
  }, 60000)

  it('el promedio de ρ se acerca a las fórmulas', () => {
    const { resumen } = correr(solicitud())
    expect(resumen.lavado.metricas.rho.promedio).toBeCloseTo(0.4234, 1)
    expect(resumen.acabado.metricas.rho.promedio).toBeCloseTo(0.7508, 1)
    expect(resumen.acabado.metricas.rho.resumen.semiancho).toBeLessThan(0.02)
  })
})

describe('con 3 puestos el acabado es inestable', () => {
  it('no lleva intervalo ni fórmulas y su fila crece', () => {
    const { resumen } = correr(solicitud({ parametros: parametros({ puestos: 3 }), replicas: 5 }))
    expect(resumen.acabado.estable).toBe(false)
    expect(resumen.acabado.metricas.lq.resumen).toBeNull()
    expect(resumen.acabado.metricas.lq.formula).toBeNull()
    expect(resumen.acabado.filas.despues).toBeGreaterThan(resumen.acabado.filas.antes * 1.5)
    expect(resumen.lavado.estable).toBe(true)
    expect(resumen.lavado.metricas.lq.resumen.inferior).not.toBeNull()
    expect(resumen.total.estable).toBe(false)
  })
})

describe('el barrido y la comparación', () => {
  it('λ de 8 a 16 de 0,5 en 0,5 con 3 puestos marca el acabado inestable desde 11,5 y el valor crítico 11,34', () => {
    const base = parametros({ puestos: 3 })
    const barrido = { parametro: 'llegadasPorHora', inicio: 8, fin: 16, paso: 0.5 }
    const marca = inestabilidadDelBarrido(base, barrido)
    expect(marca.valores[0]).toBe(8)
    expect(marca.valores.at(-1)).toBe(16)
    expect(marca.acabado.estables.slice(0, 7)).toEqual(new Array(7).fill(true)) // 8 a 11
    expect(marca.acabado.estables[7]).toBe(false) // 11,5 es el primero con ρ ≥ 1
    expect(marca.lavado.cambio).toBeNull()
    // μ₂ = 60 / 15,8696 = 3,7808; con 3 puestos el límite es 3 · μ₂ = 11,3424.
    expect(marca.acabado.critico).toBeCloseTo(11.3424, 3)
    expect(marca.acabado.critico.toFixed(2)).toBe('11.34')
  })

  it('con λ de 8 a 16 el primer valor inestable del acabado es 11,5', () => {
    const base = parametros({ puestos: 3 })
    const marca = inestabilidadDelBarrido(base, { parametro: 'llegadasPorHora', inicio: 8, fin: 16, paso: 0.5 })
    const primero = marca.valores[marca.acabado.estables.indexOf(false)]
    expect(primero).toBe(11.5)
    expect(marca.acabado.cambio).toBe(marca.acabado.estables.indexOf(false))
  })

  it('el barrido de puestos de 3 a 5 solo es inestable con 3', () => {
    const marca = inestabilidadDelBarrido(parametros({ puestos: 3 }), { parametro: 'puestos', inicio: 3, fin: 5, paso: 1 })
    expect(marca.acabado.estables).toEqual([false, true, true])
    expect(marca.lavado.estables).toEqual([true, true, true])
    expect(marca.acabado.critico).toBeCloseTo(formulasDe(parametros({ puestos: 3 })).acabado.a, 6)
  })

  it('el barrido del motor real coincide con esa marca', () => {
    const resultados = correr(solicitud({ modo: MODO_BARRIDO, replicas: 5, horas: 1000, barrido: { parametro: 'puestos', inicio: 3, fin: 5, paso: 1 } }))
    expect(resultados.puntos.map((p) => p.resumen.acabado.estable)).toEqual([false, true, true])
    expect(resultados.puntos[0].resumen.acabado.metricas.wqMin.resumen).toBeNull()
  })

  it('la comparación trae ρ₂ = 0,9385 con 4 puestos y 3 puestos inestables', () => {
    const resultados = correr(solicitud({ modo: MODO_ESCENARIOS, replicas: 5, horas: 100, parametros: parametros({ puestos: 3, modoAcabado: 'por-plan' }) }))
    const porId = Object.fromEntries(resultados.escenarios.map((e) => [e.id, e]))
    expect(porId.actual.resumen.acabado.estable).toBe(false)
    expect(porId['cinco-placas'].resumen.acabado.estable).toBe(false)
    expect(porId['siete-placas'].resumen.acabado.estable).toBe(false)
    expect(porId['cuatro-puestos'].resumen.acabado.estable).toBe(true)
    expect(porId['cuatro-puestos'].resumen.acabado.rhoDeLasFormulas).toBeCloseTo(0.9385, 4)
    expect(porId['cinco-puestos'].resumen.acabado.rhoDeLasFormulas).toBeCloseTo(0.7508, 4)
    for (const escenario of resultados.escenarios) {
      expect(escenario.replicas.map((r) => r.semilla)).toEqual([1, 2, 3, 4, 5])
    }
  })
})
