import { describe, expect, it } from 'vitest'

import { LLEGADAS_POR_HORA } from '../data/parametros.js'
import { comoHoraDeLaTarde, comoNumero, comoPorcentaje, comoReloj } from './formato.js'

describe('comoNumero', () => {
  it('usa coma decimal, como se escribe en Colombia', () => {
    expect(comoNumero(LLEGADAS_POR_HORA, 4)).toBe('14,1935')
    expect(comoNumero(0.5, 1)).toBe('0,5')
  })

  it('muestra los decimales que se le piden', () => {
    expect(comoNumero(15.3158, 2)).toBe('15,32')
    expect(comoNumero(15.3158, 0)).toBe('15')
    expect(comoNumero(10, 2)).toBe('10,00')
  })

  it('no inventa nada cuando el valor no es un número', () => {
    expect(comoNumero(Number.NaN)).toBe('—')
    expect(comoNumero(Number.POSITIVE_INFINITY)).toBe('—')
  })
})

describe('comoPorcentaje', () => {
  it('convierte una proporción en porcentaje con coma', () => {
    expect(comoPorcentaje(19 / 23)).toBe('82,6 %')
    expect(comoPorcentaje(4 / 23)).toBe('17,4 %')
    expect(comoPorcentaje(0)).toBe('0,0 %')
    expect(comoPorcentaje(1)).toBe('100,0 %')
  })
})

describe('comoReloj', () => {
  it('muestra solo minutos cuando no llega a una hora', () => {
    expect(comoReloj(0)).toBe('0 min')
    expect(comoReloj(45)).toBe('45 min')
    expect(comoReloj(59.9)).toBe('59 min')
  })

  it('muestra horas y minutos a partir de una hora', () => {
    expect(comoReloj(60)).toBe('1 h 0 min')
    expect(comoReloj(65)).toBe('1 h 5 min')
    expect(comoReloj(125)).toBe('2 h 5 min')
    expect(comoReloj(600)).toBe('10 h 0 min')
  })

  it('no retrocede con valores imposibles', () => {
    expect(comoReloj(-5)).toBe('0 min')
    expect(comoReloj(Number.NaN)).toBe('0 min')
  })
})

describe('comoHoraDeLaTarde', () => {
  it('cero minutos son las 3:10 p. m., cuando empieza la observación', () => {
    expect(comoHoraDeLaTarde(0)).toBe('3:10 p. m.')
  })

  it('suma los minutos transcurridos a la hora de la tarde', () => {
    expect(comoHoraDeLaTarde(50)).toBe('4:00 p. m.')
    expect(comoHoraDeLaTarde(61)).toBe('4:11 p. m.')
    expect(comoHoraDeLaTarde(140)).toBe('5:30 p. m.')
  })

  it('descarta la fracción de minuto', () => {
    expect(comoHoraDeLaTarde(60.9)).toBe('4:10 p. m.')
  })

  it('un valor que no es un número no rompe y se queda en el inicio', () => {
    expect(comoHoraDeLaTarde(Number.NaN)).toBe('3:10 p. m.')
    expect(comoHoraDeLaTarde(Number.POSITIVE_INFINITY)).toBe('3:10 p. m.')
    expect(comoHoraDeLaTarde(-5)).toBe('3:10 p. m.')
  })

  it('a medianoche muestra las 12 y no las 0', () => {
    expect(comoHoraDeLaTarde(530)).toBe('12:00 a. m.')
  })
})
