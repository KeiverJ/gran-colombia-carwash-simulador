import { useEffect, useState } from 'react'

import { aMilisegundos, faseDeLaPresencia } from '../store/presencia.js'

/** La duración de una variable de CSS del tema, en milisegundos (0 si no hay). */
export function duracionDeLaVariable(nombre) {
  if (typeof document === 'undefined') {
    return 0
  }
  return aMilisegundos(getComputedStyle(document.documentElement).getPropertyValue(nombre))
}

/**
 * Mantiene montado lo que se cierra mientras dura su animación de salida.
 *
 * Devuelve `{ montada, fase }`: quien lo usa no se dibuja si no está
 * `montada` y pone la fase como clase para que el CSS anime. Si la duración es
 * 0 (la persona pidió reducir el movimiento) las fases duran un instante.
 *
 * Lo único que se guarda es lo ya asentado (`oculta` o `visible`); la fase se
 * calcula con lo que se pide (ver `store/presencia.js`). El efecto solo
 * programa lo que ocurre después, siempre en una devolución de llamada y nunca
 * al dibujar: soltar la entrada dos cuadros más tarde (para que el estado de
 * partida llegue a dibujarse) y desmontar cuando termina la salida.
 *
 * @param {boolean} abierta lo que se está pidiendo
 * @param {string} [variable] la variable de CSS con la duración
 */
export function usePresencia(abierta, variable = '--duracion-media') {
  const [asentada, setAsentada] = useState(abierta ? 'visible' : 'oculta')

  useEffect(() => {
    let temporizador = null
    let cuadro = null
    if (abierta) {
      cuadro = requestAnimationFrame(() => {
        cuadro = requestAnimationFrame(() => setAsentada('visible'))
      })
    } else {
      temporizador = setTimeout(() => setAsentada('oculta'), duracionDeLaVariable(variable))
    }
    return () => {
      clearTimeout(temporizador)
      cancelAnimationFrame(cuadro)
    }
  }, [abierta, variable])

  const fase = faseDeLaPresencia(asentada, abierta)
  return { montada: fase !== 'oculta', fase }
}

export default usePresencia
