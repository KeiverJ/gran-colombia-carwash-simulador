import { useEffect, useMemo } from 'react'
import { Matrix4, Quaternion, Vector3 } from 'three'

import { sitiosPorModelo } from './colocacion.js'
import { crearInstanciasDeAmbiente as instanciasDeAmbiente } from './instanciasDeAmbiente.js'
import { useModelosDeAmbiente } from './useModelosDeAmbiente.js'

const CLAVES = ['arbol1', 'arbol2', 'planta']
const EJE_Y = new Vector3(0, 1, 0)

/** Una malla instanciada por pieza de un modelo, con todas sus copias en sus sitios. */
function GrupoDeVegetacion({ modelo, sitios }) {
  const instancias = useMemo(() => instanciasDeAmbiente(modelo, sitios.length), [modelo, sitios.length])
  useEffect(() => {
    const matriz = new Matrix4()
    const giro = new Quaternion()
    sitios.forEach(({ x, z, giro: angulo, escala }, i) => {
      matriz.compose(new Vector3(x, 0, z), giro.setFromAxisAngle(EJE_Y, angulo), new Vector3(escala, escala, escala))
      instancias.poner(i, matriz)
    })
    instancias.fijar(sitios.length)
    return () => instancias.liberar()
  }, [instancias, sitios])
  return (
    <group>
      {instancias.mallas.map((malla, i) => (
        <primitive key={i} object={malla} />
      ))}
    </group>
  )
}

/**
 * Los árboles y las plantas de las aceras (ver `colocacion.js`), con los modelos
 * preparados y por instancias: las llamadas de dibujo dependen de cuántos modelos
 * hay, no de cuántos árboles. Un modelo que no carga se omite sin error y el resto
 * de la escena sigue completa. Es decoración quieta: no recibe clics y no depende
 * del reloj, así que no hay nada que congelar en pausa.
 */
export function Vegetacion() {
  const { modelos } = useModelosDeAmbiente(CLAVES)
  const grupos = useMemo(() => sitiosPorModelo(), [])
  return (
    <group>
      {CLAVES.map((clave) =>
        modelos[clave] && grupos[clave].length > 0 ? (
          <GrupoDeVegetacion key={clave} modelo={modelos[clave]} sitios={grupos[clave]} />
        ) : null,
      )}
    </group>
  )
}

export default Vegetacion
