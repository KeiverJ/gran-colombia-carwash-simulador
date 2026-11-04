/**
 * El CSV de los resultados, hecho para abrirse bien en Excel en español:
 * columnas separadas con punto y coma, coma decimal, UTF-8 con marca de orden de
 * bytes (para que se vean las tildes y la «ρ») y saltos de línea `\r\n`.
 *
 * La primera fila dice con qué se obtuvo (parámetros, semilla base, horas,
 * calentamiento y réplicas o lotes); después viene una fila vacía y la tabla. Los
 * números se escriben con hasta 6 decimales y sin separador de miles. Donde una
 * etapa es inestable se escribe «inestable» en vez de un intervalo o un valor de
 * las fórmulas: no se inventa ninguna cifra. JavaScript puro.
 */

import { ESCENARIOS } from '../data/escenarios.js'
import {
  MODO_BARRIDO,
  MODO_ESCENARIOS,
  MODO_LOTES,
  MODO_REPLICAS,
  NOMBRE_DEL_MODO,
  PARAMETROS_DEL_BARRIDO,
} from './plan.js'
import { diferenciasContra, METRICAS_DE_LA_ETAPA, METRICAS_DEL_TOTAL } from './resumen.js'

const BOM = '﻿'
const SEPARADOR = ';'
const SALTO = '\r\n'

const NOMBRE_DE_LA_ETAPA = { lavado: 'Lavado', acabado: 'Acabado', total: 'Total' }
const SIN_INTERVALO = 'sin intervalo'

/** Un número con coma decimal y hasta 6 decimales; vacío si no hay. */
export function numeroCsv(valor) {
  if (valor === null || valor === undefined || (typeof valor === 'number' && !Number.isFinite(valor))) return ''
  if (typeof valor !== 'number') return String(valor)
  return String(Number(valor.toFixed(6))).replace('.', ',')
}

/** Una celda: texto con comillas si lleva punto y coma, comillas o saltos de línea. */
export function celdaCsv(valor) {
  const texto = typeof valor === 'number' ? numeroCsv(valor) : String(valor ?? '')
  return /[;"\r\n]/u.test(texto) ? `"${texto.replaceAll('"', '""')}"` : texto
}

const fila = (celdas) => celdas.map(celdaCsv).join(SEPARADOR)

/** Los parámetros del lavadero en una línea. */
function textoDeLosParametros(p) {
  const acabado = [1, 2, 3].map((plan) => `plan ${plan} ${numeroCsv(p.acabadoPlanMin[plan])} min`).join(', ')
  const planes = [1, 2, 3].map((plan) => `${numeroCsv(p.proporcionPlan[plan] * 100)} %`).join(' / ')
  return [
    `λ = ${numeroCsv(p.llegadasPorHora)} motos/h`,
    `lavado = ${numeroCsv(p.lavadoMin)} min`,
    `acabado: ${acabado}`,
    `proporción de planes = ${planes}`,
    `${p.placas} placas`,
    `${p.puestos} puestos`,
    `modo de acabado = ${p.modoAcabado}`,
  ].join(', ')
}

/** La primera fila: con qué parámetros, semilla, horas y réplicas se obtuvo. */
function filaDeEncabezado(resultados, extra = []) {
  const { solicitud } = resultados
  const lotes = solicitud.modo === MODO_LOTES
  const pedidas = lotes ? resultados.pedidos : resultados.pedidas
  const hechas = lotes ? resultados.hechos : resultados.hechas
  const celdas = [
    'Experimento',
    NOMBRE_DEL_MODO[solicitud.modo],
    'Parámetros',
    textoDeLosParametros(solicitud.parametros),
    'Semilla base',
    solicitud.semillaBase,
    lotes ? 'Horas de la corrida' : 'Horas por réplica',
    solicitud.horas,
    'Calentamiento (%)',
    solicitud.calentamientoPct,
    'Calentamiento (h)',
    (solicitud.horas * solicitud.calentamientoPct) / 100,
    lotes ? 'Lotes' : solicitud.modo === MODO_REPLICAS ? 'Réplicas' : 'Réplicas por valor o escenario',
    pedidas,
  ]
  if (hechas !== undefined && hechas !== pedidas) {
    celdas.push(lotes ? 'Lotes hechos' : 'Réplicas hechas', hechas)
  }
  return fila([...celdas, ...extra])
}

/** Los textos que explican el estado de una métrica. */
function observacionDe(etapa, rotulo = '') {
  const partes = []
  if (!etapa.estable) partes.push('etapa inestable: la fila crece y no hay valor de fórmulas')
  else if (etapa.aproximada) partes.push('fórmulas aproximadas en el modo por plan')
  if (rotulo) partes.push(rotulo)
  return partes.join('; ')
}

/** Las celdas de una métrica: valores usados, promedio, desviación, límites, fórmulas y dentro/fuera. */
function celdasDeLaMetrica(metrica, estable) {
  if (!estable) {
    return [metrica.resumen?.n ?? '', metrica.promedio, '', 'inestable', 'inestable', 'inestable', 'inestable']
  }
  const { resumen } = metrica
  const hayIntervalo = resumen.inferior !== null
  return [
    resumen.n,
    resumen.promedio,
    resumen.desviacion ?? '',
    hayIntervalo ? resumen.inferior : SIN_INTERVALO,
    hayIntervalo ? resumen.superior : SIN_INTERVALO,
    metrica.formula,
    metrica.dentro === null ? '' : metrica.dentro ? 'dentro' : 'fuera',
  ]
}

const COLUMNAS_DE_LA_METRICA = [
  'Valores usados',
  'Promedio',
  'Desviación estándar',
  'Límite inferior (95 %)',
  'Límite superior (95 %)',
  'Valor de las fórmulas',
  '¿Dentro del intervalo?',
]

/**
 * Las filas de un resumen (de réplicas o de lotes): una por métrica de cada etapa y
 * del total, más las filas de las motos en la fila en las etapas inestables.
 * `prefijo` son celdas que van delante (por ejemplo, el valor del barrido).
 */
function filasDelResumen(resumen, prefijo = [], rotuloDeLasFilas = ['a la mitad de la corrida', 'al final de la corrida']) {
  const filas = []
  for (const nombre of ['lavado', 'acabado', 'total']) {
    const etapa = resumen[nombre]
    const lista = nombre === 'total' ? METRICAS_DEL_TOTAL : METRICAS_DE_LA_ETAPA
    for (const { clave, texto, unidad } of lista) {
      filas.push([
        ...prefijo,
        NOMBRE_DE_LA_ETAPA[nombre],
        texto,
        unidad,
        ...celdasDeLaMetrica(etapa.metricas[clave], etapa.estable),
        observacionDe(etapa),
      ])
    }
    if (!etapa.estable && etapa.filas) {
      const vacias = ['', '', '', '', '', '']
      filas.push([...prefijo, NOMBRE_DE_LA_ETAPA[nombre], `Motos en la fila ${rotuloDeLasFilas[0]}`, 'motos', '', etapa.filas.antes, ...vacias.slice(1), 'dato de apoyo'])
      filas.push([...prefijo, NOMBRE_DE_LA_ETAPA[nombre], `Motos en la fila ${rotuloDeLasFilas[1]}`, 'motos', '', etapa.filas.despues, ...vacias.slice(1), 'dato de apoyo'])
    }
  }
  return filas
}

const TITULOS_DE_LA_TABLA = ['Etapa', 'Métrica', 'Unidad', ...COLUMNAS_DE_LA_METRICA, 'Observación']

/** Una tabla como texto: fila de títulos y filas, todas con el mismo número de columnas. */
function textoDeLaTabla({ titulos, filas }) {
  return [fila(titulos), ...filas.map(fila)]
}

/** Las filas de las diferencias entre escenarios. */
function tablaDeLasDiferencias(resultados, referencia) {
  const conDatos = resultados.escenarios.filter((e) => e.replicas.length > 0)
  const diferencias = conDatos.some((e) => e.id === referencia) ? diferenciasContra(conDatos, referencia) : {}
  const nombreDe = Object.fromEntries(ESCENARIOS.map((e) => [e.id, e.nombre]))
  const filas = []
  for (const [id, d] of Object.entries(diferencias)) {
    for (const nombre of ['lavado', 'acabado', 'total']) {
      const lista = nombre === 'total' ? METRICAS_DEL_TOTAL : METRICAS_DE_LA_ETAPA
      for (const { clave, texto, unidad } of lista) {
        const m = d[nombre].metricas[clave]
        const inestable = d[nombre].inestableEn.length > 0
        const r = m.resumen
        filas.push([
          nombreDe[id],
          NOMBRE_DE_LA_ETAPA[nombre],
          texto,
          unidad,
          d.pares,
          inestable ? 'inestable' : r.promedio,
          inestable ? '' : r.desviacion ?? '',
          inestable ? 'inestable' : r.inferior ?? SIN_INTERVALO,
          inestable ? 'inestable' : r.superior ?? SIN_INTERVALO,
          m.significativa === null ? '' : m.significativa ? 'significativa' : 'no significativa',
          inestable ? `inestable en: ${d[nombre].inestableEn.map((x) => nombreDe[x]).join(' y ')}` : '',
        ])
      }
    }
  }
  return {
    titulos: [
      'Escenario',
      'Etapa',
      'Métrica',
      'Unidad',
      'Parejas de réplicas',
      'Diferencia promedio (escenario − referencia)',
      'Desviación estándar',
      'Límite inferior (95 %)',
      'Límite superior (95 %)',
      '¿Significativa?',
      'Observación',
    ],
    filas,
  }
}

/**
 * El texto completo del CSV de unos resultados.
 *
 * @param {object} resultados lo que devuelve `armarResultados`
 * @param {object} [opciones]
 * @param {string} [opciones.referencia] en Comparar escenarios, el escenario contra el que se calculan las diferencias
 */
export function aCsv(resultados, { referencia = 'actual' } = {}) {
  const { solicitud } = resultados
  const bloques = []

  if (solicitud.modo === MODO_REPLICAS || solicitud.modo === MODO_LOTES) {
    bloques.push(filaDeEncabezado(resultados), '')
    if (resultados.resumen) {
      const rotulos = solicitud.modo === MODO_LOTES ? ['al final del primer lote', 'al final del último lote'] : undefined
      bloques.push(
        ...textoDeLaTabla({ titulos: TITULOS_DE_LA_TABLA, filas: filasDelResumen(resultados.resumen, [], rotulos) }),
      )
    }
  } else if (solicitud.modo === MODO_BARRIDO) {
    const { parametro, inicio, fin, paso } = solicitud.barrido
    const info = PARAMETROS_DEL_BARRIDO[parametro]
    bloques.push(
      filaDeEncabezado(resultados, ['Parámetro barrido', info.texto, 'Desde', inicio, 'Hasta', fin, 'Paso', paso]),
      '',
    )
    const titulos = [`${info.texto} (${info.unidad})`, 'Réplicas hechas']
    const filas = []
    for (const punto of resultados.puntos) {
      if (!punto.resumen) continue
      filas.push(...filasDelResumen(punto.resumen, [punto.valor, punto.hechas]))
    }
    bloques.push(...textoDeLaTabla({ titulos: [...titulos, ...TITULOS_DE_LA_TABLA], filas }))
  } else if (solicitud.modo === MODO_ESCENARIOS) {
    const nombreDeLaReferencia = ESCENARIOS.find((e) => e.id === referencia)?.nombre ?? referencia
    bloques.push(filaDeEncabezado(resultados, ['Referencia de las diferencias', nombreDeLaReferencia]), '')
    const filas = []
    for (const escenario of resultados.escenarios) {
      if (!escenario.resumen) continue
      filas.push(...filasDelResumen(escenario.resumen, [escenario.nombre, escenario.hechas]))
    }
    bloques.push(...textoDeLaTabla({ titulos: ['Escenario', 'Réplicas hechas', ...TITULOS_DE_LA_TABLA], filas }))

    const diferencias = tablaDeLasDiferencias(resultados, referencia)
    if (diferencias.filas.length > 0) {
      const ancho = diferencias.titulos.length
      const relleno = (celdas) => [...celdas, ...new Array(ancho - celdas.length).fill('')]
      bloques.push('', fila(relleno(['Diferencias contra', nombreDeLaReferencia])), ...textoDeLaTabla(diferencias))
    }
  }
  return BOM + bloques.join(SALTO) + SALTO
}

/** El nombre del archivo: el modo y la semilla base. */
export function nombreDelArchivoCsv(resultados) {
  const modo = {
    [MODO_REPLICAS]: 'replicas',
    [MODO_BARRIDO]: 'barrido',
    [MODO_ESCENARIOS]: 'comparar-escenarios',
    [MODO_LOTES]: 'medias-por-lotes',
  }[resultados.solicitud.modo]
  return `experimentos-${modo}-semilla${resultados.solicitud.semillaBase}.csv`
}
