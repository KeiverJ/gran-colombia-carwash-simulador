import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import { DoubleSide } from 'three'

import { COLOR_DE_ESCENA } from '../estilos/colores.js'
import { juntasDelPiso, tramosConHuecos } from './geometriasDelEntorno.js'
import Letrero from './Letrero.jsx'
import { Charcos } from './Charcos.jsx'
import { ZONA_MOJADA } from './charcos.js'
import { franjaDeLaPared } from './franjaDeLaPared.js'
import { LetreroDeLaPared, LogoDelTecho } from './LogoDelLocal.jsx'
import { arcosDeLaLona, superficieDeLaLona } from './lonaDelTecho.js'
import { queSeDibujaDelLogo, queSeDibujaEnLaPared } from './logoEnLaEscena.js'
import { useLetreroDelLocal, useLogoDelLocal } from './useLogoDelLocal.js'
import {
  COLUMNAS_DEL_TECHO,
  FRANJA_DE_ESPERA,
  LOCAL,
  PARED_DEL_FONDO,
  SERVIDOR,
  TECHO,
  ZONA_DE_SERVIDORES,
} from './posiciones.js'
import { estadoDeLaOpacidad, medidasDelTecho, opacidadDelTecho } from './techo.js'

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
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
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
        receiveShadow
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
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[ZONA_DE_SERVIDORES.centroX, 0.004, ZONA_MOJADA.z]} receiveShadow>
        <planeGeometry args={[ZONA_MOJADA.ancho, ZONA_MOJADA.fondo]} />
        <meshStandardMaterial color={COLOR_DE_ESCENA.pisoMojado} metalness={0.15} roughness={0.18} />
      </mesh>

      {/* Franja de la zona de acabado, al fondo */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[ZONA_DE_SERVIDORES.centroX, 0.004, LOCAL.zPuestos]} receiveShadow>
        <planeGeometry args={[ZONA_DE_SERVIDORES.ancho + 2, SERVIDOR.fondo + 3]} />
        <meshStandardMaterial color={COLOR_DE_ESCENA.zonaDeAcabado} roughness={0.9} />
      </mesh>
    </group>
  )
}

/**
 * Los cuatro arcos de tubo que sostienen la lona (ver `lonaDelTecho.js`): cada
 * uno va de una viga lateral a la otra, sobre la lona. Se quedan siempre a la
 * vista, aunque la lona se aparte. Proyectan sombra (son delgados).
 */
function Arcos() {
  const { centro } = medidasDelTecho()
  const geometria = useMemo(() => arcosDeLaLona(), [])
  useEffect(() => () => geometria.dispose(), [geometria])
  return (
    <mesh geometry={geometria} position={[centro[0], 0, centro[2]]} castShadow>
      <meshStandardMaterial color={COLOR_DE_ESCENA.arco} metalness={0.3} roughness={0.6} />
    </mesh>
  )
}

/**
 * Las columnas, las vigas que las unen por el perímetro y los arcos de la lona.
 * Se quedan siempre a la vista, aunque la lona se aparte, para que se vea dónde
 * está cubierto.
 */
function Estructura() {
  return (
    <group>
      <Arcos />
      {COLUMNAS_DEL_TECHO.map(([x, , z]) => (
        <mesh key={`columna-${x}-${z}`} position={[x, TECHO.alto / 2, z]} castShadow>
          <cylinderGeometry args={[0.16, 0.16, TECHO.alto, 10]} />
          <meshStandardMaterial color={COLOR_DE_ESCENA.columnaAzul} metalness={0.3} roughness={0.6} />
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
            castShadow
          >
            <boxGeometry args={[0.14, 0.12, largo]} />
            <meshStandardMaterial color={COLOR_DE_ESCENA.arco} metalness={0.3} roughness={0.6} />
          </mesh>
        )
      })}
    </group>
  )
}

/**
 * El techo: una lona blanca curva y tensada sobre los arcos (ver `lonaDelTecho.js`).
 *
 * Se aparta cuando la cámara sube (`opacidadDelTecho`): opaco con la vista de
 * frente, transparente a media subida y invisible desde arriba, para que nunca
 * tape las placas, los puestos ni las motos. La opacidad se calcula en
 * `useFrame` y se escribe en el material, sin pasar por React.
 */
function Techo() {
  const { centro } = medidasDelTecho()
  const lona = useMemo(() => superficieDeLaLona(), [])
  useEffect(() => () => lona.dispose(), [lona])
  const malla = useRef(null)
  const material = useRef(null)

  useFrame(({ camera }) => {
    const opacidad = opacidadDelTecho(camera.position.toArray())
    if (!malla.current || !material.current) return
    const { visible, transparent, depthWrite } = estadoDeLaOpacidad(opacidad)
    malla.current.visible = visible
    material.current.opacity = opacidad
    // Un material transparente no escribe profundidad: con opacidad completa
    // se vuelve sólido para ordenarse bien con lo de debajo.
    material.current.transparent = transparent
    material.current.depthWrite = depthWrite
  })

  return (
    <mesh ref={malla} geometry={lona} position={[centro[0], 0, centro[2]]}>
      <meshStandardMaterial
        ref={material}
        color={COLOR_DE_ESCENA.lona}
        emissive={COLOR_DE_ESCENA.lona}
        emissiveIntensity={0.35}
        roughness={0.85}
        side={DoubleSide}
      />
    </mesh>
  )
}

/**
 * La pared del fondo, con la abertura por donde entran y salen las motos de
 * la Av. Gran Colombia, y el letrero del local en la cara de adelante: la versión
 * horizontal del logo en 3D o, si no carga, el letrero de texto. Se construye con
 * los datos de `PARED_DEL_FONDO`.
 *
 * Con la vista general el borde delantero del techo tapa casi toda esta pared, así
 * que el letrero va ajustado a la franja que queda a la vista (ver `LETRERO_DE_LA_PARED`).
 *
 * @param {{ estado: string, logo: object|null }} props.letrero el letrero horizontal cargado
 */
function Pared({ letrero }) {
  const { z, grosor, alto, altoDeAbertura, aberturas } = PARED_DEL_FONDO
  const huecos = aberturas.map(({ centroX, ancho }) => ({ centro: centroX, ancho }))
  const macizos = tramosConHuecos(-LOCAL.ancho / 2, LOCAL.ancho / 2, huecos)
  const dinteles = aberturas.map(({ nombre, centroX, ancho }) => ({ nombre, centroX, ancho }))

  // El letrero va en el tramo macizo más ancho, sin pisar una abertura.
  const [desde, hasta] = macizos.reduce((mejor, tramo) => (tramo[1] - tramo[0] > mejor[1] - mejor[0] ? tramo : mejor))
  const anchoDelLetrero = Math.min(8, hasta - desde - 1)
  const enLaPared = queSeDibujaEnLaPared(letrero.estado)

  return (
    <group>
      {macizos.map(([a, b]) => (
        <mesh key={`pared-${a}`} position={[(a + b) / 2, alto / 2, z]} castShadow receiveShadow>
          <boxGeometry args={[b - a, alto, grosor]} />
          <meshStandardMaterial color={COLOR_DE_ESCENA.paredAzul} roughness={0.9} />
        </mesh>
      ))}
      {/* La franja amarilla del logo, bajo el letrero y sin cruzar la abertura. */}
      {franjaDeLaPared().map(({ x, y, z: zDeLaFranja, ancho, alto: altoDeLaFranja, fondo }) => (
        <mesh key={`franja-${x}`} position={[x, y, zDeLaFranja]} receiveShadow>
          <boxGeometry args={[ancho, altoDeLaFranja, fondo]} />
          <meshStandardMaterial color={COLOR_DE_ESCENA.franjaDePared} roughness={0.8} />
        </mesh>
      ))}
      {dinteles.map(({ nombre, centroX, ancho }) => (
        <mesh key={`dintel-${nombre}`} position={[centroX, (alto + altoDeAbertura) / 2, z]} castShadow receiveShadow>
          <boxGeometry args={[ancho, alto - altoDeAbertura, grosor]} />
          <meshStandardMaterial color={COLOR_DE_ESCENA.paredAzul} roughness={0.9} />
        </mesh>
      ))}
      {enLaPared === 'letrero-3d' && (
        <LetreroDeLaPared logo={letrero.logo} pared={PARED_DEL_FONDO} desde={desde} hasta={hasta} />
      )}
      {enLaPared === 'letrero-de-texto' && (
        <Letrero
          texto="Gran Colombia Car Wash Express"
          position={[(desde + hasta) / 2, alto / 2 + 0.1, z + grosor / 2 + 0.05]}
          ancho={anchoDelLetrero}
          alto={anchoDelLetrero / 8}
          fondo={COLOR_DE_ESCENA.letreroDelLocal}
          color={COLOR_DE_ESCENA.textoDeLetrero}
          postes={false}
        />
      )}
    </group>
  )
}

/** El local: piso, estructura, techo con su logo y pared del fondo con su letrero horizontal. Las placas y los puestos van aparte. */
export function Local() {
  const logoDelLocal = useLogoDelLocal()
  const letreroDeLaPared = useLetreroDelLocal()
  const dibujo = queSeDibujaDelLogo(logoDelLocal.estado)
  return (
    <group>
      <Piso />
      <Estructura />
      <Techo />
      <Charcos />
      {dibujo.techo && <LogoDelTecho logo={logoDelLocal.logo} />}
      <Pared letrero={letreroDeLaPared} />
    </group>
  )
}

export default Local
