import {
  BoxGeometry,
  CatmullRomCurve3,
  Color,
  ConeGeometry,
  CylinderGeometry,
  Float32BufferAttribute,
  PlaneGeometry,
  RingGeometry,
  SphereGeometry,
  TubeGeometry,
  Vector3,
} from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

import { COLOR_DE_ESCENA } from '../estilos/colores.js'

/**
 * Las formas del entorno (calles, piso, placas, puestos), creadas **una sola
 * vez** y compartidas. Cada conjunto de piezas que comparten material se junta
 * en una sola geometría (una llamada de dibujo), y los que llevan varios
 * colores los llevan como color de vértice.
 *
 * Son funciones sin React para poder probarlas con Node. Quien las llame se
 * encarga de soltar la geometría con `dispose()`.
 */

/**
 * Los tramos de una línea de `desde` a `hasta` que quedan al quitarle los
 * `huecos` (`{ centro, ancho }`). Sirve para los bordillos y la pared, que se
 * interrumpen donde hay una boca.
 *
 * @returns {Array<[number, number]>} tramos ordenados, sin los de largo cero
 */
export function tramosConHuecos(desde, hasta, huecos = []) {
  const ordenados = huecos
    .map(({ centro, ancho }) => [centro - ancho / 2, centro + ancho / 2])
    .sort((a, b) => a[0] - b[0])
  const tramos = []
  let cursor = desde
  for (const [inicio, fin] of ordenados) {
    if (inicio > cursor) tramos.push([cursor, Math.min(inicio, hasta)])
    cursor = Math.max(cursor, fin)
  }
  if (cursor < hasta) tramos.push([cursor, hasta])
  return tramos.filter(([a, b]) => b - a > 1e-9)
}

/** Pinta de un solo color de vértice una geometría, para poder juntarla con otras de otro color. */
export function conColor(geometria, hex) {
  const { r, g, b } = new Color(hex)
  const cantidad = geometria.attributes.position.count
  const colores = new Float32Array(cantidad * 3)
  for (let i = 0; i < cantidad; i += 1) colores.set([r, g, b], i * 3)
  geometria.setAttribute('color', new Float32BufferAttribute(colores, 3))
  return geometria
}

/** Junta piezas ya pintadas en una sola geometría. */
export function juntar(piezas) {
  const geometria = mergeGeometries(piezas, false)
  for (const pieza of piezas) pieza.dispose()
  return geometria
}

/**
 * Bordillos: cajas bajas a lo largo de un eje, una por tramo.
 *
 * @param {Array<{ eje: 'x'|'z', fijo: number, desde: number, hasta: number }>} tramos
 *   `eje` es el eje a lo largo del cual corre el tramo y `fijo` la coordenada
 *   del otro eje donde está su centro
 */
export function bordillos(tramos, { ancho = 0.2, alto = 0.15 } = {}) {
  return juntar(
    tramos.map(({ eje, fijo, desde, hasta }) => {
      const largo = hasta - desde
      const centro = (desde + hasta) / 2
      return eje === 'x'
        ? new BoxGeometry(largo, alto, ancho).translate(centro, alto / 2, fijo)
        : new BoxGeometry(ancho, alto, largo).translate(fijo, alto / 2, centro)
    }),
  )
}

/** Un rectángulo acostado, de ancho `a` (en X) por `b` (en Z), con su centro en (x, y, z). */
const rectanguloAcostado = (a, b, x, y, z) => new PlaneGeometry(a, b).rotateX(-Math.PI / 2).translate(x, y, z)

/**
 * Una línea discontinua a lo largo de un eje: rayas de `raya` metros separadas
 * `hueco`, de `desde` a `hasta`, a la altura `y` y en la coordenada fija `fijo`
 * del otro eje.
 *
 * @param {object} opciones
 * @param {'x'|'z'} opciones.eje el eje a lo largo del cual corre la línea
 */
export function lineaDiscontinua({ eje, desde, hasta, fijo, raya = 2, hueco = 2, ancho = 0.14, y = 0.012 }) {
  const piezas = []
  for (let inicio = desde; inicio + raya <= hasta + 1e-9; inicio += raya + hueco) {
    const centro = inicio + raya / 2
    piezas.push(
      eje === 'x'
        ? rectanguloAcostado(raya, ancho, centro, y, fijo)
        : rectanguloAcostado(ancho, raya, fijo, y, centro),
    )
  }
  return juntar(piezas)
}

/**
 * Un paso de cebra: `rayas` franjas paralelas al eje Z, repartidas a lo ancho
 * de `ancho` metros desde `x0`, de `largo` metros de largo y centradas en `z`.
 */
export function pasoDeCebra({ x0, ancho, z, largo = 1.6, rayas = 8, y = 0.012 }) {
  const paso = ancho / rayas
  const piezas = []
  for (let i = 0; i < rayas; i += 2) {
    piezas.push(rectanguloAcostado(paso, largo, x0 + paso * (i + 0.5), y, z))
  }
  return juntar(piezas)
}

/** Las juntas de dilatación del piso de concreto: líneas finas a lo ancho y a lo largo. */
export function juntasDelPiso({ ancho, fondo, cada = 5.5, grosor = 0.05, y = 0.008 }) {
  const piezas = []
  for (let x = -ancho / 2 + cada; x < ancho / 2 - 1e-9; x += cada) {
    piezas.push(rectanguloAcostado(grosor, fondo, x, y, 0))
  }
  for (let z = -fondo / 2 + cada; z < fondo / 2 - 1e-9; z += cada) {
    piezas.push(rectanguloAcostado(ancho, grosor, 0, y, z))
  }
  return juntar(piezas)
}

/** Un marco de cuatro tiras en el borde de una losa de `ancho` por `fondo`. */
export function marcoDeLosa({ ancho, fondo, tira = 0.1, alto = 0.05 }) {
  const lado = (a, b, x, z) => new BoxGeometry(a, alto, b).translate(x, alto / 2, z)
  return juntar([
    lado(ancho, tira, 0, -fondo / 2 + tira / 2),
    lado(ancho, tira, 0, fondo / 2 - tira / 2),
    lado(tira, fondo - 2 * tira, -ancho / 2 + tira / 2, 0),
    lado(tira, fondo - 2 * tira, ancho / 2 - tira / 2, 0),
  ])
}

/**
 * La rejilla de desagüe de una placa: una chapa metálica con ranuras oscuras.
 * Lleva color de vértice (`metal` y `manguera`).
 */
export function rejillaDeDesague({ ancho = 1.4, fondo = 0.45, ranuras = 7, alto = 0.025 }) {
  const piezas = [conColor(new BoxGeometry(ancho, alto, fondo).translate(0, alto / 2, 0), COLOR_DE_ESCENA.metal)]
  const paso = ancho / (ranuras + 1)
  for (let i = 1; i <= ranuras; i += 1) {
    piezas.push(
      conColor(
        new BoxGeometry(0.05, 0.004, fondo * 0.72).translate(-ancho / 2 + paso * i, alto + 0.002, 0),
        COLOR_DE_ESCENA.manguera,
      ),
    )
  }
  return juntar(piezas)
}

/**
 * El poste de una placa con su manguera: un tubo metálico, el soporte de la
 * manguera, la manguera que cuelga hacia el lado de la losa (+X) y la boquilla.
 * Lleva color de vértice. Mide `alto` de alto y su pie está en (0, 0, 0).
 */
export function posteConManguera({ alto = 1.55, alcance = 0.95 }) {
  const poste = conColor(new CylinderGeometry(0.05, 0.06, alto, 10).translate(0, alto / 2, 0), COLOR_DE_ESCENA.metal)
  const base = conColor(new CylinderGeometry(0.16, 0.18, 0.06, 12).translate(0, 0.03, 0), COLOR_DE_ESCENA.metal)
  const soporte = conColor(new BoxGeometry(0.16, 0.06, 0.06).translate(0.07, alto - 0.12, 0), COLOR_DE_ESCENA.metal)
  const curva = new CatmullRomCurve3([
    new Vector3(0.1, alto - 0.12, 0),
    new Vector3(0.38, alto - 0.02, 0),
    new Vector3(alcance * 0.85, alto - 0.3, 0),
    new Vector3(alcance, alto - 0.62, 0),
  ])
  const manguera = conColor(new TubeGeometry(curva, 18, 0.03, 6, false), COLOR_DE_ESCENA.manguera)
  const boquilla = conColor(
    new CylinderGeometry(0.035, 0.05, 0.18, 8).translate(alcance, alto - 0.7, 0),
    COLOR_DE_ESCENA.metal,
  )
  return juntar([poste, base, soporte, manguera, boquilla])
}

/** Un poste sencillo con su base, para el rótulo de un puesto. Lleva color de vértice. */
export function posteSencillo({ alto = 1.2 }) {
  return juntar([
    conColor(new CylinderGeometry(0.045, 0.055, alto, 10).translate(0, alto / 2, 0), COLOR_DE_ESCENA.metal),
    conColor(new CylinderGeometry(0.14, 0.16, 0.05, 12).translate(0, 0.025, 0), COLOR_DE_ESCENA.metal),
  ])
}

/**
 * La barrera de un servidor cerrado: una barra ámbar a lo ancho de la losa sobre
 * dos patas. Su pie está en (0, 0, 0), centrada en X, y va sobre la losa baja.
 */
export function barreraDeCierre({ ancho, alto = 0.55 }) {
  const luz = ancho - 0.5
  const pata = (x) => conColor(new BoxGeometry(0.07, alto, 0.07).translate(x, alto / 2, 0), COLOR_DE_ESCENA.metal)
  return juntar([
    pata(-luz / 2),
    pata(luz / 2),
    conColor(new BoxGeometry(luz, 0.14, 0.06).translate(0, alto - 0.07, 0), COLOR_DE_ESCENA.barreraDeCierre),
  ])
}

/**
 * El cono que avisa de un servidor cerrado o que se está cerrando: ámbar, sobre
 * una base cuadrada de metal. Su pie está en (0, 0, 0).
 */
export function conoDeCierre({ alto = 0.5 } = {}) {
  return juntar([
    conColor(new BoxGeometry(0.34, 0.04, 0.34).translate(0, 0.02, 0), COLOR_DE_ESCENA.metal),
    conColor(new ConeGeometry(0.14, alto - 0.04, 14).translate(0, 0.04 + (alto - 0.04) / 2, 0), COLOR_DE_ESCENA.barreraDeCierre),
  ])
}

/**
 * El tablero de herramientas de un puesto de acabado: una tabla vertical con
 * tres ganchos y un bote encima de la mesa. Lleva color de vértice. Su pie
 * está en (0, 0, 0) y mira hacia +Z.
 */
export function tableroDeHerramientas({ ancho = 1.7, alto = 0.62 }) {
  const piezas = [
    conColor(new BoxGeometry(ancho, alto, 0.05).translate(0, alto / 2, 0), COLOR_DE_ESCENA.metal),
  ]
  for (const x of [-0.5, 0, 0.5]) {
    piezas.push(
      conColor(new CylinderGeometry(0.03, 0.03, 0.14, 8).rotateX(Math.PI / 2).translate(x, alto * 0.7, 0.09), COLOR_DE_ESCENA.manguera),
    )
  }
  piezas.push(conColor(new CylinderGeometry(0.09, 0.09, 0.2, 12).translate(ancho / 2 - 0.2, 0.1, 0.22), COLOR_DE_ESCENA.manguera))
  return juntar(piezas)
}

/**
 * Cuánto tapa el velo del borde a la distancia `r` del centro: nada hasta
 * `desde`, todo desde `hasta`, y en medio una curva suave (sin esquinas, para
 * que no se note dónde empieza).
 */
export function opacidadDelBorde(r, desde, hasta) {
  const t = Math.min(1, Math.max(0, (r - desde) / (hasta - desde)))
  return t * t * (3 - 2 * t)
}

/**
 * El velo que desvanece el borde del terreno: un anillo acostado, del color del
 * horizonte del cielo (`cieloHorizonte`), cuya opacidad (color de vértice con alfa) sube de 0 en
 * `desde` a 1 en `hasta` y se queda en 1 hasta `radioExterior`. Dibujado con
 * un material sin luz, el terreno y las calles se van disolviendo en el fondo.
 */
export function veloDelBorde({ desde, hasta, radioExterior, segmentos = 96, anillos = 48 }) {
  const geometria = new RingGeometry(desde, radioExterior, segmentos, anillos).rotateX(-Math.PI / 2)
  const { r, g, b } = new Color(COLOR_DE_ESCENA.cieloHorizonte)
  const posiciones = geometria.attributes.position
  const colores = new Float32Array(posiciones.count * 4)
  for (let i = 0; i < posiciones.count; i += 1) {
    const radio = Math.hypot(posiciones.getX(i), posiciones.getZ(i))
    colores.set([r, g, b, opacidadDelBorde(radio, desde, hasta)], i * 4)
  }
  geometria.setAttribute('color', new Float32BufferAttribute(colores, 4))
  return geometria
}

/**
 * Cuánto del cielo es del color del cenit a la altura `elevacion` (en grados
 * sobre el horizonte): 0 en el horizonte y bajo él, 1 desde `hastaElCenit`, y
 * en medio una curva suave. El cielo se alcanza a ver poco desde la vista
 * general (la cámara mira hacia abajo), por eso el degradado se completa a
 * pocos grados y no a los 90.
 */
export function mezclaDelCielo(elevacion, hastaElCenit = 14) {
  const t = Math.min(1, Math.max(0, elevacion / hastaElCenit))
  return t * t * (3 - 2 * t)
}

/**
 * La cúpula del cielo: una esfera (se mira desde dentro) con el color por
 * vértice: el del horizonte (`cieloHorizonte`) en el horizonte y por debajo de
 * él, y el del cenit (`cieloCenit`) arriba, con un degradado suave entre los
 * dos. No lleva imágenes ni pide nada a internet.
 *
 * @param {object} [opciones]
 * @param {number} [opciones.radio] radio de la cúpula, en metros
 * @param {number} [opciones.hastaElCenit] a cuántos grados sobre el horizonte se completa el cenit
 */
export function cupulaDelCielo({ radio = 500, hastaElCenit = 14, segmentos = 40, anillos = 32 } = {}) {
  const geometria = new SphereGeometry(radio, segmentos, anillos)
  const horizonte = new Color(COLOR_DE_ESCENA.cieloHorizonte)
  const cenit = new Color(COLOR_DE_ESCENA.cieloCenit)
  const mezcla = new Color()
  const posiciones = geometria.attributes.position
  const colores = new Float32Array(posiciones.count * 3)
  for (let i = 0; i < posiciones.count; i += 1) {
    const elevacion = (Math.asin(Math.max(-1, Math.min(1, posiciones.getY(i) / radio))) * 180) / Math.PI
    mezcla.copy(horizonte).lerp(cenit, mezclaDelCielo(elevacion, hastaElCenit))
    colores.set([mezcla.r, mezcla.g, mezcla.b], i * 3)
  }
  geometria.setAttribute('color', new Float32BufferAttribute(colores, 3))
  return geometria
}

/**
 * La estructura metálica de una placa de lavado: cuatro patas bajo la cubierta y
 * una rampa en el frente, por donde sube la moto. Medidas en metros.
 *
 * - `pata`: el lado de cada pata (cuadrada) y `retiro`, cuánto se mete desde el borde.
 * - `anchoDeLaRampa`: más ancha que la moto (0,75 m).
 * - `espesorDeLaCubierta`: lo que mide de grueso la cubierta (la parte de arriba
 *   que lleva el color del estado) cuando la placa está levantada.
 */
export const ESTRUCTURA_DE_LA_PLACA = { pata: 0.12, retiro: 0.14, anchoDeLaRampa: 1.1, espesorDeLaCubierta: 0.12 }

/**
 * Dónde caen las patas y la rampa de una placa de `ancho` por `fondo`, medido
 * desde el centro de la placa (+Z es el frente, por donde entra la moto).
 *
 * @returns {{ patas: Array<{ x: number, z: number, lado: number }>, rampa: { x0: number, x1: number, z0: number, z1: number } | null }}
 */
export function medidasDeLaEstructura({ ancho, fondo, largoDeLaRampa }) {
  const { pata, retiro, anchoDeLaRampa } = ESTRUCTURA_DE_LA_PLACA
  const x = ancho / 2 - retiro - pata / 2
  const z = fondo / 2 - retiro - pata / 2
  return {
    patas: [
      [-x, -z],
      [x, -z],
      [-x, z],
      [x, z],
    ].map(([px, pz]) => ({ x: px, z: pz, lado: pata })),
    // Sin rampa (largo 0): `null`.
    rampa: largoDeLaRampa > 0 ? { x0: -anchoDeLaRampa / 2, x1: anchoDeLaRampa / 2, z0: fondo / 2, z1: fondo / 2 + largoDeLaRampa } : null,
  }
}

/**
 * La estructura de una placa levantada a `alto` metros: cuatro patas y la
 * rampa del frente, juntas en una sola geometría de color de vértice (`metal`).
 * Va del piso (y = 0) a `alto`: la escena la estira en Y con la altura de la
 * cubierta, así las patas y la rampa suben y bajan con ella.
 */
export function estructuraDeLaPlaca({ ancho, fondo, alto, largoDeLaRampa }) {
  const { patas, rampa } = medidasDeLaEstructura({ ancho, fondo, largoDeLaRampa })
  const piezas = patas.map(({ x, z, lado }) => conColor(new BoxGeometry(lado, alto, lado).translate(x, alto / 2, z), COLOR_DE_ESCENA.metal))

  // La rampa es una caja a la que se le baja al piso el borde de arriba del lado de afuera: queda una cuna.
  if (rampa) {
    const largo = rampa.z1 - rampa.z0
    const cuna = new BoxGeometry(rampa.x1 - rampa.x0, alto, largo).translate(0, alto / 2, rampa.z0 + largo / 2)
    const posiciones = cuna.attributes.position
    for (let i = 0; i < posiciones.count; i += 1) {
      if (posiciones.getY(i) > alto / 2 && posiciones.getZ(i) > rampa.z0 + largo / 2) posiciones.setY(i, 0)
    }
    cuna.computeVertexNormals()
    piezas.push(conColor(cuna, COLOR_DE_ESCENA.metal))
  }
  return juntar(piezas)
}
