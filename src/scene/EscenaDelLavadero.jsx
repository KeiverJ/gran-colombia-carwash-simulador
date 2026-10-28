import { Canvas } from '@react-three/fiber'
import { useCallback, useMemo, useRef, useState } from 'react'

import Aviso from '../components/Aviso.jsx'
import IndicadoresDeLaEscena from '../components/IndicadoresDeLaEscena.jsx'
import MandosMinimos from '../components/MandosMinimos.jsx'
import AjusteALasCapas from './AjusteALasCapas.jsx'
import { CAMPO_DE_VISION, VISTA_INICIAL } from './camara.js'
import { ControlDeCamara } from './ControlesDeCamara.jsx'
import FilaSuperiorDeLaEscena from './FilaSuperiorDeLaEscena.jsx'
import { useSimulacion } from '../store/simulacion.js'
import Avenidas from './Avenidas.jsx'
import Iluminacion from './Iluminacion.jsx'
import Local from './Local.jsx'
import Motos from './Motos.jsx'
import Particulas from './Particulas.jsx'
import { sobrantesDe, TOPE_DE_MOTOS_DIBUJADAS } from './posiciones.js'
import { Servidores, Sobrantes } from './Servidores.jsx'
import Sombras from './Sombras.jsx'
import Terreno from './Terreno.jsx'

/**
 * ¿Puede este navegador dibujar en 3D?
 *
 * Se comprueba antes de montar el lienzo. Dejar que falle solo no sirve: sin
 * WebGL muchas veces no hay excepción que atrapar, solo un recuadro negro, que
 * es justo lo que hay que evitar.
 */
function hayWebGL() {
  try {
    const lienzo = document.createElement('canvas')
    return Boolean(
      window.WebGLRenderingContext &&
        (lienzo.getContext('webgl2') || lienzo.getContext('webgl')),
    )
  } catch {
    return false
  }
}

/** Lo que se lee del lienzo 3D: no tiene texto, así que se dice qué se ve en él. */
const DESCRIPCION_DE_LA_ESCENA =
  'Escena 3D del lavadero: placas de lavado, fila de espera y puestos de acabado'

/** Los rótulos de "+X motos más", con el mismo freno que el resumen. */
function RotulosDeSobrantes() {
  const sobranLavado = useSimulacion((estado) => sobrantesDe(estado.resumen.enFilaLavado, TOPE_DE_MOTOS_DIBUJADAS.lavado))
  const sobranAcabado = useSimulacion((estado) => sobrantesDe(estado.resumen.enFilaAcabado, TOPE_DE_MOTOS_DIBUJADAS.acabado))
  return (
    <>
      <Sobrantes cuantas={sobranLavado} etapa="lavado" />
      <Sobrantes cuantas={sobranAcabado} etapa="acabado" />
    </>
  )
}

export function EscenaDelLavadero() {
  const soportaWebGL = useMemo(() => hayWebGL(), [])

  // Lo único a lo que se suscribe la escena: cuántas placas y puestos hay.
  // Son números, y solo cambian cuando alguien mueve el panel.
  const placas = useSimulacion((estado) => estado.parametros.placas)
  const puestos = useSimulacion((estado) => estado.parametros.puestos)

  // La vista que se ha pedido con un botón, esperando a que el lienzo la
  // recoja. Va en una referencia y no en estado: pulsar un botón de cámara no
  // debe volver a dibujar la escena.
  // El modo de respaldo de pantalla completa, por si el navegador rechaza la
  // suya. Es estado de la interfaz y vive aquí, no en el store: agrandar la
  // escena no tiene nada que ver con la simulación.
  const [expandida, setExpandida] = useState(false)
  const contenedor = useRef(null)

  const vistaPedida = useRef(null)
  const pedirVista = useCallback((clave) => {
    vistaPedida.current = clave
  }, [])
  const tomarOrden = useCallback(() => {
    const pedida = vistaPedida.current
    vistaPedida.current = null
    return pedida
  }, [])

  if (!soportaWebGL) {
    return (
      <section className="escena" aria-label="El lavadero en 3D">
        <Aviso tipo="advertencia" className="aviso-sin-3d">
          Este navegador no puede mostrar la vista en 3D porque no tiene WebGL
          disponible. El resto del simulador —los ajustes, los resultados y las
          gráficas— sigue funcionando con normalidad.
        </Aviso>
      </section>
    )
  }

  return (
    <section
      className={`escena${expandida ? ' escena--expandida' : ''}`}
      ref={contenedor}
      aria-label="El lavadero en 3D"
    >
      <div className="lienzo-3d">
        <Canvas
          camera={{ position: VISTA_INICIAL.posicion, fov: CAMPO_DE_VISION }}
          shadows={false}
          onCreated={({ gl }) => {
            // El lienzo es una imagen para las ayudas técnicas: se describe qué muestra.
            gl.domElement.setAttribute('role', 'img')
            gl.domElement.setAttribute('aria-label', DESCRIPCION_DE_LA_ESCENA)
          }}
        >
          <Iluminacion />
          <Terreno />
          <Local />
          <Avenidas />
          <Servidores placas={placas} puestos={puestos} />
          <Particulas placas={placas} />
          <Motos />
          <Sombras placas={placas} puestos={puestos} />
          <RotulosDeSobrantes />
          <ControlDeCamara tomarOrden={tomarOrden} />
          <AjusteALasCapas />
        </Canvas>

        {/* Todo lo que flota sobre la escena va en una fila arriba y un panel
            abajo, con fondo semitransparente, y deja libre el centro. */}
        <FilaSuperiorDeLaEscena
          alPedirVista={pedirVista}
          contenedor={contenedor}
          expandida={expandida}
          alExpandir={setExpandida}
        />
        <IndicadoresDeLaEscena />
        <MandosMinimos />
      </div>
    </section>
  )
}

export default EscenaDelLavadero
