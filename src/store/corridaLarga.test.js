import { describe, expect, it } from 'vitest'

import {
  CRECIMIENTO_MAXIMO,
  PRESUPUESTO_POR_CUADRO_MS,
  progreso,
  siguienteTrozoHoras,
  TROZO_INICIAL_HORAS,
  TROZO_MAXIMO_HORAS,
  TROZO_MINIMO_HORAS,
} from './corridaLarga.js'

const trozo = (opciones) =>
  siguienteTrozoHoras({ horasDelTrozoAnterior: 0, msDelTrozoAnterior: 0, ...opciones })

describe('el tamaño del próximo trozo', () => {
  it('el primero es el tamaño inicial', () => {
    expect(trozo({ horasQueFaltan: 1000 })).toBe(TROZO_INICIAL_HORAS)
  })

  it('si el trozo anterior fue rápido, el siguiente crece', () => {
    const siguiente = trozo({
      horasQueFaltan: 1000,
      horasDelTrozoAnterior: 25,
      msDelTrozoAnterior: 2,
    })
    expect(siguiente).toBeGreaterThan(25)
  })

  it('si el trozo anterior fue lento, el siguiente se encoge', () => {
    const siguiente = trozo({
      horasQueFaltan: 1000,
      horasDelTrozoAnterior: 25,
      msDelTrozoAnterior: 100,
    })
    expect(siguiente).toBeLessThan(25)
    // 25 h en 100 ms son 4 ms por hora; con 25 ms de presupuesto, unas 6 h.
    expect(siguiente).toBe(6)
  })

  it('no crece más del doble de golpe', () => {
    // Con la cola saturada cada hora cuesta más que la anterior, así que
    // extrapolar del trozo pasado se queda corto: hay que frenar el salto.
    const siguiente = trozo({
      horasQueFaltan: 10000,
      horasDelTrozoAnterior: 10,
      msDelTrozoAnterior: 0.01,
    })
    expect(siguiente).toBeLessThanOrEqual(10 * CRECIMIENTO_MAXIMO)
  })

  it('nunca pide más horas de las que faltan', () => {
    expect(trozo({ horasQueFaltan: 3, horasDelTrozoAnterior: 25, msDelTrozoAnterior: 1 })).toBe(3)
    expect(trozo({ horasQueFaltan: 1 })).toBe(1)
  })

  it('se mantiene entre sus límites', () => {
    const enorme = trozo({
      horasQueFaltan: 100000,
      horasDelTrozoAnterior: 10000,
      msDelTrozoAnterior: 0.001,
    })
    expect(enorme).toBeLessThanOrEqual(TROZO_MAXIMO_HORAS)

    const minusculo = trozo({
      horasQueFaltan: 1000,
      horasDelTrozoAnterior: 10,
      msDelTrozoAnterior: 100000,
    })
    expect(minusculo).toBeGreaterThanOrEqual(TROZO_MINIMO_HORAS)
  })

  it('cuando no falta nada, no pide nada', () => {
    expect(trozo({ horasQueFaltan: 0 })).toBe(0)
    expect(trozo({ horasQueFaltan: -5 })).toBe(0)
  })

  it('el presupuesto por cuadro deja margen dentro de un cuadro de animación', () => {
    // Un cuadro a 60 por segundo dura unos 16,7 ms; el presupuesto es del
    // orden de un par de cuadros, no de medio segundo.
    expect(PRESUPUESTO_POR_CUADRO_MS).toBeLessThanOrEqual(50)
  })
})

describe('el progreso', () => {
  it('va de 0 a 100', () => {
    expect(progreso(0, 1000)).toBe(0)
    expect(progreso(500, 1000)).toBe(50)
    expect(progreso(1000, 1000)).toBe(100)
  })

  it('no se pasa de 100 ni se rompe sin total', () => {
    expect(progreso(1200, 1000)).toBe(100)
    expect(progreso(5, 0)).toBe(100)
  })
})
