import { describe, expect, it } from 'vitest'

import { MODO_MMS, MODO_POR_PLAN } from '../engine/simulador.js'
import { HORAS_DE_LA_CORRIDA_LARGA_POSIBLES, RANGOS, validarParametro } from './rangos.js'

const sirve = (nombre, valor) => validarParametro(nombre, valor).valido

/** Lo que no es un número de verdad, o no cabe en ningún rango. */
const BASURA = [NaN, Infinity, -Infinity, undefined, null, '', '5', '5,5', 'abc', {}, [], [5], true, () => 5]

describe('los rangos', () => {
  it('son los de la especificación del cambio', () => {
    expect(RANGOS.llegadas).toMatchObject({ minimo: 1, maximo: 200 })
    expect(RANGOS.placas).toMatchObject({ minimo: 1, maximo: 14, entero: true })
    expect(RANGOS.puestos).toMatchObject({ minimo: 1, maximo: 7, entero: true })
    expect(RANGOS.lavado).toMatchObject({ minimo: 0.5, maximo: 120 })
    expect(RANGOS.acabado).toMatchObject({ minimo: 0.5, maximo: 120 })
    expect(RANGOS.velocidad).toMatchObject({ minimo: 0.25, maximo: 120 })
    expect(RANGOS.semilla).toMatchObject({ minimo: 0, maximo: 4294967295, entero: true })
    expect(HORAS_DE_LA_CORRIDA_LARGA_POSIBLES).toEqual([100, 1000, 5000])
  })
})

describe('validarParametro: los extremos valen y justo afuera no', () => {
  const CASOS = [
    ['llegadasPorHora', 1, 200, 0.9999, 200.0001],
    ['lavadoMin', 0.5, 120, 0.4999, 120.0001],
    ['acabadoPlanMin', 0.5, 120, 0.4999, 120.0001],
    ['placas', 1, 14, 0, 15],
    ['puestos', 1, 7, 0, 8],
    ['semilla', 0, 4294967295, -1, 4294967296],
    ['velocidad', 0.25, 120, 0.2499, 120.0001],
    ['proporcionPlan', 0, 1, -0.0001, 1.0001],
  ]

  it.each(CASOS)('%s', (nombre, minimo, maximo, pocoAbajo, pocoArriba) => {
    expect(validarParametro(nombre, minimo)).toEqual({ valido: true, valor: minimo })
    expect(validarParametro(nombre, maximo)).toEqual({ valido: true, valor: maximo })
    expect(sirve(nombre, pocoAbajo)).toBe(false)
    expect(sirve(nombre, pocoArriba)).toBe(false)
  })

  it.each(CASOS.map(([nombre]) => [nombre]))('%s rechaza lo que no es un número', (nombre) => {
    for (const basura of BASURA) {
      expect(sirve(nombre, basura), `${nombre} con ${String(basura)}`).toBe(false)
    }
  })
})

describe('validarParametro: los enteros', () => {
  it.each([['placas', 2.5], ['puestos', 3.1], ['semilla', 7.5], ['placas', 6.000001]])(
    '%s no acepta %s',
    (nombre, valor) => {
      expect(sirve(nombre, valor)).toBe(false)
    },
  )

  it('los decimales sí valen donde no se pide entero', () => {
    expect(sirve('llegadasPorHora', 14.1935)).toBe(true)
    expect(sirve('velocidad', 0.75)).toBe(true)
    expect(sirve('lavadoMin', 10.7391)).toBe(true)
  })
})

describe('validarParametro: los modos y las horas de la corrida larga', () => {
  it('el modo de acabado es uno de los dos que existen', () => {
    expect(validarParametro('modoAcabado', MODO_POR_PLAN)).toEqual({ valido: true, valor: MODO_POR_PLAN })
    expect(validarParametro('modoAcabado', MODO_MMS)).toEqual({ valido: true, valor: MODO_MMS })
    for (const valor of ['otro', '', null, undefined, 1, {}]) {
      expect(sirve('modoAcabado', valor)).toBe(false)
    }
  })

  it('la corrida larga dura 100, 1000 o 5000 horas y nada más', () => {
    for (const horas of [100, 1000, 5000]) {
      expect(sirve('horasDeLaCorridaLarga', horas)).toBe(true)
    }
    for (const horas of [0, 1, 99, 101, 2000, 5001, '1000', NaN, Infinity, null]) {
      expect(sirve('horasDeLaCorridaLarga', horas), String(horas)).toBe(false)
    }
  })

  it('un nombre que no existe no es válido', () => {
    expect(sirve('inventado', 5)).toBe(false)
    expect(sirve('__proto__', 5)).toBe(false)
    expect(sirve('toString', 5)).toBe(false)
  })
})
