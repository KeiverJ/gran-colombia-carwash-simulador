import { OrbitControls } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { useMemo } from 'react'

import { comoReloj } from '../components/formato.js'
import { useSimulacion } from '../store/simulacion.js'
import LeyendaDePlanes from './LeyendaDePlanes.jsx'
import { Local, Servidores, Sobrantes } from './Local.jsx'
import Motos from './Motos.jsx'
import { sobrantesDe, TOPE_DE_MOTOS_DIBUJADAS } from './posiciones.js'

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

/**
 * El reloj y los dos conteos, en texto.
 *
 * Lee el resumen del store, que se refresca cuatro veces por segundo. Si
 * leyera la foto, a velocidad alta el reloj cambiaría en cada cuadro y con él
 * se repintaría toda la escena.
 */
function ResumenDelLavadero() {
  const resumen = useSimulacion((estado) => estado.resumen)
  return (
    <p className="reloj">
      Tiempo simulado: <strong>{comoReloj(resumen.relojMin)}</strong> · esperando
      para el lavado: <strong>{resumen.enFilaLavado}</strong> · para el acabado:{' '}
      <strong>{resumen.enFilaAcabado}</strong>
    </p>
  )
}

/** Los rótulos de "+X motos más", con el mismo freno que el resumen. */
function RotulosDeSobrantes() {
  const sobranLavado = useSimulacion((estado) => sobrantesDe(estado.resumen.enFilaLavado))
  const sobranAcabado = useSimulacion((estado) => sobrantesDe(estado.resumen.enFilaAcabado))
  return (
    <>
      <Sobrantes cuantas={sobranLavado} etapa="lavado" tope={TOPE_DE_MOTOS_DIBUJADAS} />
      <Sobrantes cuantas={sobranAcabado} etapa="acabado" tope={TOPE_DE_MOTOS_DIBUJADAS} />
    </>
  )
}

export function EscenaDelLavadero() {
  const soportaWebGL = useMemo(() => hayWebGL(), [])

  // Lo único a lo que se suscribe la escena: cuántas placas y puestos hay.
  // Son números, y solo cambian cuando alguien mueve el panel.
  const placas = useSimulacion((estado) => estado.parametros.placas)
  const puestos = useSimulacion((estado) => estado.parametros.puestos)

  if (!soportaWebGL) {
    return (
      <section className="escena">
        <h2>El lavadero en 3D</h2>
        <p className="aviso-sin-3d">
          Este navegador no puede mostrar la vista en 3D porque no tiene WebGL
          disponible. El resto del simulador —el panel, la tabla de métricas y la
          gráfica— sigue funcionando con normalidad.
        </p>
      </section>
    )
  }

  return (
    <section className="escena">
      <h2>El lavadero en 3D</h2>

      <ResumenDelLavadero />

      <div className="lienzo-3d">
        <Canvas camera={{ position: [0, 13, 22], fov: 48 }} shadows={false}>
          <ambientLight intensity={0.75} />
          <directionalLight position={[8, 14, 6]} intensity={1.1} />
          <Local />
          <Servidores placas={placas} puestos={puestos} />
          <Motos />
          <RotulosDeSobrantes />
          <OrbitControls enablePan={false} minDistance={10} maxDistance={55} maxPolarAngle={1.45} />
        </Canvas>
      </div>

      <LeyendaDePlanes />
    </section>
  )
}

export default EscenaDelLavadero
