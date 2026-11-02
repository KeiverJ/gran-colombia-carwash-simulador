import { ASIENTOS_OCUPADOS, HUELLA_DE_LA_CAFETERIA, OBJETOS_DEL_MOSTRADOR } from './cafeteria.js'
import { cajasDeLosa, postesDeLasLosas, puntosDeLosCaminos } from './charcos.js'
import { entreDe, fraccionDe } from './hashPropio.js'
import {
  ANCHO_DE_BOCA,
  AVENIDAS,
  COLUMNAS_DEL_TECHO,
  CURVAS_DE_ENTRADA,
  FRANJA_DE_ESPERA,
  LOCAL,
  TERRENO,
} from './posiciones.js'
import {
  CLAVES_DE_LAS_VISTAS,
  camaraDeLaVista,
  ojosDelAsiento,
  PANTALLAS_DE_LA_PRUEBA,
  puntosClave,
  puntosTapados,
} from './visibilidad.js'

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

/* ------------------------------------------------------------------------- *
 * Los detalles de la calle y de la cafetería
 * ------------------------------------------------------------------------- */

/**
 * Lo que mide cada detalle (su alto y la mitad de lo que ocupa desde arriba, en metros),
 * para comprobar con rayos y con distancias que no estorba. `modelo` es el archivo de
 * `public/modelos/ambiente/` y `forma` lo que se hace en código.
 */
export const FORMAS_DE_DETALLE = {
  farol: { modelo: 'farol', alto: 4.5, radio: 0.7 },
  semaforo: { modelo: 'semaforo', alto: 3.5, radio: 0.35 },
  stop: { modelo: 'stop', alto: 2.2, radio: 0.4 },
  cono: { modelo: 'cono', alto: 0.5, radio: 0.25 },
  balde: { modelo: 'balde', alto: 0.35, radio: 0.25 },
  matera: { modelo: 'planta', alto: 1.6, radio: 0.45 },
  caja: { modelo: 'caja', alto: 0.3, radio: 0.2 },
  nevera: { modelo: 'nevera', alto: 1, radio: 0.3 },
  caneca: { forma: 'caneca', alto: 0.8, radio: 0.25 },
  banca: { forma: 'banca', alto: 0.9, radio: 0.9 },
  sombrilla: { forma: 'sombrilla', alto: 2.65, radio: 1.1 },
}

/** Los roles de la calle (los de la cafetería van en `ROLES_DE_LA_CAFETERIA`). */
export const ROLES_DE_LA_CALLE = ['farol', 'caneca', 'semaforo', 'stop', 'cono', 'balde']

/** Los roles que van en la cafetería, adentro o bajo su toldo. */
export const ROLES_DE_LA_CAFETERIA = ['banca', 'matera', 'sombrilla', 'caja', 'nevera']

/** Los objetos rojos o ámbar, que no pueden parecer un aviso: van lejos de lo que avisa (D12). */
export const ROLES_ROJOS = ['stop', 'semaforo']

/** Lo más cerca que puede estar un objeto rojo o ámbar de una losa, un rótulo o un indicador, en metros. */
export const DISTANCIA_A_LO_QUE_AVISA = 6

/** Lo más cerca que puede estar un cono decorativo de una placa o un puesto, en metros. */
export const DISTANCIA_DE_UN_CONO_A_UNA_LOSA = 1.5

/** A qué distancia de una columna se prueba un balde. */
const RADIOS_DEL_BALDE = [0.8, 1.1]

const SEMILLA_DE_LOS_DETALLES = 70707

/** Distancia de un punto a una caja `{ x0, x1, z0, z1 }` (0 si está dentro). */
export const distanciaAUnaCaja = (x, z, c) => Math.hypot(Math.max(c.x0 - x, 0, x - c.x1), Math.max(c.z0 - z, 0, z - c.z1))

/** Desde dónde se mira: las cámaras de las cuatro vistas y los ojos de quienes están sentados en la cafetería. */
const OJOS_QUE_MIRAN = () => [
  ...PANTALLAS_DE_LA_PRUEBA.flatMap((pantalla) => CLAVES_DE_LAS_VISTAS.map((clave) => camaraDeLaVista(clave, pantalla))),
  ...ASIENTOS_OCUPADOS.map(ojosDelAsiento),
]

/**
 * Dónde caen los baldes: junto a una columna, fuera de los caminos, de las losas y de los
 * postes (con 14 placas y 7 puestos) y sin tapar, desde ninguna vista ni desde los asientos de
 * la cafetería, un solo punto del lavadero (un balde bajo, en el piso, tapa lo que queda detrás).
 */
function sitiosDeLosBaldes() {
  const caminos = puntosDeLosCaminosMaximos()
  const cajas = cajasDeLosa(14, 7)
  const postes = postesDeLasLosas(14, 7)
  const ojos = OJOS_QUE_MIRAN()
  const puntos = puntosClave(14, 7)
  const tapaAlgo = (x, z) => {
    const { alto, radio } = FORMAS_DE_DETALLE.balde
    const caja = { nombre: 'balde', min: [x - radio, 0, z - radio], max: [x + radio, alto, z + radio] }
    return ojos.some((origen) => puntosTapados(origen, puntos, [caja]).length > 0)
  }
  const sitios = []
  for (const [cx, , cz] of COLUMNAS_DEL_TECHO) {
    let elegido = null
    for (const radio of RADIOS_DEL_BALDE) {
      for (let k = 0; k < 8 && !elegido; k += 1) {
        const x = cx + radio * Math.cos((k * Math.PI) / 4)
        const z = cz + radio * Math.sin((k * Math.PI) / 4)
        const libre =
          caminos.every(([px, pz]) => Math.hypot(x - px, z - pz) >= 1.2) &&
          cajas.every((caja) => distanciaAUnaCaja(x, z, caja) >= 0.5) &&
          postes.every(([px, pz]) => Math.hypot(x - px, z - pz) >= 0.8) &&
          !tapaAlgo(x, z)
        if (libre) elegido = [x, z]
      }
    }
    if (elegido) {
      sitios.push({ rol: 'balde', x: elegido[0], y: 0, z: elegido[1], giro: entreDe(SEMILLA_DE_LOS_DETALLES, sitios.length, 0, Math.PI * 2), escala: 1 })
    }
  }
  return sitios
}

/**
 * Los sitios de los detalles: `[{ rol, x, y, z, giro, escala }]`, siempre los mismos.
 * `giro` es el giro sobre Y de los modelos, que miran a +Z (un farol mira con su brazo).
 *
 * - **Calle:** faroles y canecas en las aceras del otro lado de las dos avenidas (con el
 *   farol de brazo hacia la calzada), el semáforo y la señal «Stop» en la esquina de las
 *   dos avenidas, conos en las aceras frente a las dos bocas y baldes junto a las columnas.
 * - **Cafetería:** bancas a su costado, materas con la planta junto a la sala de espera,
 *   la sombrilla junto a las mesas, y la caja registradora y la nevera en el mostrador.
 *
 * Todo lo de la calle queda fuera de las calzadas, del local, de las bocas y de las losas
 * (lo comprueba `colocacion.test.jsx`); los objetos rojos o ámbar, a 6 m o más de lo que avisa.
 */
export function sitiosDeLosDetalles() {
  const sitios = []
  const poner = (rol, x, z, giro = 0, y = 0, escala = 1) => sitios.push({ rol, x, y, z, giro, escala })
  const acera = { guaimaral: CALZADAS.guaimaral.x0 - 0.7, granColombia: CALZADAS.granColombia.z0 - 0.7 }

  // Faroles: a lo largo de las aceras, con el brazo hacia la calzada.
  for (const z of [14, 32, -24]) poner('farol', acera.guaimaral, z, Math.PI / 2)
  for (const x of [10, 28, -26]) poner('farol', x, acera.granColombia, 0)
  // Canecas: entre los faroles, junto a la calzada.
  for (const z of [22, -27]) poner('caneca', acera.guaimaral + 0.1, z)
  for (const x of [-9, 19]) poner('caneca', x, acera.granColombia + 0.1)
  // La esquina de las dos avenidas: el semáforo (mira a los carros de la Guaimaral) y la «Stop» (mira a los de la Gran Colombia).
  poner('semaforo', CALZADAS.guaimaral.x0 - 0.4, CALZADAS.granColombia.z0 - 0.4, 0)
  poner('stop', CALZADAS.guaimaral.x0 - 2.7, CALZADAS.granColombia.z0 - 0.3, Math.PI / 2)
  // Conos en las aceras frente a las dos bocas.
  const [bocaGuaimaral, bocaGranColombia] = [AVENIDAS.guaimaral.posicion, AVENIDAS.granColombia.posicion]
  for (const dz of [-1.2, 1.2]) poner('cono', CALZADAS.guaimaral.x0 - 1.1, bocaGuaimaral[2] + dz, 0.3 + dz)
  for (const dx of [-1.2, 1.2]) poner('cono', bocaGranColombia[0] + dx, CALZADAS.granColombia.z0 - 1.1, 1.1 + dx)
  sitios.push(...sitiosDeLosBaldes())

  // La cafetería: bancas a su costado (miran a la pared), materas junto a la sala de espera,
  // la sombrilla junto a las mesas y la caja y la nevera en el mostrador (miran al cliente, hacia −Z).
  for (const z of [28, 29.9]) poner('banca', HUELLA_DE_LA_CAFETERIA.x1 + 1.1, z, -Math.PI / 2)
  poner('matera', HUELLA_DE_LA_CAFETERIA.x0 - 0.05, 26.3, 0.8)
  poner('matera', HUELLA_DE_LA_CAFETERIA.x1 + 0.5, 26.3, 2.2)
  poner('sombrilla', HUELLA_DE_LA_CAFETERIA.x1 + 1.45, 24.9)
  const { caja, nevera } = OBJETOS_DEL_MOSTRADOR
  poner('caja', caja.x, caja.z, Math.PI, caja.y)
  poner('nevera', nevera.x, nevera.z, Math.PI, nevera.y)
  return sitios
}

/**
 * Las cajas que ocupa cada detalle, para comprobar con rayos que no tapa nada. La
 * sombrilla son dos: el palo y el toldo, que está por encima de los ojos de una persona sentada.
 */
export function cajasDeLosDetalles(sitios = sitiosDeLosDetalles()) {
  return sitios.flatMap(({ rol, x, y, z, escala }, i) => {
    const { alto, radio } = FORMAS_DE_DETALLE[rol]
    const r = radio * escala
    const nombre = `${rol} ${i + 1}`
    if (rol === 'sombrilla') {
      return [
        { nombre: `${nombre} (palo)`, min: [x - 0.06, 0, z - 0.06], max: [x + 0.06, alto, z + 0.06] },
        { nombre: `${nombre} (toldo)`, min: [x - r, 2.1, z - r], max: [x + r, alto, z + r] },
      ]
    }
    return [{ nombre, min: [x - r, y, z - r], max: [x + r, y + alto * escala, z + r] }]
  })
}
