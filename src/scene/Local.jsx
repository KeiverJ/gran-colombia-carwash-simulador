import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import { MeshStandardMaterial } from 'three'

import { COLOR_DE_ESTADO } from '../estilos/colores.js'
import { useSimulacion } from '../store/simulacion.js'
import { NumeroEnLaLosa, Rotulo, RotuloEnElSuelo } from './Rotulo.jsx'
import {
  AVENIDAS,
  COLUMNAS_DEL_TECHO,
  LOCAL,
  posicionDePlaca,
  posicionDelRotuloDeSobrantes,
  posicionDePuesto,
  REJILLA_DE_DESAGUE,
  SERVIDOR,
  ZONA_DE_SERVIDORES,
} from './posiciones.js'

/** Qué parte del camino que le falta sube una losa por segundo real. */
const VELOCIDAD_DE_LA_LOSA = 9

/** Alto de las columnas que sostienen el techo. */
const ALTO_DE_COLUMNA = 4.2

/** La zona mojada cubre las dos filas de placas, con un margen alrededor. */
const ZONA_MOJADA = {
  z: (LOCAL.zPlacasAdelante + LOCAL.zPlacasAtras) / 2,
  ancho: ZONA_DE_SERVIDORES.ancho + 2,
  fondo: LOCAL.zPlacasAtras - LOCAL.zPlacasAdelante + SERVIDOR.fondo + 1,
}

/**
 * Una avenida: su calzada a lo largo del borde del local, la boca por donde
 * entran las motos y el rótulo con su nombre.
 *
 * El local está en la esquina: la Av. Gran Colombia corre por el borde del
 * fondo, enfrente de los puestos de acabado, y la Av. Guaimaral por todo el
 * borde izquierdo, hasta juntarse con la otra en la esquina.
 *
 * El rótulo va sobre su propia calle, fuera del local. Desde la vista de
 * frente eso lo deja detrás del lavadero o a un lado, nunca delante tapándolo.
 */
function Avenida({ avenida }) {
  const { calle, rotulo, posicion } = avenida
  const porElFondo = avenida.lado === 'fondo'
  // La boca de entrada: un trozo de calzada que se mete hacia el local.
  const boca = porElFondo ? [3.2, 3] : [3, 3.2]
  const centroDeLaBoca = porElFondo
    ? [posicion[0], -0.03, posicion[2] - 1.5]
    : [posicion[0] - 1.5, -0.03, posicion[2]]

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={calle.centro}>
        <planeGeometry args={[calle.ancho, calle.fondo]} />
        <meshStandardMaterial color="#c8d4da" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={centroDeLaBoca}>
        <planeGeometry args={boca} />
        <meshStandardMaterial color="#d7e1e6" />
      </mesh>
      {/* El nombre va pintado en la calzada, no en un letrero de pie: un
          letrero mira a la cámara y crece al acercarse hasta tapar la escena. */}
      <RotuloEnElSuelo position={rotulo} alto={2.1} giro={porElFondo ? 0 : Math.PI / 2}>
        {avenida.nombre}
      </RotuloEnElSuelo>
    </group>
  )
}

/** El piso mojado con su rejilla, las columnas, las dos entradas y la salida. */
export function Local() {
  return (
    <group>
      {/* Piso del local */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]}>
        <planeGeometry args={[LOCAL.ancho + 4, LOCAL.fondo]} />
        <meshStandardMaterial color="#e8eef1" />
      </mesh>

      {/* Piso mojado del lavado: cubre las dos filas de placas */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[ZONA_DE_SERVIDORES.centroX, -0.04, ZONA_MOJADA.z]}>
        <planeGeometry args={[ZONA_MOJADA.ancho, ZONA_MOJADA.fondo]} />
        <meshStandardMaterial color="#cfe2ea" metalness={0.25} roughness={0.25} />
      </mesh>

      {/* Rejilla de desagüe, al frente de las placas */}
      <mesh position={[REJILLA_DE_DESAGUE.centroX, 0.01, REJILLA_DE_DESAGUE.z]}>
        <boxGeometry args={[REJILLA_DE_DESAGUE.ancho, 0.1, REJILLA_DE_DESAGUE.fondo]} />
        <meshStandardMaterial color="#6b7a82" metalness={0.5} roughness={0.5} />
      </mesh>

      {/* Franja de la zona de acabado, al fondo */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[ZONA_DE_SERVIDORES.centroX, -0.04, LOCAL.zPuestos]}>
        <planeGeometry args={[ZONA_DE_SERVIDORES.ancho + 2, SERVIDOR.fondo + 3]} />
        <meshStandardMaterial color="#cfe3dd" />
      </mesh>

      {/* Columnas del techo. Solo columnas y vigas finas: un techo macizo
          taparía justo lo que hay que ver. */}
      {COLUMNAS_DEL_TECHO.map(([x, , z]) => (
        <mesh key={`columna-${x}-${z}`} position={[x, ALTO_DE_COLUMNA / 2, z]}>
          <cylinderGeometry args={[0.16, 0.16, ALTO_DE_COLUMNA, 8]} />
          <meshStandardMaterial color="#9aa7ae" metalness={0.4} roughness={0.6} />
        </mesh>
      ))}
      {COLUMNAS_DEL_TECHO.map(([x, , z], i) => {
        const siguiente = COLUMNAS_DEL_TECHO[(i + 1) % COLUMNAS_DEL_TECHO.length]
        const largo = Math.hypot(siguiente[0] - x, siguiente[2] - z)
        return (
          <mesh
            key={`viga-${i}`}
            position={[(x + siguiente[0]) / 2, ALTO_DE_COLUMNA, (z + siguiente[2]) / 2]}
            rotation={[0, Math.atan2(siguiente[0] - x, siguiente[2] - z), 0]}
          >
            <boxGeometry args={[0.12, 0.12, largo]} />
            <meshStandardMaterial color="#9aa7ae" metalness={0.4} roughness={0.6} />
          </mesh>
        )
      })}

      {/* Las dos avenidas que rodean la esquina */}
      {Object.values(AVENIDAS).map((avenida) => (
        <Avenida key={avenida.nombre} avenida={avenida} />
      ))}

      <RotuloEnElSuelo position={[0, 0.02, LOCAL.zSalida + 1]} alto={1.1}>
        Salida
      </RotuloEnElSuelo>
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
  const numeros = useRef([])
  /** El alto al que va cada losa ahora mismo, mientras sube o baja. */
  const altos = useRef([])

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

  useFrame((_, delta) => {
    const { foto } = useSimulacion.getState()
    if (!foto) return
    // Qué parte del camino que le falta recorre la losa en este cuadro. Se
    // calcula con el tiempo real para que suba igual a 30 que a 60 cuadros.
    const acercamiento = 1 - Math.exp(-VELOCIDAD_DE_LA_LOSA * delta)
    const servidores = [...foto.placas, ...foto.puestos]
    servidores.forEach((servidor, i) => {
      const losa = losas.current[i]
      if (!losa) return
      const destino = servidor.libre ? SERVIDOR.altoLibre : SERVIDOR.altoOcupado
      // Se levanta poco a poco en vez de dar un salto. El alto de verdad se
      // guarda en la propia losa, no en React: cambiarlo sesenta veces por
      // segundo a través del estado provocaría un render por cuadro.
      const desde = altos.current[i] ?? destino
      const alto = desde + (destino - desde) * acercamiento
      altos.current[i] = alto

      losa.scale.y = alto / SERVIDOR.altoOcupado
      losa.position.y = alto / 2
      losa.material = servidor.libre ? materiales.libre : materiales.ocupada
      // El número va pegado a la cara de arriba de la losa, así que sube y
      // baja con ella. Aquí dentro, por lo mismo.
      const numero = numeros.current[i]
      if (numero) numero.position.y = alto + 0.02
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
          {/* El número, pegado al borde de delante de la losa: ahí no llega
              la moto, ni siquiera la que se posa un poco adelantada. */}
          <group position={[0, 0, SERVIDOR.fondo / 2 - 0.5]}>
            <NumeroEnLaLosa
              lado={0.9}
              meshRef={(nodo) => {
                numeros.current[i] = nodo
              }}
            >
              {numero}
            </NumeroEnLaLosa>
          </group>
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
export function Sobrantes({ cuantas, etapa }) {
  if (cuantas <= 0) {
    return null
  }
  return (
    <Rotulo
      position={posicionDelRotuloDeSobrantes(etapa)}
      alto={1.2}
      color="#b65050"
      borde="#b65050"
    >
      +{cuantas.toLocaleString('es-CO')} motos más
    </Rotulo>
  )
}
