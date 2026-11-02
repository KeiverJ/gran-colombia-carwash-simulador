import { useEffect, useMemo } from 'react'
import { IcosahedronGeometry, Matrix4, MeshStandardMaterial, Quaternion, InstancedMesh, Vector3 } from 'three'

import { COLOR_DE_ESCENA } from '../estilos/colores.js'
import { geometriaDelLavaderoDeCarros } from './geometriasDelLavaderoDeCarros.js'
import { crearInstanciasDeAmbiente } from './instanciasDeAmbiente.js'
import { blobsDeEspuma, carrosDelLavadero, COLUMNAS, ESPUMA_DEL_CARRO } from './lavaderoDeCarros.js'
import { useModelosDeAmbiente } from './useModelosDeAmbiente.js'

/** Es solo un adorno del lugar: no recibe clics. */
const SIN_CLICS = () => null

const EJE_Y = new Vector3(0, 1, 0)
const CLAVES = ['mazda', 'deportivo']

/** Un modelo de carro parado en su bahía, por instancias (una sola copia: las llamadas de dibujo son las de sus piezas). */
function CarroEstacionado({ modelo, sitio }) {
  const instancias = useMemo(() => crearInstanciasDeAmbiente(modelo, 1, { proyectaSombra: false }), [modelo])
  useEffect(() => {
    const matriz = new Matrix4().compose(
      new Vector3(sitio.x, COLUMNAS.alturaDelPiso, sitio.z),
      new Quaternion().setFromAxisAngle(EJE_Y, sitio.giro),
      new Vector3(1, 1, 1),
    )
    instancias.poner(0, matriz)
    instancias.fijar(1)
    return () => instancias.liberar()
  }, [instancias, sitio])
  return (
    <group>
      {instancias.mallas.map((malla, i) => (
        <primitive key={i} object={malla} />
      ))}
    </group>
  )
}

/** La espuma quieta de los dos carros: una sola malla instanciada de blobs blancos. */
function EspumaDeLosCarros({ carros }) {
  const { geometria, material, malla } = useMemo(() => {
    const geom = new IcosahedronGeometry(1, 0)
    const mat = new MeshStandardMaterial({ color: COLOR_DE_ESCENA.espuma, roughness: 0.9, flatShading: true })
    const m = new InstancedMesh(geom, mat, carros.length * ESPUMA_DEL_CARRO.blobs)
    m.raycast = SIN_CLICS
    const matriz = new Matrix4()
    const giro = new Quaternion()
    let n = 0
    carros.forEach((carro, i) => {
      for (const { x, y, z, radio } of blobsDeEspuma(i)) {
        // La espuma se calcula con el carro mirando a +Z y se gira con él.
        const sitio = new Vector3(x, y, z).applyAxisAngle(EJE_Y, carro.giro)
        matriz.compose(
          new Vector3(carro.x + sitio.x, COLUMNAS.alturaDelPiso + sitio.y, carro.z + sitio.z),
          giro,
          new Vector3(radio, radio * 0.8, radio),
        )
        m.setMatrixAt(n, matriz)
        n += 1
      }
    })
    m.instanceMatrix.needsUpdate = true
    return { geometria: geom, material: mat, malla: m }
  }, [carros])
  useEffect(
    () => () => {
      geometria.dispose()
      material.dispose()
      malla.dispose()
    },
    [geometria, material, malla],
  )
  return <primitive object={malla} />
}

/**
 * El lavado de carros del mismo local (ver `lavaderoDeCarros.js`): dos techos grandes,
 * naranja y gris, sobre columnas, y debajo las bahías con el piso marcado, las rejillas de
 * desagüe y las mangueras, con un carro quieto y con espuma en cada una. **Es solo una
 * referencia del lugar**: no tiene ninguna función y no forma parte del estudio. Lo fijo
 * va en una sola malla; los carros son los modelos de ambiente (si no cargan, se omiten
 * sin error). No proyecta sombra (no oscurece la fila de motos), no recibe clics y, con
 * `visible` apagado (la calidad adaptable), se oculta sin desmontarse.
 */
export function LavaderoDeCarros({ visible = true }) {
  const { modelos } = useModelosDeAmbiente(CLAVES)
  const geometria = useMemo(() => geometriaDelLavaderoDeCarros(), [])
  const carros = useMemo(() => carrosDelLavadero(), [])
  useEffect(() => () => geometria.dispose(), [geometria])
  const cargados = carros.filter((carro) => modelos[carro.modelo])

  return (
    <group visible={visible} name="lavado-de-carros">
      <mesh geometry={geometria} raycast={SIN_CLICS} receiveShadow>
        <meshStandardMaterial vertexColors roughness={0.9} flatShading />
      </mesh>
      {cargados.map((carro) => (
        <CarroEstacionado key={carro.modelo} modelo={modelos[carro.modelo]} sitio={carro} />
      ))}
      {cargados.length > 0 && <EspumaDeLosCarros carros={cargados} />}
    </group>
  )
}

export default LavaderoDeCarros
