import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { armarResultados } from '../experimentos/lote.js'
import { atender } from '../experimentos/trabajador.js'
import {
  __ponerFabricaDeTrabajadores,
  INTERVALO_DE_VOLCADO_MS,
  MENSAJE_DE_TRABAJADOR_CAIDO,
  MENSAJE_SIN_TRABAJADORES,
  rangoSugerido,
  reiniciarElStoreDeExperimentos,
  useExperimentos,
} from './experimentos.js'
import { useSimulacion } from './simulacion.js'

const estado = () => useExperimentos.getState()

/**
 * Un trabajador falso que no corre nada solo: la prueba le manda los mensajes que
 * quiera, o le hace correr de verdad el lote con `correrDeVerdad`.
 */
class TrabajadorFalso {
  constructor() {
    this.enviados = []
    this.terminado = false
    this.onmessage = null
    this.onerror = null
    TrabajadorFalso.ultimo = this
  }

  postMessage(mensaje) {
    this.enviados.push(mensaje)
  }

  terminate() {
    this.terminado = true
  }

  /** Le contesta a la página con un mensaje, como haría el trabajador. */
  responder(dato) {
    this.onmessage?.({ data: dato })
  }

  /** Corre el lote enviado de verdad, dejando que `cuantos` avances lleguen antes de detenerse. */
  correrDeVerdad(cuantos = Infinity) {
    const respuestas = []
    atender(this.enviados[0], (m) => respuestas.push(m))
    const avances = respuestas.filter((m) => m.tipo === 'avance').slice(0, cuantos)
    for (const m of avances) this.responder(m)
    return respuestas
  }
}

beforeEach(() => {
  vi.useFakeTimers()
  reiniciarElStoreDeExperimentos()
  __ponerFabricaDeTrabajadores(() => new TrabajadorFalso())
  useSimulacion.getState().restablecerValores()
  useSimulacion.getState().cambiarSemilla(1)
  useSimulacion.getState().cambiarParametro('puestos', 5)
  useSimulacion.getState().cambiarParametro('horasDeLaCorridaLarga', 1000)
  estado().cambiarConfiguracion({ horas: 100, replicas: 5 })
})

afterEach(() => {
  reiniciarElStoreDeExperimentos()
  vi.useRealTimers()
})

describe('la configuración', () => {
  it('arranca con las réplicas elegidas y 10 % de calentamiento', () => {
    reiniciarElStoreDeExperimentos()
    expect(estado().modo).toBe('replicas')
    expect(estado().calentamientoPct).toBe(10)
    expect(estado().estado).toBe('inactivo')
  })

  it('la semilla base es la de Ajustes mientras no se escriba otra', () => {
    useSimulacion.getState().cambiarSemilla(77)
    expect(estado().solicitudActual().semillaBase).toBe(77)
    estado().cambiarConfiguracion({ semillaBase: 5 })
    expect(estado().solicitudActual().semillaBase).toBe(5)
  })

  it('los parámetros del lote son los de Ajustes de ahora', () => {
    useSimulacion.getState().cambiarParametro('puestos', 4)
    expect(estado().solicitudActual().parametros.puestos).toBe(4)
  })

  it('al elegir otro parámetro del barrido propone un rango a partir de Ajustes', () => {
    estado().elegirParametroDelBarrido('llegadasPorHora')
    const { parametro, inicio, fin, paso } = estado().barrido
    expect(parametro).toBe('llegadasPorHora')
    expect(inicio).toBeLessThan(14.1935)
    expect(fin).toBeGreaterThan(14.1935)
    expect(paso).toBe(0.5)
    expect(rangoSugerido('puestos', { puestos: 3 })).toEqual({ inicio: 3, fin: 5, paso: 1 })
    expect(rangoSugerido('placas', { placas: 1 })).toEqual({ inicio: 1, fin: 3, paso: 1 })
    estado().elegirParametroDelBarrido('nada')
    expect(estado().barrido.parametro).toBe('llegadasPorHora')
  })

  it('valida la configuración sin correr nada', () => {
    estado().cambiarConfiguracion({ replicas: 4 })
    expect(estado().validacionActual().valida).toBe(false)
    expect(TrabajadorFalso.ultimo?.enviados ?? []).toEqual([])
  })
})

describe('correr un lote', () => {
  it('manda la solicitud al trabajador con los parámetros copiados de Ajustes', () => {
    expect(estado().iniciar()).toEqual({ ok: true })
    const trabajador = TrabajadorFalso.ultimo
    expect(trabajador.enviados).toHaveLength(1)
    expect(trabajador.enviados[0].tipo).toBe('iniciar')
    expect(trabajador.enviados[0].solicitud.parametros.puestos).toBe(5)
    expect(estado().estado).toBe('corriendo')
    // Cambiar Ajustes después no toca el lote en marcha.
    useSimulacion.getState().cambiarParametro('puestos', 3)
    expect(estado().solicitudDelLote.parametros.puestos).toBe(5)
  })

  it('con un lote en marcha no arranca otro', () => {
    estado().iniciar()
    const primero = TrabajadorFalso.ultimo
    expect(estado().iniciar().ok).toBe(false)
    expect(TrabajadorFalso.ultimo).toBe(primero)
  })

  it('una solicitud que no sirve no arranca y deja el aviso', () => {
    estado().cambiarConfiguracion({ replicas: 100, horas: 5000 })
    const resultado = estado().iniciar()
    expect(resultado.ok).toBe(false)
    expect(resultado.mensaje).toMatch(/tope/)
    expect(estado().estado).toBe('inactivo')
    expect(estado().aviso).toBe(resultado.mensaje)
  })

  it('los avances se juntan y se vuelcan cada ' + INTERVALO_DE_VOLCADO_MS + ' ms', () => {
    estado().iniciar()
    const trabajador = TrabajadorFalso.ultimo
    trabajador.correrDeVerdad(3)
    expect(estado().acumulado.hechas).toBe(0)
    vi.advanceTimersByTime(INTERVALO_DE_VOLCADO_MS)
    expect(estado().acumulado.hechas).toBe(3)
    expect(estado().avance).toMatchObject({ hechas: 3, pedidas: 5, horasHechas: 300, horasPedidas: 500 })
  })

  it('al terminar vuelca lo que faltaba, queda «terminado» y el trabajador se libera', () => {
    estado().iniciar()
    const trabajador = TrabajadorFalso.ultimo
    const respuestas = trabajador.correrDeVerdad()
    trabajador.responder(respuestas.at(-1))
    expect(estado().estado).toBe('terminado')
    expect(estado().acumulado.hechas).toBe(5)
    expect(trabajador.terminado).toBe(true)
    const resultados = armarResultados(estado().solicitudDelLote, estado().acumulado)
    expect(resultados.hechas).toBe(5)
    expect(resultados.resumen.lavado.metricas.rho.resumen.n).toBe(5)
  })

  it('el tiempo restante sale de lo que tardó lo ya hecho', () => {
    estado().iniciar()
    const trabajador = TrabajadorFalso.ultimo
    vi.setSystemTime(Date.now())
    const t0 = Date.now()
    vi.setSystemTime(t0 + 2000)
    trabajador.correrDeVerdad(2)
    vi.advanceTimersByTime(INTERVALO_DE_VOLCADO_MS)
    // 2 de 5 réplicas en ~2,15 s: faltan 3 réplicas, unos 3,2 s.
    expect(estado().avance.tiempoRestanteMs).toBeGreaterThan(2500)
    expect(estado().avance.tiempoRestanteMs).toBeLessThan(4000)
  })

  it('con menos de 2 piezas hechas no estima el tiempo', () => {
    estado().iniciar()
    TrabajadorFalso.ultimo.correrDeVerdad(1)
    vi.advanceTimersByTime(INTERVALO_DE_VOLCADO_MS)
    expect(estado().avance.tiempoRestanteMs).toBeNull()
  })
})

describe('cancelar y fallar', () => {
  it('cancelar conserva lo terminado, termina el trabajador y deja «cancelado»', () => {
    estado().cambiarConfiguracion({ replicas: 10 })
    estado().iniciar()
    const trabajador = TrabajadorFalso.ultimo
    trabajador.correrDeVerdad(4)
    estado().cancelar()
    expect(estado().estado).toBe('cancelado')
    expect(trabajador.terminado).toBe(true)
    expect(estado().acumulado.hechas).toBe(4)
    const resultados = armarResultados(estado().solicitudDelLote, estado().acumulado)
    expect(resultados.hechas).toBe(4)
    expect(resultados.pedidas).toBe(10)
  })

  it('un mensaje que llega después de cancelar no cambia nada', () => {
    estado().cambiarConfiguracion({ replicas: 10 })
    estado().iniciar()
    const trabajador = TrabajadorFalso.ultimo
    const respuestas = trabajador.correrDeVerdad(2)
    estado().cancelar()
    trabajador.responder(respuestas[2])
    vi.advanceTimersByTime(1000)
    expect(estado().acumulado.hechas).toBe(2)
    expect(estado().estado).toBe('cancelado')
  })

  it('cancelar antes de la primera pieza no deja resultados y se puede volver a iniciar', () => {
    estado().iniciar()
    estado().cancelar()
    expect(estado().acumulado.hechas).toBe(0)
    expect(estado().iniciar().ok).toBe(true)
    expect(estado().estado).toBe('corriendo')
  })

  it('cancelar sin lote en marcha no hace nada', () => {
    estado().cancelar()
    expect(estado().estado).toBe('inactivo')
  })

  it('si el trabajador se cae conserva lo recibido y deja iniciar de nuevo', () => {
    estado().cambiarConfiguracion({ replicas: 10 })
    estado().iniciar()
    const trabajador = TrabajadorFalso.ultimo
    trabajador.correrDeVerdad(3)
    trabajador.onerror({})
    expect(estado().estado).toBe('fallido')
    expect(estado().aviso).toBe(MENSAJE_DE_TRABAJADOR_CAIDO)
    expect(estado().acumulado.hechas).toBe(3)
    expect(estado().iniciar().ok).toBe(true)
  })

  it('un error del trabajador se muestra tal cual', () => {
    estado().iniciar()
    TrabajadorFalso.ultimo.responder({ tipo: 'error', mensaje: 'Algo salió mal.' })
    expect(estado().estado).toBe('fallido')
    expect(estado().aviso).toBe('Algo salió mal.')
  })

  it('sin Web Workers lo dice y no corre en la página', () => {
    __ponerFabricaDeTrabajadores(() => {
      throw new ReferenceError('Worker is not defined')
    })
    const resultado = estado().iniciar()
    expect(resultado).toEqual({ ok: false, mensaje: MENSAJE_SIN_TRABAJADORES })
    expect(estado().estado).toBe('fallido')
  })

  it('un lote nuevo reemplaza los resultados del anterior', () => {
    estado().iniciar()
    const primero = TrabajadorFalso.ultimo
    primero.responder(primero.correrDeVerdad().at(-1))
    expect(estado().acumulado.hechas).toBe(5)
    estado().cambiarConfiguracion({ semillaBase: 99 })
    estado().iniciar()
    expect(estado().acumulado.hechas).toBe(0)
    expect(estado().solicitudDelLote.semillaBase).toBe(99)
    expect(estado().estado).toBe('corriendo')
  })
})

describe('correr n* réplicas', () => {
  it('arma la misma solicitud con más réplicas y la misma semilla base', () => {
    estado().iniciar()
    const primero = TrabajadorFalso.ultimo
    primero.responder(primero.correrDeVerdad().at(-1))
    const antes = estado().solicitudDelLote
    expect(estado().correrConReplicas(8)).toEqual({ ok: true })
    const nueva = estado().solicitudDelLote
    expect(nueva).toEqual({ ...antes, replicas: 8 })
    expect(estado().replicas).toBe(8)
    expect(TrabajadorFalso.ultimo).not.toBe(primero)
    expect(TrabajadorFalso.ultimo.enviados[0].solicitud.replicas).toBe(8)
  })

  it('más de 100 o fuera del tope no arranca', () => {
    estado().iniciar()
    estado().cancelar()
    expect(estado().cabeUnLoteDeReplicas(8)).toBe(true)
    expect(estado().cabeUnLoteDeReplicas(120)).toBe(false)
    expect(estado().correrConReplicas(120).ok).toBe(false)
    estado().cambiarConfiguracion({ horas: 5000 })
    estado().iniciar()
    estado().cancelar()
    expect(estado().cabeUnLoteDeReplicas(100)).toBe(false)
  })

  it('sin un lote de réplicas del que partir no hace nada', () => {
    expect(estado().correrConReplicas(8).ok).toBe(false)
    estado().elegirModo('barrido')
    estado().iniciar()
    estado().cancelar()
    expect(estado().correrConReplicas(8).ok).toBe(false)
  })
})

describe('no se mete con la simulación en vivo', () => {
  it('lanzar y cancelar un lote deja los parámetros y la semilla de Ajustes igual', () => {
    const antes = JSON.stringify({
      parametros: useSimulacion.getState().parametros,
      semilla: useSimulacion.getState().semilla,
      reloj: useSimulacion.getState().foto.relojMin,
    })
    estado().iniciar()
    TrabajadorFalso.ultimo.correrDeVerdad(2)
    estado().cancelar()
    const despues = JSON.stringify({
      parametros: useSimulacion.getState().parametros,
      semilla: useSimulacion.getState().semilla,
      reloj: useSimulacion.getState().foto.relojMin,
    })
    expect(despues).toBe(antes)
  })
})
