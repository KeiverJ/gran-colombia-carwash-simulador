import { useEffect, useMemo } from 'react'

import { geometriaDeLosSuelos } from './geometriasDeLosSuelos.js'

/**
 * El suelo de las manzanas vecinas (ver `suelos.js`): franjas de pasto, un lote de tierra y
 * parqueaderos con sus rayas, en una sola malla pegada al piso. Es decoración quieta: no
 * recibe clics y no depende del reloj.
 */
export function Suelos() {
  const geometria = useMemo(() => geometriaDeLosSuelos(), [])
  useEffect(() => () => geometria.dispose(), [geometria])
  return (
    <mesh geometry={geometria} receiveShadow raycast={() => null}>
      <meshStandardMaterial vertexColors roughness={1} />
    </mesh>
  )
}

export default Suelos
