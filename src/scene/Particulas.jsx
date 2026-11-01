import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import { DynamicDrawUsage, IcosahedronGeometry, Matrix4, MeshStandardMaterial, Quaternion, Vector3 } from 'three'

import { COLOR_DE_ESCENA, COLOR_DE_OCUPADO } from '../estilos/colores.js'
import { useSimulacion } from '../store/simulacion.js'
import {
  boquillaDeLaPlaca,
  BURBUJAS_POR_PLACA,
  posicionDeLaBurbuja,
  posicionDelChorro,
  PUNTOS_DEL_CHORRO,
} from './chorro.js'
import { GOTAS_POR_PLACA, PLACAS_COMO_MAXIMO, posicionDeLaGota } from './gotas.js'
import { estadoDeLasLosas } from './losasPublicadas.js'
import { estaLevantada } from './losasVisuales.js'
import { posicionDePlaca, SERVIDOR } from './posiciones.js'
import { avanceDelReloj, crearMemoriaDelReloj, pasoDeLaAnimacion } from './relojDeLaEscena.js'

const SIN_GIRO = new Quaternion()
const POSICION = new Vector3()
const ESCALA = new Vector3()
const MATRIZ = new Matrix4()

/** Lo decorativo no recibe clics: ni las gotas, ni el chorro, ni las burbujas abren o cierran una placa. */
const SIN_CLICS = () => null

/**
 * El agua de cada placa ocupada: las gotas bajo la manguera, el chorro que va de la
 * boquilla a la moto y las burbujas que suben de ella.
 *
 * Son tres mallas, una llamada de dibujo cada una (dos `Points` y una malla instanciada
 * de burbujas), sin importar cuántas placas haya. Las posiciones se escriben en
 * `useFrame`, sin pasar por React; las de las placas sin moto se esconden. Se mueven
 * con el reloj simulado: en pausa, quietas. Con la corrida larga en marcha no se dibuja
 * nada. Todo va con el mismo interruptor de calidad que la espuma (`particulas`).
 */
export function Particulas({ placas }) {
  const gotas = useRef(null)
  const chorro = useRef(null)
  const burbujas = useRef(null)
  const tiempo = useRef(0)
  const reloj = useRef(crearMemoriaDelReloj())

  const gotasIniciales = useMemo(() => new Float32Array(PLACAS_COMO_MAXIMO * GOTAS_POR_PLACA * 3), [])
  const chorroInicial = useMemo(() => new Float32Array(PLACAS_COMO_MAXIMO * PUNTOS_DEL_CHORRO * 3), [])

  const recursos = useMemo(
    () => ({
      geometriaDeBurbuja: new IcosahedronGeometry(1, 1),
      materialDeBurbuja: new MeshStandardMaterial({
        color: COLOR_DE_ESCENA.espuma,
        roughness: 0.15,
        transparent: true,
        opacity: 0.7,
        depthWrite: false,
      }),
    }),
    [],
  )
  useEffect(
    () => () => {
      recursos.geometriaDeBurbuja.dispose()
      recursos.materialDeBurbuja.dispose()
    },
    [recursos],
  )

  useFrame((_, delta) => {
    const { foto, generacion, corridaLarga } = useSimulacion.getState()
    if (!foto || !gotas.current || !chorro.current || !burbujas.current) return
    // Las gotas, el chorro y las burbujas se mueven con el reloj simulado: en pausa no avanzan, y a
    // menos de 1 min/s van más despacio, como la simulación.
    const { minutos } = avanceDelReloj(reloj.current, { relojMin: foto.relojMin, generacion, segundosReales: delta })
    if (corridaLarga) {
      reloj.current.generacion = null
      gotas.current.geometry.setDrawRange(0, 0)
      chorro.current.geometry.setDrawRange(0, 0)
      burbujas.current.count = 0
      return
    }
    tiempo.current += pasoDeLaAnimacion(delta, minutos)

    // Solo salen con la moto encima de la placa (ni reservada ni ya bajada), como la losa.
    const estados = estadoDeLasLosas({ foto, generacion })
    const posicionesDeGotas = gotas.current.geometry.attributes.position
    const posicionesDelChorro = chorro.current.geometry.attributes.position
    let nGotas = 0
    let nChorro = 0
    let nBurbujas = 0
    for (let i = 0; i < Math.min(placas, PLACAS_COMO_MAXIMO); i += 1) {
      if (!estaLevantada(estados[i])) continue
      const [px, , pz] = posicionDePlaca(i, placas)
      const boquilla = boquillaDeLaPlaca(i, placas)
      for (let k = 0; k < GOTAS_POR_PLACA; k += 1) {
        const [x, y, z] = posicionDeLaGota(k, tiempo.current, SERVIDOR.altoOcupado, boquilla)
        posicionesDeGotas.setXYZ(nGotas, px + x, y, pz + z)
        nGotas += 1
      }
      for (let k = 0; k < PUNTOS_DEL_CHORRO; k += 1) {
        const [x, y, z] = posicionDelChorro(k, tiempo.current, boquilla)
        posicionesDelChorro.setXYZ(nChorro, px + x, y, pz + z)
        nChorro += 1
      }
      for (let k = 0; k < BURBUJAS_POR_PLACA; k += 1) {
        const { x, y, z, radio } = posicionDeLaBurbuja(k, tiempo.current)
        if (radio < 0.002) continue
        POSICION.set(px + x, y, pz + z)
        ESCALA.setScalar(radio)
        burbujas.current.setMatrixAt(nBurbujas, MATRIZ.compose(POSICION, SIN_GIRO, ESCALA))
        nBurbujas += 1
      }
    }
    gotas.current.geometry.setDrawRange(0, nGotas)
    chorro.current.geometry.setDrawRange(0, nChorro)
    posicionesDeGotas.needsUpdate = true
    posicionesDelChorro.needsUpdate = true
    burbujas.current.count = nBurbujas
    burbujas.current.instanceMatrix.needsUpdate = true
  })

  return (
    <>
      <points ref={gotas} frustumCulled={false} raycast={SIN_CLICS}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[gotasIniciales, 3]} usage={DynamicDrawUsage} />
        </bufferGeometry>
        <pointsMaterial color={COLOR_DE_OCUPADO.lavado} size={0.07} sizeAttenuation transparent opacity={0.75} depthWrite={false} />
      </points>
      <points ref={chorro} frustumCulled={false} raycast={SIN_CLICS}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[chorroInicial, 3]} usage={DynamicDrawUsage} />
        </bufferGeometry>
        <pointsMaterial color={COLOR_DE_ESCENA.espuma} size={0.1} sizeAttenuation transparent opacity={0.9} depthWrite={false} />
      </points>
      <instancedMesh
        ref={(nodo) => {
          burbujas.current = nodo
          if (nodo) {
            nodo.instanceMatrix.setUsage(DynamicDrawUsage)
            nodo.count = 0
          }
        }}
        args={[recursos.geometriaDeBurbuja, recursos.materialDeBurbuja, PLACAS_COMO_MAXIMO * BURBUJAS_POR_PLACA]}
        frustumCulled={false}
        raycast={SIN_CLICS}
      />
    </>
  )
}

export default Particulas
