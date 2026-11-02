import { entreDe } from './hashPropio.js'

/**
 * El lavado de carros del mismo local, que en `docs/referencias/mapa-entradas.jpg` son
 * los techos grandes naranja (terracota) y gris que quedan, en el mapa girado 180° (el
 * que corresponde a la escena), **a la derecha del lavadero de motos**. Se dibuja solo
 * como referencia del lugar: no tiene ninguna función, el modelo sigue siendo solo de
 * motos y la Ayuda lo dice. JavaScript puro, en metros y en coordenadas del mundo.
 *
 * **Dónde y por qué ahí.** Con la misma escala y la misma superposición con que se
 * colocaron las entradas (`docs/referencias/correspondencia-mapa-planta.md`: 0,0625 m
 * por píxel, el punto (348, 540) del mapa sobre la esquina (−11, −12) y el mapa girado
 * 180°), esos techos caen en x de 0 a 10,8 y z de −14 a 0,8: encima de los puestos del
 * lavadero de motos y de su franja de espera. Como no pueden pisarlos, se dibujan **a
 * la derecha de la franja de espera, en las mismas filas del mapa** (z de −10,5 a 1,8,
 * la franja donde caen los techos): un techo naranja sobre la fila de atrás y uno gris
 * sobre la de adelante, cada uno al menos tan grande como los del mapa (que miden
 * 9,0 × 6,2 m y 9,4 × 6,5 m).
 *
 * **Cinco bahías**, con el mismo diseño: el piso marcado, la rejilla de desagüe al frente
 * y una manguera. Tres van bajo el techo naranja (la fila de atrás) y dos bajo el gris (la
 * de adelante, con un hueco libre de secado al lado). Cada bahía es de 3,2 m de ancho y
 * 5,2 m de fondo: un carro de frente a +Z cabe con sitio para la rejilla.
 */

/** Lo que ocupa el lavado de carros visto desde arriba (sin los techos, que sobresalen un poco). */
export const LAVADERO_DE_CARROS = { x0: 18.5, x1: 29.9, z0: -10.5, z1: 1.8 }

/** Lo que sobresalen los techos de las columnas, y su alto sobre el piso, en metros. */
export const TECHOS = { vuelo: 0.6, alto: 4.2, grosor: 0.25 }

/** Lo que mide cada columna (de lado) y el alto del piso del lavado de carros, en metros. */
export const COLUMNAS = { lado: 0.3, alturaDelPiso: 0.05 }

/** La línea (en Z) donde termina el techo naranja, de atrás, y empieza el gris, de adelante. */
export const Z_DEL_MEDIO = -4.5

/** Cada bahía: su ancho (en X), el espacio libre entre dos (donde va una columna) y su margen con el borde del piso, en metros. */
export const BAHIA = { ancho: 3.2, separacion: 0.5, margen: 0.4, margenEnZ: 0.4 }

/** Cuántas bahías hay en cada fila (la de adelante deja un hueco libre al lado) y cuántas en total. */
export const BAHIAS_POR_FILA = { atras: 3, adelante: 2 }
export const BAHIAS_EN_TOTAL = BAHIAS_POR_FILA.atras + BAHIAS_POR_FILA.adelante

/** El borde izquierdo (en X) de la columna `i` de bahías, contando desde 0. */
const xDeLaBahia = (i) => LAVADERO_DE_CARROS.x0 + BAHIA.margen + i * (BAHIA.ancho + BAHIA.separacion)

/** Las columnas de acero: a lo ancho, en los bordes y en los espacios entre bahías; a lo largo, atrás, en el medio y adelante. */
export const COLUMNAS_DE_LOS_CARROS = [
  LAVADERO_DE_CARROS.x0 + COLUMNAS.lado,
  xDeLaBahia(1) - BAHIA.separacion / 2,
  xDeLaBahia(2) - BAHIA.separacion / 2,
  LAVADERO_DE_CARROS.x1 - COLUMNAS.lado,
].flatMap((x) => [LAVADERO_DE_CARROS.z0 + COLUMNAS.lado, Z_DEL_MEDIO, LAVADERO_DE_CARROS.z1 - COLUMNAS.lado].map((z) => [x, z]))

/** Los dos techos: `{ nombre, color, x0, x1, z0, z1, y }` con el nombre del color de la escena (naranja/terracota y gris). */
export function techosDelLavadero() {
  const { x0, x1, z0, z1 } = LAVADERO_DE_CARROS
  const { vuelo, alto } = TECHOS
  return [
    { nombre: 'techo naranja', color: 'casaTerracota', x0: x0 - vuelo, x1: x1 + vuelo, z0: z0 - vuelo, z1: Z_DEL_MEDIO, y: alto + 0.08 },
    { nombre: 'techo gris', color: 'metal', x0: x0 - vuelo, x1: x1 + vuelo, z0: Z_DEL_MEDIO, z1: z1 + vuelo, y: alto },
  ]
}

/**
 * Las cinco bahías, `{ x0, x1, z0, z1 }`: tres en la fila de atrás (bajo el techo naranja) y
 * dos en la de adelante (bajo el gris), de izquierda a derecha.
 */
export function bahiasDeLosCarros() {
  const { z0, z1 } = LAVADERO_DE_CARROS
  const bahia = (i, zDesde, zHasta) => ({ x0: xDeLaBahia(i), x1: xDeLaBahia(i) + BAHIA.ancho, z0: zDesde, z1: zHasta })
  const atras = [0, 1, 2].slice(0, BAHIAS_POR_FILA.atras).map((i) => bahia(i, z0 + BAHIA.margenEnZ, Z_DEL_MEDIO - BAHIA.margenEnZ))
  const adelante = [0, 1, 2].slice(0, BAHIAS_POR_FILA.adelante).map((i) => bahia(i, Z_DEL_MEDIO + BAHIA.margenEnZ, z1 - BAHIA.margenEnZ))
  return [...atras, ...adelante]
}

/** El centro de una bahía, en X y en Z. */
export const centroDeLaBahia = ({ x0, x1, z0, z1 }) => [(x0 + x1) / 2, (z0 + z1) / 2]

/** Cuánto mide la rejilla de desagüe de una bahía (a lo ancho en X y de fondo en Z) y a qué distancia del borde de adelante está. */
export const REJILLA = { ancho: 2.6, fondo: 0.5, delFrente: 0.2 }

/** La rejilla de desagüe de una bahía: la caja `{ x0, x1, z0, z1 }` al frente de ella (hacia +Z), donde cae el agua del carro. */
export function rejillaDeLaBahia(bahia) {
  const [cx] = centroDeLaBahia(bahia)
  const z1 = bahia.z1 - REJILLA.delFrente
  return { x0: cx - REJILLA.ancho / 2, x1: cx + REJILLA.ancho / 2, z0: z1 - REJILLA.fondo, z1 }
}

/** Cuánto sale la manguera de su poste hacia el carro, en metros. */
export const ALCANCE_DE_LA_MANGUERA = 0.6

/** Las mangueras: un poste con manguera junto al borde izquierdo de cada bahía, al frente; la manguera sale hacia +X, hacia el carro. */
export function manguerasDelLavadero() {
  return bahiasDeLosCarros().map((bahia) => ({ x: bahia.x0 + 0.25, z: bahia.z1 - 1.3 }))
}

/** Lo que miden los carros que se lavan (ancho y largo, en metros) y a qué altura queda su techo. */
export const CARRO = { ancho: 1.9, largo: 4.2, alto: 1.3 }

/**
 * Los dos carros estacionados, quietos y de frente a +Z (los modelos de carros que ya hay): el
 * modelo, su sitio y su giro sobre Y. Van en la segunda bahía de atrás y en la segunda de
 * adelante; las otras tres bahías quedan libres, con su piso y su rejilla a la vista.
 */
export function carrosDelLavadero() {
  const bahias = bahiasDeLosCarros()
  return [
    { modelo: 'mazda', bahia: 1, giro: 0.03 },
    { modelo: 'deportivo', bahia: 4, giro: -0.03 },
  ].map(({ modelo, bahia, giro }) => {
    const [x] = centroDeLaBahia(bahias[bahia])
    // El carro queda hacia el fondo de la bahía, dejando libre la rejilla de adelante.
    return { modelo, bahia, giro, x, z: bahias[bahia].z0 + CARRO.largo / 2 + 0.3 }
  })
}

/* Los techos del mapa (`docs/referencias/mapa-entradas.jpg`), en píxeles del mapa original: `{ mx0, mx1, my0, my1 }`. */
export const TECHOS_DEL_MAPA = {
  naranja: { mx0: 28, mx1: 172, my0: 405, my1: 505 },
  gris: { mx0: 0, mx1: 150, my0: 335, my1: 440 },
}

/**
 * Del mapa a la planta, con la superposición de las entradas (`correspondencia-mapa-planta.md`):
 * el mapa girado 180°, a 0,0625 m por píxel, con el punto (348, 540) del mapa sobre la esquina (−11, −12).
 */
export const METROS_POR_PIXEL_DEL_MAPA = 0.0625
export const ESQUINA_DEL_MAPA = { mx: 348, my: 540, x: -11, z: -12 }
export function delMapaALaPlanta(mx, my) {
  const { mx: ex, my: ey, x, z } = ESQUINA_DEL_MAPA
  return [x + (ex - mx) * METROS_POR_PIXEL_DEL_MAPA, z + (ey - my) * METROS_POR_PIXEL_DEL_MAPA]
}

/** Lo que ocupa un techo del mapa ya en la planta: `{ x0, x1, z0, z1 }`. */
export function techoDelMapaEnLaPlanta({ mx0, mx1, my0, my1 }) {
  const [xa, za] = delMapaALaPlanta(mx0, my0)
  const [xb, zb] = delMapaALaPlanta(mx1, my1)
  return { x0: Math.min(xa, xb), x1: Math.max(xa, xb), z0: Math.min(za, zb), z1: Math.max(za, zb) }
}

/** Cuántos blobs de espuma lleva cada carro, y entre qué radios (en metros). */
export const ESPUMA_DEL_CARRO = { blobs: 22, radio: [0.13, 0.26], semilla: 6173 }

/**
 * Los blobs de espuma de un carro, siempre los mismos (hash propio, nunca el azar del
 * motor): `{ x, y, z, radio }` medidos desde el centro del carro (de frente a +Z), sobre su
 * techo, su capó y su baúl. Es espuma quieta, de adorno.
 */
export function blobsDeEspuma(indiceDelCarro = 0) {
  const { blobs, radio, semilla } = ESPUMA_DEL_CARRO
  return Array.from({ length: blobs }, (_, i) => {
    const s = semilla + indiceDelCarro * 101
    return {
      x: entreDe(s, i * 4 + 1, -CARRO.ancho / 2 + 0.2, CARRO.ancho / 2 - 0.2),
      y: entreDe(s, i * 4 + 2, CARRO.alto * 0.7, CARRO.alto + 0.05),
      z: entreDe(s, i * 4 + 3, -CARRO.largo / 2 + 0.4, CARRO.largo / 2 - 0.4),
      radio: entreDe(s, i * 4 + 4, radio[0], radio[1]),
    }
  })
}

/** La caja que rodea a todo el lavado de carros (con los techos), para los rayos de la prueba de visibilidad. */
export function cajaDelLavaderoDeCarros() {
  const { x0, x1, z0, z1 } = LAVADERO_DE_CARROS
  const { vuelo, alto, grosor } = TECHOS
  return { nombre: 'lavado de carros', min: [x0 - vuelo, 0, z0 - vuelo], max: [x1 + vuelo, alto + grosor + 0.08, z1 + vuelo] }
}

/** Lo que ocupa visto desde arriba, con los techos: `{ x0, x1, z0, z1 }`. */
export function huellaDelLavaderoDeCarros() {
  const { min, max } = cajaDelLavaderoDeCarros()
  return { x0: min[0], x1: max[0], z0: min[2], z1: max[2] }
}
