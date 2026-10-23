/**
 * Motor de simulación de eventos discretos del lavadero.
 *
 * Dos etapas en serie, como el local real: primero el lavado (placas) y
 * después el acabado (puestos). Una fila FIFO por etapa, asignación al primer
 * servidor libre en orden, sin bloqueo entre etapas y sin abandonos.
 *
 * El reloj va en minutos y avanza de evento en evento: la próxima llegada o el
 * primer fin de servicio. `avanzar(minutos)` y `correrHoras(horas)` usan el
 * mismo bucle con distinto límite, así que animar y correr de golpe dan lo
 * mismo.
 *
 * JavaScript puro: no importa React, ni Three.js, ni toca el DOM.
 */

import {
  ACABADO_PLAN_MIN,
  ACABADO_PROMEDIO_MIN,
  LAVADO_MIN,
  LLEGADAS_POR_HORA,
  PLACAS_LAVADO,
  PROPORCION_PLAN,
  PUESTOS_ACABADO,
} from '../data/parametros.js'
import {
  crearCorrientes,
  crearSorteoDePlan,
  tiempoExponencial,
} from './aleatorio.js'

/** Modos de acabado: por el plan de cada moto, o una sola exponencial. */
export const MODO_POR_PLAN = 'por-plan'
export const MODO_MMS = 'M/M/s'

/**
 * Orden en que se resuelven los sucesos que caen en el mismo instante.
 * Primero las salidas (liberan servidores) y por último las llegadas, así una
 * moto que llega justo cuando otra sale puede ocupar esa plaza en vez de irse
 * a la fila. Entre sucesos de la misma clase decide el servidor de número
 * menor. Con tiempos exponenciales los empates no se dan en la práctica, pero
 * la regla hace que una corrida sea reproducible cuando sí los hay.
 */
const PRIORIDAD_FIN_ACABADO = 0
const PRIORIDAD_FIN_LAVADO = 1
const PRIORIDAD_LLEGADA = 2

/**
 * Crea las tres fuentes de tiempo por defecto a partir de una semilla.
 * El motor no habla con el generador: le pide los tiempos a estas funciones,
 * y quien lo use puede pasar otras (por ejemplo, tiempos ya observados).
 *
 * @param {object} config
 * @returns {{ tiempoEntreLlegadas: () => number, tiempoLavado: (moto: object) => number,
 *             tiempoAcabado: (moto: object) => number }}
 */
export function crearFuentesAleatorias({
  semilla,
  llegadasPorHora,
  lavadoMin,
  acabadoPlanMin,
  acabadoPromedioMin,
  proporcionPlan,
  modoAcabado,
}) {
  const corrientes = crearCorrientes(semilla)
  const sortearPlan = crearSorteoDePlan(proporcionPlan)
  const mediaEntreLlegadasMin = 60 / llegadasPorHora

  return {
    tiempoEntreLlegadas: () =>
      tiempoExponencial(corrientes.llegadas, mediaEntreLlegadasMin),
    planDeLaMoto: () => sortearPlan(corrientes.planes),
    tiempoLavado: () => tiempoExponencial(corrientes.servicios, lavadoMin),
    tiempoAcabado: (moto) =>
      modoAcabado === MODO_MMS
        ? tiempoExponencial(corrientes.servicios, acabadoPromedioMin)
        : tiempoExponencial(corrientes.servicios, acabadoPlanMin[moto.plan]),
  }
}

/** Un acumulador de promedios en el tiempo y por moto, para una etapa. */
function crearAcumulador() {
  return {
    areaEnCola: 0,
    areaOcupados: 0,
    areaEnEtapa: 0,
    sumaEsperaMin: 0,
    sumaEstanciaMin: 0,
    motosContadas: 0,
  }
}

/**
 * Crea un motor de simulación.
 *
 * @param {object} [opciones]
 * @param {number} [opciones.semilla] semilla de las fuentes por defecto
 * @param {number} [opciones.llegadasPorHora] λ
 * @param {number} [opciones.lavadoMin] media del lavado
 * @param {Record<number, number>} [opciones.acabadoPlanMin] media del acabado por plan
 * @param {number} [opciones.acabadoPromedioMin] E[S₂], para el modo M/M/s
 * @param {Record<number, number>} [opciones.proporcionPlan] proporción de cada plan
 * @param {number} [opciones.placas] servidores de la etapa 1
 * @param {number} [opciones.puestos] servidores de la etapa 2
 * @param {string} [opciones.modoAcabado] MODO_POR_PLAN o MODO_MMS
 * @param {number} [opciones.calentamientoHoras] horas que no cuentan para las métricas
 * @param {object} [opciones.estadoInicial] lavadero ya ocupado al empezar
 * @param {object} [opciones.fuentes] fuentes de tiempo propias, en vez de las aleatorias
 */
export function crearSimulador(opciones = {}) {
  const {
    semilla = 1,
    llegadasPorHora = LLEGADAS_POR_HORA,
    lavadoMin = LAVADO_MIN,
    acabadoPlanMin = ACABADO_PLAN_MIN,
    acabadoPromedioMin = ACABADO_PROMEDIO_MIN,
    proporcionPlan = PROPORCION_PLAN,
    placas = PLACAS_LAVADO,
    puestos = PUESTOS_ACABADO,
    modoAcabado = MODO_POR_PLAN,
    calentamientoHoras = 0,
    estadoInicial = null,
    fuentes = null,
  } = opciones

  if (!Number.isFinite(llegadasPorHora) || llegadasPorHora <= 0) {
    throw new RangeError(
      `La tasa de llegadas (λ) debe ser mayor que 0 motos por hora; se recibió ${llegadasPorHora}.`,
    )
  }
  for (const [nombre, valor] of [
    ['placas de lavado', placas],
    ['puestos de acabado', puestos],
  ]) {
    if (!Number.isInteger(valor) || valor < 1) {
      throw new RangeError(
        `El número de ${nombre} debe ser un entero mayor o igual que 1; se recibió ${valor}.`,
      )
    }
  }
  if (modoAcabado !== MODO_POR_PLAN && modoAcabado !== MODO_MMS) {
    throw new RangeError(
      `El modo de acabado debe ser "${MODO_POR_PLAN}" o "${MODO_MMS}"; se recibió ${modoAcabado}.`,
    )
  }
  if (!Number.isFinite(calentamientoHoras) || calentamientoHoras < 0) {
    throw new RangeError(
      `El calentamiento debe ser un número de horas mayor o igual que 0; se recibió ${calentamientoHoras}.`,
    )
  }

  const fuentesEnUso =
    fuentes ??
    crearFuentesAleatorias({
      semilla,
      llegadasPorHora,
      lavadoMin,
      acabadoPlanMin,
      acabadoPromedioMin,
      proporcionPlan,
      modoAcabado,
    })
  // Con fuentes propias el plan puede no venir dado: si falta, todas las motos
  // toman el primer plan con proporción mayor que 0.
  const planDeLaMoto =
    fuentesEnUso.planDeLaMoto ??
    (() => Number(Object.keys(proporcionPlan).find((p) => proporcionPlan[p] > 0)))

  const calentamientoMin = calentamientoHoras * 60

  let reloj = 0
  // Hasta dónde se han acumulado las áreas de las métricas. Solo avanza en los
  // bordes de evento, nunca al cortar un intervalo: así la suma de áreas es la
  // misma se avance de minuto en minuto o de diez horas de golpe.
  let instanteAcumulado = 0
  let numeroDeMoto = 0
  let motosLlegadas = 0
  let motosSalidas = 0

  const libre = () => null
  const enLavado = Array.from({ length: placas }, libre)
  const enAcabado = Array.from({ length: puestos }, libre)
  const finLavado = new Array(placas).fill(Infinity)
  const finAcabado = new Array(puestos).fill(Infinity)
  const colaLavado = []
  const colaAcabado = []

  const lavado = crearAcumulador()
  const acabado = crearAcumulador()
  const total = { sumaEstanciaMin: 0, areaEnSistema: 0, motosContadas: 0 }

  let proximaLlegada = fuentesEnUso.tiempoEntreLlegadas()

  /** Crea una moto nueva, la que llega de la calle. */
  function nuevaMoto(instante) {
    numeroDeMoto += 1
    return {
      n: numeroDeMoto,
      plan: planDeLaMoto(),
      llegadaMin: instante,
      precargada: false,
      entraLavadoMin: null,
      saleLavadoMin: null,
      entraAcabadoMin: null,
    }
  }

  /** Crea una moto que ya estaba en el lavadero cuando empezó la simulación. */
  function motoPrecargada() {
    numeroDeMoto += 1
    return {
      n: numeroDeMoto,
      plan: planDeLaMoto(),
      llegadaMin: null,
      precargada: true,
      entraLavadoMin: null,
      saleLavadoMin: null,
      entraAcabadoMin: null,
    }
  }

  /**
   * Mete en servidores libres a las motos que esperan, de la cabeza de la fila
   * hacia atrás y ocupando el servidor libre de número menor.
   *
   * Todo el reparto pasa por aquí para que no se pueda colar nadie: una moto
   * que llega se pone al final de su fila y solo entra a un servidor si no hay
   * nadie esperando delante.
   */
  function despachar(etapa) {
    const servidores = etapa === 1 ? enLavado : enAcabado
    const fines = etapa === 1 ? finLavado : finAcabado
    const cola = etapa === 1 ? colaLavado : colaAcabado

    for (let i = 0; i < servidores.length && cola.length > 0; i += 1) {
      if (servidores[i] === null) {
        const moto = cola.shift()
        servidores[i] = moto
        fines[i] =
          reloj +
          (etapa === 1
            ? fuentesEnUso.tiempoLavado(moto)
            : fuentesEnUso.tiempoAcabado(moto))
        if (etapa === 1) {
          moto.entraLavadoMin = reloj
        } else {
          moto.entraAcabadoMin = reloj
        }
      }
    }
  }

  /** Pone una moto al final de la fila de su etapa y reparte lo que se pueda. */
  function encolar(moto, etapa) {
    const cola = etapa === 1 ? colaLavado : colaAcabado
    cola.push(moto)
    despachar(etapa)
  }

  /** ¿Cuenta esta moto para los promedios por moto (W y Wq)? */
  const cuentaParaEsperas = (moto) =>
    !moto.precargada && moto.llegadaMin !== null && moto.llegadaMin >= calentamientoMin

  /** Acumula las áreas de las métricas por un tramo de tiempo sin sucesos. */
  function acumular(desde, hasta) {
    const inicio = Math.max(desde, calentamientoMin)
    if (hasta <= inicio) {
      return
    }
    const dt = hasta - inicio
    const ocupadasLavado = enLavado.filter((m) => m !== null).length
    const ocupadosAcabado = enAcabado.filter((m) => m !== null).length

    lavado.areaEnCola += colaLavado.length * dt
    lavado.areaOcupados += ocupadasLavado * dt
    lavado.areaEnEtapa += (colaLavado.length + ocupadasLavado) * dt

    acabado.areaEnCola += colaAcabado.length * dt
    acabado.areaOcupados += ocupadosAcabado * dt
    acabado.areaEnEtapa += (colaAcabado.length + ocupadosAcabado) * dt

    total.areaEnSistema +=
      (colaLavado.length + ocupadasLavado + colaAcabado.length + ocupadosAcabado) * dt
  }

  /** El próximo suceso: su instante, su clase y el servidor al que afecta. */
  function proximoSuceso() {
    let instante = proximaLlegada
    let prioridad = PRIORIDAD_LLEGADA
    let indice = -1

    for (let i = 0; i < finAcabado.length; i += 1) {
      if (finAcabado[i] < instante ||
        (finAcabado[i] === instante && PRIORIDAD_FIN_ACABADO < prioridad)) {
        instante = finAcabado[i]
        prioridad = PRIORIDAD_FIN_ACABADO
        indice = i
      }
    }
    for (let i = 0; i < finLavado.length; i += 1) {
      if (finLavado[i] < instante ||
        (finLavado[i] === instante && PRIORIDAD_FIN_LAVADO < prioridad)) {
        instante = finLavado[i]
        prioridad = PRIORIDAD_FIN_LAVADO
        indice = i
      }
    }
    return { instante, prioridad, indice }
  }

  function procesarLlegada() {
    const moto = nuevaMoto(reloj)
    motosLlegadas += 1
    encolar(moto, 1)
    proximaLlegada = reloj + fuentesEnUso.tiempoEntreLlegadas()
  }

  function procesarFinLavado(indice) {
    const moto = enLavado[indice]
    moto.saleLavadoMin = reloj
    // Sin bloqueo: la placa queda libre de inmediato.
    enLavado[indice] = null
    finLavado[indice] = Infinity

    if (cuentaParaEsperas(moto)) {
      const espera = moto.entraLavadoMin - moto.llegadaMin
      lavado.sumaEsperaMin += espera
      lavado.sumaEstanciaMin += reloj - moto.llegadaMin
      lavado.motosContadas += 1
    }

    encolar(moto, 2)
    despachar(1)
  }

  function procesarFinAcabado(indice) {
    const moto = enAcabado[indice]
    enAcabado[indice] = null
    finAcabado[indice] = Infinity
    motosSalidas += 1

    if (cuentaParaEsperas(moto)) {
      const espera = moto.entraAcabadoMin - moto.saleLavadoMin
      acabado.sumaEsperaMin += espera
      acabado.sumaEstanciaMin += reloj - moto.saleLavadoMin
      acabado.motosContadas += 1

      total.sumaEstanciaMin += reloj - moto.llegadaMin
      total.motosContadas += 1
    }

    despachar(2)
  }

  /** Avanza hasta `limite` (en minutos de reloj), procesando los sucesos. */
  function correrHasta(limite) {
    // Si el lavadero arrancó con motos esperando y servidores libres, entran
    // ahora: en el modelo nadie espera habiendo un servidor libre.
    despachar(1)
    despachar(2)

    while (true) {
      const { instante, prioridad, indice } = proximoSuceso()
      if (instante > limite) {
        // El tramo que queda hasta el límite no se acumula aquí: lo añade
        // `metricas()` al vuelo, para que cortar el intervalo no cambie ni un
        // bit la suma de las áreas.
        reloj = limite
        return
      }
      acumular(instanteAcumulado, instante)
      instanteAcumulado = instante
      reloj = instante
      if (prioridad === PRIORIDAD_FIN_ACABADO) {
        procesarFinAcabado(indice)
      } else if (prioridad === PRIORIDAD_FIN_LAVADO) {
        procesarFinLavado(indice)
      } else {
        procesarLlegada()
      }
    }
  }

  // Estado inicial: el lavadero puede empezar ya ocupado.
  if (estadoInicial) {
    const {
      motosEnCola1 = 0,
      motosEnCola2 = 0,
      placasOcupadas = 0,
      puestosAcabadoOcupados = 0,
    } = estadoInicial

    for (let i = 0; i < placasOcupadas; i += 1) {
      colaLavado.push(motoPrecargada())
    }
    despachar(1)
    for (let i = 0; i < puestosAcabadoOcupados; i += 1) {
      colaAcabado.push(motoPrecargada())
    }
    despachar(2)
    // Las motos que el dato observado pone esperando se quedan en la fila: la
    // foto del instante 0 muestra el lavadero tal como se vio. En cuanto el
    // reloj avanza, el despacho las manda a los servidores libres, así que son
    // las primeras en entrar y nadie se les cuela.
    for (let i = 0; i < motosEnCola1; i += 1) {
      colaLavado.push(motoPrecargada())
    }
    for (let i = 0; i < motosEnCola2; i += 1) {
      colaAcabado.push(motoPrecargada())
    }
  }

  const fotoDeMoto = (moto) =>
    moto === null ? null : { n: moto.n, plan: moto.plan, precargada: moto.precargada }

  /** Minutos del tramo final que todavía no está en los acumuladores. */
  const tramoPendienteMin = () =>
    Math.max(0, reloj - Math.max(instanteAcumulado, calentamientoMin))

  /**
   * Promedio en el tiempo de una magnitud: el área acumulada en los eventos,
   * más el tramo que va del último evento al reloj con el valor actual.
   */
  const promedioEnTiempo = (area, valorActual) => {
    const duracion = reloj - calentamientoMin
    if (duracion <= 0) {
      return 0
    }
    return (area + tramoPendienteMin() * valorActual) / duracion
  }

  const metricasDeEtapa = (acumulador, servidores, cola, enServidor) => ({
    rho: promedioEnTiempo(acumulador.areaOcupados, enServidor) / servidores,
    l: promedioEnTiempo(acumulador.areaEnEtapa, cola + enServidor),
    lq: promedioEnTiempo(acumulador.areaEnCola, cola),
    wMin: acumulador.motosContadas
      ? acumulador.sumaEstanciaMin / acumulador.motosContadas
      : 0,
    wqMin: acumulador.motosContadas
      ? acumulador.sumaEsperaMin / acumulador.motosContadas
      : 0,
    motosContadas: acumulador.motosContadas,
  })

  return {
    /** Avanza un intervalo de tiempo simulado, en minutos (para animar). */
    avanzar(minutos) {
      if (!Number.isFinite(minutos) || minutos < 0) {
        throw new RangeError(
          `El intervalo debe ser un número de minutos mayor o igual que 0; se recibió ${minutos}.`,
        )
      }
      correrHasta(reloj + minutos)
    },

    /** Corre N horas de golpe. */
    correrHoras(horas) {
      if (!Number.isFinite(horas) || horas < 0) {
        throw new RangeError(
          `Las horas deben ser un número mayor o igual que 0; se recibió ${horas}.`,
        )
      }
      correrHasta(reloj + horas * 60)
    },

    /** Foto del estado actual del lavadero. */
    estado() {
      return {
        relojMin: reloj,
        placas: enLavado.map((moto, i) => ({
          numero: i + 1,
          moto: fotoDeMoto(moto),
          libre: moto === null,
        })),
        puestos: enAcabado.map((moto, i) => ({
          numero: i + 1,
          moto: fotoDeMoto(moto),
          libre: moto === null,
        })),
        colaLavado: colaLavado.map(fotoDeMoto),
        colaAcabado: colaAcabado.map(fotoDeMoto),
        motosLlegadas,
        motosSalidas,
      }
    },

    /** Métricas acumuladas por etapa y para el lavadero completo. */
    metricas() {
      const ocupadasLavado = enLavado.filter((m) => m !== null).length
      const ocupadosAcabado = enAcabado.filter((m) => m !== null).length
      return {
        lavado: metricasDeEtapa(lavado, placas, colaLavado.length, ocupadasLavado),
        acabado: metricasDeEtapa(acabado, puestos, colaAcabado.length, ocupadosAcabado),
        total: {
          l: promedioEnTiempo(
            total.areaEnSistema,
            colaLavado.length + ocupadasLavado + colaAcabado.length + ocupadosAcabado,
          ),
          wMin: total.motosContadas
            ? total.sumaEstanciaMin / total.motosContadas
            : 0,
          motosContadas: total.motosContadas,
        },
        tiempoObservadoMin: Math.max(0, reloj - calentamientoMin),
      }
    },

    /** Para inspeccionar la configuración desde fuera (y desde las pruebas). */
    configuracion() {
      return {
        placas,
        puestos,
        modoAcabado,
        calentamientoHoras,
        llegadasPorHora,
        usaFuentesPropias: fuentes !== null,
      }
    },
  }
}
