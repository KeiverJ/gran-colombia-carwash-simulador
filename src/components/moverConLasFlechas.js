import { indiceTrasLaTecla } from './navegacionPorFlechas.js'

/**
 * El manejador de teclado común de las pestañas y de los grupos de botones de
 * una sola elección: con las flechas (y Inicio y Fin) pasa el foco al
 * elemento que toca y lo activa, que es lo que hacen las dos guías de ARIA.
 *
 * Se pone en el contenedor (`onKeyDown`); los elementos se buscan con
 * `selector`. Si la tecla no mueve nada, no toca el evento.
 *
 * @param {import('react').KeyboardEvent} evento
 * @param {{ selector: string, conVerticales?: boolean }} opciones
 */
export function moverConLasFlechas(evento, { selector, conVerticales = false }) {
  const elementos = [...evento.currentTarget.querySelectorAll(selector)]
  const actual = elementos.indexOf(document.activeElement)
  const siguiente = indiceTrasLaTecla({
    cantidad: elementos.length,
    actual,
    tecla: evento.key,
    conVerticales,
  })
  if (siguiente === null) {
    return
  }
  evento.preventDefault()
  elementos[siguiente].focus()
  elementos[siguiente].click()
}

export default moverConLasFlechas
