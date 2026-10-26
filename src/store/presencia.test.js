import { describe, expect, it } from 'vitest'

import { aMilisegundos, ASENTADAS, FASES, faseDeLaPresencia } from './presencia.js'

describe('la fase de presencia', () => {
  it('lo oculto que se pide abrir entra con su estado de partida', () => {
    expect(faseDeLaPresencia('oculta', true)).toBe('entrando')
  })

  it('lo visible que se pide cerrar sale, y sigue en el documento', () => {
    expect(faseDeLaPresencia('visible', false)).toBe('saliendo')
  })

  it('lo que ya está como se pide no cambia', () => {
    expect(faseDeLaPresencia('visible', true)).toBe('visible')
    expect(faseDeLaPresencia('oculta', false)).toBe('oculta')
  })

  it('cerrar y volver a abrir antes de que termine la salida lo deja visible, sin desmontarlo', () => {
    // La salida no terminó: sigue asentada como visible.
    expect(faseDeLaPresencia('visible', false)).toBe('saliendo')
    expect(faseDeLaPresencia('visible', true)).toBe('visible')
  })

  it('abrir y volver a cerrar antes de soltar la entrada lo deja oculto', () => {
    expect(faseDeLaPresencia('oculta', true)).toBe('entrando')
    expect(faseDeLaPresencia('oculta', false)).toBe('oculta')
  })

  it('cualquier combinación da una fase que existe', () => {
    for (const asentada of ASENTADAS) {
      for (const abierta of [true, false]) {
        expect(FASES).toContain(faseDeLaPresencia(asentada, abierta))
      }
    }
  })

  it('rechaza algo asentado que no existe', () => {
    expect(() => faseDeLaPresencia('entrando', true)).toThrow(RangeError)
  })
})

describe('las duraciones de CSS', () => {
  it('entiende milisegundos y segundos', () => {
    expect(aMilisegundos('200ms')).toBe(200)
    expect(aMilisegundos(' 120ms ')).toBe(120)
    expect(aMilisegundos('0.2s')).toBe(200)
    expect(aMilisegundos('1s')).toBe(1000)
  })

  it('con cero o con algo que no entiende, no hay animación', () => {
    expect(aMilisegundos('0ms')).toBe(0)
    expect(aMilisegundos('0s')).toBe(0)
    expect(aMilisegundos('')).toBe(0)
    expect(aMilisegundos(undefined)).toBe(0)
    expect(aMilisegundos('rápido')).toBe(0)
    expect(aMilisegundos('-50ms')).toBe(0)
  })
})
