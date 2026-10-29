import { describe, expect, it } from 'vitest'

import {
  CRECIMIENTO_MAXIMO,
  DURACION_MINIMA_DE_LA_CAMARA_RAPIDA_MS,
  horasDeLaCamaraRapida,
  marcasQueCruza,
  PRESUPUESTO_POR_CUADRO_MS,
  PUNTOS_DE_LA_CAMARA_RAPIDA,
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

describe('el ritmo de la cámara rápida', () => {
  const horas = (msTranscurridos, extra = {}) =>
    horasDeLaCamaraRapida({ msTranscurridos, horasTotales: 1000, ...extra })

  it('dura al menos 4 segundos', () => {
    expect(DURACION_MINIMA_DE_LA_CAMARA_RAPIDA_MS).toBeGreaterThanOrEqual(4000)
  })

  it('empieza en cero horas y llega a todas justo cuando se cumple la duración', () => {
    expect(horas(0)).toBe(0)
    expect(horas(DURACION_MINIMA_DE_LA_CAMARA_RAPIDA_MS - 1)).toBeLessThan(1000)
    expect(horas(DURACION_MINIMA_DE_LA_CAMARA_RAPIDA_MS)).toBe(1000)
    expect(horas(60000)).toBe(1000)
  })

  it('siempre son horas enteras y nunca bajan', () => {
    let anterior = 0
    for (let ms = 0; ms <= 5000; ms += 7) {
      const h = horas(ms)
      expect(Number.isInteger(h)).toBe(true)
      expect(h).toBeGreaterThanOrEqual(anterior)
      anterior = h
    }
  })

  it('arranca y frena despacio y va rápido en el medio', () => {
    const d = DURACION_MINIMA_DE_LA_CAMARA_RAPIDA_MS
    const primeraDecima = horas(d * 0.1)
    const medio = horas(d * 0.55) - horas(d * 0.45)
    const ultimaDecima = 1000 - horas(d * 0.9)
    expect(primeraDecima).toBeLessThan(medio)
    expect(ultimaDecima).toBeLessThan(medio)
    // y es simétrica: lo que le falta al final es lo que lleva al principio
    expect(Math.abs(primeraDecima - ultimaDecima)).toBeLessThanOrEqual(1)
  })

  it('con otra duración o menos horas, igual', () => {
    expect(horas(500, { duracionMs: 1000 })).toBe(500)
    expect(horasDeLaCamaraRapida({ msTranscurridos: 9999, horasTotales: 50 })).toBe(50)
  })
})

describe('las marcas de la gráfica que cruza un trozo', () => {
  it('un trozo de 25 horas en 1000 cruza cinco marcas, una cada 5 horas', () => {
    expect(marcasQueCruza({ horasAntes: 0, horasDespues: 25, horasTotales: 1000 })).toEqual([
      5, 10, 15, 20, 25,
    ])
  })

  it('un trozo más corto que la separación entre marcas puede no cruzar ninguna', () => {
    expect(marcasQueCruza({ horasAntes: 6, horasDespues: 9, horasTotales: 1000 })).toEqual([])
  })

  it('una marca justo en el borde del trozo cuenta en un solo trozo', () => {
    const primero = marcasQueCruza({ horasAntes: 0, horasDespues: 10, horasTotales: 1000 })
    const segundo = marcasQueCruza({ horasAntes: 10, horasDespues: 20, horasTotales: 1000 })
    expect(primero).toEqual([5, 10])
    expect(segundo).toEqual([15, 20])
  })

  it('la última marca cae exactamente en el final', () => {
    const marcas = marcasQueCruza({ horasAntes: 990, horasDespues: 1000, horasTotales: 1000 })
    expect(marcas).toEqual([995, 1000])
  })

  it('con cualquier reparto en trozos salen todas las marcas, sin repetir ni saltar', () => {
    for (const horasTotales of [100, 333, 1000, 777]) {
      const todas = []
      let horas = 0
      let trozo = 1
      while (horas < horasTotales) {
        const siguiente = Math.min(horasTotales, horas + trozo)
        todas.push(...marcasQueCruza({ horasAntes: horas, horasDespues: siguiente, horasTotales }))
        horas = siguiente
        trozo = (trozo % 61) + 7
      }
      expect(todas).toHaveLength(PUNTOS_DE_LA_CAMARA_RAPIDA)
      expect(todas.at(-1)).toBe(horasTotales)
      expect([...todas].sort((a, b) => a - b)).toEqual(todas)
      expect(new Set(todas).size).toBe(todas.length)
    }
  })

  it('sin horas que simular no hay marcas', () => {
    expect(marcasQueCruza({ horasAntes: 10, horasDespues: 10, horasTotales: 1000 })).toEqual([])
    expect(marcasQueCruza({ horasAntes: 0, horasDespues: 0, horasTotales: 0 })).toEqual([])
  })
})
