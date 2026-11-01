/**
 * Estado global de la aplicación: los parámetros, el motor y los mandos.
 *
 * El store no sabe nada del navegador: recibe los milisegundos de cada cuadro
 * y hace la cuenta. Quien mide el tiempo es el ciclo de animación, en
 * `useCicloDeSimulacion`. Así todo esto se puede probar con Node.
 */

import { create } from 'zustand'

import { ESCENARIOS } from '../data/escenarios.js'
import {
  ACABADO_PLAN_MIN,
  LAVADO_MIN,
  LLEGADAS_POR_HORA,
  PLACAS_LAVADO,
  PROPORCION_PLAN_EXACTA,
  PUESTOS_ACABADO,
} from '../data/parametros.js'
import {
  crearSimulador,
  ETAPA_ACABADO,
  ETAPA_LAVADO,
  MODO_POR_PLAN,
  SERVIDOR_ACTIVO,
} from '../engine/simulador.js'
import { crearReproductor } from '../visita/reproductor.js'
import {
  horasDeLaCamaraRapida,
  marcasQueCruza,
  progreso,
  siguienteTrozoHoras,
} from './corridaLarga.js'
import { fotoDe, largoDeLasFilas } from './filas.js'
import { pasoSimuladoMin } from './paso.js'
import { agregarPunto, intervaloDeMuestreoMin, tocaAnotar } from './puntos.js'
import { esUnPlan, RANGOS, validarParametro } from './rangos.js'

/** Los dos modos de la aplicación: la simulación al azar y la tarde de la visita. */
export const MODO_ALEATORIO = 'aleatorio'
export const MODO_VISITA = 'visita'

/** Los extremos de la velocidad, en minutos simulados por segundo real. */
export const VELOCIDAD_MINIMA = RANGOS.velocidad.minimo
export const VELOCIDAD_MAXIMA = RANGOS.velocidad.maximo
export const VELOCIDAD_POR_DEFECTO = 1

/** Cada cuánto tiempo real se refrescan la tabla y la gráfica. */
export const INTERVALO_DE_METRICAS_MS = 250

/** Horas que simula seguidas el botón de la corrida larga. */
export const HORAS_DE_LA_CORRIDA_LARGA = 1000

/** Nombre de cada parámetro en palabras, para el aviso del panel. */
const NOMBRE_DEL_PARAMETRO = {
  llegadasPorHora: 'la cantidad de motos que llegan por hora',
  lavadoMin: 'el tiempo de lavado',
  placas: 'el número de placas de lavado',
  puestos: 'el número de puestos de acabado',
  modoAcabado: 'el modo de acabado',
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

/** Los parámetros por defecto con las placas y los puestos de un escenario. */
export const parametrosDelEscenario = (escenario) => ({
  ...parametrosPorDefecto(),
  placas: escenario.placas,
  puestos: escenario.puestos,
})

/** ¿Dos conjuntos de parámetros tienen exactamente los mismos valores? */
function mismosParametros(a, b) {
  return Object.keys(a).every((clave) =>
    typeof a[clave] === 'object'
      ? mismosParametros(a[clave], b[clave])
      : a[clave] === b[clave],
  )
}

/**
 * El escenario cuyos valores coinciden con los parámetros puestos, o `null`
 * si ya se movió alguno. Se deduce en vez de guardarse: un escenario guardado
 * seguiría "elegido" después de mover cualquier deslizador, y ya no sería cierto.
 */
export function escenarioQueCoincide(parametros) {
  return (
    ESCENARIOS.find((escenario) =>
      mismosParametros(parametrosDelEscenario(escenario), parametros),
    ) ?? null
  )
}

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

/** Lo que se le dice a la persona cuando el motor falla: sin jerga ni trazas. */
export const MENSAJE_DE_FALLO =
  'La simulación se detuvo por un error inesperado. Pulsa Reiniciar para volver a empezar.'

/**
 * El único sitio por donde el store habla con el motor. Si lo que se le pide lanza
 * un error, la simulación se detiene (y la corrida larga, si la había), el fallo se
 * guarda para que la interfaz lo explique y se devuelve `undefined`: nunca sale la
 * excepción. Reiniciar borra el fallo.
 *
 * @template T
 * @param {Function} set el `set` del store
 * @param {() => T} accion lo que se le pide al motor
 * @returns {T|undefined}
 */
function conMotor(set, accion) {
  try {
    return accion()
  } catch (error) {
    set({
      corriendo: false,
      corridaLarga: null,
      fallo: { mensaje: MENSAJE_DE_FALLO, detalle: error instanceof Error ? error.message : String(error) },
    })
    return undefined
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
    foto: fotoDe(motor),
    aviso: null,
    // El aviso de haber cargado un escenario va aparte: se muestra junto al
    // selector, que está arriba del panel, y no al final con los demás avisos.
    avisoDeEscenario: null,
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
    resumen: resumenDe(fotoDe(motor)),
    // Progreso de la corrida larga: null cuando no hay ninguna en marcha.
    corridaLarga: null,
    // ¿Se cerró algún servidor en esta corrida? Lo simulado cubre entonces periodos
    // con distinto número de servidores activos (la tabla de métricas lo aclara).
    huboCierres: false,
    // Cuántas horas simula la corrida larga: 100, 1000 o 5000 (ver `rangos.js`).
    horasDeLaCorridaLarga: HORAS_DE_LA_CORRIDA_LARGA,
    // Si el motor falló: { mensaje, detalle }; null mientras todo va bien. Reiniciar lo borra.
    fallo: null,
    // Cuántas veces se ha reemplazado el motor o saltado el estado (reiniciar,
    // terminar la corrida larga, entrar o salir de la visita, fin de la visita…).
    // La escena lo compara en cada cuadro: si cambió, no anima lo que recuerda,
    // recoloca cada moto en su lugar según la foto.
    generacion: 0,
    // El modo "Repetir la visita": el reproductor ocupa el lugar del motor, y
    // aquí se guarda lo que había antes para poder volver.
    modo: MODO_ALEATORIO,
    antesDeLaVisita: null,
    // { terminada } mientras dura la visita; null en el modo aleatorio.
    visita: null,
  }
}

/**
 * El puñado de números que la interfaz muestra: los de la escena, el reloj y
 * la tira de indicadores. Salen todos de la foto que el motor ya entrega.
 */
function resumenDe(foto) {
  return {
    relojMin: foto.relojMin,
    enFilaLavado: largoDeLasFilas(foto).lavado,
    enFilaAcabado: largoDeLasFilas(foto).acabado,
    placasOcupadas: foto.placas.filter((placa) => !placa.libre).length,
    puestosOcupados: foto.puestos.filter((puesto) => !puesto.libre).length,
    motosSalidas: foto.motosSalidas,
    placasTotales: foto.placas.length,
    puestosTotales: foto.puestos.length,
    // Qué servidores reciben motos ahora. La visita no trae `estado`: allí todos están activos.
    estadosDePlacas: foto.placas.map(estadoDelServidor),
    estadosDePuestos: foto.puestos.map(estadoDelServidor),
    placasActivas: foto.placas.filter((placa) => estadoDelServidor(placa) === SERVIDOR_ACTIVO).length,
    puestosActivos: foto.puestos.filter((puesto) => estadoDelServidor(puesto) === SERVIDOR_ACTIVO).length,
  }
}

/** El estado de un servidor de la foto; sin el campo, activo. */
const estadoDelServidor = (servidor) => servidor.estado ?? SERVIDOR_ACTIVO

/** El nombre de la lista de la foto que corresponde a cada etapa. */
const SERVIDORES_DE_LA_ETAPA = { [ETAPA_LAVADO]: 'placas', [ETAPA_ACABADO]: 'puestos' }

/** Lo que se avisa cuando reiniciar vuelve a abrir servidores que estaban cerrados. */
const AVISO_DE_SERVIDORES_REABIERTOS = 'Los servidores que estaban cerrados volvieron a abrirse.'

/** ¿Hay algún servidor que no esté activo en esta foto? */
const hayServidoresSinAbrir = (foto) =>
  [...foto.placas, ...foto.puestos].some((servidor) => estadoDelServidor(servidor) !== SERVIDOR_ACTIVO)

export const useSimulacion = create((set, get) => ({
  ...estadoInicial(),

  iniciar: () => {
    // Una visita terminada no se reanuda: hay que reiniciarla o volver al modo normal.
    // Y mientras corre la corrida larga el motor es de ella: no se anima hasta que termine.
    if (get().visita?.terminada || get().corridaLarga) {
      return
    }
    set({ corriendo: true })
  },
  // Al pausar se refresca el resumen: tiene un freno de un cuarto de segundo y, sin esto,
  // un cambio ocurrido justo antes (un servidor que pasa de «cerrándose» a «cerrado»)
  // se quedaría sin mostrar mientras dure la pausa.
  pausar: () => set({ corriendo: false, resumen: resumenDe(get().foto) }),

  /**
   * Empieza de cero con los parámetros y la semilla que haya ahora; en el modo
   * visita, otra vez desde las 3:10 p. m.
   */
  reiniciar: (aviso = null) => {
    // Mientras corre la corrida larga el motor es de ella: se cancela con su botón.
    if (get().corridaLarga) {
      return
    }
    const { parametros, semilla, modo } = get()
    const enLaVisita = modo === MODO_VISITA
    // Un motor nuevo empieza con todos los servidores activos: si había cerrados, se dice.
    const reabre = !enLaVisita && hayServidoresSinAbrir(get().foto)
    // Si el motor nuevo no se puede crear, se queda el anterior y se explica el fallo.
    const creado = conMotor(set, () => {
      const motor = enLaVisita ? crearReproductor() : motorCon(parametros, semilla)
      return { motor, foto: fotoDe(motor) }
    })
    if (!creado) {
      return
    }
    const { motor, foto } = creado
    set({
      motor,
      foto,
      // Otro motor: la escena tiene que recolocar, no animar desde lo que recordaba.
      generacion: get().generacion + 1,
      corriendo: get().corriendo,
      aviso: reabre ? [aviso, AVISO_DE_SERVIDORES_REABIERTOS].filter(Boolean).join(' ') : aviso,
      huboCierres: false,
      fallo: null,
      avisoDeEscenario: null,
      visita: enLaVisita ? { terminada: false } : null,
      // Las métricas y los puntos son de la corrida que se acaba de descartar:
      // mezclarlos con los de la nueva daría una gráfica que no ocurrió.
      metricas: null,
      puntos: [],
      ultimoPuntoMin: null,
      ultimasMetricasMs: 0,
      resumen: resumenDe(foto),
      corridaLarga: null,
    })
  },

  /**
   * Avanza el tiempo simulado que le toca a un cuadro de animación.
   * @param {number} msDelCuadro lapso real desde el cuadro anterior
   */
  avanzarCuadro: (msDelCuadro) => {
    // Mientras corre la corrida larga el motor es de ella: nadie más lo avanza.
    if (get().corridaLarga) {
      return
    }
    const { motor, velocidadMinPorSegundo, corriendo } = get()
    const paso = pasoSimuladoMin({ msDelCuadro, velocidadMinPorSegundo, corriendo })
    if (paso <= 0) {
      return
    }
    const foto = conMotor(set, () => {
      motor.avanzar(paso)
      return fotoDe(motor)
    })
    if (foto === undefined) {
      return
    }
    set({ foto })
    get().anotarMetricas(foto)

    if (get().modo === MODO_VISITA && conMotor(set, () => motor.terminada()) && !get().visita?.terminada) {
      get().terminarLaVisita(foto)
    }
  },

  /**
   * La visita llegó a las 5:30 p. m.: se detiene y se deja a la vista lo final.
   * Las métricas y el último punto de la gráfica se guardan sin esperar a los
   * frenos de siempre, o lo último que se vería sería de un cuarto de segundo antes.
   */
  terminarLaVisita: (foto) => {
    const { motor, puntos } = get()
    const hayUltimoPunto = puntos.at(-1)?.minuto === foto.relojMin
    const metricas = conMotor(set, () => motor.metricas())
    if (metricas === undefined) {
      return
    }
    set({
      corriendo: false,
      // La escena se recoloca con el estado final: nada queda a medio camino.
      generacion: get().generacion + 1,
      visita: { terminada: true },
      metricas,
      resumen: resumenDe(foto),
      puntos: hayUltimoPunto
        ? puntos
        : agregarPunto(puntos, {
            minuto: foto.relojMin,
            colaLavado: largoDeLasFilas(foto).lavado,
            colaAcabado: largoDeLasFilas(foto).acabado,
          }),
      ultimoPuntoMin: foto.relojMin,
    })
  },

  /**
   * Entra al modo "Repetir la visita del 17 de octubre": guarda los parámetros
   * que había, deja el lavadero real (6 placas y 3 puestos, para que la escena
   * dibuje las losas de ese día) y empieza en pausa a las 3:10 p. m.
   */
  entrarEnLaVisita: () => {
    if (get().modo === MODO_VISITA || get().corridaLarga) {
      return
    }
    set({
      modo: MODO_VISITA,
      antesDeLaVisita: { parametros: get().parametros },
      parametros: parametrosPorDefecto(),
      corriendo: false,
    })
    get().reiniciar(null)
  },

  /**
   * Vuelve al modo normal con los parámetros de antes de entrar a la visita.
   * La semilla y la velocidad nunca se tocaron. Queda en pausa: volver de una
   * visita para encontrar la simulación corriendo sola sorprende.
   */
  volverAlModoNormal: () => {
    const { modo, antesDeLaVisita } = get()
    if (modo !== MODO_VISITA || get().corridaLarga) {
      return
    }
    set({
      modo: MODO_ALEATORIO,
      parametros: antesDeLaVisita.parametros,
      antesDeLaVisita: null,
      corriendo: false,
    })
    get().reiniciar(null)
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
      const metricas = conMotor(set, () => motor.metricas())
      if (metricas === undefined) {
        return
      }
      cambios.metricas = metricas
      cambios.resumen = resumenDe(foto)
      cambios.ultimasMetricasMs = ahora
    }

    // Freno 2: la gráfica, por tiempo simulado, e independiente del anterior.
    // Si dependiera del reloj real, a velocidad alta la gráfica se quedaría
    // con cuatro puntos por segundo y perdería la forma de las colas. El
    // intervalo crece con lo que ya cubre la gráfica, para que siga entera.
    if (tocaAnotar(foto.relojMin, ultimoPuntoMin, intervaloDeMuestreoMin(puntos))) {
      cambios.puntos = agregarPunto(puntos, {
        minuto: foto.relojMin,
        colaLavado: largoDeLasFilas(foto).lavado,
        colaAcabado: largoDeLasFilas(foto).acabado,
      })
      cambios.ultimoPuntoMin = foto.relojMin
    }

    if (Object.keys(cambios).length > 0) {
      set(cambios)
    }
  },

  /**
   * Elige cuántas horas simulará la corrida larga (100, 1000 o 5000). No reinicia
   * nada. Devuelve `true` solo si el valor se aceptó; no se puede cambiar mientras
   * hay una corrida larga en marcha.
   */
  cambiarHorasDeLaCorridaLarga: (horas) => {
    if (get().corridaLarga) {
      return false
    }
    const leido = validarParametro('horasDeLaCorridaLarga', horas)
    if (!leido.valido) {
      return false
    }
    set({ horasDeLaCorridaLarga: leido.valor })
    return true
  },

  /**
   * Arranca la corrida larga: descarta lo simulado y vuelve a empezar, porque
   * mezclar mil horas con lo que ya había daría métricas de dos sistemas.
   */
  empezarCorridaLarga: (horas = get().horasDeLaCorridaLarga, { camaraRapida = false } = {}) => {
    if (get().modo === MODO_VISITA || get().corridaLarga) {
      return
    }
    // Solo 100, 1000 o 5000 horas: cualquier otro valor no llega al motor.
    if (!validarParametro('horasDeLaCorridaLarga', horas).valido) {
      return
    }
    get().reiniciar(
      `Simulando ${horas} horas seguidas. La simulación anterior se descartó para empezar desde cero.`,
    )
    if (get().fallo) {
      return
    }
    set({
      corriendo: false,
      corridaLarga: {
        horasTotales: horas,
        horasHechas: 0,
        horasDelTrozoAnterior: 0,
        msDelTrozoAnterior: 0,
        porcentaje: 0,
        // En cámara rápida la escena muestra el estado al final de cada trozo y la
        // corrida dura a la vista un mínimo de tiempo; si no, salta al final.
        camaraRapida,
        inicioMs: null,
      },
    })
  },

  /**
   * Avanza la corrida larga en este cuadro; la llama el ciclo de animación una
   * vez por cuadro, así que la pantalla sigue respondiendo mientras tanto.
   * Devuelve true mientras quede trabajo.
   *
   * En cámara rápida, además, el trabajo sigue el ritmo de la cámara
   * (`horasDeLaCamaraRapida`): no se adelanta a ella, y si el cálculo es más
   * lento, va a su paso. Las horas simuladas y los resultados son los mismos.
   *
   * @param {number|null} [instante] el instante de este cuadro, en milisegundos
   */
  avanzarCorridaLarga: (instante = null) => {
    const { corridaLarga, motor } = get()
    if (!corridaLarga) {
      return false
    }
    const ahora = instante ?? Date.now()
    const inicioMs = corridaLarga.inicioMs ?? ahora
    const horasQueFaltan = corridaLarga.horasTotales - corridaLarga.horasHechas
    if (horasQueFaltan <= 0) {
      const final = conMotor(set, () => ({ metricas: motor.metricas(), foto: fotoDe(motor) }))
      if (!final) {
        return false
      }
      set({
        corridaLarga: null,
        // Termina en pausa y la escena se recoloca con el estado final, lista para Iniciar.
        corriendo: false,
        generacion: get().generacion + 1,
        metricas: final.metricas,
        foto: final.foto,
        resumen: resumenDe(final.foto),
        aviso: `Listo: se simularon ${corridaLarga.horasTotales} horas seguidas.`,
      })
      return false
    }

    // Las horas que la cámara deja hacer ahora; sin cámara, todas las que faltan.
    const permitidas = corridaLarga.camaraRapida
      ? horasDeLaCamaraRapida({ msTranscurridos: ahora - inicioMs, horasTotales: corridaLarga.horasTotales }) -
        corridaLarga.horasHechas
      : horasQueFaltan
    if (permitidas <= 0) {
      // Al principio la cámara arranca despacio: este cuadro no toca avanzar.
      if (corridaLarga.inicioMs === null) {
        set({ corridaLarga: { ...corridaLarga, inicioMs } })
      }
      return true
    }

    const trozo = siguienteTrozoHoras({
      horasQueFaltan: permitidas,
      horasDelTrozoAnterior: corridaLarga.horasDelTrozoAnterior,
      msDelTrozoAnterior: corridaLarga.msDelTrozoAnterior,
    })
    const horasHechas = corridaLarga.horasHechas + trozo
    const terminoElTrabajo = horasHechas >= corridaLarga.horasTotales

    // El trozo se parte en las marcas de la gráfica que cruza: en cada una el
    // motor se detiene, se lee su estado y se anota el punto. Correr por partes
    // da exactamente lo mismo que correr de golpe, así que los resultados no
    // cambian; y la gráfica queda con ~200 puntos sea cual sea el tamaño del
    // trozo, con cámara rápida o sin ella.
    const empezo = Date.now()
    const avance = conMotor(set, () => {
      let puntos = get().puntos
      let horasCorridas = corridaLarga.horasHechas
      let foto = null
      const marcas = marcasQueCruza({
        horasAntes: corridaLarga.horasHechas,
        horasDespues: horasHechas,
        horasTotales: corridaLarga.horasTotales,
      })
      for (const marca of marcas) {
        motor.correrHoras(marca - horasCorridas)
        horasCorridas = marca
        foto = fotoDe(motor)
        puntos = agregarPunto(puntos, {
          minuto: foto.relojMin,
          colaLavado: largoDeLasFilas(foto).lavado,
          colaAcabado: largoDeLasFilas(foto).acabado,
        })
      }
      if (horasCorridas < horasHechas) {
        motor.correrHoras(horasHechas - horasCorridas)
        foto = fotoDe(motor)
      }
      return { puntos, foto, marcas }
    })
    if (!avance) {
      return false
    }
    const { puntos, foto, marcas } = avance
    const tardo = Date.now() - empezo

    const cambios = {
      foto,
      resumen: resumenDe(foto),
      corridaLarga: {
        ...corridaLarga,
        inicioMs,
        horasHechas,
        horasDelTrozoAnterior: trozo,
        msDelTrozoAnterior: tardo,
        porcentaje: progreso(horasHechas, corridaLarga.horasTotales),
      },
    }
    // La última marca cae en el final de la corrida: el último punto se anota al terminar.
    if (marcas.length > 0) {
      cambios.puntos = puntos
      cambios.ultimoPuntoMin = puntos.at(-1).minuto
    }
    // La tabla de métricas, como en la marcha normal, cuatro veces por segundo; y al final siempre.
    if (!corridaLarga.camaraRapida || terminoElTrabajo || Date.now() - get().ultimasMetricasMs >= INTERVALO_DE_METRICAS_MS) {
      const metricas = conMotor(set, () => motor.metricas())
      if (metricas === undefined) {
        return false
      }
      cambios.metricas = metricas
      cambios.ultimasMetricasMs = Date.now()
    }
    set(cambios)
    return true
  },

  /**
   * Cancela la corrida larga a medias: el motor se queda donde estaba, la
   * simulación queda en pausa y la escena se recoloca, quieta, con ese estado.
   */
  cancelarCorridaLarga: () => {
    const { corridaLarga, motor } = get()
    if (!corridaLarga) {
      return
    }
    const parcial = conMotor(set, () => ({ foto: fotoDe(motor), metricas: motor.metricas() }))
    if (!parcial) {
      return
    }
    const { foto, metricas } = parcial
    set({
      corridaLarga: null,
      corriendo: false,
      generacion: get().generacion + 1,
      metricas,
      foto,
      resumen: resumenDe(foto),
      aviso: `Cancelaste la corrida larga: quedó en ${corridaLarga.horasHechas} de ${corridaLarga.horasTotales} horas.`,
    })
  },

  /**
   * Cierra un servidor (una placa o un puesto) o lo vuelve a abrir, sin reiniciar:
   * la simulación sigue en marcha o en pausa y las motos siguen donde estaban.
   *
   * No hace nada en la visita ni durante la corrida larga. El motor es quien
   * decide si se puede (el último servidor activo de una etapa no se cierra).
   *
   * @param {'lavado'|'acabado'} etapa
   * @param {number} indice posición del servidor, desde 0 (la placa 3 es el 2)
   * @param {'cerrar'|'abrir'} que
   * @returns {{ aplicado: boolean, motivo?: string }}
   */
  cambiarServidor: (etapa, indice, que) => {
    const { modo, corridaLarga, motor, foto } = get()
    if (modo === MODO_VISITA) {
      return { aplicado: false, motivo: 'visita' }
    }
    if (corridaLarga) {
      return { aplicado: false, motivo: 'corrida-larga' }
    }
    const lista = foto[SERVIDORES_DE_LA_ETAPA[etapa]]
    if (!lista || !Number.isInteger(indice) || indice < 0 || indice >= lista.length) {
      return { aplicado: false, motivo: 'no-existe' }
    }
    const hecho = conMotor(set, () => {
      const resultado =
        que === 'cerrar' ? motor.cerrarServidor(etapa, indice + 1) : motor.abrirServidor(etapa, indice + 1)
      return resultado.aplicado
        ? { resultado, nueva: fotoDe(motor), huboCierres: motor.configuracion().huboCierres }
        : { resultado }
    })
    if (!hecho) {
      return { aplicado: false, motivo: 'fallo' }
    }
    if (hecho.resultado.aplicado) {
      // La foto y el resumen se refrescan en la misma acción: el botón y la escena
      // responden al instante, sin esperar al freno de la interfaz.
      set({
        foto: hecho.nueva,
        resumen: resumenDe(hecho.nueva),
        huboCierres: hecho.huboCierres,
      })
    }
    return hecho.resultado
  },

  cerrarServidor: (etapa, indice) => get().cambiarServidor(etapa, indice, 'cerrar'),
  abrirServidor: (etapa, indice) => get().cambiarServidor(etapa, indice, 'abrir'),

  /** Cierra el servidor si está activo y lo abre si está cerrado o cerrándose. */
  alternarServidor: (etapa, indice) => {
    const servidor = get().foto[SERVIDORES_DE_LA_ETAPA[etapa]]?.[indice]
    if (!servidor) {
      return { aplicado: false, motivo: 'no-existe' }
    }
    return get().cambiarServidor(
      etapa,
      indice,
      estadoDelServidor(servidor) === SERVIDOR_ACTIVO ? 'cerrar' : 'abrir',
    )
  },

  /**
   * Cambia un parámetro y vuelve a empezar con la misma semilla.
   * Se reinicia porque las métricas acumuladas de antes describirían otro
   * lavadero; se conservan la semilla, la velocidad y si estaba corriendo.
   *
   * El store es la guardia: un valor que no pasa la validación no se aplica,
   * no reinicia y deja el parámetro como estaba. Igual en la visita y durante la
   * corrida larga. Devuelve `true` solo si el cambio se aplicó.
   */
  cambiarParametro: (nombre, valor) => {
    if (get().modo === MODO_VISITA || get().corridaLarga) {
      return false
    }
    if (!Object.hasOwn(NOMBRE_DEL_PARAMETRO, nombre)) {
      return false
    }
    const leido = validarParametro(nombre, valor)
    if (!leido.valido) {
      return false
    }
    const parametros = { ...get().parametros, [nombre]: leido.valor }
    set({ parametros })
    get().reiniciar(
      `Cambiaste ${NOMBRE_DEL_PARAMETRO[nombre]}, así que la simulación volvió a empezar con la misma semilla.`,
    )
    return true
  },

  /** Cambia el tiempo de acabado de un plan y vuelve a empezar. Devuelve `true` si se aplicó. */
  cambiarAcabadoDePlan: (plan, minutos) => {
    if (get().modo === MODO_VISITA || get().corridaLarga) {
      return false
    }
    const leido = validarParametro('acabadoPlanMin', minutos)
    if (!esUnPlan(plan) || !leido.valido) {
      return false
    }
    const anteriores = get().parametros.acabadoPlanMin
    const parametros = {
      ...get().parametros,
      acabadoPlanMin: { ...anteriores, [plan]: leido.valor },
    }
    set({ parametros })
    get().reiniciar(
      `Cambiaste el tiempo de acabado del plan ${plan}, así que la simulación volvió a empezar con la misma semilla.`,
    )
    return true
  },

  /**
   * Carga un escenario: los parámetros por defecto con sus placas y puestos, y
   * vuelve a empezar con la misma semilla. Se reinicia porque otro número de
   * servidores es otro lavadero, y con la misma semilla las llegadas son las
   * mismas: lo que cambie en las métricas se debe al escenario y no al azar.
   */
  elegirEscenario: (id) => {
    const escenario = ESCENARIOS.find((candidato) => candidato.id === id)
    if (!escenario || get().modo === MODO_VISITA || get().corridaLarga) {
      return
    }
    set({ parametros: parametrosDelEscenario(escenario) })
    get().reiniciar(null)
    set({
      avisoDeEscenario: `Se cargaron los parámetros por defecto con ${escenario.placas} placas y ${escenario.puestos} puestos.`,
    })
  },

  /**
   * Pone todos los parámetros en sus valores por defecto, con 6 placas y 3
   * puestos, y vuelve a empezar con la misma semilla. Es lo mismo que elegir
   * "Situación actual", con su propio aviso. En la visita no hace nada.
   */
  restablecerValores: () => {
    if (get().modo === MODO_VISITA || get().corridaLarga) {
      return
    }
    set({ parametros: parametrosPorDefecto() })
    get().reiniciar('Se restablecieron los valores por defecto.')
  },

  /**
   * Mueve la proporción de un plan (una fracción de 0 a 1); las otras dos se
   * reajustan. Devuelve `true` si se aplicó.
   */
  cambiarProporcion: (plan, valor) => {
    if (get().modo === MODO_VISITA || get().corridaLarga) {
      return false
    }
    const leido = validarParametro('proporcionPlan', valor)
    if (!esUnPlan(plan) || !leido.valido) {
      return false
    }
    const proporcionPlan = repartirProporciones(get().parametros.proporcionPlan, plan, leido.valor)
    set({ parametros: { ...get().parametros, proporcionPlan } })
    get().reiniciar(
      `Cambiaste la proporción del plan ${plan}, así que la simulación volvió a empezar con la misma semilla.`,
    )
    return true
  },

  /** Otra semilla es otra tarde simulada: también reinicia. Devuelve `true` si se aplicó. */
  cambiarSemilla: (semilla) => {
    if (get().modo === MODO_VISITA || get().corridaLarga) {
      return false
    }
    const leido = validarParametro('semilla', semilla)
    if (!leido.valido) {
      return false
    }
    set({ semilla: leido.valor })
    get().reiniciar('Cambiaste la semilla, así que la simulación volvió a empezar con otro azar.')
    return true
  },

  /**
   * La velocidad se puede cambiar en marcha: no reinicia nada. Un valor fuera de
   * 0,25 a 120 min/s no se aplica y la velocidad queda como estaba (no se recorta
   * al extremo). Devuelve `true` si se aplicó.
   */
  cambiarVelocidad: (velocidadMinPorSegundo) => {
    const leido = validarParametro('velocidad', velocidadMinPorSegundo)
    if (!leido.valido) {
      return false
    }
    set({ velocidadMinPorSegundo: leido.valor })
    return true
  },

  /** El tiempo medio de acabado que está usando el modo "M/M/s" ahora. */
  acabadoPromedioMin: () => acabadoPromedioDe(get().parametros),
}))
