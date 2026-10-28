import { PerformanceMonitor } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import { useEffect, useRef } from 'react'

import { resolucionDelNivel, useCalidad } from './calidad.js'

/**
 * Cuántos milisegundos después de montarse (y de que la pestaña vuelva a verse)
 * no se hace caso de una bajada de cuadros por segundo: al arrancar se están
 * decodificando los modelos y compilando los materiales, y una pestaña que estaba
 * oculta recupera el ritmo con un cuadro lento.
 */
const GRACIA_MS = 4000

/**
 * Los límites de cuadros por segundo con los que se decide. Se baja la calidad si
 * se está por debajo del primero y se sube si se pasa del segundo. Con una pantalla
 * de 60 Hz se mide como mucho 60, así que el límite de arriba es 55; con una de más
 * Hz (o sin límite, como al medir) se exige más.
 */
export const LIMITES_DE_CUADROS_POR_SEGUNDO = (frecuenciaMaxima) =>
  frecuenciaMaxima > 100 ? [60, 100] : [45, 55]

/** Deja el nivel escrito en el lienzo, para poder ver (y medir) en cuál va la escena. */
function anotarElNivel(lienzo, nivel) {
  lienzo.dataset.calidad = String(nivel)
}

/**
 * Vigila los cuadros por segundo con `PerformanceMonitor` de drei y sube o baja el
 * nivel de calidad (ver `calidad.js`). Además pone la resolución del lienzo que
 * le toca al nivel. No dibuja nada.
 */
export function CalidadAdaptable() {
  const nivel = useCalidad((estado) => estado.nivel)
  const setDpr = useThree((estado) => estado.setDpr)
  const gl = useThree((estado) => estado.gl)
  const noAntesDe = useRef(0)

  useEffect(() => {
    noAntesDe.current = performance.now() + GRACIA_MS
    const alVolverAVerse = () => {
      if (document.visibilityState === 'visible') noAntesDe.current = performance.now() + GRACIA_MS
    }
    document.addEventListener('visibilitychange', alVolverAVerse)
    return () => document.removeEventListener('visibilitychange', alVolverAVerse)
  }, [])

  useEffect(() => {
    setDpr(resolucionDelNivel(nivel, window.devicePixelRatio))
    anotarElNivel(gl.domElement, nivel)
  }, [nivel, setDpr, gl])

  const puedeCambiar = () => document.visibilityState === 'visible' && performance.now() >= noAntesDe.current

  return (
    <PerformanceMonitor
      ms={250}
      iterations={10}
      threshold={0.75}
      bounds={LIMITES_DE_CUADROS_POR_SEGUNDO}
      onDecline={() => puedeCambiar() && useCalidad.getState().empeorar()}
      onIncline={() => puedeCambiar() && useCalidad.getState().mejorar()}
    />
  )
}

export default CalidadAdaptable
