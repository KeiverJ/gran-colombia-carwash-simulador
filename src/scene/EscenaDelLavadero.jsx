import { Canvas } from '@react-three/fiber'
import { useCallback, useMemo, useRef, useState } from 'react'

import Aviso from '../components/Aviso.jsx'
import BotonDePantallaCompleta from '../components/BotonDePantallaCompleta.jsx'
import IndicadoresDeLaEscena from '../components/IndicadoresDeLaEscena.jsx'
import MandosMinimos from '../components/MandosMinimos.jsx'
import { CAMPO_DE_VISION, VISTA_INICIAL } from './camara.js'
import { BotonesDeCamara, ControlDeCamara } from './ControlesDeCamara.jsx'
import { useSimulacion } from '../store/simulacion.js'
import LeyendaDePlanes from './LeyendaDePlanes.jsx'
import { Local, Servidores, Sobrantes } from './Local.jsx'
import Motos from './Motos.jsx'
import { sobrantesDe } from './posiciones.js'

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

/** Los rótulos de "+X motos más", con el mismo freno que el resumen. */
function RotulosDeSobrantes() {
  const sobranLavado = useSimulacion((estado) => sobrantesDe(estado.resumen.enFilaLavado))
  const sobranAcabado = useSimulacion((estado) => sobrantesDe(estado.resumen.enFilaAcabado))
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
  const pedirVista = useCallback((sacarLaVista) => {
    vistaPedida.current = sacarLaVista
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
        >
          <ambientLight intensity={0.75} />
          <directionalLight position={[8, 14, 6]} intensity={1.1} />
          <Local />
          <Servidores placas={placas} puestos={puestos} />
          <Motos />
          <RotulosDeSobrantes />
          <ControlDeCamara tomarOrden={tomarOrden} />
        </Canvas>

        {/* Todo lo que flota sobre la escena va en las esquinas y el borde de
            abajo, con fondo semitransparente, y deja libre el centro. */}
        <div className="flotante-superior">
          <BotonesDeCamara alPedirVista={pedirVista} />
          <div className="flotante-derecha">
            <LeyendaDePlanes />
            <BotonDePantallaCompleta
              contenedor={contenedor}
              expandida={expandida}
              alExpandir={setExpandida}
            />
          </div>
        </div>
        <IndicadoresDeLaEscena />
        <MandosMinimos />
      </div>
    </section>
  )
}

export default EscenaDelLavadero
