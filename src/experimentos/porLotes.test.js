import { describe, expect, it } from 'vitest'

import { ACABADO_PLAN_MIN, LAVADO_MIN, LLEGADAS_POR_HORA, PROPORCION_PLAN_EXACTA } from '../data/parametros.js'
import { motorDe, numerosDeLasMetricas } from './corrida.js'
import { acumuladoVacio, acumularEvento, armarResultados, ejecutarLote } from './lote.js'
import { MODO_LOTES, validarSolicitud } from './plan.js'
import { correrPorLotes } from './porLotes.js'
import { promedio } from './estadistica.js'

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

const trabajo = (cambios = {}) => ({
  semilla: 1,
  parametros: parametros(),
  horas: 1000,
  calentamientoHoras: 100,
  lotes: 30,
  ...cambios,
})

const solicitud = (cambios = {}) => ({
  modo: MODO_LOTES,
  parametros: parametros(),
  semillaBase: 1,
  horas: 1000,
  calentamientoPct: 10,
  replicas: 30,
  lotes: 30,
  mediaAcumulada: false,
  ...cambios,
})

function recoger(t, opciones = {}) {
  const lotes = []
  const salida = correrPorLotes(t, { alLote: (l) => lotes.push(l), ...opciones })
  return { lotes, ...salida }
}

describe('las medias de cada lote', () => {
  it('hay k lotes y cada uno trae las medias de las dos etapas y del total', () => {
    const { lotes, terminado, hechos } = recoger(trabajo({ lotes: 10 }))
    expect(terminado).toBe(true)
    expect(hechos).toBe(10)
    expect(lotes.map((l) => l.numero)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
    expect(Object.keys(lotes[0].medias.lavado).sort()).toEqual(['l', 'lq', 'motos', 'rho', 'wMin', 'wqMin'])
    expect(Object.keys(lotes[0].medias.total).sort()).toEqual(['l', 'motos', 'wMin'])
    expect(lotes[0].filas).toEqual({ lavado: expect.any(Number), acabado: expect.any(Number) })
  })

  it('el promedio de las medias de ρ, L y Lq coincide con el de toda la corrida', () => {
    const t = trabajo()
    const { lotes } = recoger(t)
    const motor = motorDe(t.parametros, t.semilla, t.calentamientoHoras)
    motor.correrHoras(t.horas)
    const entera = numerosDeLasMetricas(motor.metricas())
    for (const etapa of ['lavado', 'acabado']) {
      for (const clave of ['rho', 'l', 'lq']) {
        const medias = lotes.map((l) => l.medias[etapa][clave])
        expect(Math.abs(promedio(medias) - entera[etapa][clave]), `${etapa}.${clave}`).toBeLessThan(1e-9)
      }
    }
    expect(Math.abs(promedio(lotes.map((l) => l.medias.total.l)) - entera.total.l)).toBeLessThan(1e-9)
  })

  it('las motos por lote suman las de toda la corrida y W pondera por motos', () => {
    const t = trabajo()
    const { lotes } = recoger(t)
    const motor = motorDe(t.parametros, t.semilla, t.calentamientoHoras)
    motor.correrHoras(t.horas)
    const entera = numerosDeLasMetricas(motor.metricas())
    expect(lotes.reduce((suma, l) => suma + l.medias.lavado.motos, 0)).toBe(entera.lavado.motosContadas)
    expect(lotes.reduce((suma, l) => suma + l.medias.acabado.motos, 0)).toBe(entera.acabado.motosContadas)
    const ponderado = lotes.reduce((suma, l) => suma + l.medias.acabado.wMin * l.medias.acabado.motos, 0) / entera.acabado.motosContadas
    expect(Math.abs(ponderado - entera.acabado.wMin)).toBeLessThan(1e-8)
  })

  it('sin calentamiento cuenta desde el instante 0', () => {
    const t = trabajo({ calentamientoHoras: 0, lotes: 10 })
    const { lotes } = recoger(t)
    const motor = motorDe(t.parametros, t.semilla, 0)
    motor.correrHoras(t.horas)
    expect(Math.abs(promedio(lotes.map((l) => l.medias.lavado.rho)) - motor.metricas().lavado.rho)).toBeLessThan(1e-9)
  })

  it('con la misma semilla da exactamente lo mismo', () => {
    expect(recoger(trabajo({ lotes: 10 })).lotes).toEqual(recoger(trabajo({ lotes: 10 })).lotes)
  })

  it('cancelar deja los lotes terminados', () => {
    let vistos = 0
    const { lotes, terminado, hechos } = recoger(trabajo({ lotes: 20 }), {
      alLote: () => {
        vistos += 1
      },
      estaCancelado: () => vistos >= 7,
    })
    expect(terminado).toBe(false)
    expect(hechos).toBe(7)
    expect(lotes).toEqual([])
    expect(vistos).toBe(7)
  })
})

describe('el modo completo', () => {
  function correr(pedido, cancelarDespuesDe = Infinity) {
    let acumulado = acumuladoVacio()
    let vistos = 0
    const salida = ejecutarLote(pedido, {
      alAvanzar: (e) => {
        vistos += 1
        acumulado = acumularEvento(acumulado, e)
      },
      estaCancelado: () => vistos >= cancelarDespuesDe,
    })
    return { ...salida, resultados: armarResultados(pedido, acumulado) }
  }

  it('rechaza 9 y 51 lotes', () => {
    expect(validarSolicitud(solicitud({ lotes: 9 })).valida).toBe(false)
    expect(validarSolicitud(solicitud({ lotes: 51 })).valida).toBe(false)
    expect(validarSolicitud(solicitud({ lotes: 10 })).valida).toBe(true)
  })

  it('con 6 placas y 5 puestos las fórmulas caen dentro del intervalo en la gran mayoría', () => {
    let dentro = 0
    let total = 0
    for (const semillaBase of [1, 51, 101, 151]) {
      const { resultados } = correr(solicitud({ semillaBase, horas: 5000, lotes: 50 }))
      expect(resultados.hechos).toBe(50)
      for (const nombre of ['lavado', 'acabado', 'total']) {
        for (const metrica of Object.values(resultados.resumen[nombre].metricas)) {
          total += 1
          if (metrica.dentro) dentro += 1
        }
      }
    }
    expect(total).toBe(48)
    // Los lotes vecinos pueden parecerse entre sí, así que se pide un poco menos que a las réplicas.
    expect(dentro / total).toBeGreaterThanOrEqual(0.8)
  }, 60000)

  it('con 3 puestos el acabado sale inestable, sin intervalo, y su fila crece', () => {
    const { resultados } = correr(solicitud({ parametros: parametros({ puestos: 3 }) }))
    expect(resultados.resumen.acabado.estable).toBe(false)
    expect(resultados.resumen.acabado.metricas.lq.resumen).toBeNull()
    expect(resultados.resumen.acabado.filas.despues).toBeGreaterThan(resultados.resumen.acabado.filas.antes)
    expect(resultados.resumen.lavado.metricas.rho.resumen.n).toBe(30)
  })

  it('cancelado deja los lotes hechos y con menos de 2 no hay intervalo', () => {
    const parcial = correr(solicitud({ lotes: 20 }), 5)
    expect(parcial.estado).toBe('cancelado')
    expect(parcial.resultados.hechos).toBe(5)
    expect(parcial.resultados.pedidos).toBe(20)
    expect(parcial.resultados.resumen.lavado.metricas.rho.resumen.n).toBe(5)
    const uno = correr(solicitud({ lotes: 20 }), 1)
    expect(uno.resultados.resumen.lavado.metricas.rho.resumen.inferior).toBeNull()
    const ninguno = correr(solicitud({ lotes: 20 }), 0)
    expect(ninguno.resultados.resumen).toBeNull()
  })

  it('los lotes de un lote cancelado son los primeros del lote completo', () => {
    const entero = correr(solicitud({ lotes: 20 })).resultados.lotes
    const parcial = correr(solicitud({ lotes: 20 }), 5).resultados.lotes
    expect(parcial).toEqual(entero.slice(0, 5))
  })
})
