import { describe, expect, it } from 'vitest'

import { ACABADO_PLAN_MIN, LAVADO_MIN, LLEGADAS_POR_HORA, PROPORCION_PLAN_EXACTA } from '../data/parametros.js'
import { acumuladoVacio, acumularEvento, armarResultados, ejecutarLote, piezasDeAvance } from './lote.js'
import { MODO_BARRIDO, MODO_ESCENARIOS, MODO_REPLICAS } from './plan.js'

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
  horas: 100,
  calentamientoPct: 10,
  replicas: 5,
  lotes: 10,
  mediaAcumulada: false,
  barrido: { parametro: 'puestos', inicio: 4, fin: 5, paso: 1 },
  ...cambios,
})

/** Corre el lote entero y devuelve sus resultados. */
function correr(pedido, { cancelarDespuesDe = Infinity } = {}) {
  let acumulado = acumuladoVacio()
  let vistos = 0
  const salida = ejecutarLote(pedido, {
    alAvanzar: (evento) => {
      vistos += 1
      acumulado = acumularEvento(acumulado, evento)
    },
    estaCancelado: () => vistos >= cancelarDespuesDe,
  })
  return { ...salida, resultados: armarResultados(pedido, acumulado), acumulado }
}

describe('ejecutar un lote', () => {
  it('con la misma semilla base da resultados idénticos', () => {
    const a = correr(solicitud())
    const b = correr(solicitud())
    expect(a.resultados).toEqual(b.resultados)
  })

  it('con otra semilla base cambian los promedios', () => {
    const a = correr(solicitud({ semillaBase: 1 }))
    const b = correr(solicitud({ semillaBase: 1000 }))
    expect(a.resultados.resumen.acabado.metricas.lq.promedio).not.toBe(b.resultados.resumen.acabado.metricas.lq.promedio)
  })

  it('la réplica i usa la semilla base + i', () => {
    const { resultados } = correr(solicitud({ semillaBase: 40 }))
    expect(resultados.replicas.map((r) => r.semilla)).toEqual([40, 41, 42, 43, 44])
  })

  it('avisa del avance con hechas y pedidas', () => {
    const eventos = []
    ejecutarLote(solicitud(), { alAvanzar: (e) => eventos.push([e.hechas, e.pedidas]) })
    expect(eventos).toEqual([[1, 5], [2, 5], [3, 5], [4, 5], [5, 5]])
    expect(piezasDeAvance(solicitud())).toBe(5)
  })

  it('no arranca con una solicitud que no sirve', () => {
    expect(() => ejecutarLote(solicitud({ replicas: 4 }))).toThrow(RangeError)
  })

  it('el calentamiento de 0 % cuenta desde el instante 0', () => {
    const sin = correr(solicitud({ calentamientoPct: 0 })).resultados.replicas[0]
    const con = correr(solicitud({ calentamientoPct: 10 })).resultados.replicas[0]
    expect(sin.lavado.rho).not.toBe(con.lavado.rho)
  })
})

describe('cancelar', () => {
  it('a la mitad deja exactamente las réplicas terminadas', () => {
    const { estado, hechas, resultados, acumulado } = correr(solicitud({ replicas: 10 }), { cancelarDespuesDe: 4 })
    expect(estado).toBe('cancelado')
    expect(hechas).toBe(4)
    expect(resultados.hechas).toBe(4)
    expect(resultados.pedidas).toBe(10)
    expect(resultados.resumen.n).toBe(4)
    expect(acumulado.hechas).toBe(4)
  })

  it('las réplicas terminadas son las mismas que en un lote completo', () => {
    const entero = correr(solicitud({ replicas: 10 })).resultados.replicas
    const parcial = correr(solicitud({ replicas: 10 }), { cancelarDespuesDe: 4 }).resultados.replicas
    expect(parcial).toEqual(entero.slice(0, 4))
  })

  it('con una sola réplica terminada hay promedio y no intervalo', () => {
    const { resultados } = correr(solicitud(), { cancelarDespuesDe: 1 })
    expect(resultados.resumen.lavado.metricas.rho.resumen.n).toBe(1)
    expect(resultados.resumen.lavado.metricas.rho.resumen.inferior).toBeNull()
  })

  it('sin corridas terminadas no hay resultados', () => {
    const { estado, resultados } = correr(solicitud(), { cancelarDespuesDe: 0 })
    expect(estado).toBe('cancelado')
    expect(resultados.hechas).toBe(0)
    expect(resultados.resumen).toBeNull()
  })

  it('un barrido cancelado deja los valores terminados y los que faltan', () => {
    const pedido = solicitud({ modo: MODO_BARRIDO, replicas: 5, barrido: { parametro: 'puestos', inicio: 3, fin: 5, paso: 1 } })
    const { resultados } = correr(pedido, { cancelarDespuesDe: 7 })
    expect(resultados.puntos.map((p) => p.hechas)).toEqual([5, 2, 0])
    expect(resultados.puntos[2].resumen).toBeNull()
    expect(resultados.puntos[0].resumen.n).toBe(5)
  })
})

describe('barrido y comparación', () => {
  it('el barrido usa las mismas semillas en cada valor', () => {
    const pedido = solicitud({ modo: MODO_BARRIDO, replicas: 5, semillaBase: 9, barrido: { parametro: 'puestos', inicio: 4, fin: 5, paso: 1 } })
    const { resultados } = correr(pedido)
    for (const punto of resultados.puntos) {
      expect(punto.replicas.map((r) => r.semilla)).toEqual([9, 10, 11, 12, 13])
    }
    expect(resultados.puntos[0].parametros.puestos).toBe(4)
    expect(resultados.puntos[1].parametros.puestos).toBe(5)
  })

  it('la comparación trae un bloque por cada uno de los cinco escenarios', () => {
    const { resultados } = correr(solicitud({ modo: MODO_ESCENARIOS, horas: 100 }))
    expect(resultados.escenarios.map((e) => e.id)).toEqual(['actual', 'cuatro-puestos', 'cinco-puestos', 'cinco-placas', 'siete-placas'])
    expect(resultados.escenarios.every((e) => e.hechas === 5)).toBe(true)
    expect(resultados.escenarios[3].parametros).toMatchObject({ placas: 5, puestos: 3 })
  })
})
