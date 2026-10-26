/**
 * Lo que se contó en el lavadero durante la visita del 17 de octubre de 2026.
 *
 * Copiado de la sección 3 de docs/especificacion_simulador.md ("Observado en la
 * visita, 15 conteos"). Son valores fijos: no salen de las horas de las 23
 * motos de `visita.js` sino de 15 conteos hechos aparte, así que no se
 * recalculan desde ellas. Por eso las cuatro ocupaciones no coinciden con las
 * que se reconstruirían desde la tabla de horas.
 *
 * Las ocupaciones son promedios de motos; los tiempos van en minutos.
 */
export const OBSERVADO_EN_LA_VISITA = {
  /** Cuántos conteos se hicieron. */
  conteos: 15,
  /** Placas de lavado ocupadas, en promedio. */
  placasOcupadas: 2.33,
  /** Motos esperando en la fila del lavado (cola 1), en promedio. */
  enCola1: 0.6,
  /** Motos esperando en la fila del acabado (cola 2), en promedio. */
  enCola2: 3.27,
  /** Puestos de acabado ocupados, en promedio. */
  puestosOcupados: 2.8,
  /** Espera real antes de entrar a la placa. */
  esperaAntesDeLaPlacaMin: 2.0,
  /** Tiempo total promedio en el lavadero, de la llegada al fin del acabado. */
  tiempoTotalMin: 31.1,
}
