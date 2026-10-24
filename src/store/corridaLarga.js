/**
 * El reparto en trozos de la corrida larga.
 *
 * Correr mil horas de golpe tarda 35 ms con los parámetros por defecto, pero
 * 370 ms en el peor caso que permite el panel (muchas llegadas y solo 3
 * puestos), porque la cola saturada crece y vaciarla cuesta cada vez más. De
 * una sola vez, eso congela la pantalla; por trozos, no.
 *
 * Esta función decide el tamaño del próximo trozo a partir de lo que tardó el
 * anterior, así que se adapta sola cuando la cola empieza a pesar. Está aparte
 * para poder probarla con Node.
 */

/** Cuánto tiempo real se le permite gastar a un trozo, en milisegundos. */
export const PRESUPUESTO_POR_CUADRO_MS = 25

/** Horas del primer trozo, antes de saber cuánto cuestan. */
export const TROZO_INICIAL_HORAS = 25

/** Límites del trozo, para no quedarse ni muy corto ni muy largo. */
export const TROZO_MINIMO_HORAS = 1
export const TROZO_MAXIMO_HORAS = 250

/** Cuánto puede crecer un trozo respecto del anterior. Ver `siguienteTrozoHoras`. */
export const CRECIMIENTO_MAXIMO = 2

/**
 * Tamaño del próximo trozo, en horas simuladas.
 *
 * @param {object} opciones
 * @param {number} opciones.horasQueFaltan
 * @param {number} opciones.horasDelTrozoAnterior 0 si todavía no hubo ninguno
 * @param {number} opciones.msDelTrozoAnterior
 * @param {number} [opciones.presupuestoMs]
 * @returns {number} horas, nunca más de las que faltan
 */
export function siguienteTrozoHoras({
  horasQueFaltan,
  horasDelTrozoAnterior,
  msDelTrozoAnterior,
  presupuestoMs = PRESUPUESTO_POR_CUADRO_MS,
}) {
  if (horasQueFaltan <= 0) {
    return 0
  }

  let horas
  if (!horasDelTrozoAnterior || !Number.isFinite(msDelTrozoAnterior) || msDelTrozoAnterior <= 0) {
    // Primer trozo, o uno tan rápido que no se pudo medir: se prueba con el
    // tamaño inicial y el siguiente ya se ajusta con datos.
    horas = Math.max(TROZO_INICIAL_HORAS, horasDelTrozoAnterior || 0)
  } else {
    const msPorHora = msDelTrozoAnterior / horasDelTrozoAnterior
    horas = presupuestoMs / msPorHora
    // Crecer como mucho al doble. Con la cola saturada, cada hora simulada
    // cuesta más que la anterior, así que fiarse del trozo pasado y multiplicar
    // por diez se pasa de largo: medido, un salto así llegó a tardar 421 ms en
    // un solo cuadro. Duplicando, el error se queda en un cuadro algo lento.
    horas = Math.min(horas, horasDelTrozoAnterior * CRECIMIENTO_MAXIMO)
  }

  horas = Math.min(TROZO_MAXIMO_HORAS, Math.max(TROZO_MINIMO_HORAS, Math.floor(horas)))
  return Math.min(horas, horasQueFaltan)
}

/** Qué porcentaje lleva hecho la corrida larga, de 0 a 100. */
export function progreso(horasHechas, horasTotales) {
  if (!horasTotales || horasTotales <= 0) {
    return 100
  }
  return Math.min(100, Math.round((horasHechas / horasTotales) * 100))
}
