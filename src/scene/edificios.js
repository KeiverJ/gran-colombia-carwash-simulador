import { COLOR_DE_ESCENA } from '../estilos/colores.js'
import { TERRENO } from './posiciones.js'

/**
 * Los edificios bajos de la esquina (1 a 3 pisos), en los lotes del otro lado de las
 * dos avenidas, según `docs/referencias/mapa-entradas.jpg`: un concesionario de autos,
 * una perfumería, una clínica veterinaria y un cuarto edificio genérico. JavaScript
 * puro, en metros y en coordenadas del mundo.
 *
 * El mapa trae nombres de negocios reales y **ninguno se copia**: los letreros dicen
 * solo el tipo de negocio. Son decorativos, de pocas caras y colores apagados, y se
 * desvanecen hacia el color del horizonte con la distancia (el velo del terreno es
 * plano y no cubre lo que se levanta del piso), para que el lavadero siga siendo lo
 * principal. Los sitios son un punto de partida que confirma la prueba de visibilidad
 * (`visibilidad.test.js`): ningún edificio tapa el lavadero desde ninguna vista ni
 * desde los asientos de la cafetería.
 */

/** Lo que mide cada piso y el techo, en metros. */
export const ALTO_DE_UN_PISO = 3.1
export const GROSOR_DEL_TECHO = 0.4

/** Cuánto sobresale el techo de las paredes, y el alto del tablero del letrero sobre él. */
export const VUELO_DEL_TECHO = 0.3
export const ALTO_DEL_TABLERO = 0.9

/** Lo más alto que puede ser un edificio (3 pisos con su techo y su letrero), en metros. */
export const ALTO_MAXIMO = 11

/**
 * Los edificios. `x0..x1` y `z0..z1` son el cuerpo visto desde arriba (sin el vuelo del
 * techo), `pisos` cuántos tiene, `frente` la cara con la fachada (`'x'` mira a +X, hacia la
 * Av. Guaimaral; `'z'` mira a +Z, hacia la Av. Gran Colombia) y `cuerpo` su color.
 */
export const EDIFICIOS = [
  {
    clave: 'concesionario',
    letrero: 'Venta de autos',
    pisos: 2,
    x0: -36,
    x1: -22,
    z0: 8,
    z1: 19,
    frente: 'x',
    cuerpo: 'edificioCrema',
    vitrina: 0.8,
  },
  {
    clave: 'perfumeria',
    letrero: 'Perfumería',
    pisos: 1,
    x0: -31,
    x1: -22,
    z0: -6,
    z1: 2,
    frente: 'x',
    cuerpo: 'edificioTerracota',
    vitrina: 0.6,
  },
  {
    clave: 'clinica',
    letrero: 'Clínica veterinaria',
    pisos: 2,
    x0: -33,
    x1: -23,
    z0: -34,
    z1: -24,
    frente: 'x',
    cuerpo: 'edificioVerdeGris',
    vitrina: 0.5,
  },
  {
    clave: 'apartamentos',
    letrero: 'Apartamentos',
    pisos: 3,
    x0: -52,
    x1: -40,
    z0: -34,
    z1: -24,
    frente: 'z',
    cuerpo: 'edificioGrisCalido',
    vitrina: 0.4,
  },
]

/** Los letreros que no pueden aparecer: nombres de los negocios reales del mapa. */
export const NOMBRES_PROHIBIDOS = ['zoey', 'ruedalar', 'pet clinic', 'center', 'cúcuta', 'cucuta']

/** El alto del cuerpo (sin el techo) y el total (con el techo), en metros. */
export const altoDelCuerpo = (e) => e.pisos * ALTO_DE_UN_PISO
export const altoDelEdificio = (e) => altoDelCuerpo(e) + GROSOR_DEL_TECHO

/** El centro del edificio visto desde arriba. */
export const centroDelEdificio = (e) => [(e.x0 + e.x1) / 2, (e.z0 + e.z1) / 2]

/** Lo que ocupa visto desde arriba, con el vuelo del techo: `{ x0, x1, z0, z1 }`. */
export const huellaDelEdificio = (e) => ({
  x0: e.x0 - VUELO_DEL_TECHO,
  x1: e.x1 + VUELO_DEL_TECHO,
  z0: e.z0 - VUELO_DEL_TECHO,
  z1: e.z1 + VUELO_DEL_TECHO,
})

/** La caja que rodea a todo el edificio (techo y letrero incluidos), para los rayos de la prueba de visibilidad. */
export function cajaDelEdificio(e) {
  const h = huellaDelEdificio(e)
  return {
    nombre: `edificio ${e.clave}`,
    min: [h.x0, 0, h.z0],
    max: [h.x1, altoDelEdificio(e) + ALTO_DEL_TABLERO + 0.3, h.z1],
  }
}

/** Distancia del centro de un edificio (o de un punto) al centro del terreno, en metros. */
export const distanciaAlCentro = (x, z) => Math.hypot(x - TERRENO.centro[0], z - TERRENO.centro[2])

/** De cuánto a cuánto se mezcla un color con el del horizonte, y entre qué distancias (desde el centro del terreno). */
export const NIEBLA_DE_LOS_EDIFICIOS = { cerca: 0.25, lejos: 0.5, desde: 20, hasta: 45 }

/** Cuánto (de 0 a 1) se mezcla un color con el horizonte a esta distancia del centro del terreno. */
export function mezclaConElHorizonte(distancia) {
  const { cerca, lejos, desde, hasta } = NIEBLA_DE_LOS_EDIFICIOS
  const t = Math.min(1, Math.max(0, (distancia - desde) / (hasta - desde)))
  return cerca + (lejos - cerca) * t * t * (3 - 2 * t)
}

/** Mezcla dos colores `#rrggbb`: `cantidad` 0 deja el primero y 1 el segundo. */
export function mezclarColores(a, b, cantidad) {
  const canal = (hex, i) => Number.parseInt(hex.slice(i, i + 2), 16)
  const mezcla = [1, 3, 5].map((i) => Math.round(canal(a, i) * (1 - cantidad) + canal(b, i) * cantidad))
  return `#${mezcla.map((c) => c.toString(16).padStart(2, '0')).join('')}`
}

/** Un color de la escena con la niebla que le toca a esa distancia: más lejos, más cerca del horizonte. */
export const colorConNiebla = (nombre, distancia) =>
  mezclarColores(COLOR_DE_ESCENA[nombre], COLOR_DE_ESCENA.cieloHorizonte, mezclaConElHorizonte(distancia))

/**
 * Las piezas de un edificio como cajas `{ nombre, x0, x1, y0, y1, z0, z1, color }` con el
 * nombre del color de la escena (sin mezclar): el cuerpo, el techo, la vitrina y la puerta
 * de la planta baja, una fila de ventanas por cada piso de arriba, y el tablero del letrero
 * sobre el techo. La fachada va en la cara `frente`.
 */
export function piezasDelEdificio(e) {
  const alto = altoDelCuerpo(e)
  const h = huellaDelEdificio(e)
  const pieza = (nombre, caja, color) => ({ nombre, ...caja, color })
  const piezas = [
    pieza('cuerpo', { x0: e.x0, x1: e.x1, y0: 0, y1: alto, z0: e.z0, z1: e.z1 }, e.cuerpo),
    pieza('techo', { x0: h.x0, x1: h.x1, y0: alto, y1: alto + GROSOR_DEL_TECHO, z0: h.z0, z1: h.z1 }, 'edificioTecho'),
  ]

  // La fachada: se arma sobre un eje `a` a lo largo del frente y un `p` hacia afuera.
  const sobreX = e.frente === 'x'
  const largo = sobreX ? e.z1 - e.z0 : e.x1 - e.x0
  const inicio = sobreX ? e.z0 : e.x0
  const cara = sobreX ? e.x1 : e.z1
  const grosor = 0.08
  const enLaFachada = (desde, hasta, y0, y1) =>
    sobreX
      ? { x0: cara - 0.02, x1: cara - 0.02 + grosor, y0, y1, z0: inicio + desde, z1: inicio + hasta }
      : { x0: inicio + desde, x1: inicio + hasta, y0, y1, z0: cara - 0.02, z1: cara - 0.02 + grosor }

  // Planta baja: una vitrina con la fracción del frente que dice `vitrina`, y la puerta al lado.
  const anchoDeLaVitrina = largo * e.vitrina
  const margen = 0.6
  piezas.push(pieza('vitrina', enLaFachada(margen, margen + anchoDeLaVitrina, 0.3, 2.7), 'edificioVidrio'))
  const puertaDesde = margen + anchoDeLaVitrina + 0.5
  piezas.push(pieza('puerta', enLaFachada(puertaDesde, puertaDesde + 1.2, 0, 2.3), 'edificioPuerta'))

  // Pisos de arriba: una fila de ventanas separadas parejo.
  const ventanas = Math.max(2, Math.round(largo / 3.2))
  const paso = (largo - 2 * margen) / ventanas
  for (let piso = 1; piso < e.pisos; piso += 1) {
    for (let i = 0; i < ventanas; i += 1) {
      const desde = margen + i * paso + 0.4
      piezas.push(pieza(`ventana ${piso}.${i}`, enLaFachada(desde, desde + paso - 0.8, piso * ALTO_DE_UN_PISO + 0.8, piso * ALTO_DE_UN_PISO + 2.2), 'edificioVidrio'))
    }
  }

  // El tablero del letrero, sobre el techo, centrado en el frente.
  const ancho = Math.min(largo * 0.7, 6)
  const centro = inicio + largo / 2
  const tablero = sobreX
    ? { x0: cara - 0.25, x1: cara - 0.05, y0: alto + GROSOR_DEL_TECHO, y1: alto + GROSOR_DEL_TECHO + ALTO_DEL_TABLERO, z0: centro - ancho / 2, z1: centro + ancho / 2 }
    : { x0: centro - ancho / 2, x1: centro + ancho / 2, y0: alto + GROSOR_DEL_TECHO, y1: alto + GROSOR_DEL_TECHO + ALTO_DEL_TABLERO, z0: cara - 0.25, z1: cara - 0.05 }
  piezas.push(pieza('tablero', tablero, 'edificioLetrero'))
  return piezas
}

/**
 * Dónde va el texto del letrero: un plano pegado a la cara de adelante del tablero.
 *
 * @returns {{ texto: string, x: number, y: number, z: number, ancho: number, alto: number, giro: number }}
 */
export function letreroDelEdificio(e) {
  const { x0, x1, y0, y1, z0, z1 } = piezasDelEdificio(e).find((p) => p.nombre === 'tablero')
  const sobreX = e.frente === 'x'
  return {
    texto: e.letrero,
    x: sobreX ? x1 + 0.01 : (x0 + x1) / 2,
    y: (y0 + y1) / 2,
    z: sobreX ? (z0 + z1) / 2 : z1 + 0.01,
    ancho: sobreX ? z1 - z0 : x1 - x0,
    alto: y1 - y0,
    // El plano mira a +Z; para mirar a +X se gira un cuarto de vuelta.
    giro: sobreX ? Math.PI / 2 : 0,
  }
}
