import { describe, expect, it } from 'vitest'

import { ACABADO_PLAN_MIN, LAVADO_MIN, LLEGADAS_POR_HORA, PROPORCION_PLAN_EXACTA } from '../data/parametros.js'
import { motorDe, numerosDeLasMetricas } from './corrida.js'
import { acumuladoVacio, acumularEvento, armarResultados, ejecutarLote, piezasDeAvance } from './lote.js'
import { correrObservacion, puntosDeLaMedia, PUNTOS_DE_LA_OBSERVACION } from './observacion.js'
import { horasTotales, MODO_LOTES, MODO_REPLICAS, trabajosDe, validarSolicitud } from './plan.js'
import { formulasDe } from './resumen.js'

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
  semillaBase: 3,
  horas: 1000,
  calentamientoPct: 10,
  replicas: 5,
  lotes: 10,
  mediaAcumulada: true,
  ...cambios,
})

describe('la corrida de observación', () => {
  it('tiene unos 200 puntos repartidos en las horas, sin calentamiento', () => {
    const serie = correrObservacion({ semilla: 3, parametros: parametros(), horas: 1000 })
    expect(serie).toHaveLength(PUNTOS_DE_LA_OBSERVACION)
    expect(serie[0].horas).toBeCloseTo(5, 10)
    expect(serie.at(-1).horas).toBeCloseTo(1000, 6)
  })

  it('el último punto coincide con las métricas del motor para la misma semilla y horas', () => {
    const serie = correrObservacion({ semilla: 3, parametros: parametros(), horas: 400 })
    const motor = motorDe(parametros(), 3, 0)
    motor.correrHoras(400)
    const entera = numerosDeLasMetricas(motor.metricas())
    const { horas, ...ultimo } = serie.at(-1)
    expect(horas).toBeCloseTo(400, 6)
    expect(ultimo).toEqual(entera)
  })

  it('el acumulado de una etapa estable se acerca a las fórmulas', () => {
    const serie = correrObservacion({ semilla: 3, parametros: parametros(), horas: 1000 })
    // ρ varía poco entre corridas; Lq de una sola corrida de 1000 h oscila mucho.
    const puntos = puntosDeLaMedia(serie, 'acabado', 'rho')
    const formula = formulasDe(parametros()).acabado.rho
    expect(Math.abs(puntos.at(-1).valor - formula)).toBeLessThan(0.05)
  })

  it('con 3 puestos el acumulado de la fila 2 sigue creciendo', () => {
    const serie = correrObservacion({ semilla: 3, parametros: parametros({ puestos: 3 }), horas: 1000 })
    const puntos = puntosDeLaMedia(serie, 'acabado', 'lq')
    expect(puntos.at(-1).valor).toBeGreaterThan(puntos[Math.floor(puntos.length / 2)].valor)
  })

  it('el tramo sin motos terminadas se omite en los promedios por moto', () => {
    const serie = correrObservacion({ semilla: 3, parametros: parametros({ llegadasPorHora: 1 }), horas: 100 }, 50)
    expect(puntosDeLaMedia(serie, 'lavado', 'wMin').length).toBeLessThanOrEqual(serie.length)
    for (const punto of puntosDeLaMedia(serie, 'lavado', 'wMin')) expect(punto.valor).toBeGreaterThan(0)
    expect(puntosDeLaMedia(serie, 'lavado', 'rho')).toHaveLength(50)
  })

  it('cambiar de métrica no corre nada: sale de la misma serie', () => {
    const serie = correrObservacion({ semilla: 3, parametros: parametros(), horas: 100 }, 20)
    const lq = puntosDeLaMedia(serie, 'lavado', 'lq')
    const wq = puntosDeLaMedia(serie, 'lavado', 'wqMin')
    expect(lq).toHaveLength(20)
    expect(wq.length).toBeGreaterThan(0)
    expect(serie).toBe(serie)
  })
})

describe('la observación dentro de un lote', () => {
  it('suma sus horas al tope: 100 réplicas de 1000 h son 101 000 h', () => {
    const pedido = solicitud({ replicas: 100 })
    expect(horasTotales(pedido)).toBe(101000)
    expect(validarSolicitud(pedido)).toMatchObject({ valida: true, horasTotales: 101000, trabajos: 101 })
  })

  it('es un trabajo más, sin calentamiento y con la semilla base', () => {
    const trabajos = trabajosDe(solicitud())
    expect(trabajos).toHaveLength(6)
    expect(trabajos.at(-1)).toMatchObject({ tipo: 'observacion', semilla: 3, calentamientoHoras: 0, horas: 1000 })
    expect(piezasDeAvance(solicitud())).toBe(6)
  })

  it('en Medias por lotes también se añade', () => {
    const pedido = solicitud({ modo: MODO_LOTES })
    expect(horasTotales(pedido)).toBe(2000)
    expect(piezasDeAvance(pedido)).toBe(11)
  })

  it('no se añade en Barrido ni en Comparar escenarios', () => {
    expect(horasTotales(solicitud({ modo: 'escenarios' }))).toBe(25000)
    expect(horasTotales(solicitud({ modo: 'barrido', barrido: { parametro: 'puestos', inicio: 4, fin: 5, paso: 1 } }))).toBe(10000)
  })

  it('el lote entrega la serie junto a las réplicas', () => {
    const pedido = solicitud({ horas: 100 })
    let acumulado = acumuladoVacio()
    ejecutarLote(pedido, { alAvanzar: (e) => { acumulado = acumularEvento(acumulado, e) } })
    const resultados = armarResultados(pedido, acumulado)
    expect(resultados.replicas).toHaveLength(5)
    expect(resultados.observacion).toHaveLength(PUNTOS_DE_LA_OBSERVACION)
  })

  it('si no se pide, no hay serie', () => {
    const pedido = solicitud({ horas: 100, mediaAcumulada: false })
    let acumulado = acumuladoVacio()
    ejecutarLote(pedido, { alAvanzar: (e) => { acumulado = acumularEvento(acumulado, e) } })
    expect(armarResultados(pedido, acumulado).observacion).toBeNull()
  })
})
