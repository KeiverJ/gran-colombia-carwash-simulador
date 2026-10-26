/**
 * La "presencia" de algo que se abre y se cierra con animación: una capa, la
 * franja de gráficas, la ayuda.
 *
 * Para animar la salida, el elemento tiene que seguir en el documento hasta
 * que la animación termine. Lo que se guarda es solo lo ya *asentado*:
 * `oculta` (no está) o `visible` (en su sitio). La fase que se dibuja sale de
 * combinar eso con lo que se está pidiendo:
 *
 *   asentada  pedido   fase       qué pasa
 *   oculta    cerrado  oculta     no está en el documento
 *   oculta    abierto  entrando   está montado con su estado de partida
 *   visible   abierto  visible    en su sitio
 *   visible   cerrado  saliendo   se está yendo; al terminar queda oculta
 *
 * Como la fase se calcula y no se guarda, abrir y cerrar varias veces seguidas
 * siempre da una fase coherente con el último pedido. Son funciones puras para
 * probarlas con Node, sin navegador; el hook que las usa está en
 * `components/usePresencia.js`.
 */

export const ASENTADAS = ['oculta', 'visible']
export const FASES = ['oculta', 'entrando', 'visible', 'saliendo']

/** La fase que se dibuja, a partir de lo asentado y de lo que se pide. */
export function faseDeLaPresencia(asentada, abierta) {
  if (!ASENTADAS.includes(asentada)) {
    throw new RangeError(`Lo asentado debe ser ${ASENTADAS.join(' o ')}; se recibió ${asentada}.`)
  }
  if (asentada === 'visible') {
    return abierta ? 'visible' : 'saliendo'
  }
  return abierta ? 'entrando' : 'oculta'
}

/**
 * Convierte una duración de CSS ("200ms", "0.2s", " 120ms ") en milisegundos.
 * Lo que no se entiende vale 0: sin animación es mejor que una que no termina.
 */
export function aMilisegundos(texto) {
  const partes = String(texto ?? '')
    .trim()
    .match(/^(-?\d*\.?\d+)\s*(ms|s)$/)
  if (!partes) {
    return 0
  }
  const valor = Number(partes[1])
  const ms = partes[2] === 's' ? valor * 1000 : valor
  return Number.isFinite(ms) && ms > 0 ? ms : 0
}
