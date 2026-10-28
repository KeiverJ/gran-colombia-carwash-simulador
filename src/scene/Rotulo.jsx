import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import { Vector3 } from 'three'

import { altoDelCuadroDe, anclaDentroDelLienzo, escalaParaPixeles } from './tamanoEnPantalla.js'
import { COLORES_DE_ROTULO, crearTextura } from './texturasDeRotulo.js'

/** Para proyectar la posición de un rótulo a la pantalla sin crear uno nuevo cada cuadro. */
const EN_LA_PANTALLA = new Vector3()

/**
 * Un rótulo dentro de la escena: texto en una tarjeta, dibujado como una
 * textura sobre un `sprite`, que mira siempre a la cámara. Ver
 * `texturasDeRotulo.js` para saber por qué no se usan `Html` ni `Text`.
 *
 * @param {object} props
 * @param {[number, number, number]} props.position
 * @param {string} props.children el texto del rótulo
 * @param {number} [props.alto] alto en unidades del mundo
 * @param {number} [props.pixeles] si se da, el rótulo mide siempre este alto en la
 *   pantalla (no crece al acercar la cámara) y `alto` no cuenta
 * @param {boolean} [props.sinSalirse] el rótulo se corre lo justo para no salirse del
 *   lienzo (solo con `pixeles`)
 * @param {boolean} [props.encima] se dibuja siempre por encima de la escena: nada
 *   (columnas, techo, motos) lo atraviesa ni lo tapa
 * @param {[number, number]} [props.ancla] qué punto del rótulo cae sobre `position`
 *   (0 = izquierda o abajo, 1 = derecha o arriba); por defecto, el centro
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
  pixeles,
  encima = false,
  sinSalirse = false,
  ancla = [0.5, 0.5],
}) {
  const sprite = useRef(null)
  // Los hijos pueden venir partidos ("+", el número, " motos más"): unirlos
  // con String() metería las comas del arreglo en medio del rótulo.
  const texto = Array.isArray(children) ? children.join('') : String(children)
  const { textura, ancho } = useMemo(
    () => crearTextura(texto, { color, fondo, borde, relleno, negrita }),
    [texto, color, fondo, borde, relleno, negrita],
  )

  // La textura la creamos nosotros, así que nos toca soltarla.
  useEffect(() => () => textura.dispose(), [textura])

  // De tamaño fijo en pantalla: la escala se rehace cada cuadro con la cámara de ese momento.
  useFrame(({ camera, size }) => {
    if (pixeles === undefined || !sprite.current) return
    const alturaDelMundo = escalaParaPixeles(pixeles, altoDelCuadroDe(camera, size.height), camera.fov)
    sprite.current.scale.set(alturaDelMundo * ancho, alturaDelMundo, 1)
    if (sinSalirse) {
      sprite.current.getWorldPosition(EN_LA_PANTALLA).project(camera)
      const xEnPantalla = (EN_LA_PANTALLA.x * 0.5 + 0.5) * size.width
      sprite.current.center.set(
        anclaDentroDelLienzo(xEnPantalla, pixeles * ancho, ancla[0], size.width),
        ancla[1],
      )
    }
  })

  return (
    <sprite
      ref={sprite}
      position={position}
      scale={[alto * ancho, alto, 1]}
      center={ancla}
      renderOrder={encima ? 1000 : 0}
    >
      <spriteMaterial
        map={textura}
        transparent
        depthWrite={false}
        depthTest={!encima}
        sizeAttenuation={pixeles === undefined}
      />
    </sprite>
  )
}

export default Rotulo
