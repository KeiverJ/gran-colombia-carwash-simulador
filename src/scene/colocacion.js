import { HUELLA_DE_LA_CAFETERIA } from './cafeteria.js'
import { cajasDeLosa, puntosDeLosCaminos } from './charcos.js'
import { entreDe, fraccionDe } from './hashPropio.js'
import {
  ANCHO_DE_BOCA,
  AVENIDAS,
  CURVAS_DE_ENTRADA,
  FRANJA_DE_ESPERA,
  LOCAL,
  TERRENO,
} from './posiciones.js'

/**
 * Dónde van los árboles y las plantas de la calle (y, en las partes siguientes,
 * los detalles de las aceras). JavaScript puro y determinista: los sitios salen del
 * hash propio (`hashPropio.js`), nunca del generador del motor, y son siempre los
 * mismos.
 *
 * Todo va en las **aceras** y las esquinas, con más densidad del lado de la Av.
 * Guaimaral (que en el mapa es muy arborizada) y más espaciado en la Gran
 * Colombia. Nunca sobre una calzada, el local, la cafetería, la franja de espera,
 * una losa, una fila ni un camino de las motos; y dentro del terreno que se ve
 * (antes de que el velo lo disuelva en el cielo).
 */

/** Ancho de las aceras de las dos avenidas, al otro lado de la calzada (el mismo de `Avenidas.jsx`). */
export const ANCHO_DE_ACERA = 3

const guaimaral = AVENIDAS.guaimaral.calle
const granColombia = AVENIDAS.granColombia.calle

/** Lo que cubre cada calzada (vista desde arriba), con el largo que se ve. */
export const CALZADAS = {
  guaimaral: {
    x0: guaimaral.centro[0] - guaimaral.ancho / 2,
    x1: guaimaral.centro[0] + guaimaral.ancho / 2,
    z0: TERRENO.centro[2] - TERRENO.alcanceDeLasAvenidas,
    z1: TERRENO.centro[2] + TERRENO.alcanceDeLasAvenidas,
  },
  granColombia: {
    x0: TERRENO.centro[0] - TERRENO.alcanceDeLasAvenidas,
    x1: TERRENO.centro[0] + TERRENO.alcanceDeLasAvenidas,
    z0: granColombia.centro[2] - granColombia.fondo / 2,
    z1: granColombia.centro[2] + granColombia.fondo / 2,
  },
}

/** Hasta dónde se ponen árboles, medido desde el centro del terreno: antes de que el velo lo disuelva (a 45 m empieza). */
export const ALCANCE_DE_LA_VEGETACION = 46

/**
 * Las bandas de acera donde puede haber vegetación. Cada una es un rectángulo
 * `{ nombre, avenida, x0, x1, z0, z1 }` con la dirección en que corre (`eje`) y cada
 * cuántos metros va un árbol (`paso`: menor, más denso).
 */
export const BANDAS_DE_ACERA = [
  // Guaimaral: la acera de la izquierda, al sur del cruce (hacia la cafetería) y al norte.
  {
    nombre: 'Guaimaral, acera de la izquierda, al sur',
    avenida: 'guaimaral',
    eje: 'z',
    x0: CALZADAS.guaimaral.x0 - ANCHO_DE_ACERA,
    x1: CALZADAS.guaimaral.x0,
    // Empieza más allá del frente del local (z = 4): los árboles de la acera frente al local taparían, desde las
    // vistas y desde la cafetería, el arranque de la curva de entrada de la Gran Colombia (a 19 m a la izquierda).
    z0: 4,
    z1: TERRENO.centro[2] + ALCANCE_DE_LA_VEGETACION,
    paso: 4.6,
  },
  {
    nombre: 'Guaimaral, acera de la izquierda, al norte',
    avenida: 'guaimaral',
    eje: 'z',
    x0: CALZADAS.guaimaral.x0 - ANCHO_DE_ACERA,
    x1: CALZADAS.guaimaral.x0,
    z0: TERRENO.centro[2] - ALCANCE_DE_LA_VEGETACION,
    z1: CALZADAS.granColombia.z0 - ANCHO_DE_ACERA - 1,
    paso: 4.6,
  },
  // Gran Colombia: la acera del otro lado de la calzada (al fondo), a los dos lados del cruce.
  {
    nombre: 'Gran Colombia, acera del fondo, al este',
    avenida: 'granColombia',
    eje: 'x',
    x0: CALZADAS.guaimaral.x1 + 1,
    x1: TERRENO.centro[0] + ALCANCE_DE_LA_VEGETACION,
    z0: CALZADAS.granColombia.z0 - ANCHO_DE_ACERA,
    z1: CALZADAS.granColombia.z0,
    paso: 10,
  },
  {
    nombre: 'Gran Colombia, acera del fondo, al oeste',
    avenida: 'granColombia',
    eje: 'x',
    x0: TERRENO.centro[0] - ALCANCE_DE_LA_VEGETACION,
    x1: CALZADAS.guaimaral.x0 - ANCHO_DE_ACERA - 1,
    z0: CALZADAS.granColombia.z0 - ANCHO_DE_ACERA,
    z1: CALZADAS.granColombia.z0,
    paso: 10,
  },
]

/**
 * Las zonas donde no puede haber vegetación, como rectángulos `{ nombre, x0, x1, z0, z1 }`
 * vistos desde arriba: las dos calzadas, el local con su franja de espera (y la boca por
 * donde entra la Gran Colombia), la cafetería con un margen, y las losas, las filas y los
 * caminos con margen (estos últimos con cualquier número de placas y de puestos).
 */
export function zonasDeExclusion(placas = 14, puestos = 7) {
  const margen = 1.5
  const zonas = [
    { nombre: 'calzada de la Guaimaral', ...CALZADAS.guaimaral },
    { nombre: 'calzada de la Gran Colombia', ...CALZADAS.granColombia },
    {
      nombre: 'el local con la franja de espera',
      x0: -LOCAL.ancho / 2 - margen,
      x1: FRANJA_DE_ESPERA.x0 + FRANJA_DE_ESPERA.ancho + margen,
      z0: -LOCAL.fondo / 2 - margen,
      z1: LOCAL.fondo / 2 + margen,
    },
    {
      nombre: 'la cafetería',
      x0: HUELLA_DE_LA_CAFETERIA.x0 - 3,
      x1: HUELLA_DE_LA_CAFETERIA.x1 + 3,
      z0: HUELLA_DE_LA_CAFETERIA.z0 - 3,
      z1: HUELLA_DE_LA_CAFETERIA.z1 + 3,
    },
  ]
  for (const avenida of Object.values(AVENIDAS)) {
    const [x, , z] = avenida.posicion
    zonas.push({ nombre: `boca de la ${avenida.nombre}`, x0: x - ANCHO_DE_BOCA / 2 - margen, x1: x + ANCHO_DE_BOCA / 2 + margen, z0: z - margen - 1, z1: z + margen + 1 })
  }
  for (const [i, caja] of cajasDeLosa(placas, puestos).entries()) {
    zonas.push({ nombre: `losa o rampa ${i}`, x0: caja.x0 - margen, x1: caja.x1 + margen, z0: caja.z0 - margen, z1: caja.z1 + margen })
  }
  return zonas
}

/** Los puntos (x, z) de los caminos de las motos con la máxima configuración, para apartarse de ellos. */
let puntosGuardados = null
function puntosDeLosCaminosMaximos() {
  puntosGuardados ??= [...puntosDeLosCaminos(14, 7), ...Object.values(CURVAS_DE_ENTRADA).flat().map(([x, , z]) => [x, z])]
  return puntosGuardados
}

/** Lo más cerca que puede quedar el centro de un árbol de un camino de las motos, en metros. */
export const DISTANCIA_A_UN_CAMINO = 3

const dentroDe = (x, z, { x0, x1, z0, z1 }) => x >= x0 && x <= x1 && z >= z0 && z <= z1

/** ¿Está libre este sitio? Devuelve el nombre de lo que estorba, o `null`. */
export function queEstorbaALaVegetacion(x, z, placas = 14, puestos = 7) {
  const zona = zonasDeExclusion(placas, puestos).find((candidata) => dentroDe(x, z, candidata))
  return zona ? zona.nombre : null
}

/** Los modelos de árbol y de planta que se reparten, y su alto en metros (el del modelo preparado). */
export const MODELOS_DE_VEGETACION = {
  arbol1: { alto: 5, radioDeLaCopa: 1.9 },
  arbol2: { alto: 5.5, radioDeLaCopa: 1.7 },
  planta: { alto: 1.6, radioDeLaCopa: 0.45 },
}

const SEMILLA_DE_LA_VEGETACION = 31337

/**
 * Los sitios de la vegetación: `[{ modelo, x, z, giro, escala }]`. Para cada banda
 * recorre su largo cada `paso` metros, con un desvío (a lo largo y a lo ancho) que
 * sale del hash propio, y descarta lo que cae en una zona de exclusión, cerca de un
 * camino o fuera del terreno que se ve.
 */
export function sitiosDeLaVegetacion() {
  const exclusion = zonasDeExclusion()
  const caminos = puntosDeLosCaminosMaximos()
  const sitios = []
  BANDAS_DE_ACERA.forEach((banda, b) => {
    const largo = banda.eje === 'z' ? banda.z1 - banda.z0 : banda.x1 - banda.x0
    const cuantos = Math.floor(largo / banda.paso)
    for (let i = 0; i <= cuantos; i += 1) {
      const semilla = SEMILLA_DE_LA_VEGETACION + b * 1009
      const aLoLargo = banda.paso * (i + entreDe(semilla, i * 4 + 1, -0.25, 0.25))
      // Pegados al borde de la acera que queda lejos de la calzada (las dos aceras están en las
      // coordenadas menores): así la copa, de hasta 2,3 m de radio, no llega a la calzada.
      const aLoAncho = entreDe(semilla, i * 4 + 2, 0.02, 0.15)
      const x = banda.eje === 'z' ? banda.x0 + aLoAncho * (banda.x1 - banda.x0) : banda.x0 + aLoLargo
      const z = banda.eje === 'z' ? banda.z0 + aLoLargo : banda.z0 + aLoAncho * (banda.z1 - banda.z0)
      const modelo = fraccionDe(semilla, i * 4 + 3) < 0.6 ? 'arbol1' : 'arbol2'
      sitios.push({
        banda: banda.nombre,
        avenida: banda.avenida,
        modelo,
        x,
        z,
        giro: entreDe(semilla, i * 4 + 4, 0, Math.PI * 2),
        escala: entreDe(semilla, i * 4 + 5, 0.85, 1.2),
      })
    }
  })
  // Unas plantas en las esquinas del cruce (la sala de espera lleva las suyas aparte).
  const [cruceX, cruceZ] = [CALZADAS.guaimaral.x0 - ANCHO_DE_ACERA / 2, CALZADAS.granColombia.z1 + ANCHO_DE_ACERA / 2]
  sitios.push(
    { banda: 'esquina', avenida: 'guaimaral', modelo: 'planta', x: cruceX, z: cruceZ, giro: 0.6, escala: 1.1 },
    { banda: 'esquina', avenida: 'guaimaral', modelo: 'planta', x: cruceX, z: CALZADAS.granColombia.z0 - ANCHO_DE_ACERA / 2, giro: 2.1, escala: 1 },
    { banda: 'esquina', avenida: 'granColombia', modelo: 'planta', x: CALZADAS.guaimaral.x1 + ANCHO_DE_ACERA / 2, z: CALZADAS.granColombia.z0 - ANCHO_DE_ACERA / 2, giro: 4, escala: 1.05 },
  )
  return sitios.filter(({ x, z }) => {
    if (exclusion.some((zona) => dentroDe(x, z, zona))) return false
    if (Math.hypot(x - TERRENO.centro[0], z - TERRENO.centro[2]) > ALCANCE_DE_LA_VEGETACION + 6) return false
    return !caminos.some(([px, pz]) => Math.hypot(x - px, z - pz) < DISTANCIA_A_UN_CAMINO)
  })
}

/** Los sitios agrupados por modelo: `{ arbol1: [...], arbol2: [...], planta: [...] }`. */
export function sitiosPorModelo(sitios = sitiosDeLaVegetacion()) {
  const grupos = Object.fromEntries(Object.keys(MODELOS_DE_VEGETACION).map((clave) => [clave, []]))
  for (const sitio of sitios) grupos[sitio.modelo].push(sitio)
  return grupos
}

/**
 * Las cajas que ocupa cada planta o árbol, para comprobar con rayos que no tapa nada:
 * una caja `{ nombre, min, max }` por sitio, del tamaño de su copa y de su alto.
 */
export function cajasDeLaVegetacion(sitios = sitiosDeLaVegetacion()) {
  return sitios.map(({ modelo, x, z, escala }, i) => {
    const { alto, radioDeLaCopa } = MODELOS_DE_VEGETACION[modelo]
    const r = radioDeLaCopa * escala
    return { nombre: `${modelo} ${i + 1}`, min: [x - r, 0, z - r], max: [x + r, alto * escala, z + r] }
  })
}
