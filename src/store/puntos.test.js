import { describe, expect, it } from 'vitest'

import { agregarPunto, MAXIMO_DE_PUNTOS, tocaAnotar } from './puntos.js'

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

  it('al llegar al tope se queda en el tope y conserva los últimos', () => {
    let puntos = []
    for (let i = 0; i < 100; i += 1) {
      puntos = agregarPunto(puntos, punto(i), 10)
    }
    expect(puntos).toHaveLength(10)
    expect(puntos[0].minuto).toBe(90)
    expect(puntos[9].minuto).toBe(99)
  })

  it('no modifica el arreglo que recibe', () => {
    const originales = [punto(1), punto(2)]
    const copia = [...originales]
    agregarPunto(originales, punto(3), 2)
    expect(originales).toEqual(copia)
  })

  it('con el tope en 1 guarda solo el último', () => {
    let puntos = []
    for (let i = 0; i < 5; i += 1) {
      puntos = agregarPunto(puntos, punto(i), 1)
    }
    expect(puntos).toEqual([punto(4)])
  })

  it('justo en el tope todavía no descarta nada', () => {
    let puntos = []
    for (let i = 0; i < 10; i += 1) {
      puntos = agregarPunto(puntos, punto(i), 10)
    }
    expect(puntos).toHaveLength(10)
    expect(puntos[0].minuto).toBe(0)
  })

  it('rechaza un tope imposible', () => {
    expect(() => agregarPunto([], punto(1), 0)).toThrow(/mayor o igual que 1/)
    expect(() => agregarPunto([], punto(1), 2.5)).toThrow(/entero/)
  })

  it('el tope por defecto es razonable para una gráfica', () => {
    expect(MAXIMO_DE_PUNTOS).toBeGreaterThan(50)
    expect(MAXIMO_DE_PUNTOS).toBeLessThanOrEqual(1000)
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
