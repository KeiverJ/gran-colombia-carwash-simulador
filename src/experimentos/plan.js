/**
 * El plan de un lote de experimentos: qué se pidió, si se puede correr y qué
 * trabajos hay que hacer.
 *
 * Una «solicitud» es un objeto sencillo (cabe en un `postMessage`):
 *
 *   {
 *     modo,            // MODO_REPLICAS | MODO_BARRIDO | MODO_ESCENARIOS | MODO_LOTES
 *     parametros,      // λ, lavadoMin, acabadoPlanMin, proporcionPlan, placas, puestos, modoAcabado
 *     semillaBase,     // la réplica i usa semillaBase + i
 *     horas,           // horas de cada corrida (100, 1000 o 5000)
 *     calentamientoPct,// 0 a 50: parte de las horas que no cuenta para las métricas
 *     replicas,        // réplicas por corrida, valor o escenario (5 a 100)
 *     lotes,           // solo en MODO_LOTES: k lotes de igual duración (10 a 50)
 *     barrido,         // solo en MODO_BARRIDO: { parametro, inicio, fin, paso }
 *     mediaAcumulada,  // añade una corrida de observación sin calentamiento
 *   }
 *
 * JavaScript puro: lo usan el trabajador, la interfaz y las pruebas.
 */

import { ESCENARIOS } from '../data/escenarios.js'
import { HORAS_DE_LA_CORRIDA_LARGA_POSIBLES, RANGOS, validarParametro } from '../store/rangos.js'

export const MODO_REPLICAS = 'replicas'
export const MODO_BARRIDO = 'barrido'
export const MODO_ESCENARIOS = 'escenarios'
export const MODO_LOTES = 'lotes'
export const MODOS = [MODO_REPLICAS, MODO_BARRIDO, MODO_ESCENARIOS, MODO_LOTES]
/** Cómo se llama cada modo en pantalla y en los archivos. */
export const NOMBRE_DEL_MODO = {
  [MODO_REPLICAS]: 'Réplicas',
  [MODO_BARRIDO]: 'Barrido',
  [MODO_ESCENARIOS]: 'Comparar escenarios',
  [MODO_LOTES]: 'Medias por lotes',
}

export const REPLICAS_MINIMAS = 5
export const REPLICAS_MAXIMAS = 100
export const LOTES_MINIMOS = 10
export const LOTES_MAXIMOS = 50
export const VALORES_MAXIMOS_DEL_BARRIDO = 30
export const HORAS_POSIBLES = HORAS_DE_LA_CORRIDA_LARGA_POSIBLES
export const CALENTAMIENTO_POR_DEFECTO_PCT = 10
export const CALENTAMIENTO_MINIMO_PCT = 0
export const CALENTAMIENTO_MAXIMO_PCT = 50
/** Horas simuladas, en total, que puede pedir un lote. */
export const TOPE_DE_HORAS = 200000

/** Los parámetros que se pueden barrer, con su nombre en pantalla y su unidad. */
export const PARAMETROS_DEL_BARRIDO = {
  llegadasPorHora: { texto: 'λ (llegadas)', unidad: 'motos/h', entero: false },
  placas: { texto: 'Placas de lavado', unidad: 'placas', entero: true },
  puestos: { texto: 'Puestos de acabado', unidad: 'puestos', entero: true },
  lavadoMin: { texto: 'Tiempo de lavado', unidad: 'min', entero: false },
  acabadoMin: { texto: 'Tiempo de acabado (promedio)', unidad: 'min', entero: false },
}

const PLANES = [1, 2, 3]

const enNumero = (valor) => String(Number(valor.toFixed(6))).replace('.', ',')
const enMiles = (valor) => valor.toLocaleString('es-CO')

/** E[S₂]: el acabado promedio con las proporciones y los tiempos de los parámetros. */
export function acabadoPromedioDeLosParametros({ acabadoPlanMin, proporcionPlan }) {
  return PLANES.reduce((total, plan) => total + proporcionPlan[plan] * acabadoPlanMin[plan], 0)
}

/** Cuántos decimales escribe un número (hasta 10). */
function decimalesDe(numero) {
  const texto = String(numero)
  return texto.includes('.') ? Math.min(10, texto.split('.')[1].length) : 0
}

/** Cuántos valores da un barrido, sin recortar al máximo (el error de coma flotante no quita el último). */
function cuantosValores({ inicio, fin, paso }) {
  return Math.floor(((fin - inicio) / paso) * (1 + 1e-12) + 1e-9) + 1
}

/**
 * Los valores de un barrido: inicio, inicio + paso, … sin pasar de fin, escritos
 * con los decimales del inicio y del paso (que 0,1 + 0,2 no dé 0,30000000000000004).
 * Devuelve `null` si inicio, fin o paso no sirven. Nunca da más de
 * `VALORES_MAXIMOS_DEL_BARRIDO + 1` valores.
 */
export function valoresDelBarrido({ inicio, fin, paso }) {
  if (![inicio, fin, paso].every((v) => typeof v === 'number' && Number.isFinite(v))) return null
  if (paso <= 0 || fin < inicio) return null
  const decimales = Math.max(decimalesDe(inicio), decimalesDe(paso))
  const cantidad = Math.min(cuantosValores({ inicio, fin, paso }), VALORES_MAXIMOS_DEL_BARRIDO + 1)
  const valores = []
  for (let k = 0; k < cantidad; k += 1) {
    valores.push(Number((inicio + k * paso).toFixed(decimales)))
  }
  return valores
}

/**
 * Los parámetros del lavadero con un parámetro cambiado al valor del barrido.
 * El tiempo de acabado cambia el promedio E[S₂] y reparte el cambio entre los
 * planes en la misma proporción (cada plan se multiplica por v / E[S₂]).
 */
export function parametrosConElValor(parametros, nombre, valor) {
  if (nombre !== 'acabadoMin') return { ...parametros, [nombre]: valor }
  const actual = acabadoPromedioDeLosParametros(parametros)
  const factor = valor / actual
  const acabadoPlanMin = {}
  for (const plan of PLANES) acabadoPlanMin[plan] = parametros.acabadoPlanMin[plan] * factor
  return { ...parametros, acabadoPlanMin }
}

/** Comprueba un valor del barrido contra los rangos de Ajustes; devuelve un mensaje o `null`. */
function mensajeDelValorDelBarrido(parametros, nombre, valor) {
  const info = PARAMETROS_DEL_BARRIDO[nombre]
  if (nombre === 'acabadoMin') {
    const cambiados = parametrosConElValor(parametros, nombre, valor)
    for (const plan of PLANES) {
      if (parametros.proporcionPlan[plan] > 0 && !validarParametro('acabadoPlanMin', cambiados.acabadoPlanMin[plan]).valido) {
        const { minimo, maximo } = RANGOS.acabado
        return `Con un acabado promedio de ${enNumero(valor)} min, el plan ${plan} quedaría en ${enNumero(cambiados.acabadoPlanMin[plan])} min y los tiempos de acabado van de ${enNumero(minimo)} a ${enNumero(maximo)} min.`
      }
    }
    return null
  }
  const claveDeRango = nombre === 'lavadoMin' ? 'lavado' : nombre === 'llegadasPorHora' ? 'llegadas' : nombre
  if (!validarParametro(nombre, valor).valido) {
    const { minimo, maximo } = RANGOS[claveDeRango]
    return `${info.texto}: el valor ${enNumero(valor)} está fuera del rango. Va de ${enNumero(minimo)} a ${enNumero(maximo)} ${info.unidad}.`
  }
  return null
}

const NO_SIRVE = (mensaje) => ({ valida: false, mensaje })

/**
 * Los trabajos de una solicitud, en el orden en que se corren. Un trabajo es una
 * corrida: lleva sus parámetros, su semilla y sus horas, y su resultado no
 * depende de ningún otro.
 *
 * @returns {Array<{ id: string, tipo: 'replica' | 'lotes' | 'observacion',
 *                   clave: string | number | null, indice: number, semilla: number,
 *                   parametros: object, horas: number, calentamientoHoras: number,
 *                   lotes?: number }>}
 */
export function trabajosDe(solicitud) {
  const { modo, parametros, semillaBase, horas, calentamientoPct, replicas, lotes } = solicitud
  const calentamientoHoras = (horas * calentamientoPct) / 100
  const semillaDe = (i) => (semillaBase + i) % 4294967296
  const trabajos = []

  const replicasDe = (clave, parametrosDelGrupo) => {
    for (let i = 0; i < replicas; i += 1) {
      trabajos.push({
        id: `${clave}#${i}`,
        tipo: 'replica',
        clave,
        indice: i,
        semilla: semillaDe(i),
        parametros: parametrosDelGrupo,
        horas,
        calentamientoHoras,
      })
    }
  }

  if (modo === MODO_REPLICAS) {
    replicasDe('replicas', parametros)
  } else if (modo === MODO_BARRIDO) {
    const { parametro, inicio, fin, paso } = solicitud.barrido
    for (const valor of valoresDelBarrido({ inicio, fin, paso })) {
      replicasDe(valor, parametrosConElValor(parametros, parametro, valor))
    }
  } else if (modo === MODO_ESCENARIOS) {
    for (const escenario of ESCENARIOS) {
      replicasDe(escenario.id, { ...parametros, placas: escenario.placas, puestos: escenario.puestos })
    }
  } else if (modo === MODO_LOTES) {
    trabajos.push({
      id: 'lotes',
      tipo: 'lotes',
      clave: null,
      indice: 0,
      semilla: semillaDe(0),
      parametros,
      horas,
      calentamientoHoras,
      lotes,
    })
  }

  if (solicitud.mediaAcumulada && (modo === MODO_REPLICAS || modo === MODO_LOTES)) {
    trabajos.push({
      id: 'observacion',
      tipo: 'observacion',
      clave: null,
      indice: 0,
      semilla: semillaDe(0),
      parametros,
      horas,
      calentamientoHoras: 0,
    })
  }
  return trabajos
}

/**
 * Las horas simuladas que pide una solicitud, contando la corrida de observación.
 * No exige que la solicitud sea válida del todo, pero sí que se pueda contar.
 */
export function horasTotales(solicitud) {
  const { modo, horas, replicas } = solicitud
  if (!Number.isFinite(horas)) return 0
  let corridas = 0
  if (modo === MODO_REPLICAS) corridas = replicas
  else if (modo === MODO_LOTES) corridas = 1
  else if (modo === MODO_ESCENARIOS) corridas = ESCENARIOS.length * replicas
  else if (modo === MODO_BARRIDO) {
    const { inicio, fin, paso } = solicitud.barrido ?? {}
    const hay = [inicio, fin, paso].every((v) => Number.isFinite(v)) && paso > 0 && fin >= inicio
    corridas = hay ? cuantosValores({ inicio, fin, paso }) * replicas : 0
  }
  const observacion = solicitud.mediaAcumulada && (modo === MODO_REPLICAS || modo === MODO_LOTES) ? 1 : 0
  return (Number.isFinite(corridas) ? corridas : 0) * horas + observacion * horas
}

function validarLosParametros(parametros) {
  if (!parametros || typeof parametros !== 'object') return 'Faltan los parámetros del lavadero.'
  const pruebas = [
    ['llegadasPorHora', parametros.llegadasPorHora, 'λ'],
    ['lavadoMin', parametros.lavadoMin, 'El tiempo de lavado'],
    ['placas', parametros.placas, 'Las placas'],
    ['puestos', parametros.puestos, 'Los puestos'],
  ]
  for (const [nombre, valor, rotulo] of pruebas) {
    if (!validarParametro(nombre, valor).valido) return `${rotulo} no tiene un valor válido (${String(valor)}).`
  }
  for (const plan of PLANES) {
    if (!validarParametro('acabadoPlanMin', parametros.acabadoPlanMin?.[plan]).valido) {
      return `El tiempo de acabado del plan ${plan} no tiene un valor válido.`
    }
  }
  return null
}

/**
 * Valida una solicitud antes de correrla. Los mensajes están en español sencillo
 * y dicen qué cambiar. El lote no debe arrancar si `valida` es `false`.
 *
 * @returns {{ valida: true, horasTotales: number, trabajos: number }
 *   | { valida: false, mensaje: string }}
 */
export function validarSolicitud(solicitud) {
  if (!solicitud || !MODOS.includes(solicitud.modo)) return NO_SIRVE('Elige un modo de experimento.')
  const { modo, horas, calentamientoPct, replicas, lotes } = solicitud

  const mensajeDeParametros = validarLosParametros(solicitud.parametros)
  if (mensajeDeParametros) return NO_SIRVE(mensajeDeParametros)

  if (!validarParametro('semilla', solicitud.semillaBase).valido) {
    return NO_SIRVE(`La semilla base debe ser un entero de ${RANGOS.semilla.minimo} a ${enMiles(RANGOS.semilla.maximo)}.`)
  }
  if (!HORAS_POSIBLES.includes(horas)) {
    return NO_SIRVE(`Las horas por corrida son ${HORAS_POSIBLES.map(enMiles).join(', ')}.`)
  }
  if (
    typeof calentamientoPct !== 'number' ||
    !Number.isFinite(calentamientoPct) ||
    calentamientoPct < CALENTAMIENTO_MINIMO_PCT ||
    calentamientoPct > CALENTAMIENTO_MAXIMO_PCT
  ) {
    return NO_SIRVE(`El calentamiento va de ${CALENTAMIENTO_MINIMO_PCT} a ${CALENTAMIENTO_MAXIMO_PCT} %.`)
  }

  if (modo === MODO_LOTES) {
    if (!Number.isInteger(lotes) || lotes < LOTES_MINIMOS || lotes > LOTES_MAXIMOS) {
      return NO_SIRVE(`Los lotes son de ${LOTES_MINIMOS} a ${LOTES_MAXIMOS}.`)
    }
  } else if (!Number.isInteger(replicas) || replicas < REPLICAS_MINIMAS || replicas > REPLICAS_MAXIMAS) {
    return NO_SIRVE(`Las réplicas son de ${REPLICAS_MINIMAS} a ${REPLICAS_MAXIMAS}.`)
  }

  if (modo === MODO_BARRIDO) {
    const barrido = solicitud.barrido
    const info = PARAMETROS_DEL_BARRIDO[barrido?.parametro]
    if (!info) return NO_SIRVE('Elige el parámetro que se va a barrer.')
    const { inicio, fin, paso } = barrido
    if (![inicio, fin, paso].every((v) => typeof v === 'number' && Number.isFinite(v))) {
      return NO_SIRVE('Escribe el valor inicial, el final y el paso del barrido.')
    }
    if (paso <= 0) return NO_SIRVE('El paso del barrido debe ser mayor que 0.')
    if (fin < inicio) return NO_SIRVE('El valor final del barrido no puede ser menor que el inicial.')
    if (info.entero && (!Number.isInteger(inicio) || !Number.isInteger(paso))) {
      return NO_SIRVE(`${info.texto}: el inicio y el paso deben ser números enteros.`)
    }
    const cantidad = cuantosValores({ inicio, fin, paso })
    if (cantidad > VALORES_MAXIMOS_DEL_BARRIDO) {
      return NO_SIRVE(
        `Ese barrido tiene ${enMiles(cantidad)} valores y el máximo es ${VALORES_MAXIMOS_DEL_BARRIDO}. Sube el paso o acorta el rango.`,
      )
    }
    for (const valor of valoresDelBarrido({ inicio, fin, paso })) {
      const mensaje = mensajeDelValorDelBarrido(solicitud.parametros, barrido.parametro, valor)
      if (mensaje) return NO_SIRVE(mensaje)
    }
  }

  const total = horasTotales(solicitud)
  if (total > TOPE_DE_HORAS) {
    return NO_SIRVE(
      `Piden ${enMiles(total)} horas simuladas en total y el tope es ${enMiles(TOPE_DE_HORAS)}. Baja las réplicas, los valores o las horas por corrida.`,
    )
  }
  return { valida: true, horasTotales: total, trabajos: trabajosDe(solicitud).length }
}
