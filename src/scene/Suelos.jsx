import { useEffect, useMemo } from 'react'

import { geometriaDeLosSuelos } from './geometriasDeLosSuelos.js'
import { CarroEstacionado } from './LavaderoDeCarros.jsx'
import { carrosDelParqueadero } from './suelos.js'
import { useModelosDeAmbiente } from './useModelosDeAmbiente.js'

/** Los modelos de los carros que se estacionan en el parqueadero de la cafetería. */
const CLAVES = ['mazda', 'deportivo']

/**
 * El suelo de las manzanas vecinas y del frente del lavadero (ver `suelos.js`): franjas de
 * pasto, un lote de tierra, parqueaderos con sus rayas y su borde, y la acera de la
 * cafetería, en una sola malla pegada al piso. Es decoración quieta: no recibe clics y no
 * depende del reloj.
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

/**
 * Los carros quietos del parqueadero de la cafetería: los modelos de carros que ya hay (si no
 * cargan, se omiten sin error). Se ocultan con la calidad adaptable, junto con los edificios.
 */
export function CarrosDelParqueadero({ visible = true }) {
  const { modelos } = useModelosDeAmbiente(CLAVES)
  const carros = useMemo(() => carrosDelParqueadero(), [])
  return (
    <group visible={visible} name="carros-del-parqueadero">
      {carros
        .filter((carro) => modelos[carro.modelo])
        .map((carro) => (
          <CarroEstacionado key={carro.modelo} modelo={modelos[carro.modelo]} sitio={carro} altura={0} />
        ))}
    </group>
  )
}

export default Suelos
