import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import { DynamicDrawUsage, IcosahedronGeometry, Matrix4, MeshStandardMaterial, Quaternion, Vector3 } from 'three'

import { COLOR_DE_ESCENA } from '../estilos/colores.js'
import { useSimulacion } from '../store/simulacion.js'
import {
  ALTURA_DE_LA_PLACA_CON_MOTO,
  avanzarLaEspuma,
  BLOBS_DE_LA_ESPUMA,
  BLOBS_POR_PLACA,
  crearEspuma,
  crecimientoDelBlob,
  PLACAS_CON_ESPUMA_COMO_MAXIMO,
  tauDeLaEspuma,
} from './espuma.js'
import { estadoDeLasLosas } from './losasPublicadas.js'
import { estaLevantada } from './losasVisuales.js'
import { posicionDePlaca } from './posiciones.js'
import { avanceDelReloj, crearMemoriaDelReloj } from './relojDeLaEscena.js'

const SIN_GIRO = new Quaternion()
const POSICION = new Vector3()
const ESCALA = new Vector3()
const MATRIZ = new Matrix4()

/**
 * La espuma de las motos que se lavan: **una sola malla instanciada** de blobs
 * blancos (unos 18 por placa) que van apareciendo y creciendo a medida que pasa el
 * tiempo simulado de lavado, y desaparecen cuando la moto deja la placa. La cuenta
 * está en `espuma.js` (c = 1 − e^(−t/τ)); aquí solo se escribe en la malla, dentro
 * de `useFrame` y sin pasar por React.
 *
 * Se mueve con el reloj simulado: en pausa se queda quieta. Con la corrida larga
 * en marcha no se dibuja nada. Va con el mismo interruptor de calidad que las gotas.
 */
export function Espuma({ placas }) {
  const malla = useRef(null)
  const espumas = useRef([])
  const reloj = useRef(crearMemoriaDelReloj())

  const recursos = useMemo(
    () => ({
      geometria: new IcosahedronGeometry(1, 0),
      material: new MeshStandardMaterial({ color: COLOR_DE_ESCENA.espuma, roughness: 0.9, flatShading: true }),
    }),
    [],
  )
  useEffect(
    () => () => {
      recursos.geometria.dispose()
      recursos.material.dispose()
    },
    [recursos],
  )

  useFrame((_, delta) => {
    const { foto, generacion, corridaLarga, parametros } = useSimulacion.getState()
    const nodo = malla.current
    if (!foto || !nodo) return
    const { minutos, recolocar } = avanceDelReloj(reloj.current, {
      relojMin: foto.relojMin,
      generacion,
      segundosReales: delta,
    })
    if (corridaLarga) {
      reloj.current.generacion = null
      nodo.count = 0
      return
    }
    const estados = estadoDeLasLosas({ foto, generacion })
    const tau = tauDeLaEspuma(parametros.lavadoMin)

    let n = 0
    const visibles = Math.min(placas, PLACAS_CON_ESPUMA_COMO_MAXIMO)
    for (let i = 0; i < visibles; i += 1) {
      const espuma = (espumas.current[i] ??= crearEspuma())
      const c = avanzarLaEspuma(espuma, { conMoto: estaLevantada(estados[i]), minutos, recolocar, tau })
      if (c < 0.001) continue
      const [px, , pz] = posicionDePlaca(i, placas)
      for (const { x, y, z, radio, turno } of BLOBS_DE_LA_ESPUMA) {
        const crecimiento = crecimientoDelBlob(c, turno)
        if (crecimiento < 0.01) continue
        POSICION.set(px + x, ALTURA_DE_LA_PLACA_CON_MOTO + y, pz + z)
        ESCALA.setScalar(radio * crecimiento)
        nodo.setMatrixAt(n, MATRIZ.compose(POSICION, SIN_GIRO, ESCALA))
        n += 1
      }
    }
    nodo.count = n
    nodo.instanceMatrix.needsUpdate = true
  })

  return (
    <instancedMesh
      ref={(nodo) => {
        malla.current = nodo
        if (nodo) {
          nodo.instanceMatrix.setUsage(DynamicDrawUsage)
          nodo.count = 0
        }
      }}
      args={[recursos.geometria, recursos.material, PLACAS_CON_ESPUMA_COMO_MAXIMO * BLOBS_POR_PLACA]}
      frustumCulled={false}
      castShadow
    />
  )
}

export default Espuma
