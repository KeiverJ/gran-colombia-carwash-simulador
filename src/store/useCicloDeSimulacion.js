import { useEffect } from 'react'

import { useSimulacion } from './simulacion.js'

/**
 * Lo que se hace en cada cuadro, con el estado del store: **un solo dueño del
 * motor a la vez**. Mientras dura la corrida larga el cuadro se gasta en ella
 * (avanza un trozo y devuelve el control al navegador, así la página responde) y
 * el ciclo normal no avanza el motor; si no, avanza lo que dice la velocidad.
 *
 * Devuelve el instante que hay que recordar para el cuadro siguiente (`null` en
 * la corrida larga: al volver, el primer cuadro no cuenta un lapso enorme).
 *
 * @param {object} estado el estado del store
 * @param {number} instante el instante de este cuadro, en milisegundos
 * @param {number|null} instanteAnterior el del cuadro anterior
 */
export function darUnCuadro(estado, instante, instanteAnterior) {
  if (estado.corridaLarga) {
    estado.avanzarCorridaLarga()
    return null
  }
  if (instanteAnterior !== null) {
    estado.avanzarCuadro(instante - instanteAnterior)
  }
  return instante
}

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
      instanteAnterior = darUnCuadro(useSimulacion.getState(), instante, instanteAnterior)
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
