import { beforeEach, describe, expect, it } from 'vitest'

import { MENSAJE_DE_FALLO, useSimulacion } from './simulacion.js'

const estado = () => useSimulacion.getState()
const inicial = useSimulacion.getState()

/** Un motor que se porta bien hasta que se le pide lo que `falla`. */
function motorQueFalla(falla, real = estado().motor) {
  const roto = (nombre) => () => {
    throw new Error(`falló ${nombre}`)
  }
  return new Proxy(real, {
    get(destino, propiedad) {
      if (falla.includes(propiedad)) {
        return roto(propiedad)
      }
      const valor = destino[propiedad]
      return typeof valor === 'function' ? valor.bind(destino) : valor
    },
  })
}

beforeEach(() => {
  useSimulacion.setState({ ...inicial })
  estado().reiniciar()
  estado().pausar()
})

describe('un motor que falla no tumba la aplicación', () => {
  it('al avanzar un cuadro: se detiene, guarda el fallo y no lanza', () => {
    useSimulacion.setState({ motor: motorQueFalla(['avanzar']), corriendo: true })
    expect(() => estado().avanzarCuadro(100)).not.toThrow()
    expect(estado().corriendo).toBe(false)
    expect(estado().fallo).toEqual({ mensaje: MENSAJE_DE_FALLO, detalle: 'falló avanzar' })
  })

  it('el mensaje está en español y no trae trazas', () => {
    useSimulacion.setState({ motor: motorQueFalla(['avanzar']), corriendo: true })
    estado().avanzarCuadro(100)
    expect(estado().fallo.mensaje).toMatch(/Reiniciar/)
    expect(estado().fallo.mensaje).not.toMatch(/Error|at |\.js/)
  })

  it('al leer las métricas, mientras corre', () => {
    useSimulacion.setState({ motor: motorQueFalla(['metricas']), corriendo: true })
    estado().cambiarVelocidad(10)
    expect(() => estado().avanzarCuadro(100)).not.toThrow()
    expect(estado().fallo?.detalle).toBe('falló metricas')
    expect(estado().corriendo).toBe(false)
  })

  it('al pedir la foto', () => {
    useSimulacion.setState({ motor: motorQueFalla(['estado']), corriendo: true })
    estado().avanzarCuadro(100)
    expect(estado().fallo?.detalle).toBe('falló estado')
    expect(estado().corriendo).toBe(false)
  })

  it('durante la corrida larga: la apaga y deja el fallo', () => {
    estado().empezarCorridaLarga(100, { camaraRapida: false })
    expect(estado().corridaLarga).not.toBeNull()
    useSimulacion.setState({ motor: motorQueFalla(['correrHoras']) })
    let sigue
    expect(() => {
      sigue = estado().avanzarCorridaLarga()
    }).not.toThrow()
    expect(sigue).toBe(false)
    expect(estado().corridaLarga).toBeNull()
    expect(estado().corriendo).toBe(false)
    expect(estado().fallo?.detalle).toBe('falló correrHoras')
  })

  it('al cancelar la corrida larga con el motor roto', () => {
    estado().empezarCorridaLarga(100, { camaraRapida: false })
    useSimulacion.setState({ motor: motorQueFalla(['metricas']) })
    expect(() => estado().cancelarCorridaLarga()).not.toThrow()
    expect(estado().corridaLarga).toBeNull()
    expect(estado().fallo).not.toBeNull()
  })

  it('al abrir o cerrar un servidor', () => {
    useSimulacion.setState({ motor: motorQueFalla(['cerrarServidor']) })
    expect(estado().cerrarServidor('lavado', 0)).toEqual({ aplicado: false, motivo: 'fallo' })
    expect(estado().fallo?.detalle).toBe('falló cerrarServidor')
  })

  it('Reiniciar borra el fallo y vuelve a dejarlo todo en marcha', () => {
    useSimulacion.setState({ motor: motorQueFalla(['avanzar']), corriendo: true })
    estado().avanzarCuadro(100)
    expect(estado().fallo).not.toBeNull()

    estado().reiniciar()
    expect(estado().fallo).toBeNull()
    estado().cambiarVelocidad(10)
    estado().iniciar()
    estado().avanzarCuadro(100)
    expect(estado().fallo).toBeNull()
    expect(estado().foto.relojMin).toBeGreaterThan(0)
  })

  it('si no se puede crear el motor nuevo, se conserva el anterior y se explica', () => {
    const anterior = estado().motor
    const generacion = estado().generacion
    // Unos parámetros que el motor no acepta, puestos a la fuerza (no hay forma de llegar aquí por las acciones).
    useSimulacion.setState({ parametros: { ...estado().parametros, placas: 0 } })
    expect(() => estado().reiniciar()).not.toThrow()
    expect(estado().motor).toBe(anterior)
    expect(estado().generacion).toBe(generacion)
    expect(estado().fallo).not.toBeNull()
  })

  it('un fallo no se acumula: el segundo reemplaza al primero', () => {
    const real = estado().motor
    useSimulacion.setState({ motor: motorQueFalla(['avanzar'], real), corriendo: true })
    estado().avanzarCuadro(100)
    useSimulacion.setState({ motor: motorQueFalla(['estado'], real), corriendo: true })
    estado().avanzarCuadro(100)
    expect(estado().fallo.detalle).toBe('falló estado')
  })
})
