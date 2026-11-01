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
 * Servidores fuera de servicio: cada placa y cada puesto se puede cerrar y
 * reabrir en medio de la simulación (`cerrarServidor`, `abrirServidor`). Un
 * servidor está activo, cerrándose o cerrado. Cerrar uno libre lo deja cerrado
 * al instante; cerrar uno ocupado lo deja cerrándose y la moto termina su
 * servicio, tras lo cual queda cerrado sin atender a la siguiente. Un servidor
 * que no está activo no recibe motos, y la asignación sigue siendo al primer
 * servidor libre y activo en orden. Cada etapa conserva siempre al menos un
 * servidor activo: el motor rechaza cerrar el último (uno que se está cerrando
 * no cuenta como activo).
 *
 * Con cierres, ρ de una etapa es el tiempo ocupado de todos sus servidores entre
 * el tiempo que todos ellos estuvieron en servicio (activos o cerrándose, no
 * cerrados), y lo mismo por servidor. Sin cierres es el ocupado promedio entre el
 * número de servidores, de siempre, y se calcula con la misma cuenta que antes:
 * con la misma semilla los resultados son idénticos. L, Lq, W y Wq no cambian.
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

/**
 * Estados de un servidor (una placa o un puesto): activo, cerrándose (ocupado,
 * no recibirá más motos y quedará cerrado al terminar la que atiende) o cerrado
 * (fuera de servicio, vacío).
 */
export const SERVIDOR_ACTIVO = 'activo'
export const SERVIDOR_CERRANDOSE = 'cerrandose'
export const SERVIDOR_CERRADO = 'cerrado'

/** Las dos etapas, con el nombre que llevan en las métricas. */
export const ETAPA_LAVADO = 'lavado'
export const ETAPA_ACABADO = 'acabado'

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

/** Cuántas posiciones se dejan atrás en una fila antes de plantearse limpiarlas. */
const POSICIONES_ATRAS_ANTES_DE_LIMPIAR = 1024

/**
 * Una fila FIFO cuyo costo por moto no crece con su largo.
 *
 * Sacar la primera moto de un arreglo con `shift()` mueve todas las demás, y con
 * la fila del acabado saturada eso llega a ser lo que más tarda de toda la
 * corrida. Aquí sacar solo avanza un índice de cabeza; las posiciones que quedan
 * atrás se limpian de golpe cuando son la mitad del arreglo, así que el costo
 * por moto es constante en promedio. No toca el orden ni el azar.
 */
function crearFila() {
  let elementos = []
  let cabeza = 0

  return {
    get largo() {
      return elementos.length - cabeza
    },

    /** Pone una moto al final de la fila. */
    meter(moto) {
      elementos.push(moto)
    },

    /** Saca la moto de la cabeza (la que más lleva esperando). */
    sacar() {
      const moto = elementos[cabeza]
      elementos[cabeza] = undefined
      cabeza += 1
      if (cabeza === elementos.length) {
        elementos = []
        cabeza = 0
      } else if (cabeza >= POSICIONES_ATRAS_ANTES_DE_LIMPIAR && cabeza * 2 >= elementos.length) {
        elementos = elementos.slice(cabeza)
        cabeza = 0
      }
      return moto
    },

    /** Las motos de la fila, de la cabeza hacia atrás; con `maximo`, solo las primeras. */
    desdeLaCabeza(maximo = Infinity) {
      return elementos.slice(cabeza, Number.isFinite(maximo) ? cabeza + maximo : undefined)
    },
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
  const colaLavado = crearFila()
  const colaAcabado = crearFila()
  // Cada servidor empieza activo. Los cierres y las aperturas los mueven.
  const estadoDePlaca = new Array(placas).fill(SERVIDOR_ACTIVO)
  const estadoDePuesto = new Array(puestos).fill(SERVIDOR_ACTIVO)
  // Cuántos cierres se han aplicado en cada etapa. Mientras sea 0, las métricas
  // usan exactamente las mismas cuentas que antes de que existieran los cierres.
  const cierresAplicados = { [ETAPA_LAVADO]: 0, [ETAPA_ACABADO]: 0 }

  const lavado = crearAcumulador()
  const acabado = crearAcumulador()
  // Minutos que estuvo ocupada cada placa y cada puesto, con el mismo recorte
  // del calentamiento que las áreas de la etapa.
  const areaOcupadaPorPlaca = new Array(placas).fill(0)
  const areaOcupadaPorPuesto = new Array(puestos).fill(0)
  // Minutos que estuvo cerrada cada placa y cada puesto (con el mismo recorte).
  // El tiempo en servicio de un servidor es el observado menos este.
  const areaCerradaPorPlaca = new Array(placas).fill(0)
  const areaCerradaPorPuesto = new Array(puestos).fill(0)
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
   * Mete en servidores libres y activos a las motos que esperan, de la cabeza de
   * la fila hacia atrás y ocupando el servidor libre y activo de número menor.
   *
   * Todo el reparto pasa por aquí para que no se pueda colar nadie: una moto
   * que llega se pone al final de su fila y solo entra a un servidor si no hay
   * nadie esperando delante.
   */
  function despachar(etapa) {
    const servidores = etapa === 1 ? enLavado : enAcabado
    const fines = etapa === 1 ? finLavado : finAcabado
    const estados = etapa === 1 ? estadoDePlaca : estadoDePuesto
    const cola = etapa === 1 ? colaLavado : colaAcabado

    for (let i = 0; i < servidores.length && cola.largo > 0; i += 1) {
      if (servidores[i] === null && estados[i] === SERVIDOR_ACTIVO) {
        const moto = cola.sacar()
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
    cola.meter(moto)
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

    lavado.areaEnCola += colaLavado.largo * dt
    lavado.areaOcupados += ocupadasLavado * dt
    lavado.areaEnEtapa += (colaLavado.largo + ocupadasLavado) * dt

    acabado.areaEnCola += colaAcabado.largo * dt
    acabado.areaOcupados += ocupadosAcabado * dt
    acabado.areaEnEtapa += (colaAcabado.largo + ocupadosAcabado) * dt

    for (let i = 0; i < enLavado.length; i += 1) {
      if (enLavado[i] !== null) {
        areaOcupadaPorPlaca[i] += dt
      }
      if (estadoDePlaca[i] === SERVIDOR_CERRADO) {
        areaCerradaPorPlaca[i] += dt
      }
    }
    for (let i = 0; i < enAcabado.length; i += 1) {
      if (enAcabado[i] !== null) {
        areaOcupadaPorPuesto[i] += dt
      }
      if (estadoDePuesto[i] === SERVIDOR_CERRADO) {
        areaCerradaPorPuesto[i] += dt
      }
    }

    total.areaEnSistema +=
      (colaLavado.largo + ocupadasLavado + colaAcabado.largo + ocupadosAcabado) * dt
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
    if (estadoDePlaca[indice] === SERVIDOR_CERRANDOSE) {
      estadoDePlaca[indice] = SERVIDOR_CERRADO
    }

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
    if (estadoDePuesto[indice] === SERVIDOR_CERRANDOSE) {
      estadoDePuesto[indice] = SERVIDOR_CERRADO
    }
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
      colaLavado.meter(motoPrecargada())
    }
    despachar(1)
    for (let i = 0; i < puestosAcabadoOcupados; i += 1) {
      colaAcabado.meter(motoPrecargada())
    }
    despachar(2)
    // Las motos que el dato observado pone esperando se quedan en la fila: la
    // foto del instante 0 muestra el lavadero tal como se vio. En cuanto el
    // reloj avanza, el despacho las manda a los servidores libres, así que son
    // las primeras en entrar y nadie se les cuela.
    for (let i = 0; i < motosEnCola1; i += 1) {
      colaLavado.meter(motoPrecargada())
    }
    for (let i = 0; i < motosEnCola2; i += 1) {
      colaAcabado.meter(motoPrecargada())
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

  const metricasDeEtapa = (acumulador, rho, cola, enServidor) => ({
    rho,
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

  /** Minutos observados hasta ahora (0 si todavía no pasó el calentamiento). */
  const duracionObservadaMin = () => Math.max(0, reloj - calentamientoMin)

  /**
   * Cuánto lleva cerrado un servidor en el tiempo observado: lo acumulado en los
   * eventos más el tramo final si ahora está cerrado.
   */
  const cerradoHastaAhora = (areaCerrada, estado) =>
    areaCerrada + (estado === SERVIDOR_CERRADO ? tramoPendienteMin() : 0)

  /**
   * Qué parte de su tiempo en servicio estuvo ocupado cada servidor (de 0 a 1).
   * El tiempo en servicio es el observado menos el que estuvo cerrado; un
   * servidor que estuvo cerrado todo el periodo vale 0. Mientras en la etapa no
   * se haya cerrado nada, es exactamente la cuenta de siempre.
   */
  const ocupacionPorServidor = (etapa, areas, servidores, areasCerradas, estados) =>
    areas.map((area, i) => {
      if (cierresAplicados[etapa] === 0) {
        return promedioEnTiempo(area, servidores[i] !== null ? 1 : 0)
      }
      const ocupado = area + (servidores[i] !== null ? tramoPendienteMin() : 0)
      const enServicio = duracionObservadaMin() - cerradoHastaAhora(areasCerradas[i], estados[i])
      return enServicio > 0 ? ocupado / enServicio : 0
    })

  /**
   * ρ de una etapa: el tiempo ocupado de todos sus servidores entre el tiempo
   * que todos ellos estuvieron en servicio. Sin cierres coincide con el ocupado
   * promedio entre el número de servidores, y se calcula con esa misma cuenta.
   */
  const rhoDeLaEtapa = (etapa, acumulador, servidores, enServidor, areasCerradas, estados) => {
    if (cierresAplicados[etapa] === 0) {
      return promedioEnTiempo(acumulador.areaOcupados, enServidor) / servidores
    }
    const duracion = duracionObservadaMin()
    if (duracion <= 0) {
      return 0
    }
    const ocupado = acumulador.areaOcupados + tramoPendienteMin() * enServidor
    let cerrado = 0
    for (let i = 0; i < areasCerradas.length; i += 1) {
      cerrado += cerradoHastaAhora(areasCerradas[i], estados[i])
    }
    const enServicio = servidores * duracion - cerrado
    return enServicio > 0 ? ocupado / enServicio : 0
  }

  /** Los servidores, el estado y el cierre acumulado de una etapa, por su nombre. */
  const etapaPorNombre = (etapa) => {
    if (etapa === ETAPA_LAVADO) {
      return { servidores: enLavado, estados: estadoDePlaca, numero: 1, nombre: 'placa' }
    }
    if (etapa === ETAPA_ACABADO) {
      return { servidores: enAcabado, estados: estadoDePuesto, numero: 2, nombre: 'puesto' }
    }
    throw new RangeError(
      `La etapa debe ser "${ETAPA_LAVADO}" o "${ETAPA_ACABADO}"; se recibió ${etapa}.`,
    )
  }

  /** Comprueba que `numero` (de 1 en adelante, como en la foto) existe en la etapa. */
  function indiceDelServidor(etapa, numero) {
    const { servidores, nombre } = etapaPorNombre(etapa)
    if (!Number.isInteger(numero) || numero < 1 || numero > servidores.length) {
      throw new RangeError(
        `El número de ${nombre} debe ser un entero entre 1 y ${servidores.length}; se recibió ${numero}.`,
      )
    }
    return numero - 1
  }

  /**
   * Antes de cambiar el estado de un servidor entre dos sucesos, las áreas se
   * acumulan hasta el reloj con el estado de antes: así cada tramo se mide con
   * el estado que de verdad tuvo.
   */
  function acumularHastaAhora() {
    acumular(instanteAcumulado, reloj)
    instanteAcumulado = reloj
  }

  /**
   * Cierra la placa o el puesto `numero`. Libre: queda cerrado ya. Ocupado: queda
   * cerrándose y se cierra cuando termina su moto. No se puede cerrar el último
   * servidor activo de una etapa.
   *
   * @returns {{ aplicado: boolean, motivo?: 'ya-cerrado' | 'ya-cerrandose' | 'ultimo-activo' }}
   */
  function cerrarServidor(etapa, numero) {
    const i = indiceDelServidor(etapa, numero)
    const { servidores, estados } = etapaPorNombre(etapa)
    if (estados[i] === SERVIDOR_CERRADO) {
      return { aplicado: false, motivo: 'ya-cerrado' }
    }
    if (estados[i] === SERVIDOR_CERRANDOSE) {
      return { aplicado: false, motivo: 'ya-cerrandose' }
    }
    if (estados.filter((estado) => estado === SERVIDOR_ACTIVO).length === 1) {
      return { aplicado: false, motivo: 'ultimo-activo' }
    }
    acumularHastaAhora()
    estados[i] = servidores[i] === null ? SERVIDOR_CERRADO : SERVIDOR_CERRANDOSE
    cierresAplicados[etapa] += 1
    return { aplicado: true }
  }

  /**
   * Abre la placa o el puesto `numero`. Si estaba cerrado, vuelve a recibir motos
   * y, si hay una esperando, entra ya; si se estaba cerrando, se cancela el cierre
   * y sigue con su moto.
   *
   * @returns {{ aplicado: boolean, motivo?: 'ya-activo' }}
   */
  function abrirServidor(etapa, numero) {
    const i = indiceDelServidor(etapa, numero)
    const { estados, numero: etapaNumero } = etapaPorNombre(etapa)
    if (estados[i] === SERVIDOR_ACTIVO) {
      return { aplicado: false, motivo: 'ya-activo' }
    }
    acumularHastaAhora()
    const estabaCerrado = estados[i] === SERVIDOR_CERRADO
    estados[i] = SERVIDOR_ACTIVO
    if (estabaCerrado) {
      despachar(etapaNumero)
    }
    return { aplicado: true }
  }

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

    /**
     * Foto del estado actual del lavadero.
     *
     * Cada placa y cada puesto trae su `estado` (activo, cerrándose o cerrado).
     * `largoColaLavado` y `largoColaAcabado` dicen cuántas motos esperan. Con
     * `maxEnFila`, las filas traen solo las primeras motos de la cabeza: con una
     * etapa saturada la fila llega a cientos de miles, y copiarla entera en cada
     * foto es lo que más cuesta.
     *
     * @param {{ maxEnFila?: number }} [opciones]
     */
    estado({ maxEnFila = Infinity } = {}) {
      return {
        relojMin: reloj,
        placas: enLavado.map((moto, i) => ({
          numero: i + 1,
          moto: fotoDeMoto(moto),
          libre: moto === null,
          estado: estadoDePlaca[i],
        })),
        puestos: enAcabado.map((moto, i) => ({
          numero: i + 1,
          moto: fotoDeMoto(moto),
          libre: moto === null,
          estado: estadoDePuesto[i],
        })),
        colaLavado: colaLavado.desdeLaCabeza(maxEnFila).map(fotoDeMoto),
        colaAcabado: colaAcabado.desdeLaCabeza(maxEnFila).map(fotoDeMoto),
        largoColaLavado: colaLavado.largo,
        largoColaAcabado: colaAcabado.largo,
        motosLlegadas,
        motosSalidas,
      }
    },

    cerrarServidor,
    abrirServidor,

    /** Métricas acumuladas por etapa y para el lavadero completo. */
    metricas() {
      const ocupadasLavado = enLavado.filter((m) => m !== null).length
      const ocupadosAcabado = enAcabado.filter((m) => m !== null).length
      return {
        lavado: {
          ...metricasDeEtapa(
            lavado,
            rhoDeLaEtapa(ETAPA_LAVADO, lavado, placas, ocupadasLavado, areaCerradaPorPlaca, estadoDePlaca),
            colaLavado.largo,
            ocupadasLavado,
          ),
          ocupacionPorServidor: ocupacionPorServidor(
            ETAPA_LAVADO,
            areaOcupadaPorPlaca,
            enLavado,
            areaCerradaPorPlaca,
            estadoDePlaca,
          ),
        },
        acabado: {
          ...metricasDeEtapa(
            acabado,
            rhoDeLaEtapa(ETAPA_ACABADO, acabado, puestos, ocupadosAcabado, areaCerradaPorPuesto, estadoDePuesto),
            colaAcabado.largo,
            ocupadosAcabado,
          ),
          ocupacionPorServidor: ocupacionPorServidor(
            ETAPA_ACABADO,
            areaOcupadaPorPuesto,
            enAcabado,
            areaCerradaPorPuesto,
            estadoDePuesto,
          ),
        },
        total: {
          l: promedioEnTiempo(
            total.areaEnSistema,
            colaLavado.largo + ocupadasLavado + colaAcabado.largo + ocupadosAcabado,
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
        // ¿Se cerró alguna vez un servidor en esta corrida? Lo simulado cubre
        // entonces periodos con distinto número de servidores activos.
        huboCierres: cierresAplicados[ETAPA_LAVADO] + cierresAplicados[ETAPA_ACABADO] > 0,
      }
    },
  }
}
