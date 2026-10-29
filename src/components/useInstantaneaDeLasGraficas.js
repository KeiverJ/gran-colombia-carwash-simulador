import { useEffect, useState } from 'react'

import { crearFreno } from '../store/frenoDeActualizacion.js'
import { tomarLaInstantanea } from '../store/instantaneaDeLasGraficas.js'
import { useSimulacion } from '../store/simulacion.js'

/**
 * La instantánea que dibujan las gráficas, renovada como mucho unas 4 veces por
 * segundo aunque la simulación corra a la velocidad máxima.
 *
 * El store acumula sin freno; aquí se frena la lectura. Se renueva de inmediato
 * cuando la escena se recoloca desde cero (`generacion` cambia: reiniciar,
 * escenario, parámetros, modo, fin de la corrida) y cuando la simulación pasa a
 * pausa, para que no haya un cuarto de segundo de gráfica vieja.
 */
export function useInstantaneaDeLasGraficas() {
  const [instantanea, setInstantanea] = useState(() => tomarLaInstantanea(useSimulacion.getState()))

  useEffect(() => {
    const renovar = () => setInstantanea(tomarLaInstantanea(useSimulacion.getState()))
    const freno = crearFreno(renovar)

    const dejarDeEscuchar = useSimulacion.subscribe((estado, previo) => {
      if (estado.generacion !== previo.generacion || (previo.corriendo && !estado.corriendo)) {
        freno.ahora()
      } else if (
        estado.puntos !== previo.puntos ||
        estado.metricas !== previo.metricas ||
        estado.resumen !== previo.resumen
      ) {
        freno.cambio()
      }
    })

    // Lo que cambió entre el primer render y este efecto no se pierde.
    renovar()
    return () => {
      dejarDeEscuchar()
      freno.descartar()
    }
  }, [])

  return instantanea
}
