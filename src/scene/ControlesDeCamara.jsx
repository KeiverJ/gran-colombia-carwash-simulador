import { OrbitControls } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'

import { LIMITES_DE_CAMARA, VISTA_INICIAL, VISTAS, vistaRecentrada } from './camara.js'

/**
 * Los botones de vista y la pieza que mueve la cámara cuando se pulsan.
 *
 * Los botones son HTML y viven fuera del lienzo; la cámara vive dentro. Lo que
 * los une no es estado de React sino una orden que se deja apuntada y el
 * lienzo recoge en su propio ciclo de dibujo: si fuera estado, cada clic
 * volvería a dibujar la escena entera, que es justo lo que se ha cuidado que
 * no pase en todo el cambio.
 *
 * Mover la cámara no toca nada de la simulación: ni el reloj, ni los
 * parámetros, ni el motor.
 */

/** Qué parte del camino que le falta recorre la cámara por segundo real. */
const VELOCIDAD_DE_LA_CAMARA = 7

/** A partir de aquí se da por llegada y se suelta el control. */
const DISTANCIA_PARA_SOLTAR = 0.05

/**
 * @param {object} props
 * @param {(sacarLaVista: Function) => void} props.alPedirVista deja la orden
 */
export function BotonesDeCamara({ alPedirVista }) {
  const pedir = (sacarLaVista) => () => alPedirVista(sacarLaVista)

  return (
    <div className="mandos-de-camara" role="group" aria-label="Vistas de la cámara">
      <button type="button" onClick={pedir(() => VISTAS.comoEnLaFoto)}>
        Como en la foto
      </button>
      <button type="button" onClick={pedir(() => VISTAS.desdeArriba)}>
        Desde arriba (plano)
      </button>
      <button type="button" onClick={pedir((camara) => vistaRecentrada(camara.position.toArray()))}>
        Recentrar
      </button>
    </div>
  )
}

/**
 * Dentro del lienzo: el control de órbita con sus límites, y el movimiento a
 * la vista que se haya pedido con un botón.
 *
 * El control lo crea y lo guarda este componente, no quien lo usa: así la
 * cámara se mueve a través de una referencia propia, como el resto de la
 * escena mueve sus objetos, sin tocar nada que venga de fuera.
 *
 * La orden se resuelve en el primer cuadro —"Recentrar" necesita saber dónde
 * está la cámara justo entonces— y a partir de ahí el destino queda fijo, para
 * no perseguir un blanco que se mueve.
 *
 * @param {object} props
 * @param {() => Function|null} props.tomarOrden devuelve la orden y la consume
 */
export function ControlDeCamara({ tomarOrden }) {
  const controles = useRef(null)
  const destino = useRef(null)

  useFrame((_, delta) => {
    const control = controles.current
    if (!control) return
    const camara = control.object

    const pedida = tomarOrden()
    if (pedida) destino.current = pedida(camara)

    const vista = destino.current
    if (!vista) return

    const acercamiento = 1 - Math.exp(-VELOCIDAD_DE_LA_CAMARA * delta)
    const objetivo = control.target

    camara.position.x += (vista.posicion[0] - camara.position.x) * acercamiento
    camara.position.y += (vista.posicion[1] - camara.position.y) * acercamiento
    camara.position.z += (vista.posicion[2] - camara.position.z) * acercamiento
    objetivo.x += (vista.objetivo[0] - objetivo.x) * acercamiento
    objetivo.y += (vista.objetivo[1] - objetivo.y) * acercamiento
    objetivo.z += (vista.objetivo[2] - objetivo.z) * acercamiento
    control.update()

    const queFalta = Math.hypot(
      vista.posicion[0] - camara.position.x,
      vista.posicion[1] - camara.position.y,
      vista.posicion[2] - camara.position.z,
    )
    if (queFalta < DISTANCIA_PARA_SOLTAR) {
      camara.position.set(...vista.posicion)
      objetivo.set(...vista.objetivo)
      control.update()
      destino.current = null
    }
  })

  return (
    <OrbitControls
      ref={controles}
      makeDefault
      enablePan={false}
      target={VISTA_INICIAL.objetivo}
      minDistance={LIMITES_DE_CAMARA.distanciaMinima}
      maxDistance={LIMITES_DE_CAMARA.distanciaMaxima}
      maxPolarAngle={LIMITES_DE_CAMARA.anguloPolarMaximo}
    />
  )
}

export default BotonesDeCamara
