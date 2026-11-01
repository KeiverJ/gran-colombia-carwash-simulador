/**
 * Lo que las fórmulas predicen para los parámetros que están puestos ahora.
 *
 * Es la columna "Fórmulas" de la tabla, y el aviso de cuando una
 * etapa se satura. Está aparte de los componentes para poder probarlo con Node.
 */

import { metricasMMs } from '../engine/formulas.js'
import { MODO_MMS } from '../engine/simulador.js'
import { acabadoPromedioDe, parametrosDelEscenario } from './simulacion.js'

/**
 * Los parámetros con los servidores que están **activos** ahora en lugar de los
 * del total: lo que las fórmulas deben usar cuando hay placas o puestos cerrados.
 * Una etapa nunca queda con cero (el motor no deja cerrar el último), pero por
 * si acaso nunca baja de 1, o las fórmulas dividirían entre cero.
 *
 * @param {object} parametros los del store
 * @param {{ placasActivas?: number, puestosActivos?: number }} [resumen] el del store
 */
export function parametrosConLosActivos(parametros, resumen) {
  const activos = (hay, total) => (Number.isInteger(hay) && hay >= 1 ? Math.min(hay, total) : total)
  return {
    ...parametros,
    placas: activos(resumen?.placasActivas, parametros.placas),
    puestos: activos(resumen?.puestosActivos, parametros.puestos),
  }
}

/**
 * Las métricas teóricas de cada etapa, con los parámetros del panel.
 *
 * La etapa 2 usa la MISMA media de acabado que el motor —la que sale de los
 * tiempos por plan y las proporciones puestas en este momento—, no la constante
 * del documento. Si cada columna usara parámetros distintos, estarían
 * describiendo sistemas distintos y compararlas no diría nada.
 *
 * Si se pasa el `resumen` del store, usa las placas y los puestos que están
 * **activos** ahora; sin él, el total (los escenarios y las pruebas).
 *
 * @param {object} parametros los del store
 * @param {{ placasActivas?: number, puestosActivos?: number }} [resumen] el del store
 * @returns {{ lavado: object, acabado: object, servicioLavadoPorHora: number,
 *             servicioAcabadoPorHora: number }}
 */
export function metricasCalculadas(parametros, resumen) {
  const { llegadasPorHora, lavadoMin, placas, puestos } = parametrosConLosActivos(parametros, resumen)
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

/**
 * El ρ₂ del acabado de un escenario, calculado con las fórmulas M/M/s y los
 * parámetros por defecto con las placas y los puestos de ese escenario. Es lo
 * que muestra cada tarjeta de escenario: 1 o más quiere decir que se satura.
 *
 * @param {{ placas: number, puestos: number }} escenario
 * @returns {number}
 */
export function rho2DelEscenario(escenario) {
  return metricasCalculadas(parametrosDelEscenario(escenario)).acabado.rho
}

/** Cómo se llama cada etapa y su fila, en palabras. */
const ETAPAS = {
  lavado: {
    nombre: 'el lavado',
    fila: 'la fila del lavado',
    servidores: 'placas',
    abiertos: 'placas abiertas',
  },
  acabado: {
    nombre: 'el acabado',
    fila: 'la fila del acabado',
    servidores: 'puestos',
    abiertos: 'puestos abiertos',
  },
}

/**
 * Avisos de las etapas saturadas, en palabras simples.
 *
 * Una etapa se satura cuando llegan más motos de las que puede atender, es
 * decir desde λ = s·μ. A partir de ahí la fila no se estabiliza: crece mientras
 * el lavadero esté abierto.
 *
 * @param {object} parametros
 * @param {{ placasActivas?: number, puestosActivos?: number }} [resumen] el del store
 * @returns {Array<{ etapa: string, texto: string, llegadasDeSaturacionPorHora: number }>}
 */
export function avisoDeSaturacion(parametros, resumen) {
  const calculadas = metricasCalculadas(parametros, resumen)
  const { placas, puestos } = parametrosConLosActivos(parametros, resumen)
  const servidoresDe = { lavado: placas, acabado: puestos }
  const totalDe = { lavado: parametros.placas, acabado: parametros.puestos }
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
    const { nombre, fila, servidores, abiertos } = ETAPAS[etapa]
    // Con servidores cerrados se dice cuántos están abiertos, no solo el número.
    const cuantos = `${servidoresDe[etapa]} ${servidoresDe[etapa] < totalDe[etapa] ? abiertos : servidores}`
    avisos.push({
      etapa,
      llegadasDeSaturacionPorHora,
      texto:
        `Con ${cuantos}, ${nombre} no da abasto: llegan más motos de las ` +
        `que alcanza a atender, así que ${fila} crece sin parar mientras el lavadero esté abierto. ` +
        `Se satura a partir de ${conComa(llegadasDeSaturacionPorHora)} motos por hora, ` +
        `y están llegando ${conComa(parametros.llegadasPorHora)}.`,
    })
  }
  return avisos
}

/**
 * El mismo aviso, en **una sola frase** y para las dos etapas juntas.
 *
 * Es lo que va encima de la tabla. Antes se pintaba un bloque por etapa, y con
 * las dos saturadas se repetía dos veces casi lo mismo, que es ruido justo
 * donde hay que entender algo.
 *
 * @param {object} parametros
 * @param {{ placasActivas?: number, puestosActivos?: number }} [resumen] el del store
 * @returns {string|null} la frase, o nada si ninguna etapa está saturada
 */
export function avisoCortoDeSaturacion(parametros, resumen) {
  const avisos = avisoDeSaturacion(parametros, resumen)
  if (avisos.length === 0) {
    return null
  }

  const nombres = avisos.map(({ etapa }) => ETAPAS[etapa].nombre)
  const quienes = nombres.length === 1 ? nombres[0] : `${nombres[0]} y ${nombres[1]}`
  const seSatura = nombres.length === 1 ? 'se satura' : 'se saturan'
  // La más estrecha manda: es la que se satura primero.
  const desde = Math.min(...avisos.map((a) => a.llegadasDeSaturacionPorHora))

  return (
    `Con estos parámetros ${quienes} no da${nombres.length === 1 ? '' : 'n'} abasto: ` +
    `${seSatura} a partir de ${conComa(desde)} motos por hora y están llegando ` +
    `${conComa(parametros.llegadasPorHora)}, así que la fila crece sin parar.`
  )
}

/** La frase que une el aviso de saturación con lo que pasa con los valores simulados. */
export const FRASE_DE_LOS_VALORES_SIMULADOS = 'Por eso sus valores simulados no se estabilizan.'

/**
 * El aviso de la tercera columna de Métricas: el aviso corto de saturación y,
 * si ya hay valores simulados, la frase que dice por qué no se estabilizan. Las
 * cifras salen de los parámetros puestos. Antes de simular no hay ningún valor
 * simulado que advertir, así que la frase no se agrega.
 *
 * @param {object} parametros
 * @param {boolean} hayValoresSimulados
 * @param {{ placasActivas?: number, puestosActivos?: number }} [resumen] el del store
 * @returns {string|null} el aviso, o nada si ninguna etapa está saturada
 */
export function avisoDeSaturacionConLoSimulado(parametros, hayValoresSimulados, resumen) {
  const corto = avisoCortoDeSaturacion(parametros, resumen)
  if (corto === null) {
    return null
  }
  return hayValoresSimulados ? `${corto} ${FRASE_DE_LOS_VALORES_SIMULADOS}` : corto
}

function conComa(numero) {
  return numero.toFixed(2).replace('.', ',')
}

/** ¿Está saturada esta etapa con los parámetros puestos? */
export function etapaSaturada(parametros, etapa, resumen) {
  return !metricasCalculadas(parametros, resumen)[etapa].estable
}

/**
 * En el modo "por plan" cada moto usa el tiempo de su propio plan, así que la
 * etapa 2 no es exactamente una M/M/s y la comparación con las fórmulas es
 * aproximada. Conviene decirlo en vez de dar a entender que cuadra exacto.
 */
export function comparacionEsAproximada(parametros) {
  return parametros.modoAcabado !== MODO_MMS
}
