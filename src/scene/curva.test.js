import { describe, expect, it } from 'vitest'

import { funcionDeLaCurva, numerosDeLaCurva } from './curva.js'

describe('leer una curva de CSS', () => {
  it('entiende cubic-bezier con o sin espacios', () => {
    expect(numerosDeLaCurva('cubic-bezier(0, 0, 0.2, 1)')).toEqual([0, 0, 0.2, 1])
    expect(numerosDeLaCurva(' cubic-bezier(0.4,0,1,1) ')).toEqual([0.4, 0, 1, 1])
  })

  it('no entiende lo que no es un cubic-bezier válido', () => {
    expect(numerosDeLaCurva('ease-out')).toBeNull()
    expect(numerosDeLaCurva('')).toBeNull()
    expect(numerosDeLaCurva(undefined)).toBeNull()
    expect(numerosDeLaCurva('cubic-bezier(2, 0, 0.2, 1)')).toBeNull()
    expect(numerosDeLaCurva('cubic-bezier(a, 0, 0.2, 1)')).toBeNull()
  })
})

describe('la curva como función', () => {
  const entrada = funcionDeLaCurva('cubic-bezier(0, 0, 0.2, 1)')
  const salida = funcionDeLaCurva('cubic-bezier(0.4, 0, 1, 1)')

  it('empieza en 0 y termina en 1', () => {
    for (const curva of [entrada, salida]) {
      expect(curva(0)).toBe(0)
      expect(curva(1)).toBe(1)
      expect(curva(-3)).toBe(0)
      expect(curva(7)).toBe(1)
    }
  })

  it('la de entrada arranca rápido y la de salida arranca lento', () => {
    expect(entrada(0.2)).toBeGreaterThan(0.2)
    expect(salida(0.2)).toBeLessThan(0.2)
  })

  it('siempre avanza: nunca retrocede', () => {
    for (const curva of [entrada, salida]) {
      let anterior = 0
      for (let i = 1; i <= 50; i += 1) {
        const valor = curva(i / 50)
        expect(valor).toBeGreaterThanOrEqual(anterior - 1e-9)
        anterior = valor
      }
    }
  })

  it('coincide con valores conocidos de la curva de CSS ease-out de Material', () => {
    // cubic-bezier(0, 0, 0.2, 1) en 50 % da cerca de 0,80.
    expect(entrada(0.5)).toBeCloseTo(0.8, 1)
  })

  it('con una curva que no entiende avanza en línea recta', () => {
    const recta = funcionDeLaCurva('nada')
    expect(recta(0.25)).toBeCloseTo(0.25, 9)
  })
})
