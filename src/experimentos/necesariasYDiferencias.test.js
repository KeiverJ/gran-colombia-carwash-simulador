import { beforeAll, describe, expect, it } from 'vitest'

import { ACABADO_PLAN_MIN, LAVADO_MIN, LLEGADAS_POR_HORA, PROPORCION_PLAN_EXACTA } from '../data/parametros.js'
import { resumirMuestra } from './estadistica.js'
import { acumuladoVacio, acumularEvento, armarResultados, ejecutarLote } from './lote.js'
import { MODO_ESCENARIOS, MODO_REPLICAS } from './plan.js'
import { diferenciasContra, replicasNecesarias } from './resumen.js'

const parametros = (cambios = {}) => ({
  llegadasPorHora: LLEGADAS_POR_HORA,
  lavadoMin: LAVADO_MIN,
  acabadoPlanMin: { ...ACABADO_PLAN_MIN },
  proporcionPlan: { ...PROPORCION_PLAN_EXACTA },
  placas: 6,
  puestos: 5,
  modoAcabado: 'por-plan',
  ...cambios,
})

const solicitud = (cambios = {}) => ({
  modo: MODO_REPLICAS,
  parametros: parametros(),
  semillaBase: 1,
  horas: 1000,
  calentamientoPct: 10,
  replicas: 10,
  lotes: 30,
  mediaAcumulada: false,
  barrido: { parametro: 'puestos', inicio: 4, fin: 5, paso: 1 },
  ...cambios,
})

function correr(pedido) {
  let acumulado = acumuladoVacio()
  ejecutarLote(pedido, { alAvanzar: (e) => { acumulado = acumularEvento(acumulado, e) } })
  return armarResultados(pedido, acumulado)
}

describe('cuántas réplicas hacen falta', () => {
  it('n = 10, h = 0,03 y h* = 0,02 dan 23 (22,5 hacia arriba)', () => {
    const r = replicasNecesarias({ n: 10, semiancho: 0.03, deseado: 0.02 })
    expect(r).toMatchObject({ disponible: true, necesarias: 23, alcanza: false, aCorrer: 23, pasaDelMaximo: false })
  })

  it('un entero exacto no sube de más: 10 · (0,02 / 0,01)² = 40', () => {
    expect(replicasNecesarias({ n: 10, semiancho: 0.02, deseado: 0.01 }).necesarias).toBe(40)
    expect(replicasNecesarias({ n: 30, semiancho: 0.3, deseado: 0.1 }).necesarias).toBe(270)
  })

  it('si h* es mayor o igual que h, ya alcanza', () => {
    expect(replicasNecesarias({ n: 10, semiancho: 0.03, deseado: 0.03 })).toMatchObject({ alcanza: true, necesarias: 10 })
    expect(replicasNecesarias({ n: 10, semiancho: 0.03, deseado: 0.1 }).alcanza).toBe(true)
  })

  it('más de 100 pasa del máximo', () => {
    const r = replicasNecesarias({ n: 30, semiancho: 0.02, deseado: 0.01 })
    expect(r.necesarias).toBe(120)
    expect(r.pasaDelMaximo).toBe(true)
  })

  it('menos de 5 se corren como 5, el mínimo', () => {
    const r = replicasNecesarias({ n: 2, semiancho: 0.03, deseado: 0.02 })
    expect(r.necesarias).toBe(5)
    expect(r.alcanza).toBe(false)
    expect(replicasNecesarias({ n: 3, semiancho: 0.021, deseado: 0.02 })).toMatchObject({ necesarias: 4, aCorrer: 5 })
  })

  it('no se ofrece con menos de 2 réplicas ni con datos que no sirven', () => {
    expect(replicasNecesarias({ n: 1, semiancho: 0.03, deseado: 0.02 }).disponible).toBe(false)
    expect(replicasNecesarias({ n: 10, semiancho: null, deseado: 0.02 }).disponible).toBe(false)
    expect(replicasNecesarias({ n: 10, semiancho: 0.03, deseado: 0 }).disponible).toBe(false)
    expect(replicasNecesarias({ n: 10, semiancho: 0.03, deseado: Number.NaN }).disponible).toBe(false)
  })

  it('con réplicas reales, correr n* repite las semillas y deja el semiancho cerca de h*', () => {
    const primeras = correr(solicitud({ replicas: 10 }))
    const h = primeras.resumen.acabado.metricas.rho.resumen.semiancho
    const deseado = h / 2
    const cuenta = replicasNecesarias({ n: 10, semiancho: h, deseado })
    expect(cuenta.necesarias).toBe(40)

    const mas = correr(solicitud({ replicas: cuenta.aCorrer }))
    expect(mas.replicas.slice(0, 10)).toEqual(primeras.replicas)
    const nuevo = mas.resumen.acabado.metricas.rho.resumen.semiancho
    expect(nuevo).toBeGreaterThan(deseado * 0.5)
    expect(nuevo).toBeLessThan(deseado * 1.5)
  })
})

/** Una réplica inventada con un valor de Wq₂ y de Wq₁ dados. */
const replica = (semilla, wq2, wq1 = 0.1) => {
  const etapa = (wq) => ({ rho: 0.5, lq: 1, wqMin: wq, wMin: 10, l: 2 })
  return { semilla, lavado: etapa(wq1), acabado: etapa(wq2), total: { wMin: 20, l: 4 }, filas: { mitad: {}, final: {} } }
}

describe('diferencias entre escenarios (con datos hechos a mano)', () => {
  const referencia = { id: 'ref', parametros: parametros({ puestos: 4 }), replicas: [1, 2, 3, 4, 5].map((s, i) => replica(s, [1, 2, 3, 4, 5][i])) }
  const otro = {
    id: 'otro',
    parametros: parametros({ puestos: 5 }),
    replicas: [5, 4, 3, 2, 1].map((s) => replica(s, [0.5, 1.4, 2.5, 3.1, 4.6][s - 1])),
  }

  it('la diferencia es escenario − referencia, réplica a réplica con la misma semilla', () => {
    const d = diferenciasContra([referencia, otro], 'ref').otro
    const esperado = resumirMuestra([-0.5, -0.6, -0.5, -0.9, -0.4])
    expect(d.pares).toBe(5)
    const wq2 = d.acabado.metricas.wqMin
    expect(wq2.calculada).toBe(true)
    expect(wq2.resumen.promedio).toBeCloseTo(-0.58, 12)
    expect(wq2.resumen.desviacion).toBeCloseTo(esperado.desviacion, 12)
    expect(wq2.resumen.inferior).toBeCloseTo(esperado.inferior, 12)
    expect(wq2.resumen.superior).toBeCloseTo(esperado.superior, 12)
    expect(wq2.significativa).toBe(true)
  })

  it('la referencia no se compara consigo misma', () => {
    expect(Object.keys(diferenciasContra([referencia, otro], 'ref'))).toEqual(['otro'])
    expect(Object.keys(diferenciasContra([referencia, otro], 'otro'))).toEqual(['ref'])
  })

  it('si el intervalo contiene el cero no es significativa', () => {
    const ruido = { ...otro, replicas: [1, 2, 3, 4, 5].map((s) => replica(s, [1, 2, 3, 4, 5][s - 1] + [0.3, -0.2, 0.1, -0.3, 0.2][s - 1])) }
    const d = diferenciasContra([referencia, ruido], 'ref').otro
    expect(d.acabado.metricas.wqMin.significativa).toBe(false)
  })

  it('solo usa las semillas que tienen los dos escenarios', () => {
    const parcial = { ...otro, replicas: otro.replicas.slice(0, 3) }
    expect(diferenciasContra([referencia, parcial], 'ref').otro.pares).toBe(3)
  })

  it('con una sola pareja no hay intervalo', () => {
    const uno = { ...otro, replicas: [replica(1, 0.5)] }
    const d = diferenciasContra([referencia, uno], 'ref').otro.acabado.metricas.wqMin
    expect(d.calculada).toBe(false)
    expect(d.significativa).toBeNull()
  })

  it('una referencia que no existe es un error', () => {
    expect(() => diferenciasContra([referencia, otro], 'nada')).toThrow(RangeError)
  })

  it('una etapa inestable en el escenario o en la referencia no se calcula', () => {
    const inestable = { ...referencia, id: 'tres', parametros: parametros({ puestos: 3 }) }
    const d = diferenciasContra([inestable, otro], 'tres').otro
    expect(d.acabado.inestableEn).toEqual(['tres'])
    expect(d.acabado.metricas.wqMin).toEqual({ calculada: false, resumen: null, significativa: null })
    expect(d.total.inestableEn).toEqual(['tres'])
    expect(d.lavado.inestableEn).toEqual([])
    expect(d.lavado.metricas.rho.calculada).toBe(true)
    const alReves = diferenciasContra([inestable, otro], 'otro').tres
    expect(alReves.acabado.inestableEn).toEqual(['tres'])
  })
})

describe('diferencias entre los cinco escenarios (motor real, 30 réplicas de 1000 h)', () => {
  let escenarios

  beforeAll(() => {
    const resultados = correr(solicitud({ modo: MODO_ESCENARIOS, replicas: 30, parametros: parametros({ puestos: 3 }) }))
    escenarios = resultados.escenarios
  }, 120000)

  it('contra la situación actual, la reducción de Wq₂ con 4 o 5 puestos no se puede calcular: con 3 puestos es inestable', () => {
    const d = diferenciasContra(escenarios, 'actual')
    for (const id of ['cuatro-puestos', 'cinco-puestos']) {
      expect(d[id].acabado.inestableEn).toEqual(['actual'])
      expect(d[id].acabado.metricas.wqMin.calculada).toBe(false)
      expect(d[id].acabado.metricas.wqMin.resumen).toBeNull()
      expect(d[id].total.inestableEn).toEqual(['actual'])
    }
    expect(d['cinco-placas'].acabado.inestableEn).toEqual(['cinco-placas', 'actual'])
  })

  it('entre 4 y 5 puestos la diferencia de Wq₂ se calcula, es negativa y significativa', () => {
    const d = diferenciasContra(escenarios, 'cuatro-puestos')['cinco-puestos']
    const wq2 = d.acabado.metricas.wqMin
    expect(d.acabado.inestableEn).toEqual([])
    expect(wq2.calculada).toBe(true)
    expect(wq2.resumen.promedio).toBeLessThan(0)
    expect(wq2.resumen.superior).toBeLessThan(0)
    expect(wq2.significativa).toBe(true)
    expect(d.pares).toBe(30)
    // Con 4 puestos Wq₂ ronda los 56 min y con 5 los 5,9 min: baja decenas de minutos.
    expect(wq2.resumen.promedio).toBeLessThan(-20)
  })

  it('en la etapa 1 (las mismas 6 placas) el lavado casi no cambia', () => {
    const d = diferenciasContra(escenarios, 'actual')['cuatro-puestos'].lavado
    expect(d.inestableEn).toEqual([])
    // Mismas placas, mismas llegadas y mismos tiempos de lavado: la diferencia es chica.
    expect(Math.abs(d.metricas.rho.resumen.promedio)).toBeLessThan(0.02)
    expect(Math.abs(d.metricas.wMin.resumen.promedio)).toBeLessThan(0.5)
  })

  it('cambiar de referencia no corre nada: es solo un cálculo sobre lo ya hecho', () => {
    const a = diferenciasContra(escenarios, 'cuatro-puestos')
    const b = diferenciasContra(escenarios, 'cuatro-puestos')
    expect(a).toEqual(b)
    expect(Object.keys(diferenciasContra(escenarios, 'siete-placas'))).toHaveLength(4)
  })
})
