/**
 * En qué se va el tiempo promedio de una moto en el lavadero: espera en la fila
 * 1, lavado, espera en la fila 2 y acabado.
 *
 * Sale de las métricas del motor (o, en la visita, de las horas de la tabla), y
 * se compara con las fórmulas M/M/s cuando las dos etapas son estables. Está
 * aparte de los componentes para poder probarlo con Node.
 */

import { comparacionEsAproximada } from './metricas.js'
import { motosQueYaSalieron } from './tiemposDeLaVisita.js'

/** Los cuatro tramos, en el orden en que la moto los recorre. */
export const TRAMOS = [
  { id: 'esperaFila1', nombre: 'Espera en la fila 1', tipo: 'espera', etapa: 'lavado' },
  { id: 'lavado', nombre: 'Lavado', tipo: 'atencion', etapa: 'lavado' },
  { id: 'esperaFila2', nombre: 'Espera en la fila 2', tipo: 'espera', etapa: 'acabado' },
  { id: 'acabado', nombre: 'Acabado', tipo: 'atencion', etapa: 'acabado' },
]

/** Desde cuántos minutos de diferencia con el total de la tabla se avisa. */
export const DIFERENCIA_QUE_SE_AVISA_MIN = 0.1

const NOTA_DE_LA_DIFERENCIA =
  'El total de la tabla de Métricas es distinto porque solo cuenta las motos que ya salieron; ' +
  'aquí cada etapa promedia las motos que ya la terminaron.'

const NOTA_DE_LA_APROXIMACION =
  'Con el modo «Según su plan», cada moto usa el tiempo de su propio plan; las fórmulas suponen ' +
  'un único tiempo medio, así que la comparación del acabado es aproximada.'

const NOTA_DE_LOS_PUESTOS_DE_LA_VISITA =
  'La espera en la fila 2 y el acabado salen de una asignación aproximada de los puestos, ' +
  'porque la tabla no dice qué puesto usó cada moto.'

/** Una barra: los cuatro tramos en minutos y su total, que es la suma. */
function barraDe(id, nombre, minutosPorTramo) {
  const tramos = TRAMOS.map((tramo, i) => ({ ...tramo, minutos: minutosPorTramo[i] }))
  return {
    id,
    nombre,
    tramos,
    total: tramos.reduce((suma, tramo) => suma + tramo.minutos, 0),
  }
}

/** Los cuatro tramos de una etapa: la espera (Wq) y la atención (W menos Wq). */
const tramosDeLaEtapa = ({ wqMin, wMin }) => [wqMin, wMin - wqMin]

const VACIO = { vacia: true, barras: [], notas: [] }

/** La frase de las etapas que no dan abasto, en palabras simples. */
function notaDeLaInestabilidad(calculadas) {
  const nombres = []
  if (!calculadas.lavado.estable) {
    nombres.push('el lavado')
  }
  if (!calculadas.acabado.estable) {
    nombres.push('el acabado')
  }
  const quienes = nombres.length === 1 ? nombres[0] : `${nombres[0]} y ${nombres[1]}`
  return (
    `Con estos parámetros ${quienes} no da${nombres.length === 1 ? '' : 'n'} abasto: no hay valores de ` +
    'fórmulas y la barra simulada no se estabiliza, sigue cambiando mientras más se simula.'
  )
}

/**
 * El desglose en el modo Simulación.
 *
 * @param {object} datos
 * @param {object|null} datos.metricas lo que entrega `motor.metricas()`
 * @param {object} datos.calculadas lo que entrega `metricasCalculadas(parametros)`
 * @param {object} datos.parametros los parámetros del store
 * @returns {{ vacia: boolean, barras: Array, notas: string[] }}
 */
export function desgloseDeLaSimulacion({ metricas, calculadas, parametros }) {
  if (!metricas || metricas.lavado.motosContadas === 0 || metricas.acabado.motosContadas === 0) {
    return VACIO
  }

  const simulada = barraDe('simulado', 'Simulado', [
    ...tramosDeLaEtapa(metricas.lavado),
    ...tramosDeLaEtapa(metricas.acabado),
  ])
  const barras = [simulada]
  const notas = []

  if (calculadas.lavado.estable && calculadas.acabado.estable) {
    barras.push(
      barraDe('formulas', 'Fórmulas', [
        ...tramosDeLaEtapa(calculadas.lavado),
        ...tramosDeLaEtapa(calculadas.acabado),
      ]),
    )
    if (comparacionEsAproximada(parametros)) {
      notas.push(NOTA_DE_LA_APROXIMACION)
    }
  } else {
    notas.push(notaDeLaInestabilidad(calculadas))
  }

  if (Math.abs(simulada.total - metricas.total.wMin) >= DIFERENCIA_QUE_SE_AVISA_MIN) {
    notas.push(NOTA_DE_LA_DIFERENCIA)
  }

  return { vacia: false, barras, notas }
}

/**
 * El desglose en la visita, con las motos que ya salieron a la hora del reloj.
 * Cada moto aporta sus cuatro tramos, que suman exactamente su tiempo en el
 * lavadero, así que el total coincide con el «Tiempo total» de la pestaña Visita.
 *
 * @param {object} datos
 * @param {Array} datos.motos las motos de la visita (minutos desde las 3:00 p. m.)
 * @param {Array} datos.detalle lo que entrega `detalleDeLaEtapa2()`
 * @param {number} datos.inicioMin el minuto de la tabla en que empieza el reloj
 * @param {number} datos.relojMin minutos transcurridos desde el inicio
 * @returns {{ vacia: boolean, barras: Array, notas: string[] }}
 */
export function desgloseDeLaVisita({ motos, detalle, inicioMin, relojMin }) {
  const espera2PorMoto = new Map(detalle.map((d) => [d.n, d.esperaEnFila2Min]))
  const salieron = motosQueYaSalieron(motos, inicioMin, relojMin)
  if (salieron.length === 0) {
    return VACIO
  }

  const sumas = [0, 0, 0, 0]
  for (const moto of salieron) {
    const esperaFila1 = moto.entraPlacaMin - moto.llegadaMin
    const lavado = moto.salePlacaMin - moto.entraPlacaMin
    const esperaFila2 = espera2PorMoto.get(moto.n)
    const acabado = moto.finAcabadoMin - moto.llegadaMin - esperaFila1 - lavado - esperaFila2
    sumas[0] += esperaFila1
    sumas[1] += lavado
    sumas[2] += esperaFila2
    sumas[3] += acabado
  }

  return {
    vacia: false,
    barras: [barraDe('reproduccion', 'Reproducción', sumas.map((suma) => suma / salieron.length))],
    notas: [NOTA_DE_LOS_PUESTOS_DE_LA_VISITA],
  }
}
