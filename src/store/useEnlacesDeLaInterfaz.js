import { useEffect } from 'react'

import { useInterfaz } from './interfaz.js'
import { MODO_VISITA, useSimulacion } from './simulacion.js'

/**
 * Une el estado de la interfaz con lo que pasa fuera de ella: el ancho de la
 * ventana, la tecla Escape y el modo de la simulación.
 *
 * Vive en un hook y no en el módulo del store por la misma razón que el ciclo
 * de animación: con `React.StrictMode` el efecto corre dos veces en desarrollo
 * y la limpieza del primero quita sus oyentes antes de que arranque el segundo.
 */
export function useEnlacesDeLaInterfaz() {
  useEffect(() => {
    const ajustarAncho = () => {
      useInterfaz.getState().cambiarAncho(window.innerWidth)
      useInterfaz.getState().cambiarAlto(window.innerHeight)
    }
    const alPulsarUnaTecla = (evento) => {
      if (evento.key === 'Escape') {
        useInterfaz.getState().pulsarEscape()
      }
    }
    ajustarAncho()
    useInterfaz.getState().cambiarDeModo(useSimulacion.getState().modo === MODO_VISITA)

    window.addEventListener('resize', ajustarAncho)
    window.addEventListener('keydown', alPulsarUnaTecla)
    // Cualquier cosa que cambie el modo —el selector, el aviso de fin— lleva a
    // las pestañas a donde toca, sin que cada botón tenga que acordarse.
    const dejarDeEscuchar = useSimulacion.subscribe((estado, anterior) => {
      if (estado.modo !== anterior.modo) {
        useInterfaz.getState().cambiarDeModo(estado.modo === MODO_VISITA)
      }
    })

    return () => {
      window.removeEventListener('resize', ajustarAncho)
      window.removeEventListener('keydown', alPulsarUnaTecla)
      dejarDeEscuchar()
    }
  }, [])
}
