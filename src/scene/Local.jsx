import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import { MeshStandardMaterial } from 'three'

import { COLOR_DE_ESTADO } from '../estilos/colores.js'
import { useSimulacion } from '../store/simulacion.js'
import { Rotulo } from './Rotulo.jsx'
import {
  AVENIDAS,
  LOCAL,
  posicionDePlaca,
  posicionEnFila,
  posicionDePuesto,
  SERVIDOR,
} from './posiciones.js'

/** El piso, las dos entradas y la salida. */
export function Local() {
  return (
    <group>
      {/* Piso del local */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]}>
        <planeGeometry args={[LOCAL.ancho + 4, LOCAL.fondo]} />
        <meshStandardMaterial color="#e8eef1" />
      </mesh>

      {/* Franja de la zona de lavado, al frente */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.04, LOCAL.zPlacas]}>
        <planeGeometry args={[LOCAL.ancho + 4, 6]} />
        <meshStandardMaterial color="#d6e6ec" />
      </mesh>

      {/* Franja de la zona de acabado, al fondo */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.04, LOCAL.zPuestos]}>
        <planeGeometry args={[LOCAL.ancho + 4, 6]} />
        <meshStandardMaterial color="#cfe3dd" />
      </mesh>

      {/* Las dos avenidas por donde entran las motos */}
      {Object.values(AVENIDAS).map((avenida) => (
        <group key={avenida.nombre}>
          <mesh
            rotation={[-Math.PI / 2, 0, 0]}
            position={[avenida.x, -0.03, LOCAL.zEntrada - 1]}
          >
            <planeGeometry args={[3, 5]} />
            <meshStandardMaterial color="#c8d4da" />
          </mesh>
          <Rotulo
            position={[avenida.x, 1.6, LOCAL.zEntrada - 3]}
            alto={1.7}
            color="#0b7c86"
            borde="#0b7c86"
          >
            {avenida.nombre}
          </Rotulo>
        </group>
      ))}

      <Rotulo position={[0, 1.3, LOCAL.zSalida + 1.5]} alto={1} color="#0b7c86">
        Salida
      </Rotulo>
    </group>
  )
}

/**
 * Las placas de lavado y los puestos de acabado.
 *
 * Solo recibe cuántos hay de cada uno: el estado de ocupación lo lee dentro
 * del ciclo de dibujo y lo aplica cambiando a mano el material y la altura de
 * cada losa. Si pasara por React, cada cambio de ocupación provocaría un
 * render, y a velocidad alta son varios por cuadro.
 *
 * Libre y ocupado se distinguen por color y además por altura: el verde y el
 * rojo son casi el mismo color para quien no distingue esos dos.
 */
export function Servidores({ placas, puestos }) {
  const losas = useRef([])

  const materiales = useMemo(
    () => ({
      libre: new MeshStandardMaterial({ color: COLOR_DE_ESTADO.libre }),
      ocupada: new MeshStandardMaterial({ color: COLOR_DE_ESTADO.ocupada }),
    }),
    [],
  )

  // Los materiales los creamos nosotros, así que nos toca soltarlos.
  useEffect(() => {
    const { libre, ocupada } = materiales
    return () => {
      libre.dispose()
      ocupada.dispose()
    }
  }, [materiales])

  useFrame(() => {
    const { foto } = useSimulacion.getState()
    if (!foto) return
    const servidores = [...foto.placas, ...foto.puestos]
    servidores.forEach((servidor, i) => {
      const losa = losas.current[i]
      if (!losa) return
      const alto = servidor.libre ? SERVIDOR.altoLibre : SERVIDOR.altoOcupado
      losa.scale.y = alto / SERVIDOR.altoOcupado
      losa.position.y = alto / 2
      losa.material = servidor.libre ? materiales.libre : materiales.ocupada
    })
  })

  const todos = [
    ...Array.from({ length: placas }, (_, i) => ({
      clave: `placa-${i}`,
      numero: i + 1,
      posicion: posicionDePlaca(i, placas),
    })),
    ...Array.from({ length: puestos }, (_, i) => ({
      clave: `puesto-${i}`,
      numero: i + 1,
      posicion: posicionDePuesto(i, puestos),
    })),
  ]

  return (
    <group>
      {todos.map(({ clave, numero, posicion }, i) => (
        <group key={clave} position={posicion}>
          <mesh
            ref={(nodo) => {
              losas.current[i] = nodo
            }}
            material={materiales.libre}
            position={[0, SERVIDOR.altoLibre / 2, 0]}
            scale={[1, SERVIDOR.altoLibre / SERVIDOR.altoOcupado, 1]}
          >
            <boxGeometry args={[SERVIDOR.ancho, SERVIDOR.altoOcupado, SERVIDOR.fondo]} />
          </mesh>
          <Rotulo position={[0, SERVIDOR.altoOcupado + 0.6, 0]} alto={0.9}>
            {numero}
          </Rotulo>
        </group>
      ))}
    </group>
  )
}

/**
 * El rótulo del final de una fila cuando hay más motos de las que se dibujan.
 *
 * Con la etapa 2 saturada la fila llega a miles: se dibujan las primeras y el
 * resto se cuenta aquí, justo donde se acaba la fila dibujada.
 */
export function Sobrantes({ cuantas, etapa, tope }) {
  if (cuantas <= 0) {
    return null
  }
  const [x, , z] = posicionEnFila(tope, etapa)
  return (
    <Rotulo position={[x - 1.5, 1.3, z]} alto={1.2} color="#b65050" borde="#b65050">
      +{cuantas.toLocaleString('es-CO')} motos más
    </Rotulo>
  )
}
