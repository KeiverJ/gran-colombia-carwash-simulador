import { beforeEach, describe, expect, it } from 'vitest'

import { ESCENARIOS } from '../data/escenarios.js'
import { useSimulacion } from './simulacion.js'

const estado = () => useSimulacion.getState()
const inicial = useSimulacion.getState()

beforeEach(() => {
  useSimulacion.setState({ ...inicial })
  estado().cambiarSemilla(1)
  estado().pausar()
  estado().cambiarVelocidad(1)
})

const estadosDePlacas = () => estado().foto.placas.map((placa) => placa.estado)

/** Avanza la simulación para que haya motos dentro. */
function avanzarUnRato(cuadros = 400) {
  estado().cambiarVelocidad(30)
  estado().iniciar()
  for (let i = 0; i < cuadros; i += 1) {
    estado().avanzarCuadro(100)
  }
}

describe('cerrar y abrir servidores desde el store', () => {
  it('cerrar una placa libre la deja cerrada al instante, sin reiniciar', () => {
    avanzarUnRato(5)
    const generacion = estado().generacion
    const reloj = estado().foto.relojMin
    // La última placa está libre al principio: el motor ocupa de la 1 hacia arriba.
    const resultado = estado().cerrarServidor('lavado', 5)
    expect(resultado.aplicado).toBe(true)
    expect(estadosDePlacas()[5]).toBe('cerrado')
    expect(estado().foto.relojMin).toBe(reloj)
    expect(estado().generacion).toBe(generacion)
    expect(estado().corriendo).toBe(true)
  })

  it('refresca la foto y el resumen en la misma acción', () => {
    estado().cerrarServidor('acabado', 2)
    expect(estado().foto.puestos[2].estado).toBe('cerrado')
    expect(estado().resumen.estadosDePuestos).toEqual(['activo', 'activo', 'cerrado'])
    expect(estado().resumen.puestosActivos).toBe(2)
    expect(estado().resumen.placasActivas).toBe(6)
  })

  it('alternar cierra y vuelve a abrir', () => {
    expect(estado().alternarServidor('lavado', 2).aplicado).toBe(true)
    expect(estadosDePlacas()[2]).toBe('cerrado')
    expect(estado().alternarServidor('lavado', 2).aplicado).toBe(true)
    expect(estadosDePlacas()[2]).toBe('activo')
  })

  it('un servidor ocupado queda cerrándose y alternar cancela el cierre', () => {
    avanzarUnRato(300)
    const ocupada = estado().foto.placas.findIndex((placa) => !placa.libre)
    expect(ocupada).toBeGreaterThanOrEqual(0)
    estado().cerrarServidor('lavado', ocupada)
    expect(estadosDePlacas()[ocupada]).toBe('cerrandose')
    expect(estado().resumen.estadosDePlacas[ocupada]).toBe('cerrandose')
    expect(estado().alternarServidor('lavado', ocupada).aplicado).toBe(true)
    expect(estadosDePlacas()[ocupada]).toBe('activo')
  })

  it('el último servidor activo de una etapa no se cierra', () => {
    for (const indice of [0, 1, 2, 3, 4]) {
      expect(estado().cerrarServidor('lavado', indice).aplicado).toBe(true)
    }
    const antes = estado().foto
    const resultado = estado().cerrarServidor('lavado', 5)
    expect(resultado).toEqual({ aplicado: false, motivo: 'ultimo-activo' })
    expect(estadosDePlacas()[5]).toBe('activo')
    expect(estado().resumen.placasActivas).toBe(1)
    expect(estado().foto).toBe(antes)
  })

  it('un servidor que no existe se rechaza sin tocar nada', () => {
    const antes = estado().foto
    for (const [etapa, indice] of [['lavado', 6], ['lavado', -1], ['acabado', 3], ['acabado', 1.5], ['otra', 0]]) {
      expect(estado().alternarServidor(etapa, indice).aplicado).toBe(false)
      expect(estado().cerrarServidor(etapa, indice).aplicado).toBe(false)
    }
    expect(estado().foto).toBe(antes)
  })

  it('en la visita no se abre ni se cierra nada', () => {
    estado().entrarEnLaVisita()
    const antes = estado().foto
    expect(estado().cerrarServidor('lavado', 0)).toEqual({ aplicado: false, motivo: 'visita' })
    expect(estado().alternarServidor('acabado', 0).aplicado).toBe(false)
    expect(estado().foto).toBe(antes)
    expect(estado().huboCierres).toBe(false)
  })

  it('durante la corrida larga no se abre ni se cierra nada', () => {
    estado().empezarCorridaLarga(100, { camaraRapida: false })
    const resultado = estado().cerrarServidor('lavado', 0)
    expect(resultado).toEqual({ aplicado: false, motivo: 'corrida-larga' })
    expect(estadosDePlacas().every((e) => e === 'activo')).toBe(true)
  })

  it('huboCierres se enciende al cerrar (aunque se reabra) y se apaga al reiniciar', () => {
    expect(estado().huboCierres).toBe(false)
    estado().cerrarServidor('lavado', 0)
    estado().abrirServidor('lavado', 0)
    expect(estado().huboCierres).toBe(true)
    estado().reiniciar()
    expect(estado().huboCierres).toBe(false)
  })
})

describe('todo lo que reinicia vuelve a abrir los servidores y lo avisa', () => {
  const cerrarAlgunos = () => {
    estado().cerrarServidor('lavado', 1)
    estado().cerrarServidor('acabado', 0)
  }
  const todoActivo = () =>
    [...estado().foto.placas, ...estado().foto.puestos].every((servidor) => servidor.estado === 'activo')
  const AVISO = /volvieron a abrirse/

  it('reiniciar', () => {
    cerrarAlgunos()
    estado().reiniciar()
    expect(todoActivo()).toBe(true)
    expect(estado().aviso).toMatch(AVISO)
  })

  it('cambiar el número de placas', () => {
    cerrarAlgunos()
    estado().cambiarParametro('placas', 8)
    expect(todoActivo()).toBe(true)
    expect(estado().foto.placas).toHaveLength(8)
    expect(estado().aviso).toMatch(AVISO)
    expect(estado().aviso).toMatch(/placas/)
  })

  it('elegir un escenario', () => {
    cerrarAlgunos()
    estado().elegirEscenario(ESCENARIOS[1].id)
    expect(todoActivo()).toBe(true)
    expect(estado().aviso).toMatch(AVISO)
  })

  it('restablecer valores', () => {
    cerrarAlgunos()
    estado().restablecerValores()
    expect(todoActivo()).toBe(true)
    expect(estado().aviso).toMatch(AVISO)
  })

  it('sin servidores cerrados no se agrega el aviso', () => {
    estado().reiniciar()
    expect(estado().aviso).toBeNull()
  })

  it('los cinco escenarios cargan lo de siempre con todo activo', () => {
    for (const escenario of ESCENARIOS) {
      estado().elegirEscenario(escenario.id)
      expect(estado().foto.placas).toHaveLength(escenario.placas)
      expect(estado().foto.puestos).toHaveLength(escenario.puestos)
      expect(todoActivo()).toBe(true)
    }
  })
})
