/**
 * Cuánto tiempo simulado le toca a un cuadro de animación.
 *
 * Está aparte y sin depender de nada del navegador para poder probarla con
 * Node: quien mide el tiempo entre cuadros es el ciclo de animación, y esta
 * función solo hace la cuenta.
 */

/**
 * Tope del lapso real que se tiene en cuenta en un cuadro, en milisegundos.
 *
 * A 60 cuadros por segundo un cuadro dura unos 17 ms, así que el tope no se
 * nota mientras la animación corre normal. Sirve para cuando la pestaña estuvo
 * oculta o el equipo se quedó ocupado: sin él, volver tras diez minutos
 * simularía horas de golpe y la pantalla daría un salto absurdo.
 */
export const MS_TOPE_POR_CUADRO = 100

/**
 * @param {object} opciones
 * @param {number} opciones.msDelCuadro lapso real desde el cuadro anterior
 * @param {number} opciones.velocidadMinPorSegundo minutos simulados por segundo real
 * @param {boolean} opciones.corriendo si la simulación está en marcha
 * @returns {number} minutos simulados que hay que avanzar (nunca negativos)
 */
export function pasoSimuladoMin({ msDelCuadro, velocidadMinPorSegundo, corriendo }) {
  if (!corriendo) {
    return 0
  }
  if (!Number.isFinite(msDelCuadro) || msDelCuadro <= 0) {
    return 0
  }
  if (!Number.isFinite(velocidadMinPorSegundo) || velocidadMinPorSegundo <= 0) {
    return 0
  }
  const msQueCuentan = Math.min(msDelCuadro, MS_TOPE_POR_CUADRO)
  return (msQueCuentan / 1000) * velocidadMinPorSegundo
}
