import { describe, expect, it } from 'vitest'

import {
  ACABADO_POR_HORA,
  LAVADO_POR_HORA,
  LLEGADAS_POR_HORA,
} from '../data/parametros.js'
import { metricasMMs } from './formulas.js'

/**
 * Los parámetros (λ, μ₁, μ₂) se importan de src/data/parametros.js a propósito:
 * si alguien corrige un parámetro medido sin actualizar la tabla de resultados
 * esperados, estas pruebas fallan y avisan de la incoherencia.
 *
 * Los valores esperados sí van escritos aquí: son la tabla de la sección 3 de
 * docs/especificacion_simulador.md (corrección del 23-oct-2026), que es la
 * referencia contra la que se compara. Cada celda va como [valor, decimales] y
 * la tolerancia es una unidad del último decimal con que la tabla la imprime.
 * Las celdas que en la tabla dicen "—" no aparecen y no se comprueban.
 */

const ETIQUETAS = {
  rho: 'ρ',
  p0: 'P₀',
  lq: 'Lq',
  wqMin: 'Wq (min)',
  wMin: 'W (min)',
  l: 'L',
}

function esperarCelda(resultado, clave, [esperado, decimales]) {
  const calculado = resultado[clave]
  const tolerancia = 10 ** -decimales
  expect(
    Math.abs(calculado - esperado) <= tolerancia,
    `${ETIQUETAS[clave]}: se calculó ${calculado}, la tabla dice ${esperado} (tolerancia ${tolerancia})`,
  ).toBe(true)
}

function comprobarFila(servicioPorHora, { servidores, ...celdas }) {
  const resultado = metricasMMs({
    llegadasPorHora: LLEGADAS_POR_HORA,
    servicioPorHora,
    servidores,
  })
  expect(resultado.estable).toBe(true)
  for (const clave of Object.keys(ETIQUETAS)) {
    if (clave in celdas) {
      esperarCelda(resultado, clave, celdas[clave])
    }
  }
}

describe('etapa 1, lavado (tabla de la sección 3)', () => {
  it('con 5 placas', () => {
    comprobarFila(LAVADO_POR_HORA, {
      servidores: 5,
      rho: [0.508, 3],
      p0: [0.077, 3],
      lq: [0.14, 2],
      wqMin: [0.6, 2],
      wMin: [11.34, 2],
    })
  })

  it('con 6 placas (situación actual)', () => {
    comprobarFila(LAVADO_POR_HORA, {
      servidores: 6,
      rho: [0.4234, 4],
      p0: [0.07834, 5],
      lq: [0.0372, 4],
      wqMin: [0.16, 2],
      wMin: [10.9, 2],
      l: [2.58, 2],
    })
  })

  it('con 7 placas', () => {
    comprobarFila(LAVADO_POR_HORA, {
      servidores: 7,
      rho: [0.363, 3],
      p0: [0.079, 3],
      lq: [0.01, 2],
      wqMin: [0.04, 2],
      wMin: [10.78, 2],
    })
  })
})

describe('etapa 2, acabado (tabla de la sección 3)', () => {
  it('con 3 puestos (situación actual): saturada', () => {
    const resultado = metricasMMs({
      llegadasPorHora: LLEGADAS_POR_HORA,
      servicioPorHora: ACABADO_POR_HORA,
      servidores: 3,
    })
    expect(resultado.estable).toBe(false)
    esperarCelda(resultado, 'rho', [1.2514, 4])
    // La tabla pone "inestable" en P₀ y "—" en el resto: no se calculan.
    expect(resultado.p0).toBeUndefined()
    expect(resultado.lq).toBeUndefined()
    expect(resultado.wqMin).toBeUndefined()
    expect(resultado.wMin).toBeUndefined()
    expect(resultado.l).toBeUndefined()
  })

  it('con 4 puestos', () => {
    comprobarFila(ACABADO_POR_HORA, {
      servidores: 4,
      rho: [0.9385, 4],
      p0: [0.00644, 5],
      lq: [13.24, 2],
      wqMin: [56.0, 1],
      wMin: [71.8, 1],
      l: [16.99, 2],
    })
  })

  it('con 5 puestos', () => {
    comprobarFila(ACABADO_POR_HORA, {
      servidores: 5,
      rho: [0.7508, 4],
      p0: [0.01858, 5],
      lq: [1.4, 2],
      wqMin: [5.9, 1],
      wMin: [21.8, 1],
      l: [5.15, 2],
    })
  })
})

describe('frontera de estabilidad de la etapa 2 (texto de la sección 3)', () => {
  it('con 3 puestos la etapa se satura desde λ = 3·μ₂', () => {
    const enElLimite = metricasMMs({
      llegadasPorHora: 3 * ACABADO_POR_HORA,
      servicioPorHora: ACABADO_POR_HORA,
      servidores: 3,
    })
    expect(enElLimite.rho).toBe(1)
    expect(enElLimite.estable).toBe(false)

    // Un pelo por debajo de 3·μ₂ (11,34 motos/h) sí es estable.
    const justoDebajo = metricasMMs({
      llegadasPorHora: 3 * ACABADO_POR_HORA - 0.01,
      servicioPorHora: ACABADO_POR_HORA,
      servidores: 3,
    })
    expect(justoDebajo.estable).toBe(true)
  })

  it('para que 3 puestos basten, el acabado debe durar menos de 12,7 min', () => {
    const conAcabadoDe = (minutos) =>
      metricasMMs({
        llegadasPorHora: LLEGADAS_POR_HORA,
        servicioPorHora: 60 / minutos,
        servidores: 3,
      })

    expect(conAcabadoDe(12.6).estable).toBe(true)
    expect(conAcabadoDe(12.7).estable).toBe(false)
    expect(conAcabadoDe(15.8696).estable).toBe(false)
  })
})

describe('coherencia entre las cantidades', () => {
  const resultado = metricasMMs({
    llegadasPorHora: LLEGADAS_POR_HORA,
    servicioPorHora: LAVADO_POR_HORA,
    servidores: 6,
  })

  it('a es λ/μ y ρ es a/s', () => {
    expect(resultado.a).toBeCloseTo(LLEGADAS_POR_HORA / LAVADO_POR_HORA, 10)
    expect(resultado.rho).toBeCloseTo(resultado.a / 6, 10)
  })

  it('Wq es Lq/λ', () => {
    const wqEsperadoMin = (resultado.lq / LLEGADAS_POR_HORA) * 60
    expect(resultado.wqMin).toBeCloseTo(wqEsperadoMin, 10)
  })

  it('W es Wq más el tiempo medio de lavado', () => {
    const lavadoMin = 60 / LAVADO_POR_HORA
    expect(resultado.wMin).toBeCloseTo(resultado.wqMin + lavadoMin, 10)
  })

  it('L es λ·W', () => {
    expect(resultado.l).toBeCloseTo(LLEGADAS_POR_HORA * (resultado.wMin / 60), 10)
  })
})

describe('parámetros imposibles', () => {
  const validos = {
    llegadasPorHora: LLEGADAS_POR_HORA,
    servicioPorHora: LAVADO_POR_HORA,
    servidores: 6,
  }

  it('rechaza una tasa de llegadas que no es positiva', () => {
    expect(() => metricasMMs({ ...validos, llegadasPorHora: 0 })).toThrow(/llegadas/)
    expect(() => metricasMMs({ ...validos, llegadasPorHora: -3 })).toThrow(/llegadas/)
  })

  it('rechaza una tasa de servicio que no es positiva', () => {
    expect(() => metricasMMs({ ...validos, servicioPorHora: 0 })).toThrow(/servicio/)
    expect(() => metricasMMs({ ...validos, servicioPorHora: -1 })).toThrow(/servicio/)
  })

  it('rechaza una tasa que no es un número', () => {
    expect(() => metricasMMs({ ...validos, llegadasPorHora: 'muchas' })).toThrow(/llegadas/)
    expect(() => metricasMMs({ ...validos, servicioPorHora: Number.NaN })).toThrow(/servicio/)
  })

  it('rechaza un número de servidores que no es un entero mayor o igual que 1', () => {
    expect(() => metricasMMs({ ...validos, servidores: 2.5 })).toThrow(/entero/)
    expect(() => metricasMMs({ ...validos, servidores: 0 })).toThrow(/entero/)
    expect(() => metricasMMs({ ...validos, servidores: -2 })).toThrow(/entero/)
  })

  it('acepta un solo servidor (M/M/1)', () => {
    const unoSolo = metricasMMs({
      llegadasPorHora: 3,
      servicioPorHora: 5,
      servidores: 1,
    })
    expect(unoSolo.estable).toBe(true)
    expect(unoSolo.rho).toBeCloseTo(0.6, 10)
    // En M/M/1, P₀ = 1 − ρ y Lq = ρ²/(1 − ρ).
    expect(unoSolo.p0).toBeCloseTo(0.4, 10)
    expect(unoSolo.lq).toBeCloseTo(0.36 / 0.4, 10)
  })
})
