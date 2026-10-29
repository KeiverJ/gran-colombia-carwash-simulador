import { beforeEach, describe, expect, it } from 'vitest'

import { ESCENARIOS } from '../data/escenarios.js'
import { useSimulacion } from './simulacion.js'
import { darUnCuadro } from './useCicloDeSimulacion.js'

const estado = () => useSimulacion.getState()
const inicial = useSimulacion.getState()

beforeEach(() => {
  useSimulacion.setState({ ...inicial })
})

/**
 * La «generación» cuenta cuántas veces se reemplazó el motor o saltó el estado:
 * la escena la compara en cada cuadro y, si cambió, recoloca en vez de animar.
 */
describe('la generación del motor', () => {
  const ACCIONES = {
    reiniciar: () => estado().reiniciar(),
    'cambiar un parámetro': () => estado().cambiarParametro('placas', 6),
    'cambiar el tiempo de acabado de un plan': () => estado().cambiarAcabadoDePlan(1, 12),
    'elegir un escenario': () => estado().elegirEscenario(ESCENARIOS[1].id),
    'restablecer los valores': () => estado().restablecerValores(),
    'cambiar la proporción de un plan': () => estado().cambiarProporcion(2, 0.4),
    'cambiar la semilla': () => estado().cambiarSemilla(3),
    'entrar a la visita': () => estado().entrarEnLaVisita(),
    'empezar la corrida larga': () => estado().empezarCorridaLarga(5),
  }

  it.each(Object.entries(ACCIONES))('sube al %s', (_nombre, accion) => {
    const antes = estado().generacion
    accion()
    expect(estado().generacion).toBeGreaterThan(antes)
  })

  it('sube al volver al modo normal desde la visita', () => {
    estado().entrarEnLaVisita()
    const antes = estado().generacion
    estado().volverAlModoNormal()
    expect(estado().generacion).toBeGreaterThan(antes)
  })

  it('sube al terminar la corrida larga y al terminar la visita', () => {
    estado().empezarCorridaLarga(5)
    const antes = estado().generacion
    while (estado().corridaLarga) estado().avanzarCorridaLarga()
    expect(estado().generacion).toBeGreaterThan(antes)

    estado().entrarEnLaVisita()
    estado().cambiarVelocidad(60)
    estado().iniciar()
    const antesDeLaVisita = estado().generacion
    let instante = 0
    let anterior = null
    for (let i = 0; i < 60 * 120 && !estado().visita.terminada; i += 1) {
      instante += 1000 / 60
      anterior = darUnCuadro(estado(), instante, anterior)
    }
    expect(estado().visita.terminada).toBe(true)
    expect(estado().generacion).toBeGreaterThan(antesDeLaVisita)
  })

  it('no sube con lo que no reemplaza el motor: iniciar, pausar, cambiar la velocidad, avanzar', () => {
    const antes = estado().generacion
    estado().iniciar()
    estado().cambiarVelocidad(20)
    estado().avanzarCuadro(16)
    estado().pausar()
    expect(estado().generacion).toBe(antes)
  })

  it('Reiniciar durante la corrida larga la cancela y deja la simulación en pausa', () => {
    estado().empezarCorridaLarga(50)
    estado().avanzarCorridaLarga()
    estado().reiniciar()
    expect(estado().corridaLarga).toBeNull()
    expect(estado().corriendo).toBe(false)
  })

  it('un solo dueño: con la corrida larga en marcha, darUnCuadro la avanza a ella y no al ciclo normal', () => {
    estado().empezarCorridaLarga(50)
    const motor = estado().motor
    const horas = estado().corridaLarga.horasHechas
    const instante = darUnCuadro(estado(), 1000, 900)
    expect(instante).toBeNull()
    expect(estado().motor).toBe(motor)
    expect(estado().corridaLarga === null || estado().corridaLarga.horasHechas > horas).toBe(true)
  })
})
