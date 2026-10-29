import { describe, expect, it } from 'vitest'

import {
  avanceDelReloj,
  crearMemoriaDelReloj,
  pasoDeLaAnimacion,
  SALTO_MAXIMO_DE_RELOJ_MIN,
  SALTO_MAXIMO_DE_TIEMPO_REAL_S,
} from './relojDeLaEscena.js'

const cuadro = (relojMin, extra = {}) => ({ relojMin, generacion: 0, segundosReales: 1 / 60, ...extra })

describe('cuánto avanzó el reloj simulado', () => {
  it('el primer cuadro no anima: recoloca', () => {
    expect(avanceDelReloj(crearMemoriaDelReloj(), cuadro(10))).toEqual({ minutos: 0, recolocar: true })
  })

  it('después da los minutos simulados que pasaron desde el cuadro anterior', () => {
    const memoria = crearMemoriaDelReloj()
    avanceDelReloj(memoria, cuadro(10))
    expect(avanceDelReloj(memoria, cuadro(10.25))).toEqual({ minutos: 0.25, recolocar: false })
    expect(avanceDelReloj(memoria, cuadro(10.75))).toEqual({ minutos: 0.5, recolocar: false })
  })

  it('en pausa (el reloj no avanza) son 0 minutos y no se recoloca', () => {
    const memoria = crearMemoriaDelReloj()
    avanceDelReloj(memoria, cuadro(10))
    for (let i = 0; i < 5; i += 1) {
      expect(avanceDelReloj(memoria, cuadro(10))).toEqual({ minutos: 0, recolocar: false })
    }
  })

  it('si cambia la generación, recoloca, y solo ese cuadro', () => {
    const memoria = crearMemoriaDelReloj()
    avanceDelReloj(memoria, cuadro(10))
    expect(avanceDelReloj(memoria, cuadro(10.1, { generacion: 1 }))).toEqual({ minutos: 0, recolocar: true })
    expect(avanceDelReloj(memoria, cuadro(10.2, { generacion: 1 }))).toEqual({ minutos: expect.closeTo(0.1, 10), recolocar: false })
  })

  it('si el reloj retrocede (otro motor que empieza en 0), recoloca', () => {
    const memoria = crearMemoriaDelReloj()
    avanceDelReloj(memoria, cuadro(500))
    expect(avanceDelReloj(memoria, cuadro(0))).toEqual({ minutos: 0, recolocar: true })
  })

  it('si el reloj salta de golpe (la corrida larga), recoloca', () => {
    const memoria = crearMemoriaDelReloj()
    avanceDelReloj(memoria, cuadro(10))
    expect(avanceDelReloj(memoria, cuadro(10 + SALTO_MAXIMO_DE_RELOJ_MIN + 1)).recolocar).toBe(true)
  })

  it('un cuadro normal a la velocidad más alta (6 minutos en 100 ms) no cuenta como salto', () => {
    const memoria = crearMemoriaDelReloj()
    avanceDelReloj(memoria, cuadro(10))
    expect(avanceDelReloj(memoria, cuadro(16)).recolocar).toBe(false)
  })

  it('si pasó mucho tiempo real entre cuadros (pestaña oculta), recoloca', () => {
    const memoria = crearMemoriaDelReloj()
    avanceDelReloj(memoria, cuadro(10))
    expect(avanceDelReloj(memoria, cuadro(10.1, { segundosReales: SALTO_MAXIMO_DE_TIEMPO_REAL_S + 0.1 })).recolocar).toBe(true)
    expect(avanceDelReloj(memoria, cuadro(10.2, { segundosReales: 0.2 })).recolocar).toBe(false)
  })

  it('un reloj que no es un número no rompe: recoloca y no se acuerda de él', () => {
    const memoria = crearMemoriaDelReloj()
    avanceDelReloj(memoria, cuadro(10))
    expect(avanceDelReloj(memoria, cuadro(Number.NaN)).recolocar).toBe(true)
    expect(memoria.reloj).toBe(10)
  })
})

describe('las animaciones de adorno (losas, gotas)', () => {
  it('con la simulación en pausa no avanzan', () => {
    expect(pasoDeLaAnimacion(1 / 60, 0)).toBe(0)
  })

  it('a 1 min/s o más avanzan lo que dura el cuadro, sin pasar de ahí', () => {
    expect(pasoDeLaAnimacion(1 / 60, 1 / 60)).toBeCloseTo(1 / 60, 12)
    expect(pasoDeLaAnimacion(1 / 60, 1)).toBeCloseTo(1 / 60, 12)
    expect(pasoDeLaAnimacion(1 / 60, 6)).toBeCloseTo(1 / 60, 12)
  })

  it('a menos de 1 min/s van más despacio, como la simulación', () => {
    expect(pasoDeLaAnimacion(1 / 60, 0.25 / 60)).toBeCloseTo(0.25 / 60, 12)
  })

  it('nunca es negativo', () => {
    expect(pasoDeLaAnimacion(-1, 5)).toBe(0)
    expect(pasoDeLaAnimacion(1, -5)).toBe(0)
  })
})
