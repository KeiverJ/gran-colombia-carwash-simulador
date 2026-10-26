import { beforeEach, describe, expect, it } from 'vitest'

import { ESCENARIOS } from '../data/escenarios.js'
import { avisoCortoDeSaturacion, avisoDeSaturacion, metricasCalculadas } from './metricas.js'
import { escenarioQueCoincide, useSimulacion } from './simulacion.js'

const estado = () => useSimulacion.getState()
const inicial = useSimulacion.getState()

beforeEach(() => {
  // Cada prueba arranca con un store limpio, como en simulacion.test.js.
  useSimulacion.setState({ ...inicial })
  estado().cambiarSemilla(1)
  estado().pausar()
  estado().cambiarVelocidad(1)
})

const avanzarUnRato = () => {
  estado().iniciar()
  for (let i = 0; i < 50; i += 1) {
    estado().avanzarCuadro(100)
  }
}

const escenario = (id) => ESCENARIOS.find((candidato) => candidato.id === id)

describe('elegir un escenario', () => {
  it('pone sus placas y sus puestos y deja el lavadero vacío', () => {
    for (const { id, placas, puestos } of ESCENARIOS) {
      estado().elegirEscenario(id)
      expect(estado().parametros.placas).toBe(placas)
      expect(estado().parametros.puestos).toBe(puestos)
      expect(estado().foto.placas).toHaveLength(placas)
      expect(estado().foto.puestos).toHaveLength(puestos)
      expect(estado().foto.relojMin).toBe(0)
    }
  })

  it('carga los valores por defecto: se pierden los ajustes hechos a mano', () => {
    const porDefecto = { ...estado().parametros }
    estado().cambiarParametro('llegadasPorHora', 20)
    estado().cambiarParametro('lavadoMin', 5)
    estado().cambiarAcabadoDePlan(2, 30)

    estado().elegirEscenario('cuatro-puestos')

    expect(estado().parametros).toEqual({ ...porDefecto, puestos: 4 })
  })

  it('vuelve al minuto cero conservando la semilla', () => {
    estado().cambiarSemilla(7)
    avanzarUnRato()
    expect(estado().foto.relojMin).toBeGreaterThan(0)

    estado().elegirEscenario('siete-placas')

    expect(estado().foto.relojMin).toBe(0)
    expect(estado().semilla).toBe(7)
  })

  it('con la misma semilla llegan las mismas motos en cualquier escenario', () => {
    const llegadasEn = (id) => {
      estado().elegirEscenario(id)
      estado().iniciar()
      for (let i = 0; i < 300; i += 1) {
        estado().avanzarCuadro(100)
      }
      return estado().foto.motosLlegadas
    }
    expect(llegadasEn('cinco-puestos')).toBe(llegadasEn('cinco-placas'))
  })

  it('sigue corriendo si estaba corriendo, y pausada si estaba pausada', () => {
    avanzarUnRato()
    estado().elegirEscenario('cinco-placas')
    expect(estado().corriendo).toBe(true)

    estado().pausar()
    estado().elegirEscenario('actual')
    expect(estado().corriendo).toBe(false)
  })

  it('conserva la velocidad', () => {
    estado().cambiarVelocidad(12)
    estado().elegirEscenario('cinco-placas')
    expect(estado().velocidadMinPorSegundo).toBe(12)
  })

  it('avisa en una línea qué se cargó', () => {
    estado().elegirEscenario('cinco-placas')
    expect(estado().avisoDeEscenario).toBe(
      'Se cargaron los parámetros por defecto con 5 placas y 3 puestos.',
    )

    estado().elegirEscenario('cuatro-puestos')
    expect(estado().avisoDeEscenario).toBe(
      'Se cargaron los parámetros por defecto con 6 placas y 4 puestos.',
    )
    expect(estado().avisoDeEscenario).not.toMatch(/\n/)
  })

  it('no repite el aviso en el lugar de los avisos de siempre', () => {
    estado().elegirEscenario('cinco-placas')
    expect(estado().aviso).toBeNull()
  })

  it('cualquier otro reinicio borra el aviso del escenario', () => {
    estado().elegirEscenario('cinco-placas')
    estado().cambiarParametro('llegadasPorHora', 15)
    expect(estado().avisoDeEscenario).toBeNull()
    expect(estado().aviso).toMatch(/volvió a empezar/)

    estado().elegirEscenario('cinco-placas')
    estado().reiniciar(null)
    expect(estado().avisoDeEscenario).toBeNull()
  })

  it('un escenario que no existe no cambia nada', () => {
    const antes = estado().parametros

    estado().elegirEscenario('siete-puestos')

    expect(estado().parametros).toBe(antes)
    expect(estado().avisoDeEscenario).toBeNull()
  })
})

describe('qué escenario está puesto', () => {
  it('al arrancar es la situación actual', () => {
    expect(escenarioQueCoincide(estado().parametros)).toBe(escenario('actual'))
  })

  it('cada escenario elegido se reconoce a sí mismo', () => {
    for (const candidato of ESCENARIOS) {
      estado().elegirEscenario(candidato.id)
      expect(escenarioQueCoincide(estado().parametros)).toBe(candidato)
    }
  })

  it('mover cualquier parámetro lo deja en personalizado', () => {
    estado().cambiarParametro('placas', 7)
    estado().cambiarParametro('puestos', 4)
    expect(escenarioQueCoincide(estado().parametros)).toBeNull()

    estado().elegirEscenario('actual')
    estado().cambiarParametro('llegadasPorHora', 15)
    expect(escenarioQueCoincide(estado().parametros)).toBeNull()

    estado().elegirEscenario('actual')
    estado().cambiarAcabadoDePlan(3, 20)
    expect(escenarioQueCoincide(estado().parametros)).toBeNull()

    estado().elegirEscenario('actual')
    estado().cambiarProporcion(2, 0.5)
    expect(escenarioQueCoincide(estado().parametros)).toBeNull()
  })

  it('cambiar placas y puestos a mano hacia otro escenario también lo reconoce', () => {
    estado().cambiarParametro('placas', 5)
    expect(escenarioQueCoincide(estado().parametros)).toBe(escenario('cinco-placas'))
  })
})

describe('el aviso de saturación en los cinco escenarios', () => {
  const conEscenario = (id) => {
    estado().elegirEscenario(id)
    return estado().parametros
  }

  it.each([
    ['actual', 'Situación actual'],
    ['cinco-placas', '5 placas'],
    ['siete-placas', '7 placas'],
  ])('con 3 puestos sale el aviso: %s', (id) => {
    const parametros = conEscenario(id)
    const { acabado } = metricasCalculadas(parametros)

    expect(parametros.puestos).toBe(3)
    expect(acabado.estable).toBe(false)
    expect(acabado.rho).toBeCloseTo(1.2514, 4)
    expect(avisoCortoDeSaturacion(parametros)).not.toBeNull()
    expect(avisoDeSaturacion(parametros).map((aviso) => aviso.etapa)).toEqual(['acabado'])
  })

  it('con 4 puestos no sale el aviso y ρ₂ = 0,9385', () => {
    const parametros = conEscenario('cuatro-puestos')
    const { acabado } = metricasCalculadas(parametros)

    expect(acabado.estable).toBe(true)
    expect(acabado.rho).toBeCloseTo(0.9385, 4)
    expect(avisoCortoDeSaturacion(parametros)).toBeNull()
    expect(avisoDeSaturacion(parametros)).toEqual([])
  })

  it('con 5 puestos no sale el aviso y ρ₂ = 0,7508', () => {
    const parametros = conEscenario('cinco-puestos')
    const { acabado } = metricasCalculadas(parametros)

    expect(acabado.estable).toBe(true)
    expect(acabado.rho).toBeCloseTo(0.7508, 4)
    expect(avisoCortoDeSaturacion(parametros)).toBeNull()
    expect(avisoDeSaturacion(parametros)).toEqual([])
  })

  it('el lavado es estable en los cinco: ρ₁ = 0,508, 0,4234 y 0,363 con 5, 6 y 7 placas', () => {
    const rhoDelLavado = (id) => metricasCalculadas(conEscenario(id)).lavado

    for (const { id } of ESCENARIOS) {
      expect(rhoDelLavado(id).estable).toBe(true)
    }
    expect(rhoDelLavado('cinco-placas').rho).toBeCloseTo(0.508, 3)
    expect(rhoDelLavado('actual').rho).toBeCloseTo(0.4234, 4)
    expect(rhoDelLavado('siete-placas').rho).toBeCloseTo(0.363, 3)
  })
})
