import { describe, expect, it } from 'vitest'

import {
  ACABADO_POR_HORA,
  LAVADO_POR_HORA,
  LLEGADAS_POR_HORA,
} from '../data/parametros.js'
import { metricasMMs } from './formulas.js'
import { crearSimulador, MODO_MMS } from './simulador.js'

/**
 * La simulación contra las fórmulas: la comprobación de que el modelo M/M/s
 * describe el lavadero.
 *
 * En el modo "M/M/s" el acabado usa una sola exponencial con media E[S₂], así
 * que cada etapa es una M/M/s y sus métricas deben coincidir con las de
 * `formulas.js`. Que la etapa 2 también valga, aunque no reciba motos de la
 * calle sino salidas de la etapa 1, es el teorema de Burke: las salidas de una
 * M/M/s en régimen estacionario forman un proceso de Poisson con la misma λ.
 *
 * POR QUÉ 5 RÉPLICAS Y NO UNA CORRIDA LARGA
 * El residuo frente a las fórmulas es varianza, no sesgo: con una sola semilla
 * el error de Lq puede llegar al 20 % incluso con 10.000 horas simuladas,
 * mientras que la media de varias semillas se queda en pocos puntos. Promediar
 * réplicas con semillas fijas mantiene la prueba determinista y la vuelve
 * estable; una sola corrida sería una lotería.
 *
 * DE DÓNDE SALEN LAS TOLERANCIAS
 * Son el error medido de este motor en los cinco escenarios, redondeado hacia
 * arriba con margen (entre 2 y 13 veces el error observado), de modo que un
 * cambio de semilla no rompa la prueba pero un error de fórmula o de
 * contabilidad sí la viole:
 *
 *   métrica | error medido (peor de los 5 escenarios) | tolerancia
 *   ρ       | 0,15 %                                  |  2 %
 *   W       | 5,04 %  (etapa 2 con 4 puestos)         | 12 %
 *   L       | 5,01 %  (etapa 2 con 4 puestos)         | 12 %
 *   Lq      | 6,40 %  (etapa 2 con 4 puestos)         | 15 %
 *   Wq      | 6,43 %  (etapa 2 con 4 puestos)         | 15 %
 *
 * W y L necesitan más margen que lo previsto en el diseño (4 %) porque con
 * ρ = 0,9385 la espera en la cola domina el tiempo total: W = Wq + 1/μ es
 * 71,8 min de los cuales 56 son cola, así que W hereda la varianza de Wq. Con
 * la etapa 1, donde la cola es insignificante, el error de W es del 0,23 %.
 *
 * Lq y Wq llevan además un piso absoluto: con 7 placas la fila está casi
 * siempre vacía (Lq = 0,0095 motos) y el criterio relativo pierde sentido.
 */

const REPLICAS = 5
const HORAS_POR_REPLICA = 4000
const CALENTAMIENTO_HORAS = 200
const SEMILLAS = [1001, 2002, 3003, 4004, 5005]

const TOLERANCIA = {
  rho: 0.02,
  wMin: 0.12,
  l: 0.12,
  lq: 0.15,
  wqMin: 0.15,
}
/** Por debajo de esto, la diferencia absoluta ya es suficientemente pequeña. */
const PISO_ABSOLUTO = {
  lq: 0.02, // motos
  wqMin: 0.05, // minutos
}

/** Promedia las métricas de una etapa sobre varias réplicas con semilla fija. */
function simularEtapa({ etapa, config }) {
  const medias = { rho: 0, l: 0, lq: 0, wMin: 0, wqMin: 0 }
  for (const semilla of SEMILLAS) {
    const motor = crearSimulador({
      semilla,
      modoAcabado: MODO_MMS,
      calentamientoHoras: CALENTAMIENTO_HORAS,
      ...config,
    })
    motor.correrHoras(HORAS_POR_REPLICA + CALENTAMIENTO_HORAS)
    const observadas = motor.metricas()[etapa]
    for (const clave of Object.keys(medias)) {
      medias[clave] += observadas[clave] / REPLICAS
    }
  }
  return medias
}

function compararConLasFormulas({ etapa, config, servicioPorHora, servidores }) {
  const teoricas = metricasMMs({
    llegadasPorHora: LLEGADAS_POR_HORA,
    servicioPorHora,
    servidores,
  })
  expect(teoricas.estable).toBe(true)

  const simuladas = simularEtapa({ etapa, config })

  for (const clave of Object.keys(TOLERANCIA)) {
    const esperado = teoricas[clave]
    const observado = simuladas[clave]
    const errorRelativo = Math.abs(observado - esperado) / esperado
    const dentroDelPiso =
      clave in PISO_ABSOLUTO && Math.abs(observado - esperado) <= PISO_ABSOLUTO[clave]
    expect(
      errorRelativo <= TOLERANCIA[clave] || dentroDelPiso,
      `${clave}: la simulación da ${observado} y la fórmula ${esperado} ` +
        `(error ${(errorRelativo * 100).toFixed(2)} %, tolerancia ${TOLERANCIA[clave] * 100} %)`,
    ).toBe(true)
  }
}

describe('la simulación reproduce las fórmulas: etapa 1 (lavado)', () => {
  for (const placas of [5, 6, 7]) {
    it(`con ${placas} placas`, () => {
      compararConLasFormulas({
        etapa: 'lavado',
        config: { placas },
        servicioPorHora: LAVADO_POR_HORA,
        servidores: placas,
      })
    })
  }
})

describe('la simulación reproduce las fórmulas: etapa 2 (acabado)', () => {
  for (const puestos of [4, 5]) {
    it(`con ${puestos} puestos`, () => {
      compararConLasFormulas({
        etapa: 'acabado',
        config: { puestos },
        servicioPorHora: ACABADO_POR_HORA,
        servidores: puestos,
      })
    })
  }
})

describe('con 3 puestos la fila del acabado crece sin límite', () => {
  const DERIVA_POR_HORA = LLEGADAS_POR_HORA - 3 * ACABADO_POR_HORA // ≈ 2,85 motos/h

  it('no hay valor estable: las fórmulas ni se calculan', () => {
    const teoricas = metricasMMs({
      llegadasPorHora: LLEGADAS_POR_HORA,
      servicioPorHora: ACABADO_POR_HORA,
      servidores: 3,
    })
    expect(teoricas.estable).toBe(false)
    expect(teoricas.rho).toBeGreaterThan(1)
  })

  it('la fila a 3T horas es mucho mayor que a T horas', () => {
    const colaTras = (horas) => {
      const motor = crearSimulador({ semilla: 4242, puestos: 3, modoAcabado: MODO_MMS })
      motor.correrHoras(horas)
      return motor.estado().colaAcabado.length
    }
    const enT = colaTras(100)
    const enTresT = colaTras(300)
    expect(enT).toBeGreaterThan(0)
    expect(enTresT).toBeGreaterThan(2 * enT)
  })

  it('crece al ritmo del exceso de llegadas sobre la capacidad', () => {
    for (const horas of [100, 200, 400]) {
      const motor = crearSimulador({ semilla: 4242, puestos: 3, modoAcabado: MODO_MMS })
      motor.correrHoras(horas)
      const cola = motor.estado().colaAcabado.length
      const deriva = DERIVA_POR_HORA * horas
      expect(cola).toBeGreaterThan(0.5 * deriva)
      expect(cola).toBeLessThan(1.5 * deriva)
    }
  })
})
