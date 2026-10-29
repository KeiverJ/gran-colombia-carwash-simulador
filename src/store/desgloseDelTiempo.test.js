import { describe, expect, it } from 'vitest'

import { INICIO_OBSERVACION_MIN, MOTOS_VISITA } from '../data/visita.js'
import { crearSimulador, MODO_MMS } from '../engine/simulador.js'
import { crearReproductor } from '../visita/reproductor.js'
import {
  DIFERENCIA_QUE_SE_AVISA_MIN,
  desgloseDeLaSimulacion,
  desgloseDeLaVisita,
  TRAMOS,
} from './desgloseDelTiempo.js'
import { metricasCalculadas } from './metricas.js'
import { acabadoPromedioDe, useSimulacion } from './simulacion.js'

const porDefecto = () => ({ ...useSimulacion.getState().parametros })

/** Corre el motor con esos parámetros y arma el desglose, como lo hará la gráfica. */
function desgloseCon(parametros, horas = 200) {
  const motor = crearSimulador({
    semilla: 1,
    llegadasPorHora: parametros.llegadasPorHora,
    lavadoMin: parametros.lavadoMin,
    acabadoPlanMin: parametros.acabadoPlanMin,
    acabadoPromedioMin: acabadoPromedioDe(parametros),
    proporcionPlan: parametros.proporcionPlan,
    placas: parametros.placas,
    puestos: parametros.puestos,
    modoAcabado: parametros.modoAcabado,
  })
  motor.correrHoras(horas)
  const metricas = motor.metricas()
  return {
    metricas,
    desglose: desgloseDeLaSimulacion({ metricas, calculadas: metricasCalculadas(parametros), parametros }),
  }
}

describe('el desglose en la simulación', () => {
  it('antes de que salga una moto no hay nada que dibujar', () => {
    const parametros = porDefecto()
    const vacio = desgloseDeLaSimulacion({
      metricas: null,
      calculadas: metricasCalculadas(parametros),
      parametros,
    })
    expect(vacio.vacia).toBe(true)
    expect(vacio.barras).toEqual([])
    const sinMotos = crearSimulador({ semilla: 1 }).metricas()
    expect(
      desgloseDeLaSimulacion({ metricas: sinMotos, calculadas: metricasCalculadas(parametros), parametros }).vacia,
    ).toBe(true)
  })

  it('son cuatro tramos en el orden en que la moto los recorre', () => {
    expect(TRAMOS.map((t) => t.nombre)).toEqual([
      'Espera en la fila 1',
      'Lavado',
      'Espera en la fila 2',
      'Acabado',
    ])
    const { desglose } = desgloseCon(porDefecto())
    expect(desglose.barras[0].nombre).toBe('Simulado')
    expect(desglose.barras[0].tramos.map((t) => t.id)).toEqual(['esperaFila1', 'lavado', 'esperaFila2', 'acabado'])
  })

  it('los tramos salen de Wq y de W menos Wq de cada etapa', () => {
    const { metricas, desglose } = desgloseCon(porDefecto())
    const [espera1, lavado, espera2, acabado] = desglose.barras[0].tramos.map((t) => t.minutos)
    expect(espera1).toBe(metricas.lavado.wqMin)
    expect(lavado).toBeCloseTo(metricas.lavado.wMin - metricas.lavado.wqMin, 12)
    expect(espera2).toBe(metricas.acabado.wqMin)
    expect(acabado).toBeCloseTo(metricas.acabado.wMin - metricas.acabado.wqMin, 12)
  })

  it('los tramos suman el total', () => {
    const { desglose } = desgloseCon({ ...porDefecto(), puestos: 5 })
    for (const barra of desglose.barras) {
      const suma = barra.tramos.reduce((total, tramo) => total + tramo.minutos, 0)
      expect(barra.total).toBeCloseTo(suma, 12)
      for (const tramo of barra.tramos) {
        expect(tramo.minutos).toBeGreaterThanOrEqual(-1e-9)
      }
    }
  })

  it('con 6 placas y 3 puestos no hay barra de fórmulas y la nota nombra el acabado', () => {
    const { desglose } = desgloseCon(porDefecto())
    expect(desglose.barras.map((b) => b.id)).toEqual(['simulado'])
    expect(desglose.notas.join(' ')).toMatch(/el acabado no da abasto/)
    expect(desglose.notas.join(' ')).not.toMatch(/el lavado/)
  })

  it('con 5 puestos hay barra de fórmulas con los mismos cuatro tramos', () => {
    const { desglose } = desgloseCon({ ...porDefecto(), puestos: 5 })
    expect(desglose.barras.map((b) => b.id)).toEqual(['simulado', 'formulas'])
    expect(desglose.barras[1].nombre).toBe('Fórmulas')
    expect(desglose.barras[1].tramos).toHaveLength(4)
  })

  it('la barra de fórmulas sale de las mismas fórmulas de la tabla', () => {
    const parametros = { ...porDefecto(), puestos: 5 }
    const { desglose } = desgloseCon(parametros)
    const calculadas = metricasCalculadas(parametros)
    const [espera1, lavado, espera2, acabado] = desglose.barras[1].tramos.map((t) => t.minutos)
    expect(espera1).toBeCloseTo(calculadas.lavado.wqMin, 12)
    expect(lavado).toBeCloseTo(calculadas.lavado.wMin - calculadas.lavado.wqMin, 12)
    expect(espera2).toBeCloseTo(calculadas.acabado.wqMin, 12)
    expect(acabado).toBeCloseTo(calculadas.acabado.wMin - calculadas.acabado.wqMin, 12)
    expect(desglose.barras[1].total).toBeCloseTo(calculadas.lavado.wMin + calculadas.acabado.wMin, 12)
  })

  it('el tiempo de lavado de las fórmulas es el tiempo medio puesto', () => {
    const parametros = { ...porDefecto(), puestos: 5 }
    const { desglose } = desgloseCon(parametros)
    expect(desglose.barras[1].tramos[1].minutos).toBeCloseTo(parametros.lavadoMin, 9)
    expect(desglose.barras[1].tramos[3].minutos).toBeCloseTo(acabadoPromedioDe(parametros), 9)
  })

  it('si la etapa inestable es el lavado, la nota nombra el lavado', () => {
    const { desglose } = desgloseCon({ ...porDefecto(), placas: 1, puestos: 5 }, 20)
    expect(desglose.barras.map((b) => b.id)).toEqual(['simulado'])
    expect(desglose.notas.join(' ')).toMatch(/el lavado no da abasto/)
  })

  it('si no dan abasto las dos, las nombra a las dos', () => {
    const { desglose } = desgloseCon({ ...porDefecto(), placas: 1, puestos: 1 }, 20)
    expect(desglose.notas.join(' ')).toMatch(/el lavado y el acabado no dan abasto/)
  })

  it('con el modo «Según su plan» avisa de que la comparación es aproximada', () => {
    const { desglose } = desgloseCon({ ...porDefecto(), puestos: 5 })
    expect(desglose.notas.join(' ')).toMatch(/aproximada/)
  })

  it('con un solo promedio (M/M/s) no hay nota de aproximación', () => {
    const { desglose } = desgloseCon({ ...porDefecto(), puestos: 5, modoAcabado: MODO_MMS })
    expect(desglose.notas.join(' ')).not.toMatch(/aproximada/)
  })

  describe('la nota de la diferencia con el total de la tabla', () => {
    const parametros = { ...porDefecto(), puestos: 5, modoAcabado: MODO_MMS }
    const calculadas = metricasCalculadas(parametros)
    const metricasCon = (totalDeLaTabla) => ({
      lavado: { motosContadas: 10, wqMin: 1, wMin: 11 },
      acabado: { motosContadas: 10, wqMin: 2, wMin: 22 },
      total: { wMin: totalDeLaTabla, motosContadas: 10 },
    })

    it('no aparece si el total de la tabla es el mismo', () => {
      const { notas } = desgloseDeLaSimulacion({ metricas: metricasCon(33), calculadas, parametros })
      expect(notas.join(' ')).not.toMatch(/total de la tabla/)
    })

    it('no aparece con menos de 0,1 min de diferencia', () => {
      const { notas } = desgloseDeLaSimulacion({
        metricas: metricasCon(33 + DIFERENCIA_QUE_SE_AVISA_MIN * 0.9),
        calculadas,
        parametros,
      })
      expect(notas.join(' ')).not.toMatch(/total de la tabla/)
    })

    it('aparece con 0,1 min o más', () => {
      for (const total of [33.1, 32.9, 20]) {
        const { notas } = desgloseDeLaSimulacion({ metricas: metricasCon(total), calculadas, parametros })
        expect(notas.join(' ')).toMatch(/total de la tabla/)
      }
    })
  })
})

describe('el desglose en la visita', () => {
  /** El desglose a la hora del reloj, con los datos y el reproductor de verdad. */
  function visitaA(relojMin) {
    const reproductor = crearReproductor()
    reproductor.avanzar(relojMin)
    const desglose = desgloseDeLaVisita({
      motos: MOTOS_VISITA,
      detalle: reproductor.detalleDeLaEtapa2(),
      inicioMin: INICIO_OBSERVACION_MIN,
      relojMin,
    })
    return { desglose, metricas: reproductor.metricas() }
  }

  it('antes de que salga la primera moto no hay nada que dibujar', () => {
    expect(visitaA(0).desglose.vacia).toBe(true)
    expect(visitaA(10).desglose.vacia).toBe(true)
  })

  it('no hay barra de fórmulas', () => {
    const { desglose } = visitaA(140)
    expect(desglose.barras.map((b) => b.id)).toEqual(['reproduccion'])
  })

  it('al terminar, el total es el tiempo total de la pestaña Visita (31,13 min)', () => {
    const { desglose, metricas } = visitaA(140)
    expect(desglose.barras[0].total).toBeCloseTo(metricas.porMoto.tiempoTotalMin, 9)
    expect(desglose.barras[0].total).toBeCloseTo(31.13, 2)
  })

  it('los tramos suman el total', () => {
    for (const reloj of [40, 90, 140]) {
      const { barras } = visitaA(reloj).desglose
      const suma = barras[0].tramos.reduce((total, tramo) => total + tramo.minutos, 0)
      expect(barras[0].total).toBeCloseTo(suma, 12)
    }
  })

  it('al terminar, las esperas son las de la pestaña Visita', () => {
    const { desglose, metricas } = visitaA(140)
    const [espera1, , espera2] = desglose.barras[0].tramos.map((t) => t.minutos)
    expect(espera1).toBeCloseTo(metricas.porMoto.esperaAntesDeLaPlacaMin, 9)
    expect(espera2).toBeCloseTo(metricas.porMoto.esperaEnCola2Min, 9)
  })

  it('a mitad de tarde cuenta solo las motos que ya salieron, como la pestaña Visita', () => {
    const { desglose, metricas } = visitaA(70)
    expect(desglose.barras[0].total).toBeCloseTo(metricas.porMoto.tiempoTotalMin, 9)
  })

  it('el lavado de la visita es lo que tardó cada placa, de entrar a salir', () => {
    const { desglose } = visitaA(140)
    const lavados = MOTOS_VISITA.map((m) => m.salePlacaMin - m.entraPlacaMin)
    const promedio = lavados.reduce((suma, valor) => suma + valor, 0) / lavados.length
    expect(desglose.barras[0].tramos[1].minutos).toBeCloseTo(promedio, 9)
  })

  it('avisa de que los puestos son aproximados', () => {
    expect(visitaA(140).desglose.notas.join(' ')).toMatch(/aproximada/)
  })
})
