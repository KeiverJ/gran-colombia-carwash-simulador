/**
 * Lo que las fórmulas predicen para los parámetros que están puestos ahora.
 *
 * Es la columna "Calculado con fórmulas" de la tabla, y el aviso de cuando una
 * etapa se satura. Está aparte de los componentes para poder probarlo con Node.
 */

import { metricasMMs } from '../engine/formulas.js'
import { MODO_MMS } from '../engine/simulador.js'
import { acabadoPromedioDe } from './simulacion.js'

/**
 * Las métricas teóricas de cada etapa, con los parámetros del panel.
 *
 * La etapa 2 usa la MISMA media de acabado que el motor —la que sale de los
 * tiempos por plan y las proporciones puestas en este momento—, no la constante
 * del documento. Si cada columna usara parámetros distintos, estarían
 * describiendo sistemas distintos y compararlas no diría nada.
 *
 * @param {object} parametros los del store
 * @returns {{ lavado: object, acabado: object, servicioLavadoPorHora: number,
 *             servicioAcabadoPorHora: number }}
 */
export function metricasCalculadas(parametros) {
  const { llegadasPorHora, lavadoMin, placas, puestos } = parametros
  const servicioLavadoPorHora = 60 / lavadoMin
  const servicioAcabadoPorHora = 60 / acabadoPromedioDe(parametros)

  return {
    lavado: metricasMMs({
      llegadasPorHora,
      servicioPorHora: servicioLavadoPorHora,
      servidores: placas,
    }),
    acabado: metricasMMs({
      llegadasPorHora,
      servicioPorHora: servicioAcabadoPorHora,
      servidores: puestos,
    }),
    servicioLavadoPorHora,
    servicioAcabadoPorHora,
  }
}

/** Cómo se llama cada etapa y su fila, en palabras. */
const ETAPAS = {
  lavado: { nombre: 'el lavado', fila: 'la fila del lavado', servidores: 'placas' },
  acabado: { nombre: 'el acabado', fila: 'la fila del acabado', servidores: 'puestos' },
}

/**
 * Avisos de las etapas saturadas, en palabras simples.
 *
 * Una etapa se satura cuando llegan más motos de las que puede atender, es
 * decir desde λ = s·μ. A partir de ahí la fila no se estabiliza: crece mientras
 * el lavadero esté abierto.
 *
 * @param {object} parametros
 * @returns {Array<{ etapa: string, texto: string, llegadasDeSaturacionPorHora: number }>}
 */
export function avisoDeSaturacion(parametros) {
  const calculadas = metricasCalculadas(parametros)
  const servidoresDe = { lavado: parametros.placas, acabado: parametros.puestos }
  const servicioDe = {
    lavado: calculadas.servicioLavadoPorHora,
    acabado: calculadas.servicioAcabadoPorHora,
  }

  const avisos = []
  for (const etapa of ['lavado', 'acabado']) {
    if (calculadas[etapa].estable) {
      continue
    }
    const llegadasDeSaturacionPorHora = servidoresDe[etapa] * servicioDe[etapa]
    const { nombre, fila, servidores } = ETAPAS[etapa]
    avisos.push({
      etapa,
      llegadasDeSaturacionPorHora,
      texto:
        `Con ${servidoresDe[etapa]} ${servidores}, ${nombre} no da abasto: llegan más motos de las ` +
        `que alcanza a atender, así que ${fila} crece sin parar mientras el lavadero esté abierto. ` +
        `Se satura a partir de ${llegadasDeSaturacionPorHora.toFixed(2).replace('.', ',')} motos por hora, ` +
        `y están llegando ${parametros.llegadasPorHora.toFixed(2).replace('.', ',')}.`,
    })
  }
  return avisos
}

/** ¿Está saturada esta etapa con los parámetros puestos? */
export function etapaSaturada(parametros, etapa) {
  return !metricasCalculadas(parametros)[etapa].estable
}

/**
 * En el modo "por plan" cada moto usa el tiempo de su propio plan, así que la
 * etapa 2 no es exactamente una M/M/s y la comparación con las fórmulas es
 * aproximada. Conviene decirlo en vez de dar a entender que cuadra exacto.
 */
export function comparacionEsAproximada(parametros) {
  return parametros.modoAcabado !== MODO_MMS
}
