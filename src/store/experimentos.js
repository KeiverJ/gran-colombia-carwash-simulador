/**
 * El estado de la vista «Experimentos»: lo que la persona va eligiendo en cada
 * modo, el lote que corre en segundo plano y los resultados que van llegando.
 *
 * Está aparte de `useSimulacion` a propósito: un lote copia los parámetros de
 * Ajustes al pulsar «Iniciar» y desde ahí no vuelve a leer la simulación en vivo,
 * que nunca se toca. Los resultados sobreviven al cierre de la vista y al modo visita, y
 * un lote nuevo reemplaza a los anteriores.
 *
 * El lote corre en un Web Worker (`src/experimentos/trabajador.js`). Cancelar es
 * `terminate()`: lo ya recibido queda como resultado parcial. Los avances se
 * juntan y se vuelcan al estado cada 150 ms, para no redibujar por cada réplica.
 */

import { create } from 'zustand'

import { acumuladoVacio, acumularEvento } from '../experimentos/lote.js'
import {
  acabadoPromedioDeLosParametros,
  CALENTAMIENTO_POR_DEFECTO_PCT,
  horasTotales,
  MODO_REPLICAS,
  PARAMETROS_DEL_BARRIDO,
  REPLICAS_MAXIMAS,
  validarSolicitud,
} from '../experimentos/plan.js'
import { useSimulacion } from './simulacion.js'

/** Cada cuánto se vuelcan al estado los avances que llegan del trabajador. */
export const INTERVALO_DE_VOLCADO_MS = 150

export const MENSAJE_SIN_TRABAJADORES =
  'Este navegador no permite correr los experimentos en segundo plano. Prueba con otro navegador más reciente.'
export const MENSAJE_DE_TRABAJADOR_CAIDO =
  'El cálculo en segundo plano se detuvo por un fallo. Lo que alcanzó a terminar se conserva; puedes volver a iniciar.'

/** Cómo se crea el trabajador: se puede cambiar en las pruebas. */
let fabricaDeTrabajadores = () =>
  new Worker(new URL('../experimentos/trabajador.js', import.meta.url), { type: 'module' })

export function __ponerFabricaDeTrabajadores(fabrica) {
  fabricaDeTrabajadores = fabrica
}

const redondear = (valor, decimales) => Number(valor.toFixed(decimales))

/**
 * Un rango sugerido para barrer un parámetro, a partir del valor que tiene en
 * Ajustes. Es solo un punto de partida: se puede escribir cualquier otro.
 */
export function rangoSugerido(parametro, parametros) {
  switch (parametro) {
    case 'placas':
      return { inicio: Math.max(1, parametros.placas - 2), fin: Math.min(14, parametros.placas + 2), paso: 1 }
    case 'puestos':
      return { inicio: parametros.puestos, fin: Math.min(7, parametros.puestos + 2), paso: 1 }
    case 'llegadasPorHora': {
      const inicio = Math.max(1, Math.round(parametros.llegadasPorHora * 0.6 * 2) / 2)
      const fin = Math.min(200, Math.round(parametros.llegadasPorHora * 1.2 * 2) / 2)
      return { inicio, fin, paso: 0.5 }
    }
    default: {
      const actual = parametro === 'lavadoMin' ? parametros.lavadoMin : acabadoPromedioDeLosParametros(parametros)
      const inicio = Math.max(0.5, redondear(actual * 0.6, 1))
      const fin = Math.min(120, redondear(actual * 1.4, 1))
      return { inicio, fin, paso: Math.max(0.1, redondear((fin - inicio) / 10, 1)) }
    }
  }
}

const parametrosDeAjustes = () => structuredClone(useSimulacion.getState().parametros)

const configuracionInicial = () => ({
  modo: MODO_REPLICAS,
  horas: 1000,
  calentamientoPct: CALENTAMIENTO_POR_DEFECTO_PCT,
  /** `null` = la semilla de Ajustes en el momento de pedir. */
  semillaBase: null,
  replicas: 30,
  lotes: 30,
  mediaAcumulada: false,
  barrido: { parametro: 'puestos', ...rangoSugerido('puestos', parametrosDeAjustes()) },
  /** El escenario contra el que se calculan las diferencias. */
  referencia: 'actual',
  /** La métrica del barrido que se dibuja. */
  grafica: { etapa: 'acabado', clave: 'wqMin' },
  /** La métrica de la media acumulada que se dibuja. */
  serie: { etapa: 'acabado', clave: 'lq' },
  /** La métrica y la precisión deseada para calcular las réplicas necesarias. */
  precision: { etapa: 'lavado', clave: 'lq', deseado: null },
})

const ejecucionInicial = () => ({
  /** inactivo | corriendo | terminado | cancelado | fallido */
  estado: 'inactivo',
  /** La solicitud del último lote, con los parámetros que tenía al empezar. */
  solicitudDelLote: null,
  acumulado: acumuladoVacio(),
  avance: { hechas: 0, pedidas: 0, horasHechas: 0, horasPedidas: 0, tiempoRestanteMs: null },
  /** Mensaje de error o aviso del último intento. */
  aviso: null,
})

let trabajadorEnMarcha = null
let pendientes = []
let temporizador = null
let inicioMs = 0

function limpiarTrabajador() {
  if (trabajadorEnMarcha) {
    trabajadorEnMarcha.onmessage = null
    trabajadorEnMarcha.onerror = null
    trabajadorEnMarcha.terminate()
    trabajadorEnMarcha = null
  }
}

export const useExperimentos = create((set, get) => {
  /** Pasa al estado los avances juntados. */
  function volcar() {
    temporizador = null
    if (pendientes.length === 0) return
    const eventos = pendientes
    pendientes = []
    let acumulado = get().acumulado
    for (const evento of eventos) acumulado = acumularEvento(acumulado, evento)
    const ultimo = eventos[eventos.length - 1]
    const { horasHechas, horasPedidas, hechas, pedidas } = ultimo
    const transcurrido = Date.now() - inicioMs
    // El tiempo que falta sale de lo que tardó lo ya hecho (en horas simuladas).
    const tiempoRestanteMs =
      hechas >= 2 && horasHechas > 0 ? Math.max(0, (transcurrido / horasHechas) * (horasPedidas - horasHechas)) : null
    set({ acumulado, avance: { hechas, pedidas, horasHechas, horasPedidas, tiempoRestanteMs } })
  }

  function programarVolcado() {
    if (temporizador === null) temporizador = setTimeout(volcar, INTERVALO_DE_VOLCADO_MS)
  }

  function volcarYa() {
    if (temporizador !== null) {
      clearTimeout(temporizador)
      temporizador = null
    }
    volcar()
  }

  function terminarCon(estado, aviso = null) {
    volcarYa()
    limpiarTrabajador()
    set({ estado, aviso })
  }

  /** Arranca un lote con una solicitud ya armada y válida. */
  function arrancar(solicitud) {
    let trabajador
    try {
      trabajador = fabricaDeTrabajadores()
    } catch {
      set({ ...ejecucionInicial(), estado: 'fallido', aviso: MENSAJE_SIN_TRABAJADORES })
      return { ok: false, mensaje: MENSAJE_SIN_TRABAJADORES }
    }
    limpiarTrabajador()
    pendientes = []
    inicioMs = Date.now()
    trabajadorEnMarcha = trabajador
    set({
      ...ejecucionInicial(),
      estado: 'corriendo',
      solicitudDelLote: solicitud,
      avance: {
        hechas: 0,
        pedidas: 0,
        horasHechas: 0,
        horasPedidas: horasTotales(solicitud),
        tiempoRestanteMs: null,
      },
    })

    trabajador.onmessage = (mensaje) => {
      const dato = mensaje.data
      if (trabajador !== trabajadorEnMarcha) return
      if (dato.tipo === 'avance') {
        pendientes.push(dato.evento)
        programarVolcado()
      } else if (dato.tipo === 'fin') {
        terminarCon(dato.estado === 'terminado' ? 'terminado' : 'cancelado')
      } else if (dato.tipo === 'error') {
        terminarCon('fallido', dato.mensaje)
      }
    }
    trabajador.onerror = () => {
      if (trabajador === trabajadorEnMarcha) terminarCon('fallido', MENSAJE_DE_TRABAJADOR_CAIDO)
    }
    trabajador.postMessage({ tipo: 'iniciar', solicitud })
    return { ok: true }
  }

  return {
    ...configuracionInicial(),
    ...ejecucionInicial(),

    elegirModo: (modo) => set({ modo }),

    cambiarConfiguracion: (cambios) => set(cambios),

    cambiarBarrido: (cambios) => set((estado) => ({ barrido: { ...estado.barrido, ...cambios } })),

    /** Cambia el parámetro del barrido y propone un rango a partir de Ajustes. */
    elegirParametroDelBarrido: (parametro) => {
      if (!PARAMETROS_DEL_BARRIDO[parametro]) return
      set({ barrido: { parametro, ...rangoSugerido(parametro, parametrosDeAjustes()) } })
    },

    cambiarGrafica: (cambios) => set((estado) => ({ grafica: { ...estado.grafica, ...cambios } })),
    cambiarSerie: (cambios) => set((estado) => ({ serie: { ...estado.serie, ...cambios } })),
    cambiarPrecision: (cambios) => set((estado) => ({ precision: { ...estado.precision, ...cambios } })),

    /** La semilla base que se usaría ahora: la escrita o la de Ajustes. */
    semillaBaseEfectiva: () => get().semillaBase ?? useSimulacion.getState().semilla,

    /** La solicitud con la configuración de ahora y los parámetros de Ajustes de ahora. */
    solicitudActual: () => {
      const c = get()
      return {
        modo: c.modo,
        parametros: parametrosDeAjustes(),
        semillaBase: c.semillaBase ?? useSimulacion.getState().semilla,
        horas: c.horas,
        calentamientoPct: c.calentamientoPct,
        replicas: c.replicas,
        lotes: c.lotes,
        barrido: { ...c.barrido },
        mediaAcumulada: c.mediaAcumulada,
      }
    },

    /** Valida la configuración de ahora, sin correr nada. */
    validacionActual: () => validarSolicitud(get().solicitudActual()),

    /**
     * Pulsa «Iniciar»: copia los parámetros de Ajustes y arranca el lote en segundo plano.
     * Con un lote en marcha no hace nada.
     */
    iniciar: () => {
      if (get().estado === 'corriendo') return { ok: false, mensaje: 'Ya hay un experimento en marcha.' }
      const solicitud = get().solicitudActual()
      const validacion = validarSolicitud(solicitud)
      if (!validacion.valida) {
        set({ aviso: validacion.mensaje })
        return { ok: false, mensaje: validacion.mensaje }
      }
      return arrancar(solicitud)
    },

    /**
     * Corre `n` réplicas con la configuración del último lote de Réplicas (los mismos
     * parámetros y la misma semilla base: las primeras repiten las de antes).
     */
    correrConReplicas: (n) => {
      const { estado, solicitudDelLote } = get()
      if (estado === 'corriendo' || !solicitudDelLote || solicitudDelLote.modo !== MODO_REPLICAS) {
        return { ok: false, mensaje: 'No hay un lote de réplicas del que partir.' }
      }
      const solicitud = { ...solicitudDelLote, replicas: n }
      const validacion = validarSolicitud(solicitud)
      if (!validacion.valida) {
        set({ aviso: validacion.mensaje })
        return { ok: false, mensaje: validacion.mensaje }
      }
      set({ replicas: n, semillaBase: solicitud.semillaBase })
      return arrancar(solicitud)
    },

    /** Detiene el lote; se conservan las piezas ya recibidas. */
    cancelar: () => {
      if (get().estado !== 'corriendo') return
      terminarCon('cancelado')
    },

    /** Borra los resultados (por ejemplo, tras un lote que no se quiere conservar). */
    descartarResultados: () => {
      if (get().estado === 'corriendo') return
      set(ejecucionInicial())
    },

    /** ¿Pasa de 100 réplicas o del tope un pedido de `n` réplicas con la solicitud del lote? */
    cabeUnLoteDeReplicas: (n) => {
      const base = get().solicitudDelLote
      if (!base || n > REPLICAS_MAXIMAS) return false
      return validarSolicitud({ ...base, replicas: n }).valida
    },
  }
})

/** Para las pruebas: vuelve todo al principio y detiene cualquier trabajador. */
export function reiniciarElStoreDeExperimentos() {
  if (temporizador !== null) clearTimeout(temporizador)
  temporizador = null
  pendientes = []
  limpiarTrabajador()
  useExperimentos.setState({ ...configuracionInicial(), ...ejecucionInicial() })
}
