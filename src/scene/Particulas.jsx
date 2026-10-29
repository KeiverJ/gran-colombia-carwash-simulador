import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import { DynamicDrawUsage } from 'three'

import { COLOR_DE_OCUPADO } from '../estilos/colores.js'
import { useSimulacion } from '../store/simulacion.js'
import { avanceDelReloj, crearMemoriaDelReloj, pasoDeLaAnimacion } from './relojDeLaEscena.js'
import { GOTAS_POR_PLACA, PLACAS_COMO_MAXIMO, posicionDeLaGota } from './gotas.js'
import { posicionDePlaca, SERVIDOR } from './posiciones.js'

/**
 * Gotas de agua suaves bajo la manguera de cada placa ocupada.
 *
 * Es un solo `Points` con todas las gotas: una llamada de dibujo. Las posiciones
 * se escriben en `useFrame`, sin pasar por React, y las de las placas libres se
 * esconden debajo del piso. Se mueven con el reloj simulado: en pausa, quietas.
 */
export function Particulas({ placas }) {
  const puntos = useRef(null)
  const tiempo = useRef(0)
  const reloj = useRef(crearMemoriaDelReloj())

  const posicionesIniciales = useMemo(() => new Float32Array(PLACAS_COMO_MAXIMO * GOTAS_POR_PLACA * 3), [])

  useFrame((_, delta) => {
    const { foto, generacion } = useSimulacion.getState()
    if (!foto || !puntos.current) return
    // Las gotas caen con el reloj simulado: en pausa no se mueven, y a menos de 1 min/s
    // van más despacio, como la simulación.
    const { minutos } = avanceDelReloj(reloj.current, { relojMin: foto.relojMin, generacion, segundosReales: delta })
    tiempo.current += pasoDeLaAnimacion(delta, minutos)

    const { geometry } = puntos.current
    const posiciones = geometry.attributes.position
    let n = 0
    for (let i = 0; i < Math.min(placas, PLACAS_COMO_MAXIMO); i += 1) {
      const [px, , pz] = posicionDePlaca(i, placas)
      const ocupada = foto.placas[i] && !foto.placas[i].libre
      for (let k = 0; k < GOTAS_POR_PLACA; k += 1) {
        const [x, y, z] = ocupada
          ? posicionDeLaGota(k, tiempo.current, SERVIDOR.altoOcupado)
          : [0, -10, 0]
        posiciones.setXYZ(n, px + x, y, pz + z)
        n += 1
      }
    }
    geometry.setDrawRange(0, n)
    posiciones.needsUpdate = true
  })

  return (
    <points ref={puntos} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[posicionesIniciales, 3]} usage={DynamicDrawUsage} />
      </bufferGeometry>
      <pointsMaterial color={COLOR_DE_OCUPADO.lavado} size={0.07} sizeAttenuation transparent opacity={0.75} depthWrite={false} />
    </points>
  )
}

export default Particulas
