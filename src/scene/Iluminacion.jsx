import { Environment, Lightformer } from '@react-three/drei'

import { COLOR_DE_ESCENA } from '../estilos/colores.js'

/**
 * La luz de la escena.
 *
 * Además de las luces directas hay un **entorno generado en código**: unos
 * rectángulos de luz (`Lightformer`) que se dibujan una sola vez en un mapa de
 * reflejos. No descarga nada —no usa `preset` ni `files`, que sí piden un
 * archivo a un servidor externo— y da a las motos oscuras y al piso mojado
 * algo que reflejar. Sin él, un material metálico o brillante se ve plano y
 * las motos negras se ven como manchas.
 *
 * Es un caja de luz suave: una grande arriba (el cielo), dos tiras a los lados
 * y una detrás de la cámara que rellena de frente.
 */
export function Iluminacion() {
  return (
    <>
      <ambientLight intensity={0.3} />
      <directionalLight position={[8, 14, 6]} intensity={0.9} />
      <Environment frames={1} resolution={256} environmentIntensity={0.6}>
        <Lightformer form="rect" intensity={2.2} color={COLOR_DE_ESCENA.pinturaVial} position={[0, 9, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[22, 22, 1]} />
        <Lightformer form="rect" intensity={1.6} color={COLOR_DE_ESCENA.pinturaVial} position={[-12, 4, 2]} rotation={[0, Math.PI / 2, 0]} scale={[16, 5, 1]} />
        <Lightformer form="rect" intensity={1.6} color={COLOR_DE_ESCENA.pinturaVial} position={[12, 4, 2]} rotation={[0, -Math.PI / 2, 0]} scale={[16, 5, 1]} />
        <Lightformer form="rect" intensity={1.2} color={COLOR_DE_ESCENA.pisoMojado} position={[0, 4, 14]} rotation={[0, Math.PI, 0]} scale={[22, 5, 1]} />
        <Lightformer form="rect" intensity={0.8} color={COLOR_DE_ESCENA.pisoMojado} position={[0, 4, -14]} scale={[22, 5, 1]} />
      </Environment>
    </>
  )
}

export default Iluminacion
