import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import { BackSide } from 'three'

import { cupulaDelCielo } from './geometriasDelEntorno.js'

/** Radio de la cúpula: más lejos que el velo del terreno y dentro del alcance de la cámara. */
const RADIO_DEL_CIELO = 500

/**
 * El cielo: una cúpula azul que va de un azul intenso arriba a uno claro en el
 * horizonte (los colores salen del tema: `cieloCenit` y `cieloHorizonte`).
 *
 * Se mira desde dentro, sin luz, sin niebla, sin mapa de tonos y sin escribir
 * profundidad, y se dibuja primero (como el velo del terreno, que termina en el
 * mismo color del horizonte, así que terreno y cielo se encuentran sin corte).
 * Sigue a la cámara para que no tenga paralaje: siempre está infinitamente lejos.
 * Está hecho en código: no usa imágenes ni pide nada a internet.
 */
export function Cielo() {
  const cupula = useMemo(() => cupulaDelCielo({ radio: RADIO_DEL_CIELO }), [])
  const malla = useRef(null)
  useEffect(() => () => cupula.dispose(), [cupula])

  useFrame(({ camera }) => {
    malla.current?.position.copy(camera.position)
  })

  return (
    <mesh ref={malla} geometry={cupula} renderOrder={-10} frustumCulled={false}>
      <meshBasicMaterial vertexColors side={BackSide} depthWrite={false} toneMapped={false} fog={false} />
    </mesh>
  )
}

export default Cielo
