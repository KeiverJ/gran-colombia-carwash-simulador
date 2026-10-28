import { useEffect, useMemo } from 'react'

import { COLOR_DE_ESCENA } from '../estilos/colores.js'
import { veloDelBorde } from './geometriasDelEntorno.js'
import { TERRENO } from './posiciones.js'

/**
 * El terreno base: un disco amplio bajo el local y las dos avenidas, con un
 * velo del color del fondo encima de su borde. El velo es transparente cerca
 * del centro y opaco lejos, así que el terreno y las calles se disuelven en el
 * fondo de la escena: no hay un borde que se pueda ver desde ninguna vista.
 *
 * El velo se dibuja sin luz y sin pasar por el mapa de tonos, para que su color
 * sea exactamente el del fondo, y antes que lo demás de lo transparente
 * (`renderOrder`) para que el techo y las sombras se mezclen por encima de él.
 */
export function Terreno() {
  const { centro, radio, radioDelVelo, desvanecerDesde, desvanecerHasta } = TERRENO
  const velo = useMemo(
    () => veloDelBorde({ desde: desvanecerDesde, hasta: desvanecerHasta, radioExterior: radioDelVelo }),
    [desvanecerDesde, desvanecerHasta, radioDelVelo],
  )
  useEffect(() => () => velo.dispose(), [velo])

  return (
    <group position={centro}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}>
        <circleGeometry args={[radio, 96]} />
        <meshStandardMaterial color={COLOR_DE_ESCENA.terreno} roughness={1} />
      </mesh>
      <mesh geometry={velo} position={[0, 0.05, 0]} renderOrder={-1}>
        <meshBasicMaterial vertexColors transparent depthWrite={false} toneMapped={false} fog={false} />
      </mesh>
    </group>
  )
}

export default Terreno
