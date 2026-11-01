import { beforeEach, describe, expect, it } from 'vitest'

import { MODO_MMS } from '../engine/simulador.js'
import { MODO_VISITA, useSimulacion } from './simulacion.js'

/**
 * El store es la guardia: todo valor pasa por la validación antes de llegar al
 * motor. Un valor que no sirve no se aplica, no reinicia nada y conserva el
 * anterior, venga de donde venga (un campo, un deslizador, un escenario o
 * código).
 */

const estado = () => useSimulacion.getState()
const inicial = useSimulacion.getState()

beforeEach(() => {
  useSimulacion.setState({ ...inicial })
  estado().cambiarSemilla(1)
  estado().pausar()
  estado().cambiarVelocidad(1)
})

/** Lo que no es un número, o no es finito. */
const NO_NUMEROS = [NaN, Infinity, -Infinity, undefined, null, '', '7', 'abc', {}, []]

/** Una foto de todo lo que una acción rechazada no debe tocar. */
function huella() {
  const { parametros, semilla, velocidadMinPorSegundo, generacion, motor, aviso, foto } = estado()
  return { parametros: structuredClone(parametros), semilla, velocidadMinPorSegundo, generacion, motor, aviso, foto }
}

/** Avanza un rato, para que "reiniciar" se note si ocurre. */
function avanzarUnRato() {
  estado().cambiarVelocidad(10)
  estado().iniciar()
  for (let i = 0; i < 20; i += 1) {
    estado().avanzarCuadro(100)
  }
  estado().cambiarVelocidad(1)
  expect(estado().foto.relojMin).toBeGreaterThan(0)
}

function noSeAplica(accion) {
  avanzarUnRato()
  const antes = huella()
  expect(accion()).toBe(false)
  const despues = huella()
  expect(despues.parametros).toEqual(antes.parametros)
  expect(despues.semilla).toBe(antes.semilla)
  expect(despues.velocidadMinPorSegundo).toBe(antes.velocidadMinPorSegundo)
  // Ni se reinició ni se cambió el motor: el reloj sigue donde estaba.
  expect(despues.generacion).toBe(antes.generacion)
  expect(despues.motor).toBe(antes.motor)
  expect(despues.foto).toBe(antes.foto)
  expect(despues.aviso).toBe(antes.aviso)
}

describe('cambiarParametro rechaza lo que no sirve', () => {
  const CASOS = [
    ['llegadasPorHora', [0, 0.99, 200.01, 1000, -5]],
    ['lavadoMin', [0, 0.49, 120.01, -1]],
    ['placas', [0, 15, 2.5, -1, 100]],
    ['puestos', [0, 8, 3.2, -2, 100]],
    ['modoAcabado', ['otro', 3, true]],
  ]

  it.each(CASOS)('%s', (nombre, malos) => {
    for (const valor of [...malos, ...NO_NUMEROS]) {
      noSeAplica(() => estado().cambiarParametro(nombre, valor))
    }
  })

  it('un nombre que no es un parámetro no hace nada', () => {
    noSeAplica(() => estado().cambiarParametro('semilla', 5))
    noSeAplica(() => estado().cambiarParametro('inventado', 5))
    noSeAplica(() => estado().cambiarParametro('constructor', 5))
  })

  it('los extremos válidos sí se aplican y reinician con la misma semilla', () => {
    const casos = [
      ['llegadasPorHora', 1],
      ['llegadasPorHora', 200],
      ['lavadoMin', 0.5],
      ['lavadoMin', 120],
      ['placas', 1],
      ['placas', 14],
      ['puestos', 1],
      ['puestos', 7],
      ['modoAcabado', MODO_MMS],
    ]
    for (const [nombre, valor] of casos) {
      avanzarUnRato()
      expect(estado().cambiarParametro(nombre, valor)).toBe(true)
      expect(estado().parametros[nombre]).toBe(valor)
      expect(estado().foto.relojMin).toBe(0)
      expect(estado().semilla).toBe(1)
    }
  })

  it('con 14 placas y 7 puestos el motor arranca y avanza', () => {
    expect(estado().cambiarParametro('placas', 14)).toBe(true)
    expect(estado().cambiarParametro('puestos', 7)).toBe(true)
    expect(estado().foto.placas).toHaveLength(14)
    expect(estado().foto.puestos).toHaveLength(7)
    estado().iniciar()
    estado().cambiarVelocidad(60)
    for (let i = 0; i < 30; i += 1) {
      estado().avanzarCuadro(100)
    }
    expect(estado().foto.relojMin).toBeGreaterThan(0)
  })
})

describe('cambiarAcabadoDePlan rechaza lo que no sirve', () => {
  it('tiempos fuera de 0,5 a 120 min y valores que no son números', () => {
    for (const minutos of [0, 0.49, 120.01, -3, ...NO_NUMEROS]) {
      noSeAplica(() => estado().cambiarAcabadoDePlan(2, minutos))
    }
  })

  it('un plan que no existe', () => {
    for (const plan of [0, 4, 1.5, '2', null, undefined, NaN]) {
      noSeAplica(() => estado().cambiarAcabadoDePlan(plan, 10))
    }
  })

  it('los extremos valen', () => {
    expect(estado().cambiarAcabadoDePlan(1, 0.5)).toBe(true)
    expect(estado().parametros.acabadoPlanMin[1]).toBe(0.5)
    expect(estado().cambiarAcabadoDePlan(3, 120)).toBe(true)
    expect(estado().parametros.acabadoPlanMin[3]).toBe(120)
  })
})

describe('cambiarProporcion rechaza lo que no sirve', () => {
  it('fracciones fuera de 0 a 1 y valores que no son números', () => {
    for (const valor of [-0.01, 1.01, 50, ...NO_NUMEROS]) {
      noSeAplica(() => estado().cambiarProporcion(2, valor))
    }
  })

  it('un plan que no existe', () => {
    for (const plan of [0, 4, 1.5, '2', null, undefined, NaN]) {
      noSeAplica(() => estado().cambiarProporcion(plan, 0.5))
    }
  })

  it('los extremos 0 y 1 valen', () => {
    expect(estado().cambiarProporcion(2, 1)).toBe(true)
    expect(estado().parametros.proporcionPlan[2]).toBe(1)
    expect(estado().cambiarProporcion(2, 0)).toBe(true)
    expect(estado().parametros.proporcionPlan[2]).toBe(0)
  })
})

describe('cambiarSemilla rechaza lo que no sirve', () => {
  it('negativas, decimales, fuera de 32 bits y lo que no es un número', () => {
    for (const semilla of [-1, 2.5, 4294967296, 1e12, ...NO_NUMEROS]) {
      noSeAplica(() => estado().cambiarSemilla(semilla))
    }
  })

  it('0 y 4 294 967 295 valen', () => {
    expect(estado().cambiarSemilla(0)).toBe(true)
    expect(estado().semilla).toBe(0)
    expect(estado().cambiarSemilla(4294967295)).toBe(true)
    expect(estado().semilla).toBe(4294967295)
  })
})

describe('cambiarVelocidad rechaza en vez de recortar', () => {
  it('fuera de 0,25 a 120 y lo que no es un número, sin reiniciar', () => {
    for (const velocidad of [0, 0.24, 120.01, 1000, -1, ...NO_NUMEROS]) {
      noSeAplica(() => estado().cambiarVelocidad(velocidad))
    }
  })

  it('los extremos valen y no reinician', () => {
    avanzarUnRato()
    const reloj = estado().foto.relojMin
    expect(estado().cambiarVelocidad(0.25)).toBe(true)
    expect(estado().cambiarVelocidad(120)).toBe(true)
    expect(estado().velocidadMinPorSegundo).toBe(120)
    expect(estado().foto.relojMin).toBe(reloj)
  })

  it('se puede cambiar también en la visita', () => {
    estado().entrarEnLaVisita()
    expect(estado().modo).toBe(MODO_VISITA)
    expect(estado().cambiarVelocidad(30)).toBe(true)
    expect(estado().velocidadMinPorSegundo).toBe(30)
  })
})

describe('en la visita nada de esto se aplica', () => {
  it('ninguna acción de parámetros cambia nada', () => {
    estado().entrarEnLaVisita()
    const antes = huella()
    expect(estado().cambiarParametro('placas', 7)).toBe(false)
    expect(estado().cambiarAcabadoDePlan(1, 10)).toBe(false)
    expect(estado().cambiarProporcion(1, 0.5)).toBe(false)
    expect(estado().cambiarSemilla(9)).toBe(false)
    const despues = huella()
    expect(despues.parametros).toEqual(antes.parametros)
    expect(despues.semilla).toBe(antes.semilla)
    expect(despues.motor).toBe(antes.motor)
  })
})
