import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { crearFreno, INTERVALO_DE_GRAFICAS_MS } from './frenoDeActualizacion.js'

describe('el freno de actualización de las gráficas', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renueva como mucho cada 250 ms', () => {
    expect(INTERVALO_DE_GRAFICAS_MS).toBe(250)
  })

  it('100 cambios en 250 ms producen una sola renovación, con lo último', () => {
    let ultimo = null
    const entregar = vi.fn(() => {
      ultimo = valor
    })
    let valor = 0
    const freno = crearFreno(entregar)

    for (let i = 1; i <= 100; i += 1) {
      valor = i
      freno.cambio()
      vi.advanceTimersByTime(2)
    }
    vi.advanceTimersByTime(250)

    expect(entregar).toHaveBeenCalledTimes(1)
    expect(ultimo).toBe(100)
  })

  it('un cambio aislado se entrega a los 250 ms y no antes', () => {
    const entregar = vi.fn()
    const freno = crearFreno(entregar)

    freno.cambio()
    vi.advanceTimersByTime(249)
    expect(entregar).not.toHaveBeenCalled()

    vi.advanceTimersByTime(1)
    expect(entregar).toHaveBeenCalledTimes(1)
  })

  it('si no hay cambios, no entrega nada', () => {
    const entregar = vi.fn()
    crearFreno(entregar)
    vi.advanceTimersByTime(5000)
    expect(entregar).not.toHaveBeenCalled()
  })

  it('con cambios sin parar entrega 4 veces por segundo y al final entrega lo último', () => {
    let valor = 0
    const entregadas = []
    const freno = crearFreno(() => entregadas.push(valor))

    for (let ms = 0; ms < 1000; ms += 10) {
      valor += 1
      freno.cambio()
      vi.advanceTimersByTime(10)
    }
    // El último cambio (valor 100) aún espera su turno; llega en el borde final.
    vi.advanceTimersByTime(250)

    expect(entregadas.length).toBeLessThanOrEqual(5)
    expect(entregadas.length).toBeGreaterThanOrEqual(4)
    expect(entregadas[entregadas.length - 1]).toBe(100)
  })

  it('la renovación inmediata no espera', () => {
    const entregar = vi.fn()
    const freno = crearFreno(entregar)

    freno.ahora()

    expect(entregar).toHaveBeenCalledTimes(1)
  })

  it('la renovación inmediata anula el turno pendiente y no se entrega dos veces', () => {
    const entregar = vi.fn()
    const freno = crearFreno(entregar)

    freno.cambio()
    vi.advanceTimersByTime(100)
    freno.ahora()
    vi.advanceTimersByTime(1000)

    expect(entregar).toHaveBeenCalledTimes(1)
  })

  it('tras entregar, el siguiente cambio vuelve a esperar su turno', () => {
    const entregar = vi.fn()
    const freno = crearFreno(entregar)

    freno.cambio()
    vi.advanceTimersByTime(250)
    freno.cambio()
    expect(entregar).toHaveBeenCalledTimes(1)
    vi.advanceTimersByTime(250)
    expect(entregar).toHaveBeenCalledTimes(2)
  })

  it('descartar anula el turno pendiente sin entregar', () => {
    const entregar = vi.fn()
    const freno = crearFreno(entregar)

    freno.cambio()
    freno.descartar()
    vi.advanceTimersByTime(1000)

    expect(entregar).not.toHaveBeenCalled()
  })

  it('acepta un temporizador y un intervalo inyectados', () => {
    const turnos = []
    const programar = vi.fn((fn, ms) => {
      turnos.push({ fn, ms })
      return turnos.length
    })
    const cancelar = vi.fn()
    const entregar = vi.fn()
    const freno = crearFreno(entregar, { intervaloMs: 40, programar, cancelar })

    freno.cambio()
    freno.cambio()
    expect(programar).toHaveBeenCalledTimes(1)
    expect(turnos[0].ms).toBe(40)

    freno.ahora()
    expect(cancelar).toHaveBeenCalledWith(1)
    expect(entregar).toHaveBeenCalledTimes(1)
  })
})
