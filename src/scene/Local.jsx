import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'

import { COLOR_DE_ESCENA } from '../estilos/colores.js'
import { juntasDelPiso, tramosConHuecos } from './geometriasDelEntorno.js'
import Letrero from './Letrero.jsx'
import {
  COLUMNAS_DEL_TECHO,
  FRANJA_DE_ESPERA,
  LOCAL,
  PARED_DEL_FONDO,
  SERVIDOR,
  TECHO,
  ZONA_DE_SERVIDORES,
} from './posiciones.js'
import { medidasDelTecho, opacidadDelTecho } from './techo.js'

/** La zona mojada cubre las dos filas de placas, con un margen alrededor. */
const ZONA_MOJADA = {
  z: (LOCAL.zPlacasAdelante + LOCAL.zPlacasAtras) / 2,
  ancho: ZONA_DE_SERVIDORES.ancho + 2,
  fondo: LOCAL.zPlacasAtras - LOCAL.zPlacasAdelante + SERVIDOR.fondo + 1,
}

/** Líneas de pintura de la franja de espera: una en cada borde, a un palmo hacia adentro. */
const GROSOR_DE_LA_LINEA = 0.12
const LINEAS_DE_LA_FRANJA = [
  FRANJA_DE_ESPERA.x0 + 0.2,
  FRANJA_DE_ESPERA.x0 + FRANJA_DE_ESPERA.ancho - 0.2,
]

/** Piso de concreto con sus juntas, el brillo de mojado del lavado, la franja del acabado y la franja de espera del lado derecho. */
function Piso() {
  const juntas = useMemo(() => juntasDelPiso({ ancho: LOCAL.ancho, fondo: LOCAL.fondo }), [])
  useEffect(() => () => juntas.dispose(), [juntas])

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[LOCAL.ancho, LOCAL.fondo]} />
        <meshStandardMaterial color={COLOR_DE_ESCENA.piso} roughness={0.9} />
      </mesh>
      <mesh geometry={juntas}>
        <meshStandardMaterial color={COLOR_DE_ESCENA.juntaDelPiso} />
      </mesh>

      {/* La franja del lado derecho, fuera de las columnas: ahí espera la fila del lavado. */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[FRANJA_DE_ESPERA.x0 + FRANJA_DE_ESPERA.ancho / 2, 0, 0]}
      >
        <planeGeometry args={[FRANJA_DE_ESPERA.ancho, LOCAL.fondo]} />
        <meshStandardMaterial color={COLOR_DE_ESCENA.piso} roughness={0.9} />
      </mesh>
      {/* Dos líneas de pintura finas, en los bordes de la franja, en un tono neutro. */}
      {LINEAS_DE_LA_FRANJA.map((x) => (
        <mesh key={x} rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.006, 0]}>
          <planeGeometry args={[GROSOR_DE_LA_LINEA, LOCAL.fondo]} />
          <meshStandardMaterial color={COLOR_DE_ESCENA.pinturaDeEspera} roughness={0.9} />
        </mesh>
      ))}

      {/* Piso mojado del lavado: cubre las dos filas de placas. Liso y con
          poca rugosidad: es lo que da el brillo de mojado. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[ZONA_DE_SERVIDORES.centroX, 0.004, ZONA_MOJADA.z]}>
        <planeGeometry args={[ZONA_MOJADA.ancho, ZONA_MOJADA.fondo]} />
        <meshStandardMaterial color={COLOR_DE_ESCENA.pisoMojado} metalness={0.15} roughness={0.18} />
      </mesh>

      {/* Franja de la zona de acabado, al fondo */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[ZONA_DE_SERVIDORES.centroX, 0.004, LOCAL.zPuestos]}>
        <planeGeometry args={[ZONA_DE_SERVIDORES.ancho + 2, SERVIDOR.fondo + 3]} />
        <meshStandardMaterial color={COLOR_DE_ESCENA.zonaDeAcabado} roughness={0.9} />
      </mesh>
    </group>
  )
}

/**
 * Las columnas y las vigas que las unen por el perímetro. Se quedan siempre a
 * la vista, aunque el techo se aparte, para que se vea dónde está cubierto.
 */
function Estructura() {
  return (
    <group>
      {COLUMNAS_DEL_TECHO.map(([x, , z]) => (
        <mesh key={`columna-${x}-${z}`} position={[x, TECHO.alto / 2, z]}>
          <cylinderGeometry args={[0.16, 0.16, TECHO.alto, 10]} />
          <meshStandardMaterial color={COLOR_DE_ESCENA.columna} metalness={0.3} roughness={0.6} />
        </mesh>
      ))}
      {COLUMNAS_DEL_TECHO.map(([x, , z], i) => {
        const siguiente = COLUMNAS_DEL_TECHO[(i + 1) % COLUMNAS_DEL_TECHO.length]
        const largo = Math.hypot(siguiente[0] - x, siguiente[2] - z)
        return (
          <mesh
            key={`viga-${x}-${z}`}
            position={[(x + siguiente[0]) / 2, TECHO.alto - 0.06, (z + siguiente[2]) / 2]}
            rotation={[0, Math.atan2(siguiente[0] - x, siguiente[2] - z), 0]}
          >
            <boxGeometry args={[0.14, 0.12, largo]} />
            <meshStandardMaterial color={COLOR_DE_ESCENA.columna} metalness={0.3} roughness={0.6} />
          </mesh>
        )
      })}
    </group>
  )
}

/**
 * El techo: una losa fina sobre las columnas.
 *
 * Se aparta cuando la cámara sube (`opacidadDelTecho`): opaco con la vista de
 * frente, transparente a media subida y invisible desde arriba, para que nunca
 * tape las placas, los puestos ni las motos. La opacidad se calcula en
 * `useFrame` y se escribe en el material, sin pasar por React.
 */
function Techo() {
  const { ancho, fondo, centro } = medidasDelTecho()
  const malla = useRef(null)
  const material = useRef(null)

  useFrame(({ camera }) => {
    const opacidad = opacidadDelTecho(camera.position.toArray())
    if (!malla.current || !material.current) return
    malla.current.visible = opacidad > 0.01
    material.current.opacity = opacidad
    // Un material transparente no escribe profundidad: con opacidad completa
    // se vuelve sólido para ordenarse bien con lo de debajo.
    material.current.transparent = opacidad < 0.999
    material.current.depthWrite = opacidad >= 0.999
  })

  return (
    <mesh ref={malla} position={centro}>
      <boxGeometry args={[ancho, TECHO.grosor, fondo]} />
      <meshStandardMaterial ref={material} color={COLOR_DE_ESCENA.techo} roughness={0.85} />
    </mesh>
  )
}

/**
 * La pared del fondo, con la abertura por donde entran y salen las motos de
 * la Av. Gran Colombia, y el letrero del local en la cara de adelante. Se construye con los datos de `PARED_DEL_FONDO`.
 */
function Pared() {
  const { z, grosor, alto, altoDeAbertura, aberturas } = PARED_DEL_FONDO
  const huecos = aberturas.map(({ centroX, ancho }) => ({ centro: centroX, ancho }))
  const macizos = tramosConHuecos(-LOCAL.ancho / 2, LOCAL.ancho / 2, huecos)
  const dinteles = aberturas.map(({ nombre, centroX, ancho }) => ({ nombre, centroX, ancho }))

  // El letrero va en el tramo macizo más ancho, sin pisar una abertura.
  const [desde, hasta] = macizos.reduce((mejor, tramo) => (tramo[1] - tramo[0] > mejor[1] - mejor[0] ? tramo : mejor))
  const anchoDelLetrero = Math.min(8, hasta - desde - 1)

  return (
    <group>
      {macizos.map(([a, b]) => (
        <mesh key={`pared-${a}`} position={[(a + b) / 2, alto / 2, z]}>
          <boxGeometry args={[b - a, alto, grosor]} />
          <meshStandardMaterial color={COLOR_DE_ESCENA.pared} roughness={0.9} />
        </mesh>
      ))}
      {dinteles.map(({ nombre, centroX, ancho }) => (
        <mesh key={`dintel-${nombre}`} position={[centroX, (alto + altoDeAbertura) / 2, z]}>
          <boxGeometry args={[ancho, alto - altoDeAbertura, grosor]} />
          <meshStandardMaterial color={COLOR_DE_ESCENA.pared} roughness={0.9} />
        </mesh>
      ))}
      <Letrero
        texto="Gran Colombia Car Wash Express"
        position={[(desde + hasta) / 2, alto / 2 + 0.1, z + grosor / 2 + 0.05]}
        ancho={anchoDelLetrero}
        alto={anchoDelLetrero / 8}
        fondo={COLOR_DE_ESCENA.letreroDelLocal}
        color={COLOR_DE_ESCENA.textoDeLetrero}
        postes={false}
      />
    </group>
  )
}

/** El local: piso, estructura, techo y pared del fondo. Las placas y los puestos van aparte. */
export function Local() {
  return (
    <group>
      <Piso />
      <Estructura />
      <Techo />
      <Pared />
    </group>
  )
}

export default Local
