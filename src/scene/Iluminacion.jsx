import { Environment, Lightformer } from '@react-three/drei'
import { useLayoutEffect, useMemo, useRef } from 'react'

import { COLOR_DE_ESCENA } from '../estilos/colores.js'
import { NIVELES_DE_CALIDAD, useCalidad } from './calidad.js'
import { DISTANCIA_DEL_SOL, direccionDelSol, recorteDeLaSombra } from './luz.js'

/** El lado del mapa de sombras, en píxeles (a calidad media se podría bajar a 1024). */
const MAPA_DE_SOMBRAS = 2048

/**
 * La luz de la escena: la tarde de Cúcuta.
 *
 * - **El sol**: una luz direccional cálida a unos 30° de elevación que entra
 *   desde la derecha y un poco desde el frente (ver `luz.js`), así las caras que
 *   miran a la vista general quedan iluminadas y las sombras caen hacia la
 *   izquierda y el fondo. Proyecta sombra con un mapa suave cuya cámara cubre el
 *   local, la cafetería y las avenidas cercanas.
 * - **El cielo** rellena lo que queda en sombra con un tono azulado
 *   (`hemisphereLight`: azul arriba, el color de la acera abajo).
 * - **Un entorno generado en código**: unos rectángulos de luz (`Lightformer`) en
 *   los tonos del cielo y del sol que se dibujan una sola vez en un mapa de
 *   reflejos. No descarga nada —no usa `preset` ni `files`, que sí piden un
 *   archivo a un servidor externo— y da a las motos oscuras y al piso mojado
 *   algo que reflejar.
 *
 * A calidad baja se apagan, en este orden, la sombra del sol (nivel 5: se quita
 * `castShadow` de la luz, una sola recompilación) y el entorno de reflejos
 * (nivel 6). Las luces directas se quedan.
 */
export function Iluminacion() {
  const { sombras, ambiente } = useCalidad((estado) => NIVELES_DE_CALIDAD[estado.nivel])

  const sol = useRef(null)
  const direccion = useMemo(() => direccionDelSol(), [])
  const posicion = useMemo(() => direccion.map((c) => c * DISTANCIA_DEL_SOL), [direccion])
  const recorte = useMemo(() => recorteDeLaSombra(undefined, direccion, DISTANCIA_DEL_SOL), [direccion])

  // La cámara de la sombra es ortográfica: se le dice qué recuadro cubrir.
  useLayoutEffect(() => {
    const camara = sol.current?.shadow.camera
    if (!camara) return
    camara.left = recorte.izquierda
    camara.right = recorte.derecha
    camara.bottom = recorte.abajo
    camara.top = recorte.arriba
    camara.near = recorte.cerca
    camara.far = recorte.lejos
    camara.updateProjectionMatrix()
  }, [recorte])

  return (
    <>
      <hemisphereLight args={[COLOR_DE_ESCENA.cieloHorizonte, COLOR_DE_ESCENA.acera, 0.55]} />
      <directionalLight
        ref={sol}
        position={posicion}
        color={COLOR_DE_ESCENA.sol}
        intensity={1.7}
        castShadow={sombras}
        shadow-mapSize={[MAPA_DE_SOMBRAS, MAPA_DE_SOMBRAS]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.04}
      />
      {ambiente && (
        <Environment frames={1} resolution={256} environmentIntensity={0.6}>
          <Lightformer form="rect" intensity={2.2} color={COLOR_DE_ESCENA.cieloHorizonte} position={[0, 9, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[22, 22, 1]} />
          <Lightformer form="rect" intensity={1.6} color={COLOR_DE_ESCENA.cieloHorizonte} position={[-12, 4, 2]} rotation={[0, Math.PI / 2, 0]} scale={[16, 5, 1]} />
          <Lightformer form="rect" intensity={2.0} color={COLOR_DE_ESCENA.sol} position={[12, 4, 2]} rotation={[0, -Math.PI / 2, 0]} scale={[16, 5, 1]} />
          <Lightformer form="rect" intensity={1.2} color={COLOR_DE_ESCENA.cieloHorizonte} position={[0, 4, 14]} rotation={[0, Math.PI, 0]} scale={[22, 5, 1]} />
          <Lightformer form="rect" intensity={0.8} color={COLOR_DE_ESCENA.pisoMojado} position={[0, 4, -14]} scale={[22, 5, 1]} />
        </Environment>
      )}
    </>
  )
}

export default Iluminacion
