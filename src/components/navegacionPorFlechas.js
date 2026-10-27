/**
 * La parte sin pantalla de la navegación con el teclado de las pestañas y de
 * los grupos de botones de una sola elección (los dos usan el mismo patrón de
 * ARIA: una sola parada de Tab y las flechas para moverse dentro). JavaScript
 * puro, para probarlo con Node.
 */

const SIGUIENTE = new Set(['ArrowRight', 'ArrowDown'])
const ANTERIOR = new Set(['ArrowLeft', 'ArrowUp'])

/**
 * A qué elemento se pasa al pulsar una tecla, o `null` si la tecla no mueve
 * nada. Las flechas dan la vuelta en los extremos; Inicio y Fin van al primero
 * y al último.
 *
 * @param {object} datos
 * @param {number} datos.cantidad cuántos elementos hay
 * @param {number} datos.actual el índice del que tiene el foco
 * @param {string} datos.tecla el `key` del evento
 * @param {boolean} [datos.conVerticales] si arriba y abajo también cuentan (los grupos de
 *   botones de una sola elección las usan; las pestañas horizontales, no)
 * @returns {number|null}
 */
export function indiceTrasLaTecla({ cantidad, actual, tecla, conVerticales = false }) {
  if (!Number.isInteger(cantidad) || cantidad < 1 || !Number.isInteger(actual)) {
    return null
  }
  if (tecla === 'Home') {
    return 0
  }
  if (tecla === 'End') {
    return cantidad - 1
  }
  const esVertical = tecla === 'ArrowUp' || tecla === 'ArrowDown'
  if (esVertical && !conVerticales) {
    return null
  }
  if (SIGUIENTE.has(tecla)) {
    return (actual + 1) % cantidad
  }
  if (ANTERIOR.has(tecla)) {
    return (actual - 1 + cantidad) % cantidad
  }
  return null
}

/**
 * Cuál de los elementos es la única parada de Tab: el elegido y, si ninguno lo
 * está (un valor que no coincide con ninguna opción), el primero.
 *
 * @param {boolean[]} elegidos cuáles están elegidos, en orden
 * @returns {number} el índice que lleva `tabIndex={0}`
 */
export function indiceDeLaParadaDeTab(elegidos) {
  const i = elegidos.indexOf(true)
  return i >= 0 ? i : 0
}
