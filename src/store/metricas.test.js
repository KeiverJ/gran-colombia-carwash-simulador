import { describe, expect, it } from 'vitest'

import { ACABADO_POR_HORA } from '../data/parametros.js'
import { MODO_MMS, MODO_POR_PLAN } from '../engine/simulador.js'
import {
  avisoDeSaturacion,
  comparacionEsAproximada,
  etapaSaturada,
  metricasCalculadas,
} from './metricas.js'
import { useSimulacion } from './simulacion.js'

const porDefecto = () => ({ ...useSimulacion.getState().parametros })

describe('la columna calculada usa los parámetros que están puestos', () => {
  it('con los valores por defecto reproduce la tabla de la especificación', () => {
    const { lavado, acabado } = metricasCalculadas(porDefecto())
    expect(lavado.rho).toBeCloseTo(0.4234, 4)
    expect(lavado.wqMin).toBeCloseTo(0.16, 2)
    expect(acabado.rho).toBeCloseTo(1.2514, 3)
    expect(acabado.estable).toBe(false)
  })

  it('con 4 y 5 puestos el acabado vuelve a ser estable y cuadra con la tabla', () => {
    const con4 = metricasCalculadas({ ...porDefecto(), puestos: 4 }).acabado
    expect(con4.estable).toBe(true)
    expect(con4.rho).toBeCloseTo(0.9385, 3)
    expect(con4.lq).toBeCloseTo(13.24, 1)

    const con5 = metricasCalculadas({ ...porDefecto(), puestos: 5 }).acabado
    expect(con5.rho).toBeCloseTo(0.7508, 3)
    expect(con5.lq).toBeCloseTo(1.4, 1)
  })

  it('usa el μ₂ recalculado y no la constante del documento', () => {
    const parametros = porDefecto()
    const antes = metricasCalculadas(parametros).servicioAcabadoPorHora

    // Mover un tiempo de acabado tiene que mover la tasa que usan las fórmulas.
    const conPlan2Mas = {
      ...parametros,
      acabadoPlanMin: { ...parametros.acabadoPlanMin, 2: 20 },
    }
    const despues = metricasCalculadas(conPlan2Mas).servicioAcabadoPorHora
    expect(despues).toBeLessThan(antes)
    expect(despues).toBeCloseTo(3.0396, 3)

    // Y con la constante del documento no se movería nunca.
    expect(despues).not.toBeCloseTo(ACABADO_POR_HORA, 3)
  })

  it('mover las proporciones también mueve la columna calculada', () => {
    const parametros = porDefecto()
    const antes = metricasCalculadas(parametros).servicioAcabadoPorHora
    const todasPlan3 = { ...parametros, proporcionPlan: { 1: 0, 2: 0, 3: 1 } }
    expect(metricasCalculadas(todasPlan3).servicioAcabadoPorHora).not.toBeCloseTo(antes, 4)
  })

  it('la tasa de lavado sale del tiempo medio de lavado', () => {
    const parametros = { ...porDefecto(), lavadoMin: 12 }
    expect(metricasCalculadas(parametros).servicioLavadoPorHora).toBeCloseTo(5, 10)
  })
})

describe('aviso de saturación', () => {
  it('avisa del acabado con los valores por defecto', () => {
    const avisos = avisoDeSaturacion(porDefecto())
    expect(avisos).toHaveLength(1)
    expect(avisos[0].etapa).toBe('acabado')
    expect(avisos[0].llegadasDeSaturacionPorHora).toBeCloseTo(11.34, 2)
    expect(avisos[0].texto).toMatch(/11,34 motos por hora/)
    expect(avisos[0].texto).toMatch(/crece sin parar/)
  })

  it('con 4 puestos ya no hay aviso', () => {
    expect(avisoDeSaturacion({ ...porDefecto(), puestos: 4 })).toHaveLength(0)
  })

  it('avisa también del lavado si se satura', () => {
    // λ muy alta: ni 7 placas dan abasto (7 · 5,5871 = 39,1 motos/h).
    const avisos = avisoDeSaturacion({ ...porDefecto(), llegadasPorHora: 45, placas: 7 })
    expect(avisos.map((a) => a.etapa)).toContain('lavado')
  })

  it('etapaSaturada responde por etapa', () => {
    expect(etapaSaturada(porDefecto(), 'acabado')).toBe(true)
    expect(etapaSaturada(porDefecto(), 'lavado')).toBe(false)
    expect(etapaSaturada({ ...porDefecto(), puestos: 5 }, 'acabado')).toBe(false)
  })
})

describe('cuándo la comparación es aproximada', () => {
  it('en el modo por plan sí', () => {
    expect(comparacionEsAproximada({ ...porDefecto(), modoAcabado: MODO_POR_PLAN })).toBe(true)
  })

  it('en el modo M/M/s no', () => {
    expect(comparacionEsAproximada({ ...porDefecto(), modoAcabado: MODO_MMS })).toBe(false)
  })
})
