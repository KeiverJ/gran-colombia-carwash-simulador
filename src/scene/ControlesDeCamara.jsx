import { OrbitControls } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'

import { duracionDeLaVariable } from '../components/usePresencia.js'
import {
  BOTONES_DE_VISTA,
  LIMITES_DE_CAMARA,
  VISTA_INICIAL,
  vistaDeLaClave,
} from './camara.js'
import { funcionDeLaCurva } from './curva.js'

/**
 * Los botones de vista y la pieza que mueve la cámara cuando se pulsan.
 *
 * Los botones son HTML y viven fuera del lienzo; la cámara vive dentro. Lo que
 * los une no es estado de React sino una orden (la clave de la vista) que se
 * deja apuntada y el lienzo recoge en su propio ciclo de dibujo: si fuera
 * estado, cada clic volvería a dibujar la escena entera, que es justo lo que se
 * ha cuidado que no pase en todo el cambio.
 *
 * Mover la cámara no toca nada de la simulación: ni el reloj, ni los
 * parámetros, ni el motor.
 */

/** Lo que dura el paso de una vista a otra: menos de un segundo. */
export const DURACION_DE_LA_TRANSICION_MS = 600

/** Con menos diferencia que esta (relativa) entre dos proporciones del lienzo no se rehace la vista. */
const DIFERENCIA_MINIMA_DE_PROPORCION = 0.005

/**
 * @param {object} props
 * @param {(clave: string) => void} props.alPedirVista deja apuntada la vista pedida
 * @param {boolean} [props.vertical] los botones uno debajo del otro (el menú "Vista" del celular)
 * @param {() => void} [props.alElegir] se llama después de pedir una vista (para cerrar el menú)
 */
export function BotonesDeCamara({ alPedirVista, vertical = false, alElegir }) {
  const pedir = (clave) => () => {
    alPedirVista(clave)
    alElegir?.()
  }

  return (
    <div
      className={vertical ? 'mandos-de-camara mandos-de-camara--vertical' : 'mandos-de-camara'}
      role="group"
      aria-label="Vistas de la cámara"
    >
      {BOTONES_DE_VISTA.map(({ clave, nombre }) => (
        <button key={clave} type="button" onClick={pedir(clave)}>
          {nombre}
        </button>
      ))}
    </div>
  )
}

/** ¿La persona pidió menos movimiento? Entonces la cámara salta sin animar. */
function sinMovimiento() {
  return duracionDeLaVariable('--duracion-media') === 0
}

/**
 * Dentro del lienzo: el control de órbita con sus límites, y el movimiento a
 * la vista que se haya pedido con un botón.
 *
 * Las vistas se calculan con la proporción del lienzo (ver `camara.js`), así
 * que el local entero cabe en cualquier pantalla. El control lo crea y lo guarda
 * este componente, no quien lo usa: así la cámara se mueve a través de una
 * referencia propia, como el resto de la escena mueve sus objetos, sin tocar
 * nada que venga de fuera.
 *
 * - **Pasar de una vista a otra** dura `DURACION_DE_LA_TRANSICION_MS`, con la
 *   curva del tema (la misma de las capas), y es inmediato con «reducir movimiento».
 * - **Al cambiar la proporción del lienzo** (se redimensiona la ventana o se gira
 *   el celular) y mientras la persona no haya movido la cámara con el ratón, la
 *   vista activa se rehace con la proporción nueva sin animar. Si ya la movió, se
 *   respeta.
 *
 * @param {object} props
 * @param {() => string|null} props.tomarOrden devuelve la clave de la vista pedida y la consume
 */
export function ControlDeCamara({ tomarOrden }) {
  const controles = useRef(null)
  const transicion = useRef(null)
  // Qué vista está puesta, con qué proporción se calculó y si la persona la movió después.
  const activa = useRef({ clave: 'general', aspecto: null, movida: false })

  useFrame(({ size }, delta) => {
    const control = controles.current
    if (!control || !(size.width > 0 && size.height > 0)) return
    const camara = control.object
    const aspecto = size.width / size.height

    const colocar = (vista) => {
      camara.position.set(...vista.posicion)
      control.target.set(...vista.objetivo)
      control.update()
    }

    const pedida = tomarOrden()
    if (pedida) {
      const vista = vistaDeLaClave(pedida, aspecto)
      activa.current = { clave: pedida, aspecto, movida: false }
      if (sinMovimiento()) {
        transicion.current = null
        colocar(vista)
      } else {
        transicion.current = {
          tiempo: 0,
          desde: { posicion: camara.position.toArray(), objetivo: control.target.toArray() },
          hasta: vista,
          curva: funcionDeLaCurva(
            getComputedStyle(document.documentElement).getPropertyValue('--curva-entrada'),
          ),
        }
      }
    } else if (
      !activa.current.movida &&
      !transicion.current &&
      (activa.current.aspecto === null ||
        Math.abs(aspecto - activa.current.aspecto) / aspecto > DIFERENCIA_MINIMA_DE_PROPORCION)
    ) {
      activa.current.aspecto = aspecto
      colocar(vistaDeLaClave(activa.current.clave, aspecto))
    }

    const en = transicion.current
    if (!en) return
    en.tiempo += delta * 1000
    const avance = en.curva(Math.min(1, en.tiempo / DURACION_DE_LA_TRANSICION_MS))
    const entre = (desde, hasta) => desde.map((c, i) => c + (hasta[i] - c) * avance)
    camara.position.set(...entre(en.desde.posicion, en.hasta.posicion))
    control.target.set(...entre(en.desde.objetivo, en.hasta.objetivo))
    control.update()
    if (en.tiempo >= DURACION_DE_LA_TRANSICION_MS) {
      colocar(en.hasta)
      transicion.current = null
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
      onStart={() => {
        // La persona toma la cámara: se respeta lo que haga, y se suelta la transición en curso.
        activa.current.movida = true
        transicion.current = null
      }}
    />
  )
}

export default BotonesDeCamara
