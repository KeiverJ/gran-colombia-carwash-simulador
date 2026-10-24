/**
 * Estado global de la aplicación: los parámetros, el motor y los mandos.
 *
 * El store no sabe nada del navegador: recibe los milisegundos de cada cuadro
 * y hace la cuenta. Quien mide el tiempo es el ciclo de animación, en
 * `useCicloDeSimulacion`. Así todo esto se puede probar con Node.
 */

import { create } from 'zustand'

import {
  ACABADO_PLAN_MIN,
  LAVADO_MIN,
  LLEGADAS_POR_HORA,
  PLACAS_LAVADO,
  PROPORCION_PLAN_EXACTA,
  PUESTOS_ACABADO,
} from '../data/parametros.js'
import { crearSimulador, MODO_POR_PLAN } from '../engine/simulador.js'
import { progreso, siguienteTrozoHoras } from './corridaLarga.js'
import { pasoSimuladoMin } from './paso.js'
import { agregarPunto, tocaAnotar } from './puntos.js'

/** Lo que el panel deja elegir. */
export const PLACAS_POSIBLES = [5, 6, 7]
export const PUESTOS_POSIBLES = [3, 4, 5]
export const VELOCIDAD_MINIMA = 0.25
export const VELOCIDAD_MAXIMA = 60
export const VELOCIDAD_POR_DEFECTO = 1

/** Cada cuánto tiempo real se refrescan la tabla y la gráfica. */
export const INTERVALO_DE_METRICAS_MS = 250

/** Horas que simula de corrido el botón de la corrida larga. */
export const HORAS_DE_LA_CORRIDA_LARGA = 1000

/** Nombre de cada parámetro en palabras, para el aviso del panel. */
const NOMBRE_DEL_PARAMETRO = {
  llegadasPorHora: 'la cantidad de motos que llegan por hora',
  lavadoMin: 'el tiempo de lavado',
  placas: 'el número de placas de lavado',
  puestos: 'el número de puestos de acabado',
  modoAcabado: 'el modo de acabado',
  semilla: 'la semilla',
}

const parametrosPorDefecto = () => ({
  llegadasPorHora: LLEGADAS_POR_HORA,
  lavadoMin: LAVADO_MIN,
  acabadoPlanMin: { ...ACABADO_PLAN_MIN },
  proporcionPlan: { ...PROPORCION_PLAN_EXACTA },
  placas: PLACAS_LAVADO,
  puestos: PUESTOS_ACABADO,
  modoAcabado: MODO_POR_PLAN,
})

/**
 * E[S₂]: el tiempo medio de acabado de una moto cualquiera, como promedio
 * ponderado de los tiempos por plan con las proporciones puestas ahora mismo.
 *
 * Se calcula siempre, también con los parámetros por defecto, y nunca se usa
 * la constante del documento: si no, mover el acabado de un plan dejaría el
 * modo "M/M/s" simulando otro sistema distinto del que está configurado.
 */
export function acabadoPromedioDe({ acabadoPlanMin, proporcionPlan }) {
  return [1, 2, 3].reduce(
    (total, plan) => total + proporcionPlan[plan] * acabadoPlanMin[plan],
    0,
  )
}

/** Crea un motor con los parámetros y la semilla que se le pasen. */
function motorCon(parametros, semilla) {
  return crearSimulador({
    semilla,
    llegadasPorHora: parametros.llegadasPorHora,
    lavadoMin: parametros.lavadoMin,
    acabadoPlanMin: parametros.acabadoPlanMin,
    acabadoPromedioMin: acabadoPromedioDe(parametros),
    proporcionPlan: parametros.proporcionPlan,
    placas: parametros.placas,
    puestos: parametros.puestos,
    modoAcabado: parametros.modoAcabado,
  })
}

/**
 * Reparte las proporciones cuando se mueve una de ellas.
 *
 * El plan movido conserva su valor; los otros dos se reparten lo que queda en
 * la proporción que tenían entre sí (mitad y mitad si ambos estaban en 0), y
 * el posterior en el orden 1 → 2 → 3 se calcula como resto para que la suma
 * no se aleje de 1 más de un redondeo.
 */
export function repartirProporciones(proporcionActual, plan, valorPedido) {
  const valor = Math.min(1, Math.max(0, valorPedido))
  const otros = [1, 2, 3].filter((p) => p !== plan)
  const [primero, segundo] = otros
  const resto = 1 - valor
  const sumaOtros = proporcionActual[primero] + proporcionActual[segundo]

  const valorPrimero =
    sumaOtros > 0 ? resto * (proporcionActual[primero] / sumaOtros) : resto / 2
  // El segundo se deriva como resto, no con su propia multiplicación.
  const valorSegundo = Math.max(0, resto - valorPrimero)

  return {
    [plan]: valor,
    [primero]: Math.max(0, valorPrimero),
    [segundo]: valorSegundo,
  }
}

/** Estado con el que arranca la aplicación: un solo motor, en el minuto cero. */
function estadoInicial() {
  const parametros = parametrosPorDefecto()
  const semilla = 1
  const motor = motorCon(parametros, semilla)
  return {
    parametros,
    semilla,
    velocidadMinPorSegundo: VELOCIDAD_POR_DEFECTO,
    corriendo: false,
    motor,
    foto: motor.estado(),
    aviso: null,
    // Lo que alimenta la tabla y la gráfica. Se refrescan cuatro veces por
    // segundo, no en cada cuadro: una tabla de diez números no gana nada
    // redibujándose sesenta veces por segundo.
    metricas: null,
    puntos: [],
    ultimoPuntoMin: null,
    ultimasMetricasMs: 0,
    // Lo que la escena necesita mostrar como texto. Se refresca con el mismo
    // freno que las métricas: si se leyera de la foto, cada cuadro provocaría
    // un render de React, que es justo lo que la escena no debe hacer.
    resumen: resumenDe(motor.estado()),
    // Progreso de la corrida larga: null cuando no hay ninguna en marcha.
    corridaLarga: null,
  }
}

/** El puñado de números que la escena muestra en texto. */
function resumenDe(foto) {
  return {
    relojMin: foto.relojMin,
    enFilaLavado: foto.colaLavado.length,
    enFilaAcabado: foto.colaAcabado.length,
  }
}

export const useSimulacion = create((set, get) => ({
  ...estadoInicial(),

  iniciar: () => set({ corriendo: true }),
  pausar: () => set({ corriendo: false }),

  /** Empieza de cero con los parámetros y la semilla que haya ahora. */
  reiniciar: (aviso = null) => {
    const { parametros, semilla } = get()
    const motor = motorCon(parametros, semilla)
    set({
      motor,
      foto: motor.estado(),
      aviso,
      // Las métricas y los puntos son de la corrida que se acaba de descartar:
      // mezclarlos con los de la nueva daría una gráfica que no ocurrió.
      metricas: null,
      puntos: [],
      ultimoPuntoMin: null,
      ultimasMetricasMs: 0,
      resumen: resumenDe(motor.estado()),
      corridaLarga: null,
    })
  },

  /**
   * Avanza el tiempo simulado que le toca a un cuadro de animación.
   * @param {number} msDelCuadro lapso real desde el cuadro anterior
   */
  avanzarCuadro: (msDelCuadro) => {
    const { motor, velocidadMinPorSegundo, corriendo } = get()
    const paso = pasoSimuladoMin({ msDelCuadro, velocidadMinPorSegundo, corriendo })
    if (paso <= 0) {
      return
    }
    motor.avanzar(paso)
    const foto = motor.estado()
    set({ foto })
    get().anotarMetricas(foto)
  },

  /**
   * Refresca la tabla y añade un punto a la gráfica, con dos frenos: las
   * métricas como mucho cada cuarto de segundo real, y un punto cada vez que
   * el reloj simulado avanza el intervalo de muestreo.
   */
  anotarMetricas: (foto) => {
    const { motor, ultimasMetricasMs, ultimoPuntoMin, puntos } = get()
    const cambios = {}

    // Freno 1: la tabla, por tiempo real. Diez números no ganan nada
    // redibujándose sesenta veces por segundo.
    const ahora = Date.now()
    if (ahora - ultimasMetricasMs >= INTERVALO_DE_METRICAS_MS) {
      cambios.metricas = motor.metricas()
      cambios.resumen = resumenDe(foto)
      cambios.ultimasMetricasMs = ahora
    }

    // Freno 2: la gráfica, por tiempo simulado, e independiente del anterior.
    // Si dependiera del reloj real, a velocidad alta la gráfica se quedaría
    // con cuatro puntos por segundo y perdería la forma de las colas.
    if (tocaAnotar(foto.relojMin, ultimoPuntoMin)) {
      cambios.puntos = agregarPunto(puntos, {
        minuto: foto.relojMin,
        colaLavado: foto.colaLavado.length,
        colaAcabado: foto.colaAcabado.length,
      })
      cambios.ultimoPuntoMin = foto.relojMin
    }

    if (Object.keys(cambios).length > 0) {
      set(cambios)
    }
  },

  /**
   * Arranca la corrida larga: descarta lo simulado y vuelve a empezar, porque
   * mezclar mil horas con lo que ya había daría métricas de dos sistemas.
   */
  empezarCorridaLarga: (horas = HORAS_DE_LA_CORRIDA_LARGA) => {
    get().reiniciar(
      `Simulando ${horas} horas de corrido. La simulación anterior se descartó para empezar de cero.`,
    )
    set({
      corriendo: false,
      corridaLarga: {
        horasTotales: horas,
        horasHechas: 0,
        horasDelTrozoAnterior: 0,
        msDelTrozoAnterior: 0,
        porcentaje: 0,
      },
    })
  },

  /**
   * Avanza un trozo de la corrida larga; la llama el ciclo de animación una
   * vez por cuadro, así que la pantalla sigue respondiendo mientras tanto.
   * Devuelve true mientras quede trabajo.
   */
  avanzarCorridaLarga: () => {
    const { corridaLarga, motor } = get()
    if (!corridaLarga) {
      return false
    }
    const horasQueFaltan = corridaLarga.horasTotales - corridaLarga.horasHechas
    if (horasQueFaltan <= 0) {
      set({
        corridaLarga: null,
        metricas: motor.metricas(),
        foto: motor.estado(),
        resumen: resumenDe(motor.estado()),
        aviso: `Listo: se simularon ${corridaLarga.horasTotales} horas de corrido.`,
      })
      return false
    }

    const trozo = siguienteTrozoHoras({
      horasQueFaltan,
      horasDelTrozoAnterior: corridaLarga.horasDelTrozoAnterior,
      msDelTrozoAnterior: corridaLarga.msDelTrozoAnterior,
    })
    const empezo = Date.now()
    motor.correrHoras(trozo)
    const tardo = Date.now() - empezo

    const horasHechas = corridaLarga.horasHechas + trozo
    const foto = motor.estado()
    // Un punto por trozo: si no, tras mil horas la gráfica quedaría vacía
    // justo cuando más hay que enseñar, que es cómo crece la fila del acabado.
    const puntos = agregarPunto(get().puntos, {
      minuto: foto.relojMin,
      colaLavado: foto.colaLavado.length,
      colaAcabado: foto.colaAcabado.length,
    })
    set({
      foto,
      puntos,
      ultimoPuntoMin: foto.relojMin,
      metricas: motor.metricas(),
      resumen: resumenDe(foto),
      corridaLarga: {
        ...corridaLarga,
        horasHechas,
        horasDelTrozoAnterior: trozo,
        msDelTrozoAnterior: tardo,
        porcentaje: progreso(horasHechas, corridaLarga.horasTotales),
      },
    })
    return true
  },

  /**
   * Cambia un parámetro y vuelve a empezar con la misma semilla.
   * Se reinicia porque las métricas acumuladas de antes describirían otro
   * lavadero; se conservan la semilla, la velocidad y si estaba corriendo.
   */
  cambiarParametro: (nombre, valor) => {
    const parametros = { ...get().parametros, [nombre]: valor }
    set({ parametros })
    get().reiniciar(
      `Cambiaste ${NOMBRE_DEL_PARAMETRO[nombre] ?? nombre}, así que la simulación volvió a empezar con la misma semilla.`,
    )
  },

  /** Cambia el tiempo de acabado de un plan y vuelve a empezar. */
  cambiarAcabadoDePlan: (plan, minutos) => {
    const anteriores = get().parametros.acabadoPlanMin
    const parametros = {
      ...get().parametros,
      acabadoPlanMin: { ...anteriores, [plan]: minutos },
    }
    set({ parametros })
    get().reiniciar(
      `Cambiaste el tiempo de acabado del plan ${plan}, así que la simulación volvió a empezar con la misma semilla.`,
    )
  },

  /** Mueve la proporción de un plan; las otras dos se reajustan. */
  cambiarProporcion: (plan, valor) => {
    const proporcionPlan = repartirProporciones(get().parametros.proporcionPlan, plan, valor)
    set({ parametros: { ...get().parametros, proporcionPlan } })
    get().reiniciar(
      `Cambiaste la proporción del plan ${plan}, así que la simulación volvió a empezar con la misma semilla.`,
    )
  },

  /** Otra semilla es otra tarde simulada: también reinicia. */
  cambiarSemilla: (semilla) => {
    set({ semilla })
    get().reiniciar('Cambiaste la semilla, así que la simulación volvió a empezar con otro azar.')
  },

  /** La velocidad se puede cambiar en marcha: no reinicia nada. */
  cambiarVelocidad: (velocidadMinPorSegundo) =>
    set({
      velocidadMinPorSegundo: Math.min(
        VELOCIDAD_MAXIMA,
        Math.max(VELOCIDAD_MINIMA, velocidadMinPorSegundo),
      ),
    }),

  /** El tiempo medio de acabado que está usando el modo "M/M/s" ahora. */
  acabadoPromedioMin: () => acabadoPromedioDe(get().parametros),
}))
