import { describe, expect, it } from 'vitest'

import { PROPORCION_PLAN } from '../data/parametros.js'
import {
  crearCorrientes,
  crearGenerador,
  crearSorteoDePlan,
  tiempoExponencial,
} from './aleatorio.js'

const secuencia = (generador, cuantos = 20) =>
  Array.from({ length: cuantos }, () => generador())

describe('generador con semilla', () => {
  it('la misma semilla da la misma secuencia', () => {
    expect(secuencia(crearGenerador(42))).toEqual(secuencia(crearGenerador(42)))
  })

  it('semillas distintas dan secuencias distintas', () => {
    expect(secuencia(crearGenerador(42))).not.toEqual(secuencia(crearGenerador(43)))
  })

  it('los valores caen en [0, 1)', () => {
    for (const valor of secuencia(crearGenerador(2026), 10000)) {
      expect(valor).toBeGreaterThanOrEqual(0)
      expect(valor).toBeLessThan(1)
    }
  })

  it('reparte de forma razonable: la media se acerca a 0,5', () => {
    const valores = secuencia(crearGenerador(7), 100000)
    const media = valores.reduce((total, v) => total + v, 0) / valores.length
    expect(media).toBeCloseTo(0.5, 2)
  })
})

describe('tres corrientes independientes', () => {
  it('cada corriente es reproducible con la misma semilla', () => {
    const unas = crearCorrientes(7)
    const otras = crearCorrientes(7)
    expect(secuencia(unas.llegadas)).toEqual(secuencia(otras.llegadas))
    expect(secuencia(unas.planes)).toEqual(secuencia(otras.planes))
    expect(secuencia(unas.servicios)).toEqual(secuencia(otras.servicios))
  })

  it('las tres corrientes son distintas entre sí', () => {
    const { llegadas, planes, servicios } = crearCorrientes(7)
    const deLlegadas = secuencia(llegadas)
    const dePlanes = secuencia(planes)
    const deServicios = secuencia(servicios)
    expect(deLlegadas).not.toEqual(dePlanes)
    expect(deLlegadas).not.toEqual(deServicios)
    expect(dePlanes).not.toEqual(deServicios)
  })

  it('consumir una corriente no mueve a las otras', () => {
    const unas = crearCorrientes(99)
    secuencia(unas.llegadas, 500)
    const otras = crearCorrientes(99)
    expect(secuencia(unas.planes)).toEqual(secuencia(otras.planes))
  })
})

describe('tiempos exponenciales', () => {
  it('la media de 100.000 tiempos con media 10 min queda dentro del 2 %', () => {
    const uniforme = crearGenerador(123)
    let suma = 0
    const cuantos = 100000
    for (let i = 0; i < cuantos; i += 1) {
      suma += tiempoExponencial(uniforme, 10)
    }
    const media = suma / cuantos
    expect(Math.abs(media - 10) / 10).toBeLessThan(0.02)
  })

  it('siempre son positivos y finitos', () => {
    const uniforme = crearGenerador(5)
    for (let i = 0; i < 10000; i += 1) {
      const t = tiempoExponencial(uniforme, 15.3158)
      expect(t).toBeGreaterThan(0)
      expect(Number.isFinite(t)).toBe(true)
    }
  })

  it('rechaza una media que no es positiva', () => {
    const uniforme = crearGenerador(1)
    expect(() => tiempoExponencial(uniforme, 0)).toThrow(/mayor que 0/)
    expect(() => tiempoExponencial(uniforme, -5)).toThrow(/mayor que 0/)
  })
})

describe('sorteo del plan', () => {
  it('reparte según las proporciones medidas y nunca da el plan 1', () => {
    const sortear = crearSorteoDePlan(PROPORCION_PLAN)
    const uniforme = crearGenerador(2026)
    const cuenta = { 1: 0, 2: 0, 3: 0 }
    const cuantos = 100000
    for (let i = 0; i < cuantos; i += 1) {
      cuenta[sortear(uniforme)] += 1
    }
    expect(cuenta[1]).toBe(0)
    expect(cuenta[2] + cuenta[3]).toBe(cuantos)
    expect(Math.abs(cuenta[2] / cuantos - PROPORCION_PLAN[2])).toBeLessThan(0.01)
    expect(Math.abs(cuenta[3] / cuantos - PROPORCION_PLAN[3])).toBeLessThan(0.01)
  })

  it('con el número aleatorio pegado a 1 devuelve el último plan con proporción positiva', () => {
    const sortear = crearSorteoDePlan(PROPORCION_PLAN)
    expect(sortear(() => 0.9999999999999999)).toBe(3)
    // Caso límite: un uniforme que llegara a 1 no debe caer en el plan 1.
    expect(sortear(() => 1)).toBe(3)
  })

  it('con el número aleatorio en 0 devuelve el primer plan con proporción positiva', () => {
    const sortear = crearSorteoDePlan(PROPORCION_PLAN)
    expect(sortear(() => 0)).toBe(2)
  })

  it('rechaza proporciones que no suman 1', () => {
    expect(() => crearSorteoDePlan({ 1: 0.2, 2: 0.2, 3: 0.1 })).toThrow(/deben sumar 1/)
  })

  it('acepta proporciones que suman 1 con error de redondeo', () => {
    // 0,06 + 0,57 + 0,37 da 0,9999999999999999 en punto flotante.
    expect(0.06 + 0.57 + 0.37).not.toBe(1)
    const sortear = crearSorteoDePlan({ 1: 0.06, 2: 0.57, 3: 0.37 })
    expect([1, 2, 3]).toContain(sortear(crearGenerador(4)))
  })

  it('rechaza una proporción negativa', () => {
    expect(() => crearSorteoDePlan({ 1: -0.1, 2: 0.9, 3: 0.2 })).toThrow(/mayor o igual que 0/)
  })
})
