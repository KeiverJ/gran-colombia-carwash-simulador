import {
  BufferGeometry,
  Color,
  ExtrudeGeometry,
  Float32BufferAttribute,
  MeshStandardMaterial,
  Path,
} from 'three'
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader.js'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

/**
 * El logo del local en 3D, construido a partir de los trazados de
 * `public/logo-gran-colombia.svg` (los que entrega `SVGLoader`). El mismo proceso
 * sirve para la versión horizontal, el letrero de la pared (`CAPAS_DEL_LETRERO`).
 *
 * Este archivo es JavaScript puro con `three`, sin DOM ni red, para poder
 * probarlo con Node. Quien lee el SVG es `cargaDelLogo.js`.
 *
 * Cada elemento del SVG es una capa con su propia profundidad (la tabla
 * `CAPAS_DEL_LOGO`). Las profundidades están en unidades del SVG: el logo mide
 * 600 de ancho, así que 14 unidades son el 2,3 % del ancho. Los rellenos se
 * extruyen con `ExtrudeGeometry`; los contornos oscuros y los trazos sueltos
 * (las burbujas y la línea del carro) son la banda del trazo de `SVGLoader`,
 * extruida aquí. Al final todo se fusiona por color: una malla por color.
 */

/** Cuánto más abajo que su relleno queda el contorno oscuro (unidades del SVG). */
export const REBAJA_DEL_CONTORNO = 1

/**
 * Cuántos triángulos puede tener el logo entero. Medido con el archivo real
 * (14 trazados): unos 25 600. El tope deja margen y evita que un archivo
 * cambiado por error llene la escena de geometría.
 */
export const TOPE_DE_TRIANGULOS = 40000

/**
 * Divisiones de las curvas: pocas en el texto, porque a la distancia de la vista
 * general no se ven. Las elipses y los círculos son una sola curva y con pocas
 * divisiones se vuelven un polígono: llevan más (la tabla puede pedir otro valor
 * con `segmentos`).
 */
const SEGMENTOS_DE_CURVA = 6

/** Divisiones de las uniones y las puntas redondas de un trazo. */
const DIVISIONES_DE_LA_UNION = 3

/**
 * Las capas del logo, **en el orden en que se dibujan en el SVG**. `desde` y
 * `hasta` son la altura de abajo y de arriba de la capa, en unidades del SVG,
 * medidas desde la cara de atrás del logo. Todo lo que va sobre la base azul
 * (que llega a 8) arranca ahí para no esconder geometría dentro de ella; el
 * rojo grande de WASH arranca sobre el recuadro (que llega a 15).
 *
 * `agujero` es el índice de otra capa cuya forma se le resta: el borde blanco
 * es un anillo, no una elipse llena, porque si fuera llena taparía la base azul.
 * `bisel` es el tamaño del bisel del marco. `segmentos` son las divisiones de sus curvas.
 *
 * Una prueba compara esta tabla con el archivo del logo: si el SVG cambia de
 * orden o de cantidad de elementos, falla.
 */
export const CAPAS_DEL_LOGO = [
  { papel: 'borde', desde: 0, hasta: 14, bisel: 2.5, agujero: 1, segmentos: 48 },
  { papel: 'base', desde: 0, hasta: 8, segmentos: 48 },
  { papel: 'burbuja', desde: 8, hasta: 11, segmentos: 12 },
  { papel: 'burbuja', desde: 8, hasta: 11, segmentos: 12 },
  { papel: 'burbuja', desde: 8, hasta: 11, segmentos: 12 },
  { papel: 'burbuja', desde: 8, hasta: 11, segmentos: 12 },
  { papel: 'burbuja', desde: 8, hasta: 11, segmentos: 12 },
  { papel: 'burbuja', desde: 8, hasta: 11, segmentos: 12 },
  { papel: 'linea-del-carro', desde: 8, hasta: 13, segmentos: 12 },
  { papel: 'texto-amarillo', desde: 8, hasta: 19 },
  { papel: 'recuadro', desde: 8, hasta: 15 },
  { papel: 'texto-blanco', desde: 8, hasta: 19 },
  { papel: 'rojo-grande', desde: 15, hasta: 22 },
  { papel: 'rojo-pequeno', desde: 8, hasta: 17 },
]

/** Lo que mide el SVG: el área del dibujo que se centra en el origen. */
export const MEDIDA_DEL_SVG = { ancho: 600, alto: 400 }

/**
 * Las capas de la versión horizontal del logo (`public/logo-gran-colombia-horizontal.svg`),
 * el letrero alargado de la pared, también **en el orden del SVG**. Es el mismo
 * dibujo (marco blanco, base azul, burbujas, texto, recuadro de WASH) sin la línea
 * del carro, en un rectángulo redondeado de 880 × 210. Las profundidades son las del
 * logo escaladas al ancho del dibujo (880 / 600), para que el relieve se vea igual.
 */
export const CAPAS_DEL_LETRERO = [
  { papel: 'borde', desde: 0, hasta: 20, bisel: 3.5, agujero: 1, segmentos: 12 },
  { papel: 'base', desde: 0, hasta: 11, segmentos: 12 },
  { papel: 'burbuja', desde: 11, hasta: 15, segmentos: 12 },
  { papel: 'burbuja', desde: 11, hasta: 15, segmentos: 12 },
  { papel: 'burbuja', desde: 11, hasta: 15, segmentos: 12 },
  { papel: 'burbuja', desde: 11, hasta: 15, segmentos: 12 },
  { papel: 'burbuja', desde: 11, hasta: 15, segmentos: 12 },
  { papel: 'texto-amarillo', desde: 11, hasta: 27 },
  { papel: 'recuadro', desde: 11, hasta: 21 },
  { papel: 'texto-blanco', desde: 11, hasta: 27 },
  { papel: 'rojo-grande', desde: 21, hasta: 30 },
  { papel: 'rojo-pequeno', desde: 11, hasta: 24 },
]

/** Lo que mide el SVG horizontal. */
export const MEDIDA_DEL_LETRERO = { ancho: 880, alto: 210 }

/** Cuánto más abajo que su relleno queda el contorno en el letrero horizontal (1 unidad del logo, en las de este dibujo). */
export const REBAJA_DEL_CONTORNO_DEL_LETRERO = 1.5

/** Dónde queda el hexadecimal `#rrggbb` de un color de estilo SVG. */
function aHex(texto) {
  return `#${new Color().setStyle(texto).getHexString()}`
}

const hayColor = (valor) => valor !== undefined && valor !== null && valor !== 'none'

/** Un número de triángulos de una geometría sin índice. */
export function triangulosDe(geometria) {
  return geometria.getAttribute('position').count / 3
}

/**
 * Extruye una banda plana de triángulos (la que da `SVGLoader.pointsToStroke`)
 * entre las alturas `desde` y `hasta`: tapa de arriba, y paredes solo en las
 * aristas que no comparte con otro triángulo. Todos los triángulos se
 * ordenan de modo que miren hacia arriba (+Z), así que las paredes miran
 * hacia afuera.
 *
 * No lleva tapa de abajo: queda apoyada sobre otra capa.
 *
 * @param {BufferGeometry} plana triángulos sueltos, en el plano XY
 * @param {number} desde
 * @param {number} hasta
 * @returns {BufferGeometry} sin índice, con posición y normales
 */
export function extruirBanda(plana, desde, hasta) {
  const pos = plana.getAttribute('position')
  const triangulos = []
  for (let i = 0; i + 2 < pos.count; i += 3) {
    let a = [pos.getX(i), pos.getY(i)]
    let b = [pos.getX(i + 1), pos.getY(i + 1)]
    let c = [pos.getX(i + 2), pos.getY(i + 2)]
    const area2 = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])
    if (Math.abs(area2) < 1e-9) continue
    if (area2 < 0) [b, c] = [c, b]
    triangulos.push([a, b, c])
  }

  const clave = (p) => `${Math.round(p[0] * 1000)},${Math.round(p[1] * 1000)}`
  const aristas = new Set()
  for (const [a, b, c] of triangulos) {
    for (const [p, q] of [[a, b], [b, c], [c, a]]) aristas.add(`${clave(p)}>${clave(q)}`)
  }

  const v = []
  const punto = (p, z) => v.push(p[0], p[1], z)
  for (const [a, b, c] of triangulos) {
    punto(a, hasta)
    punto(b, hasta)
    punto(c, hasta)
    for (const [p, q] of [[a, b], [b, c], [c, a]]) {
      if (aristas.has(`${clave(q)}>${clave(p)}`)) continue
      punto(p, desde)
      punto(q, desde)
      punto(q, hasta)
      punto(p, desde)
      punto(q, hasta)
      punto(p, hasta)
    }
  }
  const geometria = new BufferGeometry()
  geometria.setAttribute('position', new Float32BufferAttribute(v, 3))
  geometria.computeVertexNormals()
  return geometria
}

/** Un `ExtrudeGeometry` entre `desde` y `hasta` (con bisel si la capa lo pide), sin atributos de más. */
function extruirRelleno(formas, { desde, hasta, bisel = 0, segmentos = SEGMENTOS_DE_CURVA }) {
  const opciones = {
    depth: hasta - desde - 2 * bisel,
    curveSegments: segmentos,
    steps: 1,
    bevelEnabled: bisel > 0,
    ...(bisel > 0 && { bevelThickness: bisel, bevelSize: bisel, bevelOffset: -bisel, bevelSegments: 2 }),
  }
  const geometria = new ExtrudeGeometry(formas, opciones)
  geometria.translate(0, 0, desde + bisel)
  return geometria
}

/**
 * Las piezas de una capa: su relleno y su contorno (o su trazo suelto), cada
 * una con el color que dice el propio SVG.
 *
 * @returns {Array<{ color: string, geometria: BufferGeometry }>} en unidades del SVG
 */
function piezasDeLaCapa(trazado, capa, trazados, rebaja) {
  const estilo = trazado.userData.style
  const segmentos = capa.segmentos ?? SEGMENTOS_DE_CURVA
  const piezas = []

  if (hayColor(estilo.fill)) {
    const formas = trazado.toShapes()
    if (capa.agujero !== undefined) {
      const hueco = trazados[capa.agujero].toShapes()[0]
      for (const forma of formas) forma.holes.push(new Path(hueco.getPoints(segmentos)))
    }
    piezas.push({ color: aHex(estilo.fill), geometria: extruirRelleno(formas, capa) })
  }

  if (hayColor(estilo.stroke) && estilo.strokeWidth > 0) {
    // Con relleno, el contorno va debajo de él (como `paint-order` en el SVG) y
    // un poco más abajo, para que el relleno lo tape por dentro. Sin relleno, el
    // trazo es la propia pieza y llega hasta arriba.
    const hasta = hayColor(estilo.fill) ? capa.hasta - rebaja : capa.hasta
    for (const subTrazado of trazado.subPaths) {
      const banda = SVGLoader.pointsToStroke(subTrazado.getPoints(segmentos), estilo, DIVISIONES_DE_LA_UNION)
      if (banda) piezas.push({ color: aHex(estilo.stroke), geometria: extruirBanda(banda, capa.desde, hasta) })
    }
  }
  return piezas
}

/**
 * Pasa una pieza de unidades del SVG a metros: escala, centra en el origen y
 * le da vuelta al eje Y (el SVG crece hacia abajo). Darle vuelta a un eje
 * invierte el sentido de los triángulos, así que se les cambia el orden.
 */
function aMetros(geometria, escala, medida) {
  const origen = geometria.index ? geometria.toNonIndexed() : geometria
  const pos = origen.getAttribute('position')
  const v = new Float32Array(pos.count * 3)
  for (let i = 0; i < pos.count; i += 1) {
    v[i * 3] = (pos.getX(i) - medida.ancho / 2) * escala
    v[i * 3 + 1] = -(pos.getY(i) - medida.alto / 2) * escala
    v[i * 3 + 2] = pos.getZ(i) * escala
  }
  for (let i = 0; i + 2 < pos.count; i += 3) {
    for (let k = 0; k < 3; k += 1) {
      const dos = v[(i + 1) * 3 + k]
      v[(i + 1) * 3 + k] = v[(i + 2) * 3 + k]
      v[(i + 2) * 3 + k] = dos
    }
  }
  const resultado = new BufferGeometry()
  resultado.setAttribute('position', new Float32BufferAttribute(v, 3))
  resultado.computeVertexNormals()
  geometria.dispose()
  if (origen !== geometria) origen.dispose()
  return resultado
}

/**
 * Construye el logo: una geometría por color, en metros, centrada en el origen,
 * con la cara de atrás en z = 0 y la de adelante hacia +Z.
 *
 * @param {Array} trazados los `ShapePath` que entrega `SVGLoader.parse`, en el orden del SVG
 * @param {object} [opciones]
 * @param {number} [opciones.ancho] el ancho del logo en metros
 * @param {Array} [opciones.capas] la tabla de capas
 * @param {{ ancho: number, alto: number }} [opciones.medida] el área del SVG
 * @param {number} [opciones.rebaja] cuánto más abajo que su relleno queda el contorno oscuro
 * @returns {{ piezas: Array<{ color: string, geometria: BufferGeometry }>, ancho: number, alto: number, profundidad: number, triangulos: number }}
 */
export function construirLogo(
  trazados,
  { ancho = 1, capas = CAPAS_DEL_LOGO, medida = MEDIDA_DEL_SVG, rebaja = REBAJA_DEL_CONTORNO } = {},
) {
  if (trazados.length !== capas.length) {
    throw new Error(`El logo trae ${trazados.length} trazados y la tabla espera ${capas.length}`)
  }
  const escala = ancho / medida.ancho
  const porColor = new Map()
  trazados.forEach((trazado, i) => {
    for (const { color, geometria } of piezasDeLaCapa(trazado, capas[i], trazados, rebaja)) {
      if (!porColor.has(color)) porColor.set(color, [])
      porColor.get(color).push(aMetros(geometria, escala, medida))
    }
  })

  const piezas = [...porColor].map(([color, geometrias]) => {
    const fusionada = mergeGeometries(geometrias)
    geometrias.forEach((g) => g.dispose())
    return { color, geometria: fusionada }
  })
  return {
    piezas,
    ancho,
    alto: (ancho * medida.alto) / medida.ancho,
    profundidad: Math.max(...capas.map((c) => c.hasta)) * escala,
    triangulos: piezas.reduce((suma, { geometria }) => suma + triangulosDe(geometria), 0),
  }
}

/** La luz propia de cada color: leve, y menor en los colores oscuros para que no se aplanen. */
export const EMISION_DEL_LOGO = { clara: 0.25, oscura: 0.12 }

/** Los colores con luminosidad menor a esta llevan la emisión oscura. */
const LUMINOSIDAD_DE_LO_OSCURO = 0.2

/**
 * Un material por color del logo, con una luz propia leve del mismo color.
 * Sin texturas, sin mapas y sin metal.
 *
 * @param {Array<{ color: string }>} piezas
 * @returns {MeshStandardMaterial[]} en el mismo orden que las piezas
 */
export function crearMaterialesDelLogo(piezas) {
  return piezas.map(({ color }) => {
    const base = new Color(color)
    const oscuro = base.getHSL({}).l < LUMINOSIDAD_DE_LO_OSCURO
    return new MeshStandardMaterial({
      color: base,
      emissive: base,
      emissiveIntensity: oscuro ? EMISION_DEL_LOGO.oscura : EMISION_DEL_LOGO.clara,
      roughness: 0.6,
      metalness: 0,
    })
  })
}

/** Suelta la memoria de un logo construido. */
export function liberarLogo(logo) {
  logo?.piezas.forEach(({ geometria }) => geometria.dispose())
}
