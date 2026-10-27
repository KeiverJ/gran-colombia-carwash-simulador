import { describe, expect, it } from 'vitest'

import { indiceDeLaParadaDeTab, indiceTrasLaTecla } from './navegacionPorFlechas.js'

const tecla = (nombre, actual, cantidad = 3, conVerticales = false) =>
  indiceTrasLaTecla({ cantidad, actual, tecla: nombre, conVerticales })

describe('las flechas y Inicio/Fin', () => {
  it('derecha va a la siguiente y da la vuelta al final', () => {
    expect(tecla('ArrowRight', 0)).toBe(1)
    expect(tecla('ArrowRight', 1)).toBe(2)
    expect(tecla('ArrowRight', 2)).toBe(0)
  })

  it('izquierda va a la anterior y da la vuelta al principio', () => {
    expect(tecla('ArrowLeft', 2)).toBe(1)
    expect(tecla('ArrowLeft', 0)).toBe(2)
  })

  it('Inicio va a la primera y Fin a la última', () => {
    expect(tecla('Home', 2)).toBe(0)
    expect(tecla('End', 0)).toBe(2)
    expect(tecla('End', 0, 5)).toBe(4)
  })

  it('con dos elementos las flechas alternan', () => {
    expect(tecla('ArrowRight', 0, 2)).toBe(1)
    expect(tecla('ArrowRight', 1, 2)).toBe(0)
    expect(tecla('ArrowLeft', 0, 2)).toBe(1)
  })

  it('con un solo elemento se queda donde está', () => {
    expect(tecla('ArrowRight', 0, 1)).toBe(0)
    expect(tecla('ArrowLeft', 0, 1)).toBe(0)
  })
})

describe('arriba y abajo', () => {
  it('en las pestañas horizontales no hacen nada', () => {
    expect(tecla('ArrowDown', 0)).toBeNull()
    expect(tecla('ArrowUp', 1)).toBeNull()
  })

  it('en los grupos de una sola elección se comportan como derecha e izquierda', () => {
    expect(tecla('ArrowDown', 0, 3, true)).toBe(1)
    expect(tecla('ArrowUp', 0, 3, true)).toBe(2)
  })
})

describe('lo que no mueve nada', () => {
  it('otras teclas dan null para no robarle el evento al navegador', () => {
    for (const otra of ['Enter', ' ', 'Tab', 'a', 'Escape', 'PageDown']) {
      expect(tecla(otra, 1)).toBeNull()
    }
  })

  it('datos inválidos dan null en vez de un índice absurdo', () => {
    expect(indiceTrasLaTecla({ cantidad: 0, actual: 0, tecla: 'ArrowRight' })).toBeNull()
    expect(indiceTrasLaTecla({ cantidad: 3, actual: -1.5, tecla: 'ArrowRight' })).toBeNull()
    expect(indiceTrasLaTecla({ cantidad: Number.NaN, actual: 0, tecla: 'Home' })).toBeNull()
  })
})

describe('la única parada de Tab', () => {
  it('es el elegido', () => {
    expect(indiceDeLaParadaDeTab([false, true, false])).toBe(1)
  })

  it('si ninguno está elegido es el primero', () => {
    expect(indiceDeLaParadaDeTab([false, false, false])).toBe(0)
    expect(indiceDeLaParadaDeTab([])).toBe(0)
  })
})
