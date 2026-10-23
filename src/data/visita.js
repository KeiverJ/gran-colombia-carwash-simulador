/**
 * Datos de la visita al lavadero del 17 de octubre de 2026 (tarde).
 *
 * Copiados de la tabla de la sección 4 de docs/especificacion_simulador.md,
 * para el modo "repetir la visita": en ese modo los tiempos no son aleatorios,
 * se reproducen estas 23 motos tal como se observaron.
 *
 * Los tiempos van en minutos contados desde las 3:00 p. m. (3:11 → 11; 5:30 → 150)
 * y por eso los nombres terminan en `Min`. La entrada (avenida) de cada moto
 * no se registró durante la visita.
 */

/** Las 3:00 p. m., origen de todos los minutos de este archivo. */
export const HORA_BASE_VISITA = {
  etiqueta: '3:00 p. m.',
  minutosDesdeMedianoche: 15 * 60,
}

/** Minuto en que empieza la observación: las 3:10 p. m. */
export const INICIO_OBSERVACION_MIN = 10

/** Lo que había en el lavadero a las 3:10 p. m., cuando empezó la observación. */
export const ESTADO_INICIAL = {
  placasOcupadas: 0,
  motosEnCola1: 2,
  puestosAcabadoOcupados: 1,
}

/**
 * Las 23 motos observadas, en orden de llegada.
 * n: número de la tabla · placa: placa de lavado que usó · plan: 1, 2 o 3.
 */
export const MOTOS_VISITA = [
  { n: 1, llegadaMin: 11, placa: 2, entraPlacaMin: 13, salePlacaMin: 20, plan: 2, inicioAcabadoMin: 21, finAcabadoMin: 27 },
  { n: 2, llegadaMin: 18, placa: 5, entraPlacaMin: 18, salePlacaMin: 32, plan: 2, inicioAcabadoMin: 34, finAcabadoMin: 44 },
  { n: 3, llegadaMin: 18, placa: 4, entraPlacaMin: 23, salePlacaMin: 30, plan: 2, inicioAcabadoMin: 31, finAcabadoMin: 45 },
  { n: 4, llegadaMin: 21, placa: 2, entraPlacaMin: 23, salePlacaMin: 40, plan: 3, inicioAcabadoMin: 41, finAcabadoMin: 59 },
  { n: 5, llegadaMin: 23, placa: 3, entraPlacaMin: 24, salePlacaMin: 40, plan: 2, inicioAcabadoMin: 41, finAcabadoMin: 46 },
  { n: 6, llegadaMin: 28, placa: 4, entraPlacaMin: 32, salePlacaMin: 35, plan: 2, inicioAcabadoMin: 35, finAcabadoMin: 51 },
  { n: 7, llegadaMin: 29, placa: 5, entraPlacaMin: 33, salePlacaMin: 38, plan: 3, inicioAcabadoMin: 39, finAcabadoMin: 51 },
  { n: 8, llegadaMin: 40, placa: 2, entraPlacaMin: 42, salePlacaMin: 49, plan: 2, inicioAcabadoMin: 50, finAcabadoMin: 63 },
  { n: 9, llegadaMin: 49, placa: 2, entraPlacaMin: 51, salePlacaMin: 59, plan: 2, inicioAcabadoMin: 63, finAcabadoMin: 78 },
  { n: 10, llegadaMin: 56, placa: 5, entraPlacaMin: 57, salePlacaMin: 69, plan: 3, inicioAcabadoMin: 69, finAcabadoMin: 90 },
  { n: 11, llegadaMin: 57, placa: 4, entraPlacaMin: 58, salePlacaMin: 70, plan: 2, inicioAcabadoMin: 72, finAcabadoMin: 98 },
  { n: 12, llegadaMin: 57, placa: 3, entraPlacaMin: 58, salePlacaMin: 66, plan: 2, inicioAcabadoMin: 68, finAcabadoMin: 87 },
  { n: 13, llegadaMin: 60, placa: 2, entraPlacaMin: 61, salePlacaMin: 71, plan: 2, inicioAcabadoMin: 71, finAcabadoMin: 93 },
  { n: 14, llegadaMin: 64, placa: 6, entraPlacaMin: 66, salePlacaMin: 75, plan: 2, inicioAcabadoMin: 79, finAcabadoMin: 98 },
  { n: 15, llegadaMin: 64, placa: 3, entraPlacaMin: 67, salePlacaMin: 73, plan: 2, inicioAcabadoMin: 81, finAcabadoMin: 98 },
  { n: 16, llegadaMin: 68, placa: 4, entraPlacaMin: 74, salePlacaMin: 81, plan: 2, inicioAcabadoMin: 87, finAcabadoMin: 90 },
  { n: 17, llegadaMin: 74, placa: 2, entraPlacaMin: 75, salePlacaMin: 83, plan: 2, inicioAcabadoMin: 89, finAcabadoMin: 105 },
  { n: 18, llegadaMin: 79, placa: 3, entraPlacaMin: 81, salePlacaMin: 92, plan: 2, inicioAcabadoMin: 99, finAcabadoMin: 115 },
  { n: 19, llegadaMin: 92, placa: 2, entraPlacaMin: 95, salePlacaMin: 103, plan: 2, inicioAcabadoMin: 107, finAcabadoMin: 125 },
  { n: 20, llegadaMin: 95, placa: 3, entraPlacaMin: 96, salePlacaMin: 106, plan: 2, inicioAcabadoMin: 108, finAcabadoMin: 135 },
  { n: 21, llegadaMin: 98, placa: 5, entraPlacaMin: 99, salePlacaMin: 115, plan: 3, inicioAcabadoMin: 117, finAcabadoMin: 140 },
  { n: 22, llegadaMin: 102, placa: 4, entraPlacaMin: 103, salePlacaMin: 118, plan: 2, inicioAcabadoMin: 120, finAcabadoMin: 135 },
  { n: 23, llegadaMin: 104, placa: 2, entraPlacaMin: 104, salePlacaMin: 135, plan: 2, inicioAcabadoMin: 136, finAcabadoMin: 150 },
]
