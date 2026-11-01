import { BufferGeometry, CatmullRomCurve3, Float32BufferAttribute, TubeGeometry, Vector3 } from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

import { COLUMNAS_DEL_TECHO, TECHO } from './posiciones.js'
import { CENTRO_DEL_SUELO_CUBIERTO, medidasDelTecho } from './techo.js'

/**
 * La lona del techo: una superficie blanca curva y tensada sobre cuatro arcos
 * metálicos de tubo, como en la foto del lavadero. Reemplaza a la losa plana.
 *
 * La curva es un arco de círculo que cruza el local de lado a lado (el eje X)
 * y se extruye a lo largo del fondo (el eje Z). Arranca en las vigas del
 * perímetro —las de los lados izquierdo y derecho, a `TECHO.alto`— y sube
 * `LONA.flecha` en el centro. Los arcos salen de esas mismas vigas: no hay
 * columnas nuevas. La lona se prolonga `TECHO.vuelo` más allá de las vigas,
 * cayendo un poco, como una lona tensada que cuelga del borde.
 *
 * Todo en metros. Las geometrías están centradas en el centro del suelo cubierto
 * en X y Z (la malla se coloca ahí) y llevan la altura real en Y.
 */

/** La flecha de la curva (lo que sube el centro sobre las vigas), el grosor del tubo de los arcos y cuántos arcos hay. */
export const LONA = { flecha: 1.5, radioDelArco: 0.05, arcos: 4 }

/** Mitad de la distancia entre las vigas de los lados izquierdo y derecho: donde arranca la curva. */
export function semianchoEntreVigas() {
  const xs = COLUMNAS_DEL_TECHO.map(([x]) => x)
  return (Math.max(...xs) - Math.min(...xs)) / 2
}

/**
 * Cuánto sube la lona sobre las vigas a `x` metros del centro: `flecha` en el
 * centro, 0 sobre las vigas (`x = ±semiancho`) y, más allá, baja un poco más.
 */
export function alturaDeLaLona(x, semiancho = semianchoEntreVigas(), flecha = LONA.flecha) {
  const radio = (semiancho * semiancho + flecha * flecha) / (2 * flecha)
  return Math.sqrt(radio * radio - x * x) - (radio - flecha)
}

/** La altura (en Y, absoluta) de la lona a `x` metros del centro. */
export const alturaAbsolutaDeLaLona = (x) => TECHO.alto + alturaDeLaLona(x)

/** Las posiciones de los arcos a lo largo del fondo (en Z, absolutas): de la viga de adelante a la de atrás, repartidos parejo. */
export function posicionesDeLosArcos(cuantos = LONA.arcos) {
  const zs = COLUMNAS_DEL_TECHO.map(([, , z]) => z)
  const atras = Math.min(...zs)
  const adelante = Math.max(...zs)
  return Array.from({ length: cuantos }, (_, i) => adelante - (i * (adelante - atras)) / (cuantos - 1))
}

/**
 * La lona: un plano de `ancho` × `fondo` (lo que cubre `medidasDelTecho`) cuyos
 * vértices siguen la curva. Se dibuja por los dos lados.
 */
export function superficieDeLaLona({ cortes = 32 } = {}) {
  const { ancho, fondo } = medidasDelTecho()
  const posiciones = []
  const indices = []
  for (let i = 0; i <= cortes; i += 1) {
    const x = -ancho / 2 + (ancho * i) / cortes
    const y = alturaAbsolutaDeLaLona(x)
    posiciones.push(x, y, -fondo / 2, x, y, fondo / 2)
  }
  for (let i = 0; i < cortes; i += 1) {
    const a = i * 2
    indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2)
  }
  const geometria = new BufferGeometry()
  geometria.setAttribute('position', new Float32BufferAttribute(posiciones, 3))
  geometria.setIndex(indices)
  geometria.computeVertexNormals()
  return geometria
}

/**
 * Los arcos de tubo, en una sola geometría: cada uno va de una viga lateral a la
 * otra, apoyado sobre la lona (su centro, un radio por encima de ella).
 */
export function arcosDeLaLona({ puntos = 24, lados = 8 } = {}) {
  const semiancho = semianchoEntreVigas()
  const [, , cz] = CENTRO_DEL_SUELO_CUBIERTO
  const tubos = posicionesDeLosArcos().map((z) => {
    const curva = new CatmullRomCurve3(
      Array.from({ length: puntos + 1 }, (_, i) => {
        const x = -semiancho + (2 * semiancho * i) / puntos
        return new Vector3(x, alturaAbsolutaDeLaLona(x) + LONA.radioDelArco, z - cz)
      }),
    )
    return new TubeGeometry(curva, puntos * 2, LONA.radioDelArco, lados, false)
  })
  const juntos = mergeGeometries(tubos)
  tubos.forEach((tubo) => tubo.dispose())
  return juntos
}

/**
 * La cresta del arco delantero, en el mundo: ahí se apoya el logo redondo. `y`
 * es la parte de arriba del tubo en el centro del local.
 */
export function crestaDelArcoDelantero() {
  const [cx] = CENTRO_DEL_SUELO_CUBIERTO
  const [zDelantero] = posicionesDeLosArcos()
  return { x: cx, y: TECHO.alto + LONA.flecha + 2 * LONA.radioDelArco, z: zDelantero }
}
