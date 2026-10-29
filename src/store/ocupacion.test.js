import { describe, expect, it } from 'vitest'

import { INICIO_OBSERVACION_MIN, MOTOS_VISITA } from '../data/visita.js'
import { crearSimulador } from '../engine/simulador.js'
import { crearReproductor } from '../visita/reproductor.js'
import { ocupacionDeLaSimulacion, ocupacionDeLaVisita } from './ocupacion.js'

const TOLERANCIA = 1e-9

/** La ocupación de la visita a las `relojMin` minutos, con los datos y el reproductor de verdad. */
function visitaA(relojMin) {
  const reproductor = crearReproductor()
  reproductor.avanzar(relojMin)
  const modelo = ocupacionDeLaVisita({
    motos: MOTOS_VISITA,
    detalle: reproductor.detalleDeLaEtapa2(),
    inicioMin: INICIO_OBSERVACION_MIN,
    relojMin,
    placas: 6,
    puestos: 3,
  })
  return { modelo, metricas: reproductor.metricas() }
}

describe('la ocupación de cada servidor en la simulación', () => {
  it('antes de simular no hay nada que dibujar', () => {
    expect(ocupacionDeLaSimulacion(null).vacia).toBe(true)
    expect(ocupacionDeLaSimulacion(crearSimulador().metricas()).vacia).toBe(true)
  })

  it('hay una barra por placa y por puesto, con su nombre', () => {
    const motor = crearSimulador({ semilla: 1, placas: 7, puestos: 5 })
    motor.correrHoras(20)
    const { vacia, nota, etapas } = ocupacionDeLaSimulacion(motor.metricas())
    expect(vacia).toBe(false)
    expect(nota).toBeNull()
    expect(etapas.map((etapa) => etapa.id)).toEqual(['lavado', 'acabado'])
    expect(etapas[0].servidores.map((s) => s.nombre)).toEqual([
      'Placa 1', 'Placa 2', 'Placa 3', 'Placa 4', 'Placa 5', 'Placa 6', 'Placa 7',
    ])
    expect(etapas[1].servidores.map((s) => s.nombre)).toEqual([
      'Puesto 1', 'Puesto 2', 'Puesto 3', 'Puesto 4', 'Puesto 5',
    ])
  })

  it('las proporciones son las del motor y su promedio es el ρ de la etapa', () => {
    const motor = crearSimulador({ semilla: 3 })
    motor.correrHoras(50)
    const metricas = motor.metricas()
    const { etapas } = ocupacionDeLaSimulacion(metricas)
    expect(etapas[0].servidores.map((s) => s.proporcion)).toEqual(metricas.lavado.ocupacionPorServidor)
    expect(etapas[1].servidores.map((s) => s.proporcion)).toEqual(metricas.acabado.ocupacionPorServidor)
    expect(Math.abs(etapas[0].promedio - metricas.lavado.rho)).toBeLessThan(TOLERANCIA)
    expect(Math.abs(etapas[1].promedio - metricas.acabado.rho)).toBeLessThan(TOLERANCIA)
  })

  it('con otro número de puestos, otro número de barras', () => {
    const motor = crearSimulador({ semilla: 3, puestos: 5 })
    motor.correrHoras(10)
    expect(ocupacionDeLaSimulacion(motor.metricas()).etapas[1].servidores).toHaveLength(5)
  })
})

describe('la ocupación de cada servidor en la visita', () => {
  it('a las 3:10 p. m. no hay nada que dibujar', () => {
    expect(visitaA(0).modelo.vacia).toBe(true)
  })

  it('dice que los puestos son aproximados', () => {
    expect(visitaA(60).modelo.nota).toMatch(/puestos son aproximados/)
  })

  it('al terminar, el promedio de las seis placas es la ocupación media de las placas, entre 6', () => {
    const { modelo, metricas } = visitaA(140)
    expect(modelo.etapas[0].servidores).toHaveLength(6)
    expect(Math.abs(modelo.etapas[0].promedio - metricas.promedios.placasOcupadas / 6)).toBeLessThan(TOLERANCIA)
  })

  it('y el de los tres puestos, la de los puestos entre 3', () => {
    const { modelo, metricas } = visitaA(140)
    expect(modelo.etapas[1].servidores).toHaveLength(3)
    expect(Math.abs(modelo.etapas[1].promedio - metricas.promedios.puestosOcupados / 3)).toBeLessThan(TOLERANCIA)
  })

  it.each([13, 47.3, 90.5, 139.9])('también a mitad de la tarde (%s min)', (relojMin) => {
    const { modelo, metricas } = visitaA(relojMin)
    expect(Math.abs(modelo.etapas[0].promedio - metricas.promedios.placasOcupadas / 6)).toBeLessThan(TOLERANCIA)
    expect(Math.abs(modelo.etapas[1].promedio - metricas.promedios.puestosOcupados / 3)).toBeLessThan(TOLERANCIA)
  })

  it('las placas salen de las horas de la tabla: la placa 1 nunca se usó', () => {
    const { modelo } = visitaA(140)
    expect(modelo.etapas[0].servidores[0].proporcion).toBe(0)
    // La placa 2 la usan muchas motos: es la más ocupada.
    const proporciones = modelo.etapas[0].servidores.map((s) => s.proporcion)
    expect(proporciones[1]).toBe(Math.max(...proporciones))
  })

  it('una placa se cuenta de cuando entra la moto a cuando sale', () => {
    // La moto 1 usa la placa 2 de la 3:13 a la 3:20 p. m. (minutos 3 a 10 del reloj).
    const { modelo } = visitaA(10)
    const otrasMotosEnLaPlaca2 = MOTOS_VISITA.filter((m) => m.placa === 2 && m.n !== 1 && m.entraPlacaMin - 10 < 10)
    expect(otrasMotosEnLaPlaca2).toHaveLength(0)
    expect(modelo.etapas[0].servidores[1].proporcion).toBeCloseTo(7 / 10, 12)
  })

  it('cada proporción está entre 0 y 1', () => {
    for (const relojMin of [20, 70, 140]) {
      for (const etapa of visitaA(relojMin).modelo.etapas) {
        for (const { proporcion } of etapa.servidores) {
          expect(proporcion).toBeGreaterThanOrEqual(0)
          expect(proporcion).toBeLessThanOrEqual(1 + TOLERANCIA)
        }
      }
    }
  })
})
