import { useEffect, useMemo } from 'react'

import { COLORES_DE_ROTULO, crearTextura } from './texturasDeRotulo.js'

/**
 * Un rótulo dentro de la escena: texto en una tarjeta, dibujado como una
 * textura sobre un `sprite`, que mira siempre a la cámara. Ver
 * `texturasDeRotulo.js` para saber por qué no se usan `Html` ni `Text`.
 *
 * @param {object} props
 * @param {[number, number, number]} props.position
 * @param {string} props.children el texto del rótulo
 * @param {number} [props.alto] alto en unidades del mundo
 * @param {number} [props.relleno] espacio a los lados del texto, en píxeles CSS
 * @param {boolean} [props.negrita]
 */
export function Rotulo({
  position,
  children,
  alto = 0.8,
  color = COLORES_DE_ROTULO.color,
  fondo = COLORES_DE_ROTULO.fondo,
  borde = COLORES_DE_ROTULO.borde,
  relleno,
  negrita,
}) {
  // Los hijos pueden venir partidos ("+", el número, " motos más"): unirlos
  // con String() metería las comas del arreglo en medio del rótulo.
  const texto = Array.isArray(children) ? children.join('') : String(children)
  const { textura, ancho } = useMemo(
    () => crearTextura(texto, { color, fondo, borde, relleno, negrita }),
    [texto, color, fondo, borde, relleno, negrita],
  )

  // La textura la creamos nosotros, así que nos toca soltarla.
  useEffect(() => () => textura.dispose(), [textura])

  return (
    <sprite position={position} scale={[alto * ancho, alto, 1]}>
      <spriteMaterial map={textura} transparent depthWrite={false} />
    </sprite>
  )
}

export default Rotulo
