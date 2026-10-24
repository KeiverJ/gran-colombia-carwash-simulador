import { useEffect } from 'react'

import { useSimulacion } from './simulacion.js'

/**
 * Pide cuadros de animación y le dice al store cuánto tiempo real pasó entre
 * uno y otro. El store decide cuánto tiempo simulado le toca a ese lapso.
 *
 * El ciclo vive aquí dentro, y no en el módulo del store, a propósito: con
 * `React.StrictMode` el efecto se ejecuta dos veces en desarrollo, y la
 * limpieza del primero cancela su ciclo antes de que arranque el segundo. Si
 * el ciclo arrancara al cargar el módulo, quedarían dos vivos y el reloj
 * avanzaría al doble, que es un error incómodo de ver porque parece que
 * funciona, solo que rápido.
 */
export function useCicloDeSimulacion() {
  useEffect(() => {
    let cuadroPedido = null
    let instanteAnterior = null

    const enCadaCuadro = (instante) => {
      if (instanteAnterior !== null) {
        useSimulacion.getState().avanzarCuadro(instante - instanteAnterior)
      }
      instanteAnterior = instante
      cuadroPedido = requestAnimationFrame(enCadaCuadro)
    }

    cuadroPedido = requestAnimationFrame(enCadaCuadro)

    return () => {
      if (cuadroPedido !== null) {
        cancelAnimationFrame(cuadroPedido)
      }
    }
  }, [])
}
