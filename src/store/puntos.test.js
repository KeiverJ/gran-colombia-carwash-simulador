import { describe, expect, it } from 'vitest'

import {
  aclarar,
  agregarPunto,
  INTERVALO_DE_MUESTREO_MIN,
  intervaloDeMuestreoMin,
  MAXIMO_DE_PUNTOS,
  tocaAnotar,
} from './puntos.js'

const punto = (n) => ({ minuto: n, colaLavado: n, colaAcabado: n * 2 })

describe('agregar puntos a la gráfica', () => {
  it('por debajo del tope los guarda todos', () => {
    let puntos = []
    for (let i = 0; i < 10; i += 1) {
      puntos = agregarPunto(puntos, punto(i), 50)
    }
    expect(puntos).toHaveLength(10)
    expect(puntos[0].minuto).toBe(0)
    expect(puntos[9].minuto).toBe(9)
  })

  it('justo en el tope todavía no descarta nada', () => {
    let puntos = []
    for (let i = 0; i < 10; i += 1) {
      puntos = agregarPunto(puntos, punto(i), 10)
    }
    expect(puntos).toHaveLength(10)
    expect(puntos[0].minuto).toBe(0)
  })

  it('al pasar el tope deja uno de cada dos, no solo los más recientes', () => {
    let puntos = []
    for (let i = 0; i < 11; i += 1) {
      puntos = agregarPunto(puntos, punto(i), 10)
    }
    expect(puntos.map((p) => p.minuto)).toEqual([0, 2, 4, 6, 8, 10])
  })

  it('no modifica el arreglo que recibe', () => {
    const originales = [punto(1), punto(2), punto(3)]
    const copia = [...originales]
    agregarPunto(originales, punto(4), 3)
    expect(originales).toEqual(copia)
  })

  it('rechaza un tope imposible', () => {
    expect(() => agregarPunto([], punto(1), 0)).toThrow(/mayor o igual que 2/)
    expect(() => agregarPunto([], punto(1), 1)).toThrow(/mayor o igual que 2/)
    expect(() => agregarPunto([], punto(1), 2.5)).toThrow(/entero/)
  })

  it('el tope por defecto es razonable para una gráfica', () => {
    expect(MAXIMO_DE_PUNTOS).toBeGreaterThan(50)
    expect(MAXIMO_DE_PUNTOS).toBeLessThanOrEqual(1000)
  })

  it('con el tope mínimo, 2, siempre conserva el primero y el último', () => {
    let puntos = []
    for (let i = 0; i < 20; i += 1) {
      puntos = agregarPunto(puntos, punto(i), 2)
      expect(puntos.length).toBeLessThanOrEqual(2)
    }
    expect(puntos[0].minuto).toBe(0)
    expect(puntos.at(-1).minuto).toBe(19)
  })
})

describe('aclarar los puntos', () => {
  it('deja uno de cada dos y siempre el primero y el último', () => {
    const cinco = [0, 1, 2, 3, 4].map(punto)
    expect(aclarar(cinco).map((p) => p.minuto)).toEqual([0, 2, 4])
    const seis = [0, 1, 2, 3, 4, 5].map(punto)
    expect(aclarar(seis).map((p) => p.minuto)).toEqual([0, 2, 4, 5])
  })

  it('con menos de tres puntos no quita nada', () => {
    expect(aclarar([])).toEqual([])
    expect(aclarar([punto(1), punto(2)])).toEqual([punto(1), punto(2)])
  })

  it('devuelve los mismos puntos, no copias cambiadas', () => {
    const puntos = [0, 1, 2, 3, 4].map(punto)
    const aclarados = aclarar(puntos)
    expect(aclarados[1]).toBe(puntos[2])
  })
})

describe('una corrida larga no agota la gráfica ni pierde su principio', () => {
  /** Simula lo que hace el store: anota cuando toca y agrega con el tope. */
  function anotarDurante(totalMin, pasoMin) {
    let puntos = []
    let ultimo = null
    for (let reloj = 0; reloj <= totalMin; reloj += pasoMin) {
      if (tocaAnotar(reloj, ultimo, intervaloDeMuestreoMin(puntos))) {
        puntos = agregarPunto(puntos, punto(reloj))
        ultimo = reloj
      }
    }
    return puntos
  }

  it('con diez mil puntos nunca pasa del tope y cubre del minuto 0 al final', () => {
    let puntos = []
    for (let i = 0; i < 10000; i += 1) {
      puntos = agregarPunto(puntos, punto(i))
      expect(puntos.length).toBeLessThanOrEqual(MAXIMO_DE_PUNTOS)
    }
    expect(puntos[0].minuto).toBe(0)
    expect(puntos.at(-1).minuto).toBe(9999)
  })

  it('los puntos siguen en orden de tiempo', () => {
    let puntos = []
    for (let i = 0; i < 5000; i += 1) {
      puntos = agregarPunto(puntos, punto(i))
    }
    const minutos = puntos.map((p) => p.minuto)
    expect(minutos).toEqual([...minutos].sort((a, b) => a - b))
  })

  it('mil horas simuladas, minuto a minuto, caben en el tope y cubren de 0 a 1000 h', () => {
    const puntos = anotarDurante(1000 * 60, 1)
    expect(puntos.length).toBeLessThanOrEqual(MAXIMO_DE_PUNTOS)
    expect(puntos.length).toBeGreaterThan(MAXIMO_DE_PUNTOS / 4)
    expect(puntos[0].minuto).toBe(0)
    expect(puntos.at(-1).minuto).toBeGreaterThan(1000 * 60 - 400)
  })

  it('la gráfica no se llena de puntos pegados al seguir simulando tras una corrida larga', () => {
    // 1000 h con ~200 puntos, y después 100 horas más minuto a minuto.
    let puntos = []
    for (let hora = 0; hora <= 1000; hora += 5) {
      puntos = agregarPunto(puntos, punto(hora * 60))
    }
    let ultimo = puntos.at(-1).minuto
    let anotados = 0
    for (let reloj = ultimo + 1; reloj <= 1100 * 60; reloj += 1) {
      if (tocaAnotar(reloj, ultimo, intervaloDeMuestreoMin(puntos))) {
        puntos = agregarPunto(puntos, punto(reloj))
        ultimo = reloj
        anotados += 1
      }
    }
    expect(anotados).toBeLessThan(40)
    expect(puntos.length).toBeLessThanOrEqual(MAXIMO_DE_PUNTOS)
    expect(puntos[0].minuto).toBe(0)
  })
})

describe('cada cuánto se anota un punto', () => {
  it('el primero siempre se anota', () => {
    expect(tocaAnotar(0, null)).toBe(true)
    expect(tocaAnotar(37, undefined)).toBe(true)
  })

  it('no se anota hasta que pasa el intervalo de tiempo simulado', () => {
    expect(tocaAnotar(10.5, 10, 1)).toBe(false)
    expect(tocaAnotar(11, 10, 1)).toBe(true)
    expect(tocaAnotar(12, 10, 1)).toBe(true)
  })

  it('el intervalo se mide en tiempo simulado, no en cuadros', () => {
    // Dos cuadros seguidos con la simulación casi parada no anotan dos veces.
    expect(tocaAnotar(5.001, 5, 1)).toBe(false)
    // Y un solo cuadro a mucha velocidad sí anota.
    expect(tocaAnotar(25, 5, 1)).toBe(true)
  })
})

describe('el intervalo de muestreo sale de lo que cubre la gráfica', () => {
  it('con poca duración es el mínimo', () => {
    expect(intervaloDeMuestreoMin([])).toBe(INTERVALO_DE_MUESTREO_MIN)
    expect(intervaloDeMuestreoMin([punto(0)])).toBe(INTERVALO_DE_MUESTREO_MIN)
    expect(intervaloDeMuestreoMin([punto(0), punto(100)])).toBe(INTERVALO_DE_MUESTREO_MIN)
  })

  it('crece con la duración cubierta', () => {
    const corta = intervaloDeMuestreoMin([punto(0), punto(600)])
    const larga = intervaloDeMuestreoMin([punto(0), punto(60000)])
    expect(corta).toBeGreaterThan(INTERVALO_DE_MUESTREO_MIN)
    expect(larga).toBeGreaterThan(corta)
    expect(larga).toBeCloseTo(60000 / (MAXIMO_DE_PUNTOS / 2), 6)
  })

  it('es el espaciado de un arreglo recién aclarado', () => {
    expect(intervaloDeMuestreoMin([punto(0), punto(300)], 300)).toBe(2)
  })
})
