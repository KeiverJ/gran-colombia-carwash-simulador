import { useLayoutEffect, useMemo, useRef } from 'react'
import { Euler, Matrix4, MeshBasicMaterial, PlaneGeometry, Quaternion, Vector3 } from 'three'

import { COLOR_DE_ESCENA } from '../estilos/colores.js'
import {
  COLUMNAS_DEL_TECHO,
  posicionDePlaca,
  posicionDePuesto,
  POSTE_DE_LOSA,
  SERVIDOR,
} from './posiciones.js'
import { crearTexturaDeSombra } from './texturaDeSombra.js'

/** Hasta cuántas sombras estáticas puede haber: 4 columnas + 12 losas + 12 postes, con holgura. */
const CAPACIDAD = 48

/** Cuánto sobresale la sombra de una losa de su borde, como proporción de su tamaño. */
const HOLGURA_DE_LA_LOSA = 1.3

/** Las sombras estáticas: `[x, z, ancho, fondo]` de cada una. */
function sombrasEstaticas(placas, puestos) {
  const sombras = COLUMNAS_DEL_TECHO.map(([x, , z]) => [x, z, 1.5, 1.5])
  const losas = [
    ...Array.from({ length: placas }, (_, i) => posicionDePlaca(i, placas)),
    ...Array.from({ length: puestos }, (_, i) => posicionDePuesto(i, puestos)),
  ]
  for (const [x, , z] of losas) {
    sombras.push([x, z, SERVIDOR.ancho * HOLGURA_DE_LA_LOSA, SERVIDOR.fondo * HOLGURA_DE_LA_LOSA])
    sombras.push([x + POSTE_DE_LOSA.x, z + POSTE_DE_LOSA.z, 0.7, 0.7])
  }
  return sombras
}

/**
 * Las sombras suaves de contacto de lo que no se mueve: columnas, losas y
 * postes. Son óvalos que se desvanecen hacia el borde, en **una sola malla
 * instanciada** (una llamada de dibujo) que se escribe una vez y de nuevo solo
 * si cambia el número de placas o de puestos.
 *
 * `ContactShadows` de drei, que era la primera opción, calcula la sombra desde
 * debajo con una pasada extra de toda la escena y, medido en esta escena, no
 * dejó nada visible; además no sirve para una moto sobre una losa elevada, que
 * tiene su sombra por encima del piso. Las motos llevan su propia sombra
 * instanciada (ver `Motos.jsx`).
 */
export function Sombras({ placas, puestos }) {
  const malla = useRef(null)

  const recursos = useMemo(() => {
    const textura = crearTexturaDeSombra()
    return {
      textura,
      geometria: new PlaneGeometry(1, 1).rotateX(-Math.PI / 2),
      material: new MeshBasicMaterial({
        map: textura,
        color: COLOR_DE_ESCENA.letreroDelLocal,
        transparent: true,
        opacity: 0.4,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1,
      }),
    }
  }, [])

  useLayoutEffect(() => {
    const sombras = sombrasEstaticas(placas, puestos)
    const nodo = malla.current
    const matriz = new Matrix4()
    const sinGiro = new Quaternion().setFromEuler(new Euler())
    sombras.slice(0, CAPACIDAD).forEach(([x, z, ancho, fondo], i) => {
      nodo.setMatrixAt(i, matriz.compose(new Vector3(x, 0.02, z), sinGiro, new Vector3(ancho, 1, fondo)))
    })
    nodo.count = Math.min(sombras.length, CAPACIDAD)
    nodo.instanceMatrix.needsUpdate = true
  }, [placas, puestos])

  useLayoutEffect(
    () => () => {
      recursos.geometria.dispose()
      recursos.textura.dispose()
      recursos.material.dispose()
    },
    [recursos],
  )

  return <instancedMesh ref={malla} args={[recursos.geometria, recursos.material, CAPACIDAD]} frustumCulled={false} renderOrder={-1} />
}

export default Sombras
