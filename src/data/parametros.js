/**
 * Parámetros por defecto del lavadero Gran Colombia Car Wash Express.
 *
 * Todos los valores salen de la sección 2 de docs/especificacion_simulador.md
 * (observación del 17 de octubre de 2026, con la corrección del 23 de octubre).
 * No se inventa ningún dato: al lado de cada valor va la operación que lo origina.
 *
 * Convención de nombres: las tasas terminan en `PorHora` (motos por hora) y los
 * tiempos terminan en `Min` (minutos).
 */

/** Llegadas de las dos avenidas juntas. 93 min / 22 intervalos → una moto cada 4,2273 min. */
export const LLEGADAS_POR_HORA = 14.1935

/** Tiempo entre llegadas que corresponde a LLEGADAS_POR_HORA: 93 / 22. */
export const TIEMPO_ENTRE_LLEGADAS_MIN = 4.2273

/** Etapa 1 (lavado): tiempo medio de una placa. 247 min / 23 motos. */
export const LAVADO_MIN = 10.7391

/** Etapa 1 (lavado): tasa de servicio por placa. 60 / 10,7391. */
export const LAVADO_POR_HORA = 5.5871

/** Etapa 2 (acabado): tiempo medio según el plan contratado. */
export const ACABADO_PLAN_MIN = {
  1: 10, //      dicho por el personal del lavadero (no medido)
  2: 15.3158, // 291 min / 19 motos
  3: 18.5, //    74 min / 4 motos
}

/** Motos de cada plan contadas en la visita: 0, 19 y 4, de 23 en total. */
export const CONTEO_PLANES = {
  1: 0,
  2: 19,
  3: 4,
}

/** Total de motos observadas en la visita del 17 de octubre de 2026. */
export const TOTAL_MOTOS_CONTADAS = 23

/**
 * Proporción de motos que contrata cada plan, redondeada como la imprime el
 * documento del proyecto: 0/23, 19/23 y 4/23.
 */
export const PROPORCION_PLAN = {
  1: 0,
  2: 0.8261,
  3: 0.1739,
}

/**
 * La misma proporción sin redondear, dividiendo los conteos por el total.
 * Es la que conviene darle a la simulación: suma exactamente 1 y no arrastra
 * el redondeo a cuatro decimales del documento (la diferencia es 1,3·10⁻⁵).
 */
export const PROPORCION_PLAN_EXACTA = {
  1: CONTEO_PLANES[1] / TOTAL_MOTOS_CONTADAS,
  2: CONTEO_PLANES[2] / TOTAL_MOTOS_CONTADAS,
  3: CONTEO_PLANES[3] / TOTAL_MOTOS_CONTADAS,
}

/**
 * Etapa 2 (acabado): tiempo medio de una moto cualquiera, E[S₂].
 * 0,8261·15,3158 + 0,1739·18,5 = 365 / 23.
 * Se guarda tal cual lo trae la especificación para que coincida con el documento
 * del proyecto; recalcularlo desde las proporciones daría 15,86953…
 */
export const ACABADO_PROMEDIO_MIN = 15.8696

/** Etapa 2 (acabado): tasa de servicio por puesto. 60 / 15,8696. */
export const ACABADO_POR_HORA = 3.7808

/** Etapa 1: placas de lavado (servidores de la primera etapa). Conteo en el local. */
export const PLACAS_LAVADO = 6

/** Etapa 2: puestos de acabado (servidores de la segunda etapa). Conteo en el local. */
export const PUESTOS_ACABADO = 3

/** Todos los parámetros por defecto juntos, para arrancar la simulación. */
export const PARAMETROS_POR_DEFECTO = {
  llegadasPorHora: LLEGADAS_POR_HORA,
  lavadoMin: LAVADO_MIN,
  lavadoPorHora: LAVADO_POR_HORA,
  acabadoPlanMin: ACABADO_PLAN_MIN,
  proporcionPlan: PROPORCION_PLAN,
  acabadoPromedioMin: ACABADO_PROMEDIO_MIN,
  acabadoPorHora: ACABADO_POR_HORA,
  placasLavado: PLACAS_LAVADO,
  puestosAcabado: PUESTOS_ACABADO,
}
