import { useEffect, useMemo } from 'react'

import { COLOR_DE_ESCENA } from '../estilos/colores.js'
import { CAFETERIA } from './cafeteria.js'
import { geometriaDeLaCafeteria } from './geometriasDeLaCafeteria.js'
import { LogoDeLaCafeteria } from './LogoDelLocal.jsx'
import { queSeDibujaEnLaPared } from './logoEnLaEscena.js'
import { crearTexturaDeLetrero } from './texturasDeRotulo.js'
import { useLetreroDelLocal } from './useLogoDelLocal.js'

/** Un objeto decorativo no recibe clics: no abre ni cierra ningún servidor. */
const SIN_CLICS = () => null

/** El texto del letrero cuando el logo no carga. */
const TEXTO_DEL_LETRERO = 'Car Wash Express'

/** El centro del tablero del letrero, sobre el techo, y su cara de adelante (hacia −Z). */
function sitioDelLetrero() {
  const { letrero, altoDelCuerpo, altoDelTecho, x0, x1 } = CAFETERIA
  return {
    x: (x0 + x1) / 2,
    y: altoDelCuerpo + altoDelTecho + letrero.sobreElTecho + letrero.alto / 2,
    zDeLaCara: letrero.z - 0.05,
  }
}

/** El texto de respaldo del letrero: un plano con el texto, mirando al lavadero. */
function TextoDelLetrero() {
  const { letrero } = CAFETERIA
  const sitio = sitioDelLetrero()
  const textura = useMemo(
    () =>
      crearTexturaDeLetrero(TEXTO_DEL_LETRERO, {
        color: COLOR_DE_ESCENA.textoDeLetrero,
        fondo: COLOR_DE_ESCENA.letreroDelLocal,
        proporcion: letrero.ancho / letrero.alto,
      }),
    [letrero.ancho, letrero.alto],
  )
  useEffect(() => () => textura.dispose(), [textura])
  return (
    <mesh position={[sitio.x, sitio.y, sitio.zDeLaCara - 0.002]} rotation={[0, Math.PI, 0]} raycast={SIN_CLICS}>
      <planeGeometry args={[letrero.ancho, letrero.alto]} />
      <meshBasicMaterial map={textura} />
    </mesh>
  )
}

/**
 * La cafetería del lavadero (sala de espera y caja), adelante del local y del lado
 * de la Av. Guaimaral, con su frente hacia el lavadero. Es decorativa: no recibe
 * clics y no cambia nada de la simulación.
 *
 * El edificio, el toldo, el tanque de agua, el mostrador, las mesas y las sillas
 * van en una sola malla (ver `geometriasDeLaCafeteria.js`). El letrero lleva el
 * logo horizontal del local si carga, y el texto «Car Wash Express» si no; mientras
 * carga, el tablero se ve liso.
 */
export function Cafeteria() {
  const geometria = useMemo(() => geometriaDeLaCafeteria(), [])
  useEffect(() => () => geometria.dispose(), [geometria])
  const letrero = useLetreroDelLocal()
  const queSeVe = queSeDibujaEnLaPared(letrero.estado)
  const sitio = sitioDelLetrero()

  return (
    <group>
      <mesh geometry={geometria} castShadow receiveShadow raycast={SIN_CLICS}>
        <meshStandardMaterial vertexColors roughness={0.85} />
      </mesh>
      {queSeVe === 'letrero-de-texto' && <TextoDelLetrero />}
      {queSeVe === 'letrero-3d' && <LogoDeLaCafeteria logo={letrero.logo} position={[sitio.x, sitio.y, sitio.zDeLaCara]} />}
    </group>
  )
}

export default Cafeteria
