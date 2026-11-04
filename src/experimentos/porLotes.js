/**
 * Medias por lotes: una sola corrida larga cortada en k lotes de igual duración.
 *
 * El motor solo entrega métricas acumuladas desde el fin del calentamiento. Las
 * medias de cada lote salen de puntos de control, sin tocar el motor:
 *
 *  - Para ρ, L y Lq (promedios en el tiempo), el acumulado hasta el punto j es
 *    área / duración, así que el área del lote es X_j·t_j − X_{j−1}·t_{j−1} y su
 *    media, esa área entre la duración del lote.
 *  - Para W y Wq (promedios por moto), el acumulado es suma / motos, así que la
 *    suma del lote es X_j·n_j − X_{j−1}·n_{j−1} y su media, esa suma entre las
 *    motos que salieron de la etapa en el lote. Un lote sin motos no tiene media.
 *
 * JavaScript puro.
 */

import { largosDeLasFilas, motorDe } from './corrida.js'

const METRICAS_EN_TIEMPO = ['rho', 'lq', 'l']
const METRICAS_POR_MOTO = ['wMin', 'wqMin']

/** Medias de un lote para una etapa, a partir del punto de control anterior y el actual. */
function mediasDeLaEtapa(antes, ahora, tAntes, tAhora) {
  const duracion = tAhora - tAntes
  const medias = {}
  for (const clave of METRICAS_EN_TIEMPO) {
    medias[clave] = duracion > 0 ? (ahora[clave] * tAhora - antes[clave] * tAntes) / duracion : null
  }
  const motos = ahora.motosContadas - antes.motosContadas
  for (const clave of METRICAS_POR_MOTO) {
    medias[clave] = motos > 0 ? (ahora[clave] * ahora.motosContadas - antes[clave] * antes.motosContadas) / motos : null
  }
  medias.motos = motos
  return medias
}

const NADA = { rho: 0, lq: 0, l: 0, wMin: 0, wqMin: 0, motosContadas: 0 }

/**
 * Corre la corrida larga y entrega las medias de cada lote a medida que termina.
 *
 * @param {{ semilla: number, parametros: object, horas: number, calentamientoHoras: number, lotes: number }} trabajo
 * @param {object} [opciones]
 * @param {(lote: { numero: number, medias: object, filas: object }) => void} [opciones.alLote]
 * @param {() => boolean} [opciones.estaCancelado] se consulta antes de cada lote
 * @returns {{ terminado: boolean, hechos: number }}
 */
export function correrPorLotes(trabajo, { alLote = () => {}, estaCancelado = () => false } = {}) {
  const { semilla, parametros, horas, calentamientoHoras, lotes } = trabajo
  const motor = motorDe(parametros, semilla, calentamientoHoras)
  const horasDelLote = (horas - calentamientoHoras) / lotes

  motor.correrHoras(calentamientoHoras)
  let anterior = { lavado: NADA, acabado: NADA, total: { l: 0, wMin: 0, motosContadas: 0 } }
  let tAnterior = 0
  let hechos = 0

  for (let numero = 1; numero <= lotes; numero += 1) {
    if (estaCancelado()) {
      return { terminado: false, hechos }
    }
    motor.correrHoras(horasDelLote)
    const m = motor.metricas()
    const t = m.tiempoObservadoMin
    const total = {
      ...mediasDeLaEtapa(
        { ...NADA, ...anterior.total },
        { ...NADA, ...m.total },
        tAnterior,
        t,
      ),
    }
    alLote({
      numero,
      medias: {
        lavado: mediasDeLaEtapa(anterior.lavado, m.lavado, tAnterior, t),
        acabado: mediasDeLaEtapa(anterior.acabado, m.acabado, tAnterior, t),
        total: { l: total.l, wMin: total.wMin, motos: total.motos },
      },
      filas: largosDeLasFilas(motor),
      // Horas simuladas de esta pieza; la primera incluye el calentamiento.
      horas: horasDelLote + (numero === 1 ? calentamientoHoras : 0),
    })
    anterior = { lavado: m.lavado, acabado: m.acabado, total: m.total }
    tAnterior = t
    hechos = numero
  }
  return { terminado: true, hechos }
}
