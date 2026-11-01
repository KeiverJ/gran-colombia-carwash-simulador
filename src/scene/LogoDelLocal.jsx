import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import { MeshStandardMaterial } from 'three'

import { COLOR_DE_ESCENA } from '../estilos/colores.js'
import { crearMaterialesDelLogo } from './logoDelLocal.js'
import {
  ALTURA_DE_LOS_SOPORTES,
  colocacionDelLetreroDeLaPared,
  colocacionDelLogoDelTecho,
  geometriaDeLosSoportes,
} from './logoEnLaEscena.js'
import { opacidadDelTecho, estadoDeLaOpacidad } from './techo.js'

/**
 * Una copia del logo: una malla por color (los de `logo.piezas`) y, si se le
 * pasan, los soportes. Las geometrías viven mientras la página esté abierta
 * (se construyen una vez), por eso las mallas llevan `dispose={null}`: React
 * Three Fiber no debe soltarlas al desmontar el logo.
 *
 * @param {object} props
 * @param {{ piezas: Array<{ geometria: object }> }} props.logo
 * @param {object[]} props.materiales un material por pieza, en el mismo orden
 * @param {number} props.ancho el ancho del logo en metros
 * @param {[number, number, number]} props.position el centro del logo
 * @param {{ geometria: object, material: object }} [props.soportes]
 *   los soportes, con su base en la losa (y = 0 en metros, bajo el centro del logo)
 */
export function LogoDelLocal({ logo, materiales, ancho, position, soportes, grupo }) {
  return (
    <group ref={grupo} position={position}>
      <group scale={ancho}>
        {logo.piezas.map(({ color, geometria }, i) => (
          <mesh key={color} geometry={geometria} material={materiales[i]} dispose={null} />
        ))}
      </group>
      {soportes && (
        <mesh
          geometry={soportes.geometria}
          material={soportes.material}
          position={[0, soportes.abajo, 0]}
          dispose={null}
        />
      )}
    </group>
  )
}

/** Materiales propios de una copia (nunca se comparten: cada una tiene su luz y su opacidad) y su limpieza. */
function useMaterialesDelLogo(logo) {
  const materiales = useMemo(() => crearMaterialesDelLogo(logo.piezas), [logo])
  useEffect(() => () => materiales.forEach((m) => m.dispose()), [materiales])
  return materiales
}

/**
 * La versión horizontal del logo en la pared del fondo, en el tramo macizo que va
 * de `desde` a `hasta`, ajustada a la franja de pared que se ve en la vista general.
 */
export function LetreroDeLaPared({ logo, pared, desde, hasta }) {
  const materiales = useMaterialesDelLogo(logo)
  const { ancho, position } = useMemo(() => colocacionDelLetreroDeLaPared(pared, desde, hasta), [pared, desde, hasta])
  return <LogoDelLocal logo={logo} materiales={materiales} ancho={ancho} position={position} />
}

/**
 * El logo en el borde delantero del techo, con sus soportes. Se aparta junto con
 * el techo: usa su misma opacidad (`opacidadDelTecho`), escrita cada cuadro en
 * `useFrame` y sin pasar por React, y desaparece cuando el techo desaparece.
 */
export function LogoDelTecho({ logo }) {
  const grupo = useRef(null)
  const materiales = useMaterialesDelLogo(logo)
  const colocacion = useMemo(() => colocacionDelLogoDelTecho(), [])
  const soportes = useMemo(() => {
    const geometria = geometriaDeLosSoportes(colocacion.ancho)
    const material = new MeshStandardMaterial({ color: COLOR_DE_ESCENA.columna, metalness: 0.3, roughness: 0.6 })
    return { geometria, material, abajo: -(colocacion.alto / 2 + ALTURA_DE_LOS_SOPORTES) }
  }, [colocacion])
  useEffect(
    () => () => {
      soportes.geometria.dispose()
      soportes.material.dispose()
    },
    [soportes],
  )

  useFrame(({ camera }) => {
    if (!grupo.current) return
    const opacidad = opacidadDelTecho(camera.position.toArray())
    const { visible, transparent, depthWrite } = estadoDeLaOpacidad(opacidad)
    grupo.current.visible = visible
    for (const material of [...materiales, soportes.material]) {
      material.opacity = opacidad
      material.transparent = transparent
      material.depthWrite = depthWrite
    }
  })

  return (
    <LogoDelLocal
      grupo={grupo}
      logo={logo}
      materiales={materiales}
      ancho={colocacion.ancho}
      position={colocacion.position}
      soportes={soportes}
    />
  )
}

export default LogoDelLocal
