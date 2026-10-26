import { describe, expect, it } from 'vitest'

import { crearGenerador } from '../engine/aleatorio.js'
import {
  comoTextoDeLaFrase,
  comoTextoDelCampo,
  interpretarNumero,
  mensajeDeError,
  RANGOS,
} from './campoNumerico.js'

const llegadas = RANGOS.llegadas
const semilla = RANGOS.semilla

describe('interpretarNumero', () => {
  it('acepta la coma y el punto como el mismo número, con espacios alrededor', () => {
    expect(interpretarNumero('14,5', llegadas)).toEqual({ valido: true, valor: 14.5 })
    expect(interpretarNumero('14.5', llegadas)).toEqual({ valido: true, valor: 14.5 })
    expect(interpretarNumero('  14,5  ', llegadas)).toEqual({ valido: true, valor: 14.5 })
    expect(interpretarNumero('10', llegadas)).toEqual({ valido: true, valor: 10 })
    expect(interpretarNumero('10,7391', RANGOS.lavado)).toEqual({ valido: true, valor: 10.7391 })
  })

  it('rechaza lo vacío, las letras y lo que no es un número simple', () => {
    for (const texto of ['', '   ', 'abc', '14 ,5', '1e3', '1E3', '1.000,5', '1,000.5', '0x10', '--5', '14,5,2']) {
      expect(interpretarNumero(texto, llegadas), JSON.stringify(texto)).toEqual({ valido: false })
    }
  })

  it('rechaza lo que no es finito o no cabe', () => {
    for (const texto of ['Infinity', '-Infinity', 'NaN', '1e999', '9'.repeat(400), `1${'0'.repeat(300)}`]) {
      expect(interpretarNumero(texto, llegadas), texto.slice(0, 20)).toEqual({ valido: false })
    }
    // Aunque Number() lo lea como un valor chico, un texto de cientos de dígitos no se acepta.
    expect(interpretarNumero(`0,${'1'.repeat(300)}`, RANGOS.proporcion)).toEqual({ valido: false })
  })

  it('rechaza los negativos y lo que sale del rango, y acepta los extremos', () => {
    expect(interpretarNumero('-3', llegadas)).toEqual({ valido: false })
    expect(interpretarNumero('-0,5', RANGOS.proporcion)).toEqual({ valido: false })
    expect(interpretarNumero('80', llegadas)).toEqual({ valido: false })
    expect(interpretarNumero('0,99', llegadas)).toEqual({ valido: false })
    expect(interpretarNumero('40,0001', llegadas)).toEqual({ valido: false })
    expect(interpretarNumero('1', llegadas)).toEqual({ valido: true, valor: 1 })
    expect(interpretarNumero('40', llegadas)).toEqual({ valido: true, valor: 40 })
    expect(interpretarNumero('0', RANGOS.proporcion)).toEqual({ valido: true, valor: 0 })
    expect(interpretarNumero('100', RANGOS.proporcion)).toEqual({ valido: true, valor: 100 })
  })

  it('usa los rangos de los deslizadores y ninguno nuevo', () => {
    expect(RANGOS.llegadas).toMatchObject({ minimo: 1, maximo: 40 })
    expect(RANGOS.lavado).toMatchObject({ minimo: 1, maximo: 30 })
    expect(RANGOS.acabado).toMatchObject({ minimo: 1, maximo: 40 })
    expect(RANGOS.proporcion).toMatchObject({ minimo: 0, maximo: 100 })
    expect(RANGOS.semilla).toMatchObject({ minimo: 0, maximo: 4294967295, entero: true })
  })

  it('la semilla es un entero de 0 a 4 294 967 295', () => {
    expect(interpretarNumero('0', semilla)).toEqual({ valido: true, valor: 0 })
    expect(interpretarNumero('42', semilla)).toEqual({ valido: true, valor: 42 })
    expect(interpretarNumero('4294967295', semilla)).toEqual({ valido: true, valor: 4294967295 })
    expect(interpretarNumero('2,5', semilla)).toEqual({ valido: false })
    expect(interpretarNumero('2.5', semilla)).toEqual({ valido: false })
    expect(interpretarNumero('-3', semilla)).toEqual({ valido: false })
    expect(interpretarNumero('4294967296', semilla)).toEqual({ valido: false })
    // Un decimal que vale un entero ("7,0") sí es el entero 7.
    expect(interpretarNumero('7,0', semilla)).toEqual({ valido: true, valor: 7 })
  })

  it('la semilla 4294967296 se rechaza porque repetiría la corrida de la semilla 0', () => {
    const cero = crearGenerador(0)
    const repetida = crearGenerador(4294967296)
    const dePrueba = crearGenerador(1)
    const sorteos = (generador) => Array.from({ length: 5 }, () => generador())
    expect(sorteos(repetida)).toEqual(sorteos(cero))
    expect(sorteos(dePrueba)).not.toEqual(sorteos(crearGenerador(0)))
    // Y por eso el rango termina un número antes.
    expect(RANGOS.semilla.maximo + 1).toBe(4294967296)
    expect(interpretarNumero(String(RANGOS.semilla.maximo + 1), semilla)).toEqual({ valido: false })
  })
})

describe('comoTextoDelCampo', () => {
  it('muestra la coma decimal, hasta 4 decimales y sin ceros sobrantes', () => {
    expect(comoTextoDelCampo(14.5)).toBe('14,5')
    expect(comoTextoDelCampo(10.7391)).toBe('10,7391')
    expect(comoTextoDelCampo(10)).toBe('10')
    expect(comoTextoDelCampo(14.19351234)).toBe('14,1935')
    expect(comoTextoDelCampo(0.1 + 0.2)).toBe('0,3')
  })

  it('no separa los miles (la semilla se puede copiar y pegar)', () => {
    expect(comoTextoDelCampo(4294967295)).toBe('4294967295')
    expect(comoTextoDelCampo(0)).toBe('0')
  })

  it('lo que no es finito queda vacío', () => {
    expect(comoTextoDelCampo(Number.NaN)).toBe('')
    expect(comoTextoDelCampo(Number.POSITIVE_INFINITY)).toBe('')
  })

  it('lo que se muestra se vuelve a leer como el mismo valor', () => {
    for (const valor of [1, 14.1935, 10.7391, 40, 0.5, 33.3333]) {
      const leido = interpretarNumero(comoTextoDelCampo(valor), RANGOS.proporcion)
      expect(leido).toEqual({ valido: true, valor })
    }
  })
})

describe('comoTextoDeLaFrase', () => {
  it('separa los miles con un espacio que no se parte', () => {
    expect(comoTextoDeLaFrase(4294967295)).toBe('4 294 967 295')
    expect(comoTextoDeLaFrase(40)).toBe('40')
    expect(comoTextoDeLaFrase(1000)).toBe('1 000')
  })

  it('usa la coma para los decimales', () => {
    expect(comoTextoDeLaFrase(14.1935)).toBe('14,1935')
    expect(comoTextoDeLaFrase(12345.5)).toBe('12 345,5')
  })
})

describe('mensajeDeError', () => {
  it('trae el mínimo, el máximo y el último valor válido, con coma decimal', () => {
    const mensaje = mensajeDeError(llegadas, 14.1935)
    expect(mensaje).toBe(
      'Escribe un número entre 1 y 40. La simulación sigue con 14,1935 hasta que el valor sea válido.',
    )
    expect(mensaje).toMatch(/^Escribe un número entre 1 y 40/)
  })

  it('para la semilla pide un número entero', () => {
    const mensaje = mensajeDeError(semilla, 42)
    expect(mensaje).toContain('Escribe un número entero entre 0 y 4 294 967 295.')
    expect(mensaje).toContain('sigue con 42 hasta')
  })

  it('no habla de código ni de rangos internos', () => {
    expect(mensajeDeError(RANGOS.lavado, 10.7391)).not.toMatch(/NaN|undefined|null|\bint\b/)
  })
})
