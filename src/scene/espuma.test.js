import { describe, expect, it } from 'vitest'

import { LAVADO_MIN } from '../data/parametros.js'
import { NIVELES_DE_CALIDAD } from './calidad.js'
import {
  avanzarLaEspuma,
  BLOBS_DE_LA_ESPUMA,
  BLOBS_POR_PLACA,
  CAJA_DE_LA_ESPUMA,
  COBERTURA_AL_RECOLOCAR,
  coberturaDeLaEspuma,
  crearEspuma,
  crecimientoDelBlob,
  minutosParaLaCobertura,
  tauDeLaEspuma,
} from './espuma.js'
import { MOTO } from './posiciones.js'

const TAU = tauDeLaEspuma(LAVADO_MIN)

describe('la cobertura de la espuma', () => {
  it('τ es la mitad del tiempo medio de lavado', () => {
    expect(TAU).toBeCloseTo(LAVADO_MIN / 2, 9)
    expect(tauDeLaEspuma(20)).toBe(10)
  })

  it('empieza en 0, crece sin pasar de 1 y a un τ lleva el 63 %', () => {
    expect(coberturaDeLaEspuma(0, TAU)).toBe(0)
    let anterior = 0
    for (let minutos = 0.5; minutos <= 200; minutos += 0.5) {
      const c = coberturaDeLaEspuma(minutos, TAU)
      expect(c).toBeGreaterThanOrEqual(anterior)
      expect(c).toBeLessThanOrEqual(1)
      anterior = c
    }
    expect(coberturaDeLaEspuma(1, TAU)).toBeGreaterThan(coberturaDeLaEspuma(0.5, TAU))
    expect(coberturaDeLaEspuma(TAU, TAU)).toBeCloseTo(1 - Math.exp(-1), 9)
    expect(coberturaDeLaEspuma(LAVADO_MIN, TAU)).toBeGreaterThan(0.85)
  })

  it('los minutos que dan una cobertura son la inversa', () => {
    for (const c of [0.1, 0.5, 0.9]) {
      expect(coberturaDeLaEspuma(minutosParaLaCobertura(c, TAU), TAU)).toBeCloseTo(c, 9)
    }
  })
})

describe('avanzar la espuma de una placa', () => {
  const cuadro = (extra) => ({ conMoto: true, minutos: 0, recolocar: false, tau: TAU, ...extra })

  it('crece con los minutos simulados mientras la moto está encima', () => {
    const espuma = crearEspuma()
    let anterior = avanzarLaEspuma(espuma, cuadro({ minutos: 0 }))
    expect(anterior).toBe(0)
    for (let i = 0; i < 20; i += 1) {
      const c = avanzarLaEspuma(espuma, cuadro({ minutos: 0.5 }))
      expect(c).toBeGreaterThan(anterior)
      anterior = c
    }
    expect(anterior).toBeLessThanOrEqual(1)
  })

  it('con 0 minutos (la simulación en pausa) no avanza', () => {
    const espuma = crearEspuma()
    avanzarLaEspuma(espuma, cuadro({ minutos: 2 }))
    const quieta = avanzarLaEspuma(espuma, cuadro({ minutos: 0 }))
    for (let i = 0; i < 10; i += 1) expect(avanzarLaEspuma(espuma, cuadro({ minutos: 0 }))).toBe(quieta)
  })

  it('vuelve a 0 cuando la moto sale y no queda rastro para la siguiente', () => {
    const espuma = crearEspuma()
    avanzarLaEspuma(espuma, cuadro({ minutos: 8 }))
    expect(avanzarLaEspuma(espuma, cuadro({ conMoto: false, minutos: 1 }))).toBe(0)
    expect(avanzarLaEspuma(espuma, cuadro({ minutos: 0 }))).toBe(0)
  })

  it('al recolocar con la moto ya en la placa arranca en la mitad, y sin moto en 0', () => {
    const espuma = crearEspuma()
    expect(avanzarLaEspuma(espuma, cuadro({ recolocar: true }))).toBeCloseTo(COBERTURA_AL_RECOLOCAR, 9)
    expect(avanzarLaEspuma(crearEspuma(), cuadro({ recolocar: true, conMoto: false }))).toBe(0)
    // y desde ahí sigue creciendo
    expect(avanzarLaEspuma(espuma, cuadro({ minutos: 1 }))).toBeGreaterThan(COBERTURA_AL_RECOLOCAR)
  })

  it('un tiempo de lavado más largo da una espuma más lenta', () => {
    const rapida = avanzarLaEspuma(crearEspuma(), { conMoto: true, minutos: 5, recolocar: false, tau: tauDeLaEspuma(10) })
    const lenta = avanzarLaEspuma(crearEspuma(), { conMoto: true, minutos: 5, recolocar: false, tau: tauDeLaEspuma(40) })
    expect(lenta).toBeLessThan(rapida)
  })
})

describe('los blobs de espuma', () => {
  it('hay unos 18 por placa, siempre los mismos', () => {
    expect(BLOBS_POR_PLACA).toBe(18)
    expect(BLOBS_DE_LA_ESPUMA).toHaveLength(18)
  })

  it('quedan dentro de la caja de la moto, sin tapar el aro del piso (más arriba que él)', () => {
    for (const { x, y, z } of BLOBS_DE_LA_ESPUMA) {
      expect(Math.abs(x)).toBeLessThanOrEqual(CAJA_DE_LA_ESPUMA.x)
      expect(Math.abs(z - CAJA_DE_LA_ESPUMA.centroZ)).toBeLessThanOrEqual(CAJA_DE_LA_ESPUMA.z)
      expect(y).toBeGreaterThanOrEqual(0.15)
      expect(y).toBeLessThan(MOTO.alto)
    }
  })

  it('los turnos son 18 valores distintos y parejos entre 0 y 1', () => {
    const turnos = BLOBS_DE_LA_ESPUMA.map((b) => b.turno).sort((a, b) => a - b)
    expect(new Set(turnos).size).toBe(18)
    expect(turnos[0]).toBeGreaterThan(0)
    expect(turnos.at(-1)).toBeLessThan(1)
  })

  it('con cobertura 0 no se ve ninguno y con la cobertura casi completa se ven todos', () => {
    expect(BLOBS_DE_LA_ESPUMA.filter((b) => crecimientoDelBlob(0, b.turno) > 0.01)).toHaveLength(0)
    expect(BLOBS_DE_LA_ESPUMA.filter((b) => crecimientoDelBlob(1, b.turno) > 0.99)).toHaveLength(18)
  })

  it('con la mitad de la cobertura se ve más o menos la mitad, y crecen de a poco', () => {
    const vistos = (c) => BLOBS_DE_LA_ESPUMA.filter((b) => crecimientoDelBlob(c, b.turno) > 0.5).length
    expect(vistos(0.5)).toBeGreaterThanOrEqual(8)
    expect(vistos(0.5)).toBeLessThanOrEqual(10)
    expect(vistos(0.2)).toBeLessThan(vistos(0.5))
    let anterior = 0
    for (let c = 0; c <= 1; c += 0.01) {
      const ahora = crecimientoDelBlob(c, 0.5)
      expect(ahora).toBeGreaterThanOrEqual(anterior)
      expect(ahora - anterior).toBeLessThan(0.13)
      anterior = ahora
    }
  })
})

describe('la espuma y la calidad adaptable', () => {
  it('se apaga con el interruptor de las partículas (nivel 3)', () => {
    expect(NIVELES_DE_CALIDAD[2].particulas).toBe(true)
    expect(NIVELES_DE_CALIDAD[3].particulas).toBe(false)
  })
})
