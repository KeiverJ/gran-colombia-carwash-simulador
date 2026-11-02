import { useEffect, useMemo } from 'react'
import { Matrix4, Quaternion, Vector3 } from 'three'

import { FORMAS_DE_DETALLE, sitiosDeLosDetalles } from './colocacion.js'
import { geometriaDeLosDetalles } from './geometriasDeLosDetalles.js'
import { crearInstanciasDeAmbiente } from './instanciasDeAmbiente.js'
import { useModelosDeAmbiente } from './useModelosDeAmbiente.js'

/** Las claves de los modelos que usan los detalles (la matera usa el modelo de la planta). */
const CLAVES_DE_LOS_DETALLES = [...new Set(Object.values(FORMAS_DE_DETALLE).flatMap(({ modelo }) => (modelo ? [modelo] : [])))]

const EJE_Y = new Vector3(0, 1, 0)

/** Un modelo con todas sus copias en sus sitios, por instancias. */
function GrupoDeDetalles({ modelo, sitios }) {
  const instancias = useMemo(() => crearInstanciasDeAmbiente(modelo, sitios.length), [modelo, sitios.length])
  useEffect(() => {
    const matriz = new Matrix4()
    const giro = new Quaternion()
    sitios.forEach(({ x, y, z, giro: angulo, escala }, i) => {
      matriz.compose(new Vector3(x, y, z), giro.setFromAxisAngle(EJE_Y, angulo), new Vector3(escala, escala, escala))
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
 * Los detalles de la calle y de la cafetería (ver `colocacion.js`): faroles, el semáforo,
 * la señal «Stop», conos, baldes, materas, la caja registradora y la nevera con los modelos
 * preparados y por instancias, y las canecas, las bancas y la sombrilla hechas en código y
 * juntas en una sola malla. Un modelo que no carga se omite sin error y el resto de la
 * escena sigue completa. Es decoración quieta: no recibe clics y no depende del reloj, así
 * que no hay nada que congelar en pausa.
 */
export function Detalles() {
  const { modelos } = useModelosDeAmbiente(CLAVES_DE_LOS_DETALLES)
  const sitios = useMemo(() => sitiosDeLosDetalles(), [])
  const porModelo = useMemo(() => {
    const grupos = {}
    for (const sitio of sitios) {
      const { modelo } = FORMAS_DE_DETALLE[sitio.rol]
      if (modelo) (grupos[modelo] ??= []).push(sitio)
    }
    return grupos
  }, [sitios])
  const enCodigo = useMemo(() => geometriaDeLosDetalles(sitios), [sitios])
  useEffect(() => () => enCodigo?.dispose(), [enCodigo])

  return (
    <group>
      {Object.entries(porModelo).map(([clave, lista]) =>
        modelos[clave] ? <GrupoDeDetalles key={clave} modelo={modelos[clave]} sitios={lista} /> : null,
      )}
      {enCodigo && (
        <mesh geometry={enCodigo} castShadow receiveShadow raycast={() => null}>
          <meshStandardMaterial vertexColors roughness={0.85} flatShading />
        </mesh>
      )}
    </group>
  )
}

export default Detalles
