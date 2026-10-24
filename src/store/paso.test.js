import { describe, expect, it } from 'vitest'

import { MS_TOPE_POR_CUADRO, pasoSimuladoMin } from './paso.js'

const corriendoA = (velocidadMinPorSegundo) => (msDelCuadro) =>
  pasoSimuladoMin({ msDelCuadro, velocidadMinPorSegundo, corriendo: true })

describe('el paso simulado de un cuadro', () => {
  it('en pausa no avanza nada, sea cual sea la velocidad', () => {
    for (const velocidad of [1, 10, 60]) {
      expect(
        pasoSimuladoMin({ msDelCuadro: 16, velocidadMinPorSegundo: velocidad, corriendo: false }),
      ).toBe(0)
    }
  })

  it('un cuadro normal avanza lo que dice la velocidad', () => {
    // 16 ms a 1 minuto simulado por segundo real.
    expect(corriendoA(1)(16)).toBeCloseTo(0.016, 10)
  })

  it('el doble de velocidad avanza el doble', () => {
    const sencilla = corriendoA(1)(16)
    const doble = corriendoA(2)(16)
    expect(doble).toBeCloseTo(sencilla * 2, 10)
  })

  it('un lapso largo se recorta al tope', () => {
    // Una pestaña que estuvo oculta medio minuto no simula medio minuto real.
    expect(corriendoA(1)(30000)).toBe(corriendoA(1)(MS_TOPE_POR_CUADRO))
    expect(corriendoA(1)(30000)).toBeCloseTo(0.1, 10)
  })

  it('un lapso justo por debajo del tope no se recorta', () => {
    expect(corriendoA(1)(99)).toBeCloseTo(0.099, 10)
  })

  it('los lapsos imposibles no mueven el reloj', () => {
    expect(corriendoA(1)(0)).toBe(0)
    expect(corriendoA(1)(-5)).toBe(0)
    expect(corriendoA(1)(Number.NaN)).toBe(0)
    // Un lapso infinito no es un lapso: no se recorta al tope, se descarta.
    expect(corriendoA(1)(Number.POSITIVE_INFINITY)).toBe(0)
    expect(corriendoA(1)('ya')).toBe(0)
  })

  it('una velocidad imposible tampoco mueve el reloj', () => {
    expect(corriendoA(0)(16)).toBe(0)
    expect(corriendoA(-3)(16)).toBe(0)
  })

  it('nunca devuelve un valor negativo', () => {
    for (const ms of [-1000, -1, 0, 1, 16, 100, 30000]) {
      expect(corriendoA(5)(ms)).toBeGreaterThanOrEqual(0)
    }
  })
})
