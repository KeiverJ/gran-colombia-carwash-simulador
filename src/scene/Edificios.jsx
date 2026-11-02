import { useEffect, useMemo, useState } from 'react'

import { geometriaDeLosEdificios, geometriaDeLosLetreros } from './geometriasDeLosEdificios.js'
import { crearAtlasDeLetreros } from './texturasDeLosEdificios.js'

/** Un edificio decorativo no recibe clics: no abre ni cierra ningún servidor. */
const SIN_CLICS = () => null

/**
 * Las casas y los locales de las manzanas vecinas (ver `edificios.js`): el fondo de la
 * escena. Todas las fachadas van **fusionadas en una sola malla** de color de vértice y los
 * letreros pintados en otra con un solo atlas de texto: dos llamadas de dibujo en total.
 * Decoración quieta (no depende del reloj, no recibe clics, no proyecta ni recibe sombra):
 * con `visible` apagado (la calidad adaptable) se ocultan sin desmontarse y no dejan huecos.
 * El atlas se dibuja al montar, en el navegador; mientras tanto (o si no se puede dibujar)
 * los edificios se ven sin su texto.
 */
export function Edificios({ visible = true }) {
  const cuerpos = useMemo(() => geometriaDeLosEdificios(), [])
  const letreros = useMemo(() => geometriaDeLosLetreros(), [])
  const [atlas, setAtlas] = useState(null)

  useEffect(() => () => cuerpos.dispose(), [cuerpos])
  useEffect(() => () => letreros.dispose(), [letreros])
  useEffect(() => {
    let textura = null
    try {
      textura = crearAtlasDeLetreros()
      setAtlas(textura)
    } catch {
      setAtlas(null)
    }
    return () => textura?.dispose()
  }, [])

  return (
    <group visible={visible} name="edificios-de-la-esquina">
      <mesh geometry={cuerpos} raycast={SIN_CLICS}>
        <meshStandardMaterial vertexColors roughness={0.95} flatShading />
      </mesh>
      {atlas && (
        <mesh geometry={letreros} raycast={SIN_CLICS}>
          <meshBasicMaterial map={atlas} toneMapped={false} />
        </mesh>
      )}
    </group>
  )
}

export default Edificios
