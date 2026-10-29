/**
 * El freno que limita cuántas veces por segundo se renuevan las gráficas.
 *
 * El store acumula sin freno (es barato); lo caro es redibujar. El freno se pone
 * en la lectura: cada vez que algo cambia se avisa con `cambio()`, y la
 * instantánea se entrega como mucho una vez cada `intervaloMs`. El último cambio
 * siempre llega (el borde final), así que lo último que pasó nunca se pierde.
 * Con `ahora()` se entrega de inmediato, por ejemplo al reiniciar o al pausar.
 *
 * Es una función pura con el temporizador inyectable para probarla con Node y un
 * reloj falso; el hook que la usa es solo un envoltorio.
 */

/** Cada cuánto se renuevan las gráficas como mucho: unas 4 veces por segundo. */
export const INTERVALO_DE_GRAFICAS_MS = 250

/**
 * @param {() => void} entregar lo que se hace al renovar (tomar la instantánea)
 * @param {object} [opciones]
 * @param {number} [opciones.intervaloMs]
 * @param {(fn: () => void, ms: number) => *} [opciones.programar] como `setTimeout`
 * @param {(id: *) => void} [opciones.cancelar] como `clearTimeout`
 * @returns {{ cambio: () => void, ahora: () => void, descartar: () => void }}
 */
export function crearFreno(
  entregar,
  {
    intervaloMs = INTERVALO_DE_GRAFICAS_MS,
    programar = (fn, ms) => setTimeout(fn, ms),
    cancelar = (id) => clearTimeout(id),
  } = {},
) {
  let turno = null

  function quitarElTurno() {
    if (turno !== null) {
      cancelar(turno)
      turno = null
    }
  }

  return {
    /** Algo cambió: se entregará a más tardar en `intervaloMs`, una sola vez por tanda. */
    cambio() {
      if (turno !== null) {
        return
      }
      turno = programar(() => {
        turno = null
        entregar()
      }, intervaloMs)
    },

    /** Entrega ya, sin esperar, y anula el turno que estuviera pendiente. */
    ahora() {
      quitarElTurno()
      entregar()
    },

    /** Anula el turno pendiente sin entregar (al desmontar la pestaña). */
    descartar() {
      quitarElTurno()
    },
  }
}
