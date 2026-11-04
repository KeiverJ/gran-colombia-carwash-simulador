/**
 * Lo que se muestra de los experimentos, sin pantalla: textos, modelos de las
 * tablas y de las dos gráficas (con su descripción y su tabla equivalente). Salen
 * de los resultados del lote y de las fórmulas, así que dicen exactamente los
 * mismos números que los componentes. Está aparte para poder probarlo con Node.
 */

import { comoNumero } from '../components/formato.js'
import { puntosDeLaMedia } from '../experimentos/observacion.js'
import { PARAMETROS_DEL_BARRIDO } from '../experimentos/plan.js'
import {
  formulasDe,
  inestabilidadDelBarrido,
  METRICAS_DE_LA_ETAPA,
  METRICAS_DEL_TOTAL,
} from '../experimentos/resumen.js'
import { repartir } from './descripcionesDeLasGraficas.js'

/* --------------------------------------------------------------------- textos -- */

/** Por qué el ícono de Experimentos está apagado en la visita. */
export const MOTIVO_SIN_EXPERIMENTOS = 'no está disponible en la visita del 17 de octubre'

/** Qué es un intervalo de confianza, en pocas líneas. Es el mismo texto del módulo y de la Ayuda. */
export const TEXTO_DEL_INTERVALO = [
  'Una simulación sola depende del azar de su semilla: con otra semilla da un número un poco distinto. Por eso se corren varias y se promedian.',
  'El intervalo de confianza del 95 % es un rango alrededor de ese promedio. Si el experimento se repitiera muchas veces, en 95 de cada 100 el rango incluiría el valor verdadero del sistema. Un rango angosto quiere decir que el resultado es firme; uno ancho, que faltan réplicas.',
  'Si el valor de las fórmulas cae «dentro» del rango, la simulación y las fórmulas concuerdan. «Fuera» no siempre es un error: con un 95 %, 1 de cada 20 queda fuera por puro azar.',
]

export const TEXTO_DE_MEDIAS_POR_LOTES =
  'Réplicas corre varias simulaciones independientes; Medias por lotes corre una sola, más larga, y la corta en lotes: cuesta menos, pero los lotes vecinos pueden parecerse entre sí.'

export const TEXTO_DE_LAS_REPLICAS_NECESARIAS =
  'Es una estimación: supone que la variación entre réplicas no cambia al correr más.'

export const TEXTO_DE_LAS_DIFERENCIAS =
  'La diferencia es «escenario menos referencia», calculada réplica a réplica con las mismas semillas. Si su intervalo no contiene el cero, la diferencia es significativa: no se explica solo por el azar. Un valor negativo quiere decir que el escenario da menos que la referencia.'

/** Lo que dice la Ayuda sobre la vista Experimentos (aparte de la explicación del intervalo). */
export const TEXTO_DE_LA_AYUDA = [
  'Experimentos (el matraz de la barra lateral; en el celular, el de la barra de arriba) abre una vista que corre muchas simulaciones sin animación, en segundo plano, para dar resultados con respaldo estadístico. Parte de los valores de Ajustes, se cierra con «Cerrar» o con Escape sin reiniciar nada y no está en el modo visita.',
  'Réplicas: varias corridas con semillas consecutivas; da el promedio, la desviación y el intervalo del 95 % de cada métrica, junto al valor de las fórmulas, y calcula cuántas réplicas harían falta para una precisión que tú pidas.',
  'Barrido: mueve un parámetro (λ, placas, puestos, tiempo de lavado o de acabado) en un rango y dibuja la métrica elegida con su franja de confianza y la curva de las fórmulas, con la marca de dónde la etapa se satura.',
  'Comparar escenarios: corre los cinco escenarios y muestra, además, cuánto cambia cada uno frente a otro de referencia y si esa diferencia es significativa.',
  TEXTO_DE_MEDIAS_POR_LOTES,
  'El calentamiento (de 0 a 50 %, 10 % por defecto) son las horas iniciales que no cuentan. «Ver media acumulada» dibuja cómo se va asentando el promedio de una métrica. «Exportar a CSV» baja los resultados para Excel en español.',
]

/* ------------------------------------------------------------------ formatos -- */

const DECIMALES = { rho: 4, lq: 3, wqMin: 2, wMin: 2, l: 3 }

/** Un valor de una métrica con sus decimales. */
export const comoValor = (clave, valor) => comoNumero(valor, DECIMALES[clave] ?? 2)

const NOMBRE_DE_LA_ETAPA = {
  lavado: 'Etapa 1 · Lavado',
  acabado: 'Etapa 2 · Acabado',
  total: 'Tiempo total en el lavadero',
}
export const nombreDeLaEtapa = (etapa) => NOMBRE_DE_LA_ETAPA[etapa]

/** El nombre corto de una métrica: «Lq», «Wq», … */
export const nombreCortoDeLaMetrica = (clave) =>
  ({ rho: 'ρ', lq: 'Lq', wqMin: 'Wq', wMin: 'W', l: 'L' })[clave] ?? clave

const unidadDe = (clave) => (clave === 'wqMin' || clave === 'wMin' ? 'min' : clave === 'rho' ? '' : 'motos')

/** «Wq (min)» para un título de gráfica o de columna. */
export function rotuloDeLaMetrica(clave) {
  const unidad = unidadDe(clave)
  return unidad ? `${nombreCortoDeLaMetrica(clave)} (${unidad})` : nombreCortoDeLaMetrica(clave)
}

/** Las opciones de métrica que se ofrecen para elegir (las de una etapa). */
export const OPCIONES_DE_METRICA = METRICAS_DE_LA_ETAPA.map(({ clave, texto }) => ({ valor: clave, texto }))

/* ------------------------------------------------------- tabla de un resumen -- */

/**
 * El estado de una fila con palabras: inestable, dentro, fuera o sin intervalo
 * (con menos de dos valores no hay intervalo).
 */
function estadoDeLaFila(etapa, metrica) {
  if (!etapa.estable) return 'inestable'
  if (metrica.dentro === null) return 'sin-intervalo'
  return metrica.dentro ? 'dentro' : 'fuera'
}

/**
 * Las tres tablas (etapa 1, etapa 2 y total) de un resumen de Réplicas o de Medias
 * por lotes, listas para dibujar.
 */
export function tablasDeUnResumen(resumen, rotuloDeLasFilas = ['a la mitad', 'al final']) {
  return ['lavado', 'acabado', 'total'].map((id) => {
    const etapa = resumen[id]
    const lista = id === 'total' ? METRICAS_DEL_TOTAL : METRICAS_DE_LA_ETAPA
    return {
      id,
      titulo: NOMBRE_DE_LA_ETAPA[id],
      estable: etapa.estable,
      aproximada: etapa.aproximada,
      rhoDeLasFormulas: etapa.rhoDeLasFormulas,
      apoyo: !etapa.estable && etapa.filas ? { ...etapa.filas, rotulos: rotuloDeLasFilas } : null,
      filas: lista.map(({ clave, texto, unidad }) => {
        const m = etapa.metricas[clave]
        return {
          clave,
          nombre: texto,
          unidad,
          n: m.resumen?.n ?? null,
          promedio: m.promedio,
          desviacion: m.resumen?.desviacion ?? null,
          inferior: m.resumen?.inferior ?? null,
          superior: m.resumen?.superior ?? null,
          semiancho: m.resumen?.semiancho ?? null,
          formula: m.formula,
          estado: estadoDeLaFila(etapa, m),
        }
      }),
    }
  })
}

/** El texto del estado de una fila. */
export const TEXTO_DEL_ESTADO = {
  dentro: 'dentro',
  fuera: 'fuera',
  inestable: 'inestable',
  'sin-intervalo': 'sin intervalo',
}

/* --------------------------------------------------------- escenarios: tabla -- */

/** Cómo se llama la diferencia en una frase: «significativa» o «no significativa». */
export const TEXTO_DE_LA_SIGNIFICANCIA = { true: 'significativa', false: 'no significativa' }

/** «A, B y C» para una lista de nombres. */
const enLista = (nombres) =>
  nombres.length <= 1 ? (nombres[0] ?? '') : `${nombres.slice(0, -1).join(', ')} y ${nombres[nombres.length - 1]}`

/**
 * Por qué faltan diferencias en una etapa: en qué escenarios (la referencia incluida) es inestable.
 * @param {string[]} ids los escenarios donde la etapa es inestable
 * @param {Record<string, string>} nombres
 */
export function textoDeLasInestables(ids, nombres) {
  return `La etapa es inestable en ${enLista(ids.map((id) => nombres[id] ?? id))}. No se calcula la diferencia de un escenario inestable ni contra una referencia inestable.`
}

/* ------------------------------------------------------------------ barrido -- */

/**
 * Los puntos de la gráfica del barrido para una métrica de una etapa.
 *
 * Las fórmulas y la estabilidad salen de los parámetros de cada valor (no de lo
 * simulado), así que la curva de las fórmulas se ve completa aunque el barrido
 * esté a medias. El promedio de un valor inestable va aparte, para dibujarlo
 * punteado; la franja del intervalo solo existe donde hay intervalo.
 *
 * @param {object} resultados lo que devuelve `armarResultados` para un barrido
 * @param {{ etapa: 'lavado' | 'acabado', clave: string }} elegida
 */
export function modeloDelBarrido(resultados, { etapa, clave }) {
  const { solicitud, puntos } = resultados
  const marca = inestabilidadDelBarrido(solicitud.parametros, solicitud.barrido)
  const valores = marca.valores
  const info = PARAMETROS_DEL_BARRIDO[solicitud.barrido.parametro]

  const filas = puntos.map((punto, i) => {
    const estable = marca[etapa].estables[i]
    const metrica = punto.resumen?.[etapa].metricas[clave] ?? null
    const formula = estable ? formulasDe(punto.parametros)[etapa][clave] : null
    const resumen = metrica?.resumen ?? null
    const conIntervalo = estable && resumen && resumen.inferior !== null
    return {
      valor: punto.valor,
      hechas: punto.hechas,
      pedidas: punto.pedidas,
      estable,
      promedio: metrica?.promedio ?? null,
      promedioEstable: estable ? (metrica?.promedio ?? null) : null,
      promedioInestable: estable ? null : (metrica?.promedio ?? null),
      inferior: conIntervalo ? resumen.inferior : null,
      superior: conIntervalo ? resumen.superior : null,
      banda: conIntervalo ? [resumen.inferior, resumen.superior] : null,
      formula,
      dentro: conIntervalo ? resumen.inferior <= formula && formula <= resumen.superior : null,
    }
  })

  // Los tramos inestables (seguidos), con su borde en el valor crítico si cae en el cambio.
  const tramos = []
  const estables = marca[etapa].estables
  for (let i = 0; i < estables.length; i += 1) {
    if (estables[i]) continue
    let j = i
    while (j + 1 < estables.length && !estables[j + 1]) j += 1
    const critico = marca[etapa].critico
    const mitadAntes = i > 0 ? (valores[i - 1] + valores[i]) / 2 : valores[i]
    const mitadDespues = j < estables.length - 1 ? (valores[j] + valores[j + 1]) / 2 : valores[j]
    const bordeAntes = i > 0 && critico !== null && critico >= valores[i - 1] && critico <= valores[i] ? critico : mitadAntes
    const bordeDespues =
      j < estables.length - 1 && critico !== null && critico >= valores[j] && critico <= valores[j + 1] ? critico : mitadDespues
    tramos.push({ x1: bordeAntes, x2: bordeDespues })
    i = j
  }

  const indicePrimero = estables.indexOf(false)
  const primerInestable = indicePrimero === -1 ? null : valores[indicePrimero]
  // La zona inestable puede estar al principio del rango (pocas placas o puestos) o al final (más λ).
  const alInicio = indicePrimero === 0
  const indiceUltimo = estables.lastIndexOf(false)
  const ultimoInestable = indiceUltimo === -1 ? null : valores[indiceUltimo]
  return {
    parametro: solicitud.barrido.parametro,
    textoDelParametro: info.texto,
    unidad: info.unidad,
    etapa,
    clave,
    filas,
    tramosInestables: tramos,
    critico: marca[etapa].critico,
    hayInestables: estables.some((e) => !e),
    todosInestables: estables.every((e) => !e),
    primerInestable,
    ultimoInestable,
    alInicio,
    hayDatos: filas.some((f) => f.promedio !== null),
  }
}

const comoValorDelParametro = (parametro, valor) => comoNumero(valor, parametro === 'placas' || parametro === 'puestos' ? 0 : 2)

/** Describe la gráfica del barrido para quien no la ve. */
export function descripcionDelBarrido(modelo) {
  const etapa = nombreDeLaEtapa(modelo.etapa)
  const { filas } = modelo
  if (!modelo.hayDatos) {
    return `Gráfica de ${rotuloDeLaMetrica(modelo.clave)} de la ${etapa} contra ${modelo.textoDelParametro}. Todavía no hay datos.`
  }
  const primero = filas[0].valor
  const ultimo = filas[filas.length - 1].valor
  const partes = [
    `Gráfica de líneas de ${rotuloDeLaMetrica(modelo.clave)} de la ${etapa} contra ${modelo.textoDelParametro}, de ${comoValorDelParametro(modelo.parametro, primero)} a ${comoValorDelParametro(modelo.parametro, ultimo)} ${modelo.unidad} (${filas.length} valores).`,
    'Muestra el promedio simulado, una franja con su intervalo de confianza del 95 % y la curva de las fórmulas.',
  ]
  if (modelo.todosInestables) {
    partes.push('Con todos estos valores la etapa es inestable: no hay curva de fórmulas ni franja, y el promedio simulado no se estabiliza.')
  } else if (modelo.hayInestables) {
    const desde = modelo.critico !== null ? ` Dato exacto: ρ = 1 en ${comoValorDelParametro(modelo.parametro, modelo.critico)} ${modelo.unidad}.` : ''
    const donde = modelo.alInicio && modelo.ultimoInestable !== modelo.filas[modelo.filas.length - 1].valor
      ? `con ${comoValorDelParametro(modelo.parametro, modelo.primerInestable)} a ${comoValorDelParametro(modelo.parametro, modelo.ultimoInestable)} ${modelo.unidad}`
      : `desde ${comoValorDelParametro(modelo.parametro, modelo.primerInestable)} ${modelo.unidad} (el primer valor inestable del barrido)`
    partes.push(`La etapa es inestable (ρ de 1 o más) ${donde}; ahí no hay franja ni curva de fórmulas.${desde}`)
  } else {
    partes.push('En todo el rango la etapa es estable.')
  }
  return partes.join(' ')
}

/** La tabla equivalente del barrido: un renglón por valor. */
export function tablaDelBarrido(modelo) {
  return {
    columnas: [
      `${modelo.textoDelParametro} (${modelo.unidad})`,
      `Promedio de ${nombreCortoDeLaMetrica(modelo.clave)}`,
      'Intervalo del 95 %',
      'Fórmulas',
      'Estado',
    ],
    filas: modelo.filas.map((f) => [
      comoValorDelParametro(modelo.parametro, f.valor),
      f.promedio === null ? '—' : comoValor(modelo.clave, f.promedio),
      f.inferior === null ? (f.estable ? 'sin intervalo' : 'no se calcula') : `${comoValor(modelo.clave, f.inferior)} a ${comoValor(modelo.clave, f.superior)}`,
      f.formula === null ? (f.estable ? '—' : 'inestable') : comoValor(modelo.clave, f.formula),
      f.estable ? (f.dentro === null ? 'estable' : f.dentro ? 'estable · fórmulas dentro' : 'estable · fórmulas fuera') : 'inestable',
    ]),
    nota: null,
  }
}

/* --------------------------------------------------------- media acumulada -- */

/**
 * La media acumulada de una métrica de una etapa a lo largo de la corrida de
 * observación, con la línea de las fórmulas (solo si la etapa es estable) y la
 * marca del fin del calentamiento.
 */
export function modeloDeLaMediaAcumulada(resultados, { etapa, clave }) {
  const { solicitud, observacion } = resultados
  if (!observacion) return null
  const formulas = formulasDe(solicitud.parametros)
  const estable = formulas[etapa].estable
  return {
    etapa,
    clave,
    estable,
    puntos: puntosDeLaMedia(observacion, etapa, clave),
    formula: estable ? formulas[etapa][clave] : null,
    calentamientoHoras: (solicitud.horas * solicitud.calentamientoPct) / 100,
    horas: solicitud.horas,
  }
}

export function descripcionDeLaMedia(modelo) {
  if (!modelo || modelo.puntos.length === 0) {
    return 'Gráfica de la media acumulada. Todavía no hay datos.'
  }
  const etapa = nombreDeLaEtapa(modelo.etapa)
  const ultimo = modelo.puntos[modelo.puntos.length - 1]
  const partes = [
    `Gráfica de líneas con la media acumulada de ${rotuloDeLaMetrica(modelo.clave)} de la ${etapa} a lo largo de ${comoNumero(modelo.horas, 0)} horas simuladas, sin calentamiento.`,
    `Termina en ${comoValor(modelo.clave, ultimo.valor)}.`,
  ]
  if (modelo.estable) {
    partes.push(`La línea de las fórmulas está en ${comoValor(modelo.clave, modelo.formula)}.`)
  } else {
    partes.push('La etapa es inestable: la media no se estabiliza y no hay línea de fórmulas.')
  }
  if (modelo.calentamientoHoras > 0) {
    partes.push(`Una marca señala el fin del calentamiento, a las ${comoNumero(modelo.calentamientoHoras, 0)} horas.`)
  }
  return partes.join(' ')
}

export function tablaDeLaMedia(modelo) {
  return {
    columnas: ['Horas simuladas', `Media acumulada de ${nombreCortoDeLaMetrica(modelo.clave)}`, 'Fórmulas'],
    filas: repartir(modelo.puntos).map((p) => [
      comoNumero(p.horas, p.horas >= 100 ? 0 : 1),
      comoValor(modelo.clave, p.valor),
      modelo.formula === null ? 'inestable' : comoValor(modelo.clave, modelo.formula),
    ]),
    nota: null,
  }
}

/* ------------------------------------------------------- avance y parámetros -- */

/** «unos 40 s» o «unos 2 min 10 s» para el tiempo que falta. */
export function comoTiempoRestante(milisegundos) {
  if (milisegundos === null || milisegundos === undefined || !Number.isFinite(milisegundos)) return null
  const segundos = Math.max(1, Math.ceil(milisegundos / 1000))
  if (segundos < 60) return `unos ${segundos} s`
  const minutos = Math.floor(segundos / 60)
  const resto = segundos % 60
  return resto === 0 ? `unos ${minutos} min` : `unos ${minutos} min ${resto} s`
}

/** Lo que cuenta cada pieza de avance, en plural, según el modo. */
export const PIEZA_DE_AVANCE = { replicas: 'réplicas', barrido: 'corridas', escenarios: 'corridas', lotes: 'lotes' }

/**
 * Los parámetros con que se obtuvo un resultado, en una línea: lo que hace falta
 * para repetirlo.
 */
export function resumenDeLosParametros(solicitud) {
  const p = solicitud.parametros
  const lotes = solicitud.modo === 'lotes'
  const modoDeAcabado = p.modoAcabado === 'M/M/s' ? 'acabado M/M/s' : 'acabado por plan'
  const partes = [
    `λ = ${comoNumero(p.llegadasPorHora, 2)} motos/h`,
    `lavado ${comoNumero(p.lavadoMin, 2)} min`,
    `acabado ${[1, 2, 3].map((plan) => comoNumero(p.acabadoPlanMin[plan], 1)).join(' / ')} min`,
    `${p.placas} placas`,
    `${p.puestos} puestos`,
    modoDeAcabado,
    `semilla base ${solicitud.semillaBase}`,
    lotes ? `${comoNumero(solicitud.horas, 0)} h en total` : `${comoNumero(solicitud.horas, 0)} h por réplica`,
    `calentamiento ${comoNumero(solicitud.calentamientoPct, 0)} % (${comoNumero((solicitud.horas * solicitud.calentamientoPct) / 100, 0)} h)`,
    lotes ? `${solicitud.lotes} lotes` : `${solicitud.replicas} réplicas${solicitud.modo === 'replicas' ? '' : ' por valor o escenario'}`,
  ]
  return partes.join(' · ')
}
