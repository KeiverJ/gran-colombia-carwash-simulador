import { useEffect, useMemo, useState } from 'react'

import { centroDelEdificio, colorConNiebla, distanciaAlCentro, EDIFICIOS, letreroDelEdificio } from './edificios.js'
import { geometriaDelEdificio } from './geometriasDeLosEdificios.js'
import { crearTexturaDeLetrero } from './texturasDeRotulo.js'

/** Un edificio decorativo no recibe clics: no abre ni cierra ningún servidor. */
const SIN_CLICS = () => null

/** El texto de un letrero sobre su tablero, ya con la niebla de la distancia (se crea al montar, en el navegador). */
function TextoDelEdificio({ edificio }) {
  const letrero = useMemo(() => letreroDelEdificio(edificio), [edificio])
  const [textura, setTextura] = useState(null)
  useEffect(() => {
    const [cx, cz] = centroDelEdificio(edificio)
    const nueva = crearTexturaDeLetrero(letrero.texto, {
      color: colorConNiebla('textoDeLetrero', distanciaAlCentro(cx, cz)),
      fondo: colorConNiebla('edificioLetrero', distanciaAlCentro(cx, cz)),
      proporcion: letrero.ancho / letrero.alto,
    })
    setTextura(nueva)
    return () => nueva.dispose()
  }, [edificio, letrero])
  if (!textura) return null
  return (
    <mesh position={[letrero.x, letrero.y, letrero.z]} rotation={[0, letrero.giro, 0]} raycast={SIN_CLICS}>
      <planeGeometry args={[letrero.ancho, letrero.alto]} />
      <meshBasicMaterial map={textura} toneMapped={false} />
    </mesh>
  )
}

/** Un edificio: una malla de color de vértice y su letrero. Ni proyecta ni recibe sombra. */
function Edificio({ edificio }) {
  const geometria = useMemo(() => geometriaDelEdificio(edificio), [edificio])
  useEffect(() => () => geometria.dispose(), [geometria])
  return (
    <group>
      <mesh geometry={geometria} raycast={SIN_CLICS}>
        <meshStandardMaterial vertexColors roughness={0.95} flatShading />
      </mesh>
      <TextoDelEdificio edificio={edificio} />
    </group>
  )
}

/**
 * Los edificios bajos de la esquina (ver `edificios.js`): un concesionario, una perfumería,
 * una clínica veterinaria y un edificio genérico, al otro lado de las avenidas. Decoración
 * quieta (no depende del reloj, no recibe clics, no proyecta ni recibe sombra): con `visible`
 * apagado (la calidad adaptable) se ocultan sin desmontarse y no dejan huecos.
 */
export function Edificios({ visible = true }) {
  return (
    <group visible={visible} name="edificios-de-la-esquina">
      {EDIFICIOS.map((edificio) => (
        <Edificio key={edificio.clave} edificio={edificio} />
      ))}
    </group>
  )
}

export default Edificios
