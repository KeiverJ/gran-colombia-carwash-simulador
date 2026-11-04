import { describe, expect, it } from 'vitest'

import { ACABADO_PLAN_MIN, LAVADO_MIN, LLEGADAS_POR_HORA, PROPORCION_PLAN_EXACTA } from '../data/parametros.js'
import {
  acabadoPromedioDeLosParametros,
  horasTotales,
  MODO_BARRIDO,
  MODO_ESCENARIOS,
  MODO_LOTES,
  MODO_REPLICAS,
  parametrosConElValor,
  TOPE_DE_HORAS,
  trabajosDe,
  validarSolicitud,
  valoresDelBarrido,
} from './plan.js'

const parametros = () => ({
  llegadasPorHora: LLEGADAS_POR_HORA,
  lavadoMin: LAVADO_MIN,
  acabadoPlanMin: { ...ACABADO_PLAN_MIN },
  proporcionPlan: { ...PROPORCION_PLAN_EXACTA },
  placas: 6,
  puestos: 3,
  modoAcabado: 'por-plan',
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
  barrido: { parametro: 'llegadasPorHora', inicio: 8, fin: 16, paso: 0.5 },
  ...cambios,
})

describe('réplicas y lotes', () => {
  it('acepta de 5 a 100 réplicas y rechaza 4 y 101', () => {
    expect(validarSolicitud(solicitud({ replicas: 5 })).valida).toBe(true)
    expect(validarSolicitud(solicitud({ replicas: 100, horas: 100 })).valida).toBe(true)
    const pocas = validarSolicitud(solicitud({ replicas: 4 }))
    expect(pocas.valida).toBe(false)
    expect(pocas.mensaje).toMatch(/5 a 100/)
    expect(validarSolicitud(solicitud({ replicas: 101 })).valida).toBe(false)
    expect(validarSolicitud(solicitud({ replicas: 10.5 })).valida).toBe(false)
  })

  it('acepta de 10 a 50 lotes y rechaza 9 y 51', () => {
    expect(validarSolicitud(solicitud({ modo: MODO_LOTES, lotes: 10 })).valida).toBe(true)
    expect(validarSolicitud(solicitud({ modo: MODO_LOTES, lotes: 50 })).valida).toBe(true)
    const pocos = validarSolicitud(solicitud({ modo: MODO_LOTES, lotes: 9 }))
    expect(pocos.valida).toBe(false)
    expect(pocos.mensaje).toMatch(/10 a 50/)
    expect(validarSolicitud(solicitud({ modo: MODO_LOTES, lotes: 51 })).valida).toBe(false)
  })

  it('solo admite 100, 1000 o 5000 horas', () => {
    expect(validarSolicitud(solicitud({ horas: 500 })).valida).toBe(false)
    expect(validarSolicitud(solicitud({ horas: 5000, replicas: 10 })).valida).toBe(true)
  })

  it('el calentamiento va de 0 a 50 %', () => {
    expect(validarSolicitud(solicitud({ calentamientoPct: 0 })).valida).toBe(true)
    expect(validarSolicitud(solicitud({ calentamientoPct: 50 })).valida).toBe(true)
    const mucho = validarSolicitud(solicitud({ calentamientoPct: 51 }))
    expect(mucho.valida).toBe(false)
    expect(mucho.mensaje).toMatch(/0 a 50/)
    expect(validarSolicitud(solicitud({ calentamientoPct: -1 })).valida).toBe(false)
    expect(validarSolicitud(solicitud({ calentamientoPct: Number.NaN })).valida).toBe(false)
  })

  it('rechaza una semilla fuera de rango o parámetros que no sirven', () => {
    expect(validarSolicitud(solicitud({ semillaBase: -1 })).valida).toBe(false)
    expect(validarSolicitud(solicitud({ semillaBase: 4294967296 })).valida).toBe(false)
    expect(validarSolicitud(solicitud({ parametros: { ...parametros(), placas: 15 } })).valida).toBe(false)
  })
})

describe('el tope de horas', () => {
  it('100 réplicas de 5000 h son 500 000 h y pasan del tope', () => {
    const pedido = solicitud({ replicas: 100, horas: 5000 })
    expect(horasTotales(pedido)).toBe(500000)
    const resultado = validarSolicitud(pedido)
    expect(resultado.valida).toBe(false)
    expect(resultado.mensaje).toContain('500.000')
    expect(resultado.mensaje).toContain('200.000')
  })

  it('30 réplicas de 1000 h son 30 000 h y caben', () => {
    const resultado = validarSolicitud(solicitud())
    expect(resultado).toMatchObject({ valida: true, horasTotales: 30000, trabajos: 30 })
  })

  it('justo en el tope cabe', () => {
    expect(horasTotales(solicitud({ replicas: 40, horas: 5000 }))).toBe(TOPE_DE_HORAS)
    expect(validarSolicitud(solicitud({ replicas: 40, horas: 5000 })).valida).toBe(true)
  })

  it('la corrida de observación suma sus horas', () => {
    const pedido = solicitud({ replicas: 100, horas: 1000, mediaAcumulada: true })
    expect(horasTotales(pedido)).toBe(101000)
    expect(trabajosDe(pedido)).toHaveLength(101)
    expect(trabajosDe(pedido).at(-1)).toMatchObject({ tipo: 'observacion', calentamientoHoras: 0, semilla: 1 })
  })

  it('un barrido de 30 valores con 20 réplicas de 1000 h pide 600 000 h y no cabe', () => {
    const pedido = solicitud({
      modo: MODO_BARRIDO,
      replicas: 20,
      barrido: { parametro: 'llegadasPorHora', inicio: 1, fin: 30, paso: 1 },
    })
    expect(horasTotales(pedido)).toBe(600000)
    expect(validarSolicitud(pedido).valida).toBe(false)
  })

  it('Comparar escenarios cuenta cinco escenarios', () => {
    expect(horasTotales(solicitud({ modo: MODO_ESCENARIOS, replicas: 20 }))).toBe(100000)
  })

  it('las medias por lotes son una sola corrida', () => {
    expect(horasTotales(solicitud({ modo: MODO_LOTES, horas: 5000 }))).toBe(5000)
  })
})

describe('las semillas y los trabajos', () => {
  it('la réplica i usa la semilla base + i', () => {
    const trabajos = trabajosDe(solicitud({ semillaBase: 1000, replicas: 5 }))
    expect(trabajos.map((t) => t.semilla)).toEqual([1000, 1001, 1002, 1003, 1004])
  })

  it('el calentamiento sale del porcentaje de las horas', () => {
    expect(trabajosDe(solicitud({ horas: 1000, calentamientoPct: 10 }))[0].calentamientoHoras).toBe(100)
    expect(trabajosDe(solicitud({ horas: 5000, calentamientoPct: 20, replicas: 5 }))[0].calentamientoHoras).toBe(1000)
  })

  it('cada valor del barrido y cada escenario usan las mismas semillas', () => {
    const barrido = trabajosDe(solicitud({ modo: MODO_BARRIDO, semillaBase: 7, replicas: 5, barrido: { parametro: 'puestos', inicio: 3, fin: 5, paso: 1 } }))
    expect(barrido).toHaveLength(15)
    for (const clave of [3, 4, 5]) {
      expect(barrido.filter((t) => t.clave === clave).map((t) => t.semilla)).toEqual([7, 8, 9, 10, 11])
    }
    const escenarios = trabajosDe(solicitud({ modo: MODO_ESCENARIOS, semillaBase: 7, replicas: 5 }))
    expect(escenarios).toHaveLength(25)
    expect(escenarios.filter((t) => t.clave === 'cinco-placas').map((t) => t.semilla)).toEqual([7, 8, 9, 10, 11])
  })

  it('cada escenario toma sus placas y puestos y el resto de los parámetros del lote', () => {
    const trabajos = trabajosDe(solicitud({ modo: MODO_ESCENARIOS, replicas: 5, parametros: { ...parametros(), llegadasPorHora: 10 } }))
    const cuatro = trabajos.find((t) => t.clave === 'cuatro-puestos')
    expect(cuatro.parametros).toMatchObject({ placas: 6, puestos: 4, llegadasPorHora: 10 })
    const sieteP = trabajos.find((t) => t.clave === 'siete-placas')
    expect(sieteP.parametros).toMatchObject({ placas: 7, puestos: 3 })
  })

  it('la semilla se envuelve a 32 bits', () => {
    const trabajos = trabajosDe(solicitud({ semillaBase: 4294967295, replicas: 5 }))
    expect(trabajos.map((t) => t.semilla)).toEqual([4294967295, 0, 1, 2, 3])
  })
})

describe('el barrido', () => {
  it('rechaza más de 30 valores', () => {
    const pedido = solicitud({ modo: MODO_BARRIDO, barrido: { parametro: 'llegadasPorHora', inicio: 1, fin: 16, paso: 0.5 } })
    const resultado = validarSolicitud(pedido)
    expect(resultado.valida).toBe(false)
    expect(resultado.mensaje).toMatch(/31 valores y el máximo es 30/)
  })

  it('acepta exactamente 30 valores', () => {
    const pedido = solicitud({ modo: MODO_BARRIDO, replicas: 5, barrido: { parametro: 'llegadasPorHora', inicio: 1, fin: 30, paso: 1 } })
    expect(validarSolicitud(pedido).valida).toBe(true)
  })

  it('rechaza las placas de 1 a 15', () => {
    const pedido = solicitud({ modo: MODO_BARRIDO, barrido: { parametro: 'placas', inicio: 1, fin: 15, paso: 1 } })
    const resultado = validarSolicitud(pedido)
    expect(resultado.valida).toBe(false)
    expect(resultado.mensaje).toMatch(/1 a 14/)
  })

  it('rechaza puestos fuera de 1 a 7 y tiempos fuera de 0,5 a 120', () => {
    expect(validarSolicitud(solicitud({ modo: MODO_BARRIDO, barrido: { parametro: 'puestos', inicio: 1, fin: 8, paso: 1 } })).valida).toBe(false)
    expect(validarSolicitud(solicitud({ modo: MODO_BARRIDO, barrido: { parametro: 'lavadoMin', inicio: 0.4, fin: 2, paso: 0.4 } })).valida).toBe(false)
    expect(validarSolicitud(solicitud({ modo: MODO_BARRIDO, barrido: { parametro: 'lavadoMin', inicio: 5, fin: 15, paso: 5 } })).valida).toBe(true)
  })

  it('rechaza inicio mayor que fin, paso 0 y placas con decimales', () => {
    expect(validarSolicitud(solicitud({ modo: MODO_BARRIDO, barrido: { parametro: 'puestos', inicio: 5, fin: 3, paso: 1 } })).valida).toBe(false)
    expect(validarSolicitud(solicitud({ modo: MODO_BARRIDO, barrido: { parametro: 'puestos', inicio: 3, fin: 5, paso: 0 } })).valida).toBe(false)
    expect(validarSolicitud(solicitud({ modo: MODO_BARRIDO, barrido: { parametro: 'placas', inicio: 4, fin: 6, paso: 0.5 } })).valida).toBe(false)
    expect(validarSolicitud(solicitud({ modo: MODO_BARRIDO, barrido: { parametro: 'nada', inicio: 1, fin: 2, paso: 1 } })).valida).toBe(false)
  })

  it('los valores salen sin errores de redondeo', () => {
    expect(valoresDelBarrido({ inicio: 0.1, fin: 0.5, paso: 0.1 })).toEqual([0.1, 0.2, 0.3, 0.4, 0.5])
    expect(valoresDelBarrido({ inicio: 8, fin: 16, paso: 0.5 })).toHaveLength(17)
    expect(valoresDelBarrido({ inicio: 1, fin: 10, paso: 3 })).toEqual([1, 4, 7, 10])
    expect(valoresDelBarrido({ inicio: 3, fin: 5, paso: 1 })).toEqual([3, 4, 5])
    expect(valoresDelBarrido({ inicio: 5, fin: 3, paso: 1 })).toBeNull()
  })

  it('el tiempo de acabado escalado conserva las proporciones entre planes', () => {
    const base = parametros()
    const promedio = acabadoPromedioDeLosParametros(base)
    expect(promedio).toBeCloseTo(15.8696, 3)
    const nuevo = parametrosConElValor(base, 'acabadoMin', 12)
    expect(acabadoPromedioDeLosParametros(nuevo)).toBeCloseTo(12, 10)
    expect(nuevo.acabadoPlanMin[3] / nuevo.acabadoPlanMin[2]).toBeCloseTo(base.acabadoPlanMin[3] / base.acabadoPlanMin[2], 12)
    // No toca los parámetros originales.
    expect(base.acabadoPlanMin).toEqual(ACABADO_PLAN_MIN)
  })

  it('un acabado promedio que deja un plan fuera de rango no arranca y dice cuál', () => {
    const pedido = solicitud({ modo: MODO_BARRIDO, barrido: { parametro: 'acabadoMin', inicio: 0.1, fin: 0.5, paso: 0.1 } })
    const resultado = validarSolicitud(pedido)
    expect(resultado.valida).toBe(false)
    expect(resultado.mensaje).toMatch(/plan/)
    expect(validarSolicitud(solicitud({ modo: MODO_BARRIDO, barrido: { parametro: 'acabadoMin', inicio: 10, fin: 14, paso: 2 } })).valida).toBe(true)
  })
})
