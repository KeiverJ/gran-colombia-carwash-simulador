/**
 * El trabajador (Web Worker) de los experimentos: corre un lote lejos del hilo de
 * la página, para que la escena y los controles no se traben.
 *
 * Es una envoltura delgada de `ejecutarLote`. Recibe `{ tipo: 'iniciar', solicitud }`
 * y contesta con:
 *   { tipo: 'avance', evento }                      por cada pieza terminada
 *   { tipo: 'fin', estado, hechas, pedidas }        al terminar
 *   { tipo: 'error', mensaje }                      si algo falla
 *
 * Cancelar es `terminate()` desde la página: lo ya enviado queda como resultado
 * parcial y no hay nada a medias, porque cada pieza se envía completa al terminar.
 */

import { ejecutarLote } from './lote.js'

/**
 * Atiende un mensaje de la página. `enviar` es lo que contesta (en el trabajador,
 * `postMessage`); se pasa aparte para poder probarlo con Node.
 */
export function atender(mensaje, enviar) {
  if (mensaje?.tipo !== 'iniciar') {
    enviar({ tipo: 'error', mensaje: 'El trabajador de experimentos recibió un mensaje que no entiende.' })
    return
  }
  try {
    const { estado, hechas, pedidas } = ejecutarLote(mensaje.solicitud, {
      alAvanzar: (evento) => enviar({ tipo: 'avance', evento }),
    })
    enviar({ tipo: 'fin', estado, hechas, pedidas })
  } catch (error) {
    enviar({ tipo: 'error', mensaje: error instanceof Error ? error.message : String(error) })
  }
}

// Solo dentro de un Web Worker: en la página y en Node este archivo no hace nada al importarse.
const esUnTrabajador =
  typeof WorkerGlobalScope !== 'undefined' && typeof self !== 'undefined' && self instanceof WorkerGlobalScope
if (esUnTrabajador) {
  self.onmessage = (evento) => atender(evento.data, (respuesta) => self.postMessage(respuesta))
}
