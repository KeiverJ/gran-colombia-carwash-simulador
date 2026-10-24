import { beforeEach, describe, expect, it } from 'vitest'

import { ACABADO_PROMEDIO_MIN, PROPORCION_PLAN_EXACTA } from '../data/parametros.js'
import { crearSimulador } from '../engine/simulador.js'
import {
  acabadoPromedioDe,
  PLACAS_POSIBLES,
  PUESTOS_POSIBLES,
  repartirProporciones,
  useSimulacion,
  VELOCIDAD_MAXIMA,
  VELOCIDAD_MINIMA,
} from './simulacion.js'

const estado = () => useSimulacion.getState()
const inicial = useSimulacion.getState()

beforeEach(() => {
  // Cada prueba arranca con un store limpio: el motor es una corrida entera.
  useSimulacion.setState({ ...inicial })
  estado().cambiarSemilla(1)
  estado().pausar()
  estado().cambiarVelocidad(1)
})

describe('el store arranca con el lavadero vacío y en pausa', () => {
  it('el reloj está en cero y nadie está dentro', () => {
    const { foto, corriendo } = estado()
    expect(foto.relojMin).toBe(0)
    expect(foto.placas.every((p) => p.libre)).toBe(true)
    expect(foto.puestos.every((p) => p.libre)).toBe(true)
    expect(foto.colaLavado).toHaveLength(0)
    expect(foto.colaAcabado).toHaveLength(0)
    expect(corriendo).toBe(false)
  })

  it('usa las proporciones exactas, no las redondeadas', () => {
    expect(estado().parametros.proporcionPlan).toEqual(PROPORCION_PLAN_EXACTA)
  })
})

describe('avanzar cuadro a cuadro', () => {
  it('en pausa el reloj no se mueve', () => {
    estado().avanzarCuadro(1000)
    expect(estado().foto.relojMin).toBe(0)
  })

  it('corriendo avanza lo que dice la velocidad', () => {
    estado().iniciar()
    estado().avanzarCuadro(100) // 0,1 s a 1 min/s
    expect(estado().foto.relojMin).toBeCloseTo(0.1, 10)
  })

  it('el doble de velocidad avanza el doble', () => {
    estado().iniciar()
    estado().avanzarCuadro(100)
    const conUna = estado().foto.relojMin

    useSimulacion.setState({ ...inicial })
    estado().cambiarVelocidad(2)
    estado().iniciar()
    estado().avanzarCuadro(100)
    expect(estado().foto.relojMin).toBeCloseTo(conUna * 2, 10)
  })

  it('un cuadro larguísimo se recorta', () => {
    estado().iniciar()
    estado().avanzarCuadro(30000)
    expect(estado().foto.relojMin).toBeCloseTo(0.1, 10)
  })

  it('la velocidad se mantiene entre sus límites', () => {
    estado().cambiarVelocidad(1000)
    expect(estado().velocidadMinPorSegundo).toBe(VELOCIDAD_MAXIMA)
    estado().cambiarVelocidad(0)
    expect(estado().velocidadMinPorSegundo).toBe(VELOCIDAD_MINIMA)
  })
})

describe('cambiar un parámetro reinicia la simulación', () => {
  const avanzarUnRato = () => {
    estado().iniciar()
    for (let i = 0; i < 50; i += 1) {
      estado().avanzarCuadro(100)
    }
  }

  it('vuelve al minuto cero conservando la semilla', () => {
    avanzarUnRato()
    expect(estado().foto.relojMin).toBeGreaterThan(0)
    const semillaAntes = estado().semilla

    estado().cambiarParametro('placas', 7)

    expect(estado().foto.relojMin).toBe(0)
    expect(estado().foto.placas).toHaveLength(7)
    expect(estado().foto.placas.every((p) => p.libre)).toBe(true)
    expect(estado().semilla).toBe(semillaAntes)
  })

  it('sigue corriendo si estaba corriendo', () => {
    avanzarUnRato()
    estado().cambiarParametro('puestos', 4)
    expect(estado().corriendo).toBe(true)
    estado().avanzarCuadro(100)
    expect(estado().foto.relojMin).toBeGreaterThan(0)
  })

  it('sigue pausada si estaba pausada', () => {
    estado().pausar()
    estado().cambiarParametro('puestos', 5)
    expect(estado().corriendo).toBe(false)
    estado().avanzarCuadro(100)
    expect(estado().foto.relojMin).toBe(0)
  })

  it('deja un aviso en palabras simples que nombra lo que cambió', () => {
    estado().cambiarParametro('placas', 7)
    expect(estado().aviso).toMatch(/placas/)
    expect(estado().aviso).toMatch(/volvió a empezar/)
  })

  it('cambiar la semilla también reinicia', () => {
    avanzarUnRato()
    estado().cambiarSemilla(2026)
    expect(estado().foto.relojMin).toBe(0)
    expect(estado().semilla).toBe(2026)
    expect(estado().aviso).toMatch(/semilla/)
  })

  it('la velocidad se puede cambiar sin reiniciar', () => {
    avanzarUnRato()
    const relojAntes = estado().foto.relojMin
    estado().cambiarVelocidad(5)
    expect(estado().foto.relojMin).toBe(relojAntes)
  })

  it('las placas y los puestos que ofrece el panel son los del proyecto', () => {
    expect(PLACAS_POSIBLES).toEqual([5, 6, 7])
    expect(PUESTOS_POSIBLES).toEqual([3, 4, 5])
    for (const placas of PLACAS_POSIBLES) {
      estado().cambiarParametro('placas', placas)
      expect(estado().foto.placas).toHaveLength(placas)
    }
    for (const puestos of PUESTOS_POSIBLES) {
      estado().cambiarParametro('puestos', puestos)
      expect(estado().foto.puestos).toHaveLength(puestos)
    }
  })
})

describe('el tiempo medio de acabado se recalcula con los valores actuales', () => {
  it('por defecto sale de los tiempos y las proporciones, no de la constante', () => {
    const recalculado = acabadoPromedioDe(estado().parametros)
    expect(recalculado).toBeCloseTo(15.8696, 3)
    // Es la media ponderada de verdad, no el número redondeado del documento.
    expect(recalculado).not.toBe(ACABADO_PROMEDIO_MIN)
    expect(recalculado).toBe(
      (19 / 23) * estado().parametros.acabadoPlanMin[2] +
        (4 / 23) * estado().parametros.acabadoPlanMin[3],
    )
  })

  it('sube al subir el tiempo de acabado de un plan', () => {
    estado().cambiarAcabadoDePlan(2, 20)
    expect(acabadoPromedioDe(estado().parametros)).toBeCloseTo(19.7391, 4)
  })

  it('cambia al mover las proporciones', () => {
    estado().cambiarProporcion(3, 1) // todas las motos al plan 3
    expect(acabadoPromedioDe(estado().parametros)).toBeCloseTo(
      estado().parametros.acabadoPlanMin[3],
      10,
    )
  })
})

describe('las proporciones al mover un deslizador', () => {
  const suma = (p) => p[1] + p[2] + p[3]

  it('el plan movido queda exactamente en el valor pedido', () => {
    for (const plan of [1, 2, 3]) {
      estado().cambiarProporcion(plan, 0.37)
      expect(estado().parametros.proporcionPlan[plan]).toBe(0.37)
    }
  })

  it('las tres suman 1 dentro de la tolerancia del motor, sin negativas', () => {
    for (const plan of [1, 2, 3]) {
      for (let pct = 0; pct <= 100; pct += 1) {
        estado().cambiarProporcion(plan, pct / 100)
        const proporciones = estado().parametros.proporcionPlan
        expect(Math.abs(suma(proporciones) - 1)).toBeLessThan(1e-9)
        for (const p of [1, 2, 3]) {
          expect(proporciones[p]).toBeGreaterThanOrEqual(0)
        }
      }
    }
  })

  it('llevar un plan al 100 % deja los otros dos en 0, y se puede volver', () => {
    estado().cambiarProporcion(2, 1)
    expect(estado().parametros.proporcionPlan).toEqual({ 1: 0, 2: 1, 3: 0 })

    estado().cambiarProporcion(2, 0.1)
    const proporciones = estado().parametros.proporcionPlan
    // Los otros dos estaban en 0: el resto se reparte mitad y mitad.
    expect(proporciones[1]).toBeCloseTo(0.45, 10)
    expect(proporciones[3]).toBeCloseTo(0.45, 10)
    expect(Math.abs(suma(proporciones) - 1)).toBeLessThan(1e-9)
  })

  it('los otros dos conservan la relación que tenían entre sí', () => {
    const repartido = repartirProporciones({ 1: 0, 2: 0.6, 3: 0.2 }, 1, 0.2)
    // 0,8 repartido tres cuartos y un cuarto.
    expect(repartido[2]).toBeCloseTo(0.6, 10)
    expect(repartido[3]).toBeCloseTo(0.2, 10)
  })

  it('el motor acepta cualquier reparto que salga de mover un deslizador', () => {
    for (const plan of [1, 2, 3]) {
      for (const valor of [0, 0.123, 0.5, 0.999, 1]) {
        const proporcionPlan = repartirProporciones(
          estado().parametros.proporcionPlan,
          plan,
          valor,
        )
        expect(() => crearSimulador({ semilla: 1, proporcionPlan })).not.toThrow()
      }
    }
  })

  it('un valor fuera de rango se acota en vez de romper nada', () => {
    estado().cambiarProporcion(2, 1.8)
    expect(estado().parametros.proporcionPlan[2]).toBe(1)
    estado().cambiarProporcion(2, -0.5)
    expect(estado().parametros.proporcionPlan[2]).toBe(0)
  })
})
