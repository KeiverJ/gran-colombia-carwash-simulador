import { beforeEach, describe, expect, it } from 'vitest'

import { ESCENARIOS } from '../data/escenarios.js'
import { PARAMETROS_POR_DEFECTO } from '../data/parametros.js'
import { rho2DelEscenario } from './metricas.js'
import { escenarioQueCoincide, parametrosDelEscenario, useSimulacion } from './simulacion.js'

const estado = () => useSimulacion.getState()
const inicial = useSimulacion.getState()

beforeEach(() => {
  useSimulacion.setState({ ...inicial })
  estado().cambiarSemilla(1)
  estado().pausar()
  estado().cambiarVelocidad(1)
})

/** El resumen se refresca con un freno por tiempo real: aquí se salta el freno. */
const refrescarElResumen = () => {
  useSimulacion.setState({ ultimasMetricasMs: 0 })
  estado().anotarMetricas(estado().foto)
}

const avanzar = (cuadros, velocidad = 30) => {
  estado().cambiarVelocidad(velocidad)
  estado().iniciar()
  for (let i = 0; i < cuadros; i += 1) {
    estado().avanzarCuadro(100)
  }
}

describe('el resumen que alimenta los indicadores', () => {
  it('al arrancar trae las placas y los puestos totales y todo lo demás en cero', () => {
    expect(estado().resumen).toEqual({
      relojMin: 0,
      enFilaLavado: 0,
      enFilaAcabado: 0,
      placasOcupadas: 0,
      puestosOcupados: 0,
      motosSalidas: 0,
      placasTotales: 6,
      puestosTotales: 3,
    })
  })

  it('coincide con la foto del motor mientras la simulación avanza', () => {
    for (let ronda = 0; ronda < 12; ronda += 1) {
      avanzar(10)
      refrescarElResumen()
      const { foto, resumen } = estado()
      expect(resumen.relojMin).toBe(foto.relojMin)
      expect(resumen.enFilaLavado).toBe(foto.colaLavado.length)
      expect(resumen.enFilaAcabado).toBe(foto.colaAcabado.length)
      expect(resumen.placasOcupadas).toBe(foto.placas.filter((p) => p.moto !== null).length)
      expect(resumen.puestosOcupados).toBe(foto.puestos.filter((p) => p.moto !== null).length)
      expect(resumen.motosSalidas).toBe(foto.motosSalidas)
      expect(resumen.placasOcupadas).toBeLessThanOrEqual(resumen.placasTotales)
      expect(resumen.puestosOcupados).toBeLessThanOrEqual(resumen.puestosTotales)
    }
    expect(estado().resumen.motosSalidas).toBeGreaterThan(0)
  })

  it('los totales siguen a las placas y los puestos elegidos', () => {
    estado().elegirEscenario('siete-placas')
    expect(estado().resumen.placasTotales).toBe(7)
    expect(estado().resumen.puestosTotales).toBe(3)
    estado().elegirEscenario('cinco-puestos')
    expect(estado().resumen.placasTotales).toBe(6)
    expect(estado().resumen.puestosTotales).toBe(5)
  })

  it('en la visita los totales son los del lavadero real y las salidas llegan a 23', () => {
    estado().entrarEnLaVisita()
    expect(estado().resumen).toMatchObject({ placasTotales: 6, puestosTotales: 3 })
    estado().cambiarVelocidad(60)
    estado().iniciar()
    for (let i = 0; i < 600 && estado().corriendo; i += 1) {
      estado().avanzarCuadro(100)
    }
    expect(estado().resumen.motosSalidas).toBe(23)
    expect(estado().resumen.placasOcupadas).toBe(0)
    expect(estado().resumen.puestosOcupados).toBe(0)
  })
})

describe('restablecer valores', () => {
  it('deja todo en los valores por defecto, con 6 placas y 3 puestos', () => {
    const porDefecto = { ...estado().parametros }
    estado().cambiarParametro('llegadasPorHora', 20)
    estado().cambiarAcabadoDePlan(2, 30)
    estado().cambiarParametro('placas', 7)
    estado().cambiarParametro('puestos', 5)

    estado().restablecerValores()

    expect(estado().parametros).toEqual(porDefecto)
    expect(estado().parametros.placas).toBe(PARAMETROS_POR_DEFECTO.placasLavado)
    expect(escenarioQueCoincide(estado().parametros)).toBe(ESCENARIOS[0])
  })

  it('reinicia, conserva la semilla y la velocidad y el hecho de estar corriendo', () => {
    estado().cambiarSemilla(7)
    avanzar(30)
    expect(estado().foto.relojMin).toBeGreaterThan(0)

    estado().restablecerValores()

    expect(estado().foto.relojMin).toBe(0)
    expect(estado().semilla).toBe(7)
    expect(estado().velocidadMinPorSegundo).toBe(30)
    expect(estado().corriendo).toBe(true)
  })

  it('avisa en palabras simples', () => {
    estado().restablecerValores()
    expect(estado().aviso).toBe('Se restablecieron los valores por defecto.')
  })

  it('en la visita no hace nada', () => {
    estado().entrarEnLaVisita()
    const parametros = estado().parametros
    estado().restablecerValores()
    expect(estado().parametros).toBe(parametros)
    expect(estado().modo).toBe('visita')
  })
})

describe('el ρ₂ de cada escenario', () => {
  it('coincide con la tabla de la especificación', () => {
    const rho = Object.fromEntries(ESCENARIOS.map((e) => [e.id, rho2DelEscenario(e)]))
    expect(rho['actual']).toBeCloseTo(1.2514, 4)
    expect(rho['cuatro-puestos']).toBeCloseTo(0.9385, 4)
    expect(rho['cinco-puestos']).toBeCloseTo(0.7508, 4)
    expect(rho['cinco-placas']).toBeCloseTo(1.2514, 4)
    expect(rho['siete-placas']).toBeCloseTo(1.2514, 4)
  })

  it('es 1 o más exactamente en los escenarios de 3 puestos', () => {
    for (const escenario of ESCENARIOS) {
      expect(rho2DelEscenario(escenario) >= 1, escenario.nombre).toBe(escenario.puestos === 3)
    }
  })

  it('usa los mismos parámetros que carga el escenario', () => {
    const escenario = ESCENARIOS[3]
    expect(parametrosDelEscenario(escenario)).toMatchObject({
      placas: escenario.placas,
      puestos: escenario.puestos,
    })
  })
})
