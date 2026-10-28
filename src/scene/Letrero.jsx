import { useEffect, useMemo } from 'react'

import { COLOR_DE_ESCENA } from '../estilos/colores.js'
import { crearTexturaDeLetrero } from './texturasDeRotulo.js'

const GROSOR_DEL_LETRERO = 0.08

/**
 * Un letrero fijo: un panel con texto en las dos caras, apoyado en dos postes
 * si `altoDelSuelo` es mayor que cero.
 *
 * A diferencia de `Rotulo`, no mira a la cámara: tiene un sitio y una
 * orientación en la escena, como el de una calle de verdad. Por eso su tamaño
 * no crece al acercarse la cámara y no puede acabar tapando la escena: se
 * coloca fuera del camino de la vista.
 *
 * @param {object} props
 * @param {string} props.texto
 * @param {[number, number, number]} props.position el centro del panel
 * @param {number} props.ancho
 * @param {number} props.alto
 * @param {number} [props.giro] giro sobre Y, en radianes; 0 mira a +Z
 * @param {string} [props.fondo]
 * @param {string} [props.color] color del texto y del marco
 * @param {boolean} [props.postes] si lleva postes hasta el suelo
 */
export function Letrero({
  texto,
  position,
  ancho,
  alto,
  giro = 0,
  fondo = COLOR_DE_ESCENA.letreroDeCalle,
  color = COLOR_DE_ESCENA.textoDeLetrero,
  postes = true,
}) {
  const textura = useMemo(
    () => crearTexturaDeLetrero(texto, { color, fondo, proporcion: ancho / alto }),
    [texto, color, fondo, ancho, alto],
  )
  useEffect(() => () => textura.dispose(), [textura])

  const caraDeAtras = GROSOR_DEL_LETRERO / 2 + 0.002
  const altoDePoste = position[1] - alto / 2

  return (
    <group position={position} rotation={[0, giro, 0]}>
      <mesh>
        <boxGeometry args={[ancho, alto, GROSOR_DEL_LETRERO]} />
        <meshStandardMaterial color={fondo} />
      </mesh>
      <mesh position={[0, 0, caraDeAtras]}>
        <planeGeometry args={[ancho, alto]} />
        <meshBasicMaterial map={textura} />
      </mesh>
      <mesh position={[0, 0, -caraDeAtras]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[ancho, alto]} />
        <meshBasicMaterial map={textura} />
      </mesh>
      {postes &&
        altoDePoste > 0 &&
        [-1, 1].map((lado) => (
          <mesh key={lado} position={[lado * (ancho / 2 - 0.25), -alto / 2 - altoDePoste / 2, 0]}>
            <cylinderGeometry args={[0.045, 0.045, altoDePoste, 8]} />
            <meshStandardMaterial color={COLOR_DE_ESCENA.metal} />
          </mesh>
        ))}
    </group>
  )
}

export default Letrero
