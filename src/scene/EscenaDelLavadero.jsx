import { Canvas } from '@react-three/fiber'
import { useCallback, useMemo, useRef, useState } from 'react'

import Aviso from '../components/Aviso.jsx'
import AvisoDeLaEscenaCaida from '../components/AvisoDeLaEscenaCaida.jsx'
import AvisoDeCorridaLarga from '../components/AvisoDeCorridaLarga.jsx'
import IndicadoresDeLaEscena from '../components/IndicadoresDeLaEscena.jsx'
import MandosMinimos from '../components/MandosMinimos.jsx'
import AjusteALasCapas from './AjusteALasCapas.jsx'
import CalidadAdaptable from './CalidadAdaptable.jsx'
import { useCalidad, NIVELES_DE_CALIDAD } from './calidad.js'
import { CAMPO_DE_VISION, VISTA_INICIAL } from './camara.js'
import { ControlDeCamara } from './ControlesDeCamara.jsx'
import FilaSuperiorDeLaEscena from './FilaSuperiorDeLaEscena.jsx'
import { useSimulacion } from '../store/simulacion.js'
import Avenidas from './Avenidas.jsx'
import Cafeteria from './Cafeteria.jsx'
import Cielo from './Cielo.jsx'
import Detalles from './Detalles.jsx'
import Espuma from './Espuma.jsx'
import Iluminacion from './Iluminacion.jsx'
import Local from './Local.jsx'
import Motos from './Motos.jsx'
import Particulas from './Particulas.jsx'
import Personas from './Personas.jsx'
import { sobrantesDe, TOPE_DE_MOTOS_DIBUJADAS } from './posiciones.js'
import { Servidores, Sobrantes } from './Servidores.jsx'
import Sombras from './Sombras.jsx'
import Terreno from './Terreno.jsx'
import Trafico from './Trafico.jsx'
import Vegetacion from './Vegetacion.jsx'

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

/**
 * Lo que se puede apagar si la escena va lenta (ver `calidad.js`): las gotas de
 * agua con la espuma, las personas (se ocultan sin desmontarse) y las sombras
 * suaves de contacto de lo fijo. Los charcos leen su interruptor en `Charcos.jsx`,
 * el tráfico lee el suyo en `Trafico.jsx`, y la sombra del sol y el entorno de
 * reflejos lo leen en `Iluminacion.jsx`.
 */
function EfectosQueSePuedenApagar({ placas, puestos }) {
  const { trafico, particulas, personas, sombras } = useCalidad((estado) => NIVELES_DE_CALIDAD[estado.nivel])
  return (
    <>
      <Trafico visible={trafico} />
      <Personas placas={placas} puestos={puestos} visible={personas} />
      {particulas && <Particulas placas={placas} />}
      {particulas && <Espuma placas={placas} />}
      {sombras && <Sombras placas={placas} puestos={puestos} />}
    </>
  )
}

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
  // Si el navegador le quita a la página la tarjeta gráfica (`webglcontextlost`), la escena
  // se cambia por un aviso con un botón para dibujarla de nuevo (otro lienzo, otro contexto).
  const [contextoPerdido, setContextoPerdido] = useState(false)
  const [intento, setIntento] = useState(0)

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

  if (contextoPerdido) {
    return (
      <AvisoDeLaEscenaCaida
        alReintentar={() => {
          setContextoPerdido(false)
          setIntento((n) => n + 1)
        }}
      />
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
          key={intento}
          camera={{ position: VISTA_INICIAL.posicion, fov: CAMPO_DE_VISION }}
          shadows="soft"
          onCreated={({ gl }) => {
            // El lienzo es una imagen para las ayudas técnicas: se describe qué muestra.
            gl.domElement.setAttribute('role', 'img')
            gl.domElement.setAttribute('aria-label', DESCRIPCION_DE_LA_ESCENA)
            gl.domElement.addEventListener('webglcontextlost', (evento) => {
              evento.preventDefault()
              setContextoPerdido(true)
            })
          }}
        >
          <Cielo />
          <Iluminacion />
          <Terreno />
          <Local />
          <Cafeteria />
          <Vegetacion />
          <Detalles />
          <Avenidas />
          {/* Primero las motos: las losas y las gotas siguen a lo que ellas hacen en este cuadro. */}
          <Motos />
          <Servidores placas={placas} puestos={puestos} />
          <EfectosQueSePuedenApagar placas={placas} puestos={puestos} />
          <RotulosDeSobrantes />
          <ControlDeCamara tomarOrden={tomarOrden} />
          <AjusteALasCapas />
          <CalidadAdaptable />
        </Canvas>

        {/* Todo lo que flota sobre la escena va en una fila arriba y un panel
            abajo, con fondo semitransparente, y deja libre el centro. */}
        <FilaSuperiorDeLaEscena
          alPedirVista={pedirVista}
          contenedor={contenedor}
          expandida={expandida}
          alExpandir={setExpandida}
        />
        <AvisoDeCorridaLarga />
        <IndicadoresDeLaEscena />
        <MandosMinimos />
      </div>
    </section>
  )
}

export default EscenaDelLavadero
