import { useEffect, useMemo } from 'react'

import { COLOR_DE_ESCENA } from '../estilos/colores.js'
import { bordillos, juntar, lineaDiscontinua, pasoDeCebra, tramosConHuecos } from './geometriasDelEntorno.js'
import Letrero from './Letrero.jsx'
import { ANCHO_DE_BOCA, AVENIDAS, LOCAL, PARED_DEL_FONDO, TERRENO } from './posiciones.js'

/** Ancho de las aceras de las dos avenidas, al otro lado de la calzada. */
const ANCHO_DE_ACERA = 3

/** Lo que cubre la calzada de una avenida, con sus cuatro lados. */
function extremos({ calle }) {
  const [cx, , cz] = calle.centro
  return { x0: cx - calle.ancho / 2, x1: cx + calle.ancho / 2, z0: cz - calle.fondo / 2, z1: cz + calle.fondo / 2 }
}

/**
 * Las dos avenidas se cruzan en la esquina del fondo a la izquierda y siguen
 * en línea recta hasta el borde del terreno, por sus dos extremos, donde el
 * velo las disuelve en el fondo. La Gran Colombia es una sola calzada; la
 * Guaimaral se parte en dos tramos, uno a cada lado del cruce, para que nada
 * se dibuje dos veces en el mismo sitio.
 */
function calzadas() {
  const gran = extremos(AVENIDAS.granColombia)
  const guaimaral = extremos(AVENIDAS.guaimaral)
  const [cx, , cz] = TERRENO.centro
  const alcance = TERRENO.alcanceDeLasAvenidas
  return {
    gran: { ...gran, x0: cx - alcance, x1: cx + alcance },
    guaimaralNorte: { ...guaimaral, z0: cz - alcance, z1: gran.z0 },
    guaimaralSur: { ...guaimaral, z0: gran.z1, z1: cz + alcance },
  }
}

const { gran, guaimaralNorte, guaimaralSur } = calzadas()
/** El ancho de la Guaimaral (x0 a x1) y el de la Gran Colombia (z0 a z1), que no cambian a lo largo. */
const { x0: GUAIMARAL_X0, x1: GUAIMARAL_X1 } = guaimaralNorte

/** Un plano acostado que cubre de `x0` a `x1` y de `z0` a `z1`, a la altura `y`. */
function Superficie({ x0, x1, z0, z1, y = 0, color }) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[(x0 + x1) / 2, y, (z0 + z1) / 2]}>
      <planeGeometry args={[x1 - x0, z1 - z0]} />
      <meshStandardMaterial color={color} />
    </mesh>
  )
}

/**
 * Las avenidas que rodean el local por la esquina: asfalto con línea de carril
 * discontinua, bordillos, aceras al otro lado, el paso de cebra del cruce y
 * los letreros de calle.
 *
 * El local está en la esquina: la Av. Gran Colombia corre por el borde del
 * fondo, detrás de los puestos de acabado, y la Av. Guaimaral por todo el
 * borde izquierdo. Todo sale de los datos de `AVENIDAS`, así que si las
 * entradas cambian de sitio, la calle las sigue.
 *
 * Los letreros van fuera del camino de la vista: el de la Guaimaral en la acera
 * de la izquierda y el de la Gran Colombia alto, sobre la acera del fondo, por
 * encima de la pared. Ninguno queda entre la cámara y el local.
 */
export function Avenidas() {
  const bocaGuaimaral = AVENIDAS.guaimaral.posicion[2]
  const oeste = gran.x0
  const este = gran.x1
  const norte = guaimaralNorte.z0
  const sur = guaimaralSur.z1

  const geometrias = useMemo(() => {
    const huecosDeLaPared = PARED_DEL_FONDO.aberturas.map(({ centroX, ancho }) => ({ centro: centroX, ancho }))
    const huecoGuaimaral = [{ centro: bocaGuaimaral, ancho: ANCHO_DE_BOCA }]
    const mitadDeGran = (gran.z0 + gran.z1) / 2
    const mitadDeGuaimaral = (GUAIMARAL_X0 + GUAIMARAL_X1) / 2
    return {
      bordillos: bordillos([
        // al otro lado de cada calzada, del lado de la acera, partidos por el cruce
        { eje: 'x', fijo: gran.z0 - 0.1, desde: oeste, hasta: GUAIMARAL_X0 },
        { eje: 'x', fijo: gran.z0 - 0.1, desde: GUAIMARAL_X1, hasta: este },
        { eje: 'x', fijo: gran.z1 + 0.1, desde: oeste, hasta: GUAIMARAL_X0 },
        { eje: 'z', fijo: GUAIMARAL_X0 - 0.1, desde: norte, hasta: gran.z0 },
        { eje: 'z', fijo: GUAIMARAL_X0 - 0.1, desde: gran.z1, hasta: sur },
        { eje: 'z', fijo: GUAIMARAL_X1 + 0.1, desde: norte, hasta: gran.z0 },
        // del lado del local, interrumpidos donde hay una boca
        ...tramosConHuecos(gran.z1, sur, huecoGuaimaral).map(([desde, hasta]) => ({
          eje: 'z',
          fijo: GUAIMARAL_X1 - 0.1,
          desde,
          hasta,
        })),
        ...tramosConHuecos(-LOCAL.ancho / 2, este, huecosDeLaPared).map(([desde, hasta]) => ({
          eje: 'x',
          fijo: gran.z1 + 0.1,
          desde,
          hasta,
        })),
      ]),
      lineaGran: juntar([
        lineaDiscontinua({ eje: 'x', desde: oeste, hasta: GUAIMARAL_X0, fijo: mitadDeGran }),
        lineaDiscontinua({ eje: 'x', desde: GUAIMARAL_X1, hasta: este, fijo: mitadDeGran }),
      ]),
      lineaGuaimaral: juntar([
        lineaDiscontinua({ eje: 'z', desde: norte, hasta: gran.z0, fijo: mitadDeGuaimaral }),
        lineaDiscontinua({ eje: 'z', desde: gran.z1, hasta: sur, fijo: mitadDeGuaimaral }),
      ]),
      cebra: pasoDeCebra({
        x0: GUAIMARAL_X0,
        ancho: GUAIMARAL_X1 - GUAIMARAL_X0,
        z: gran.z1 + 1.8,
      }),
    }
  }, [bocaGuaimaral, oeste, este, norte, sur])

  useEffect(() => () => Object.values(geometrias).forEach((g) => g.dispose()), [geometrias])

  const acera = { color: COLOR_DE_ESCENA.acera }
  const bordeDeAcera = GUAIMARAL_X0 - ANCHO_DE_ACERA

  return (
    <group>
      {/* Asfalto */}
      <Superficie {...gran} color={COLOR_DE_ESCENA.asfalto} />
      <Superficie {...guaimaralNorte} color={COLOR_DE_ESCENA.asfalto} />
      <Superficie {...guaimaralSur} color={COLOR_DE_ESCENA.asfalto} />

      {/* Aceras, al otro lado de cada calzada y alrededor del cruce */}
      <Superficie x0={bordeDeAcera} x1={GUAIMARAL_X0} z0={norte} z1={gran.z0} {...acera} />
      <Superficie x0={bordeDeAcera} x1={GUAIMARAL_X0} z0={gran.z1} z1={sur} {...acera} />
      <Superficie x0={oeste} x1={bordeDeAcera} z0={gran.z0 - ANCHO_DE_ACERA} z1={gran.z0} {...acera} />
      <Superficie x0={oeste} x1={bordeDeAcera} z0={gran.z1} z1={gran.z1 + ANCHO_DE_ACERA} {...acera} />
      <Superficie x0={GUAIMARAL_X1} x1={este} z0={gran.z0 - ANCHO_DE_ACERA} z1={gran.z0} {...acera} />
      <Superficie x0={GUAIMARAL_X1} x1={GUAIMARAL_X1 + ANCHO_DE_ACERA} z0={norte} z1={gran.z0 - ANCHO_DE_ACERA} {...acera} />

      <mesh geometry={geometrias.bordillos}>
        <meshStandardMaterial color={COLOR_DE_ESCENA.bordillo} />
      </mesh>

      {/* Pintura de la calzada: línea de carril discontinua y el paso de cebra */}
      {[geometrias.lineaGran, geometrias.lineaGuaimaral, geometrias.cebra].map((geometria) => (
        <mesh key={geometria.uuid} geometry={geometria}>
          <meshStandardMaterial color={COLOR_DE_ESCENA.pinturaVial} />
        </mesh>
      ))}

      {/* Letreros de calle: el de la Guaimaral, bajo, en su acera; el de la
          Gran Colombia, alto y sobre la acera del fondo para quedar por encima
          de la pared. */}
      <Letrero
        texto={AVENIDAS.guaimaral.nombre}
        position={[bordeDeAcera + 1.5, 2.1, gran.z1 + 7]}
        ancho={3.6}
        alto={0.85}
        giro={0.6}
      />
      <Letrero
        texto={AVENIDAS.granColombia.nombre}
        position={[GUAIMARAL_X1 + 6, 4.15, gran.z0 - 1.5]}
        ancho={4.8}
        alto={0.9}
      />
    </group>
  )
}

export default Avenidas
