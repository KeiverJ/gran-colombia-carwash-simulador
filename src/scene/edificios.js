import { COLOR_DE_ESCENA } from '../estilos/colores.js'
import { TERRENO } from './posiciones.js'

/**
 * Las casas y los locales de las manzanas vecinas (de 1 a 3 pisos): a los dos lados
 * del lavadero, detrás (al otro lado de la Av. Gran Colombia) y al otro lado de la Av.
 * Guaimaral, en los lotes de al lado y no a lo lejos. Son el fondo de la escena y se
 * parecen a los de Cúcuta: fachadas de colores fuertes (amarillo ocre, terracota,
 * turquesa, salmón, verde claro, blanco, azul cielo) con marcos de color, ventanas,
 * rejas, balcones, toldos de rayas y un letrero pintado con el tipo de negocio.
 *
 * JavaScript puro, en metros y en coordenadas del mundo. El mapa trae nombres de
 * negocios reales y **ninguno se copia**: los letreros dicen solo el tipo de negocio.
 * Los sitios son un punto de partida que confirma la prueba de visibilidad
 * (`visibilidad.test.js`): ningún edificio tapa el lavadero desde ninguna vista ni
 * desde los asientos de la cafetería. Solo lo más lejano se mezcla con el color del
 * horizonte.
 */

/** Lo que mide la planta baja (con la zona del letrero), cada piso de arriba y el pretil, en metros. */
export const ALTO_DE_LA_PLANTA_BAJA = 3.6
export const ALTO_DE_UN_PISO = 3.1
export const ALTO_DEL_PRETIL = 0.5

/** El techo (cornisa): su grosor y cuánto sobresale de las paredes. */
export const GROSOR_DEL_TECHO = 0.25
export const VUELO_DEL_TECHO = 0.3

/** Lo más alto que puede ser un edificio con su techo (3 pisos, unos 10 m), en metros. */
export const ALTO_MAXIMO = 10.8

/** El letrero pintado: su alto, la proporción ancho/alto de su cartel y a qué altura empieza. */
export const LETRERO = { alto: 0.85, proporcion: 8, desde: 2.65 }

/** Lo mínimo que mide una fachada para llevar un letrero (el cartel mide `alto × proporción`). */
export const LARGO_MINIMO_DE_LA_FACHADA = LETRERO.alto * LETRERO.proporcion + 1.4

/**
 * Los edificios. `x0..x1` y `z0..z1` son el cuerpo visto desde arriba (sin el vuelo del techo),
 * `pisos` cuántos tiene, `frente` la cara con la fachada (`'x'` mira a +X, hacia la Av.
 * Guaimaral; `'z'` mira a +Z, hacia la Av. Gran Colombia o hacia la cámara de la vista
 * general), `vitrina` qué fracción del frente es vitrina y los demás son nombres de color
 * de la escena: la fachada, el color de los marcos y balcones, el del toldo y el fondo del
 * letrero.
 */
export const EDIFICIOS = [
  // Al otro lado de la Av. Guaimaral, de adelante hacia el fondo (la fachada mira a la avenida)
  { clave: 'restaurante', letrero: 'Restaurante', pisos: 2, x0: -35, x1: -22.8, z0: 31, z1: 42, frente: 'x', vitrina: 0.5, fachada: 'casaOcre', acento: 'acentoAzul', toldo: 'acentoVerde', rotulo: 'acentoAzul' },
  { clave: 'drogueria', letrero: 'Droguería', pisos: 2, x0: -33, x1: -22.8, z0: 20, z1: 30, frente: 'x', vitrina: 0.45, fachada: 'casaBlanca', acento: 'acentoVerde', toldo: 'acentoVerde', rotulo: 'acentoVerde' },
  { clave: 'concesionario', letrero: 'Venta de autos', pisos: 2, x0: -36, x1: -22.8, z0: 6.5, z1: 19, frente: 'x', vitrina: 0.8, fachada: 'casaAzulCielo', acento: 'acentoAzul', toldo: 'acentoAzul', rotulo: 'edificioLetrero' },
  { clave: 'perfumeria', letrero: 'Perfumería', pisos: 1, x0: -31, x1: -22.8, z0: -6.5, z1: 5.5, frente: 'x', vitrina: 0.55, fachada: 'casaSalmon', acento: 'acentoRosa', toldo: 'acentoRosa', rotulo: 'acentoRosa' },
  // Detrás, al otro lado de la Av. Gran Colombia (la fachada mira a la avenida): primero el lote de la esquina
  { clave: 'clinica', letrero: 'Clínica veterinaria', pisos: 2, x0: -35, x1: -23, z0: -36, z1: -24, frente: 'z', vitrina: 0.5, fachada: 'casaVerdeClaro', acento: 'acentoTurquesa', toldo: 'acentoTurquesa', rotulo: 'acentoTurquesa' },
  { clave: 'papeleria', letrero: 'Papelería', pisos: 1, x0: -47, x1: -36, z0: -36, z1: -24, frente: 'z', vitrina: 0.5, fachada: 'casaTurquesa', acento: 'acentoMostaza', toldo: 'acentoMostaza', rotulo: 'edificioLetrero' },
  { clave: 'panaderia', letrero: 'Panadería', pisos: 2, x0: -5, x1: 6, z0: -36, z1: -24, frente: 'z', vitrina: 0.55, fachada: 'casaTerracota', acento: 'acentoMostaza', toldo: 'acentoMostaza', rotulo: 'edificioLetrero' },
  { clave: 'ferreteria', letrero: 'Ferretería', pisos: 1, x0: 7, x1: 19, z0: -36, z1: -24, frente: 'z', vitrina: 0.5, fachada: 'casaBlanca', acento: 'acentoAzul', toldo: 'acentoMostaza', rotulo: 'acentoAzul' },
  { clave: 'tienda', letrero: 'Tienda', pisos: 3, x0: 20, x1: 30, z0: -36, z1: -24, frente: 'z', vitrina: 0.45, fachada: 'casaVerdeClaro', acento: 'acentoRosa', toldo: 'acentoRosa', rotulo: 'acentoRosa' },
  // A la derecha del lavadero, después del lavado de carros (la fachada mira a la cámara de la vista general)
  { clave: 'heladeria', letrero: 'Heladería', pisos: 1, x0: 34.5, x1: 44.5, z0: -10.5, z1: 1, frente: 'z', vitrina: 0.5, fachada: 'casaTurquesa', acento: 'acentoRosa', toldo: 'acentoRosa', rotulo: 'acentoRosa' },
  { clave: 'peluqueria', letrero: 'Peluquería', pisos: 2, x0: 46, x1: 56, z0: -10.5, z1: 1, frente: 'z', vitrina: 0.45, fachada: 'casaOcre', acento: 'acentoTurquesa', toldo: 'acentoTurquesa', rotulo: 'acentoTurquesa' },
]

/** Los letreros que no pueden aparecer: nombres de los negocios reales del mapa. */
export const NOMBRES_PROHIBIDOS = ['zoey', 'ruedalar', 'pet clinic', 'center', 'cúcuta', 'cucuta']

/** El alto del cuerpo (sin el techo) y el total (con el techo), en metros. */
export const altoDelCuerpo = (e) => ALTO_DE_LA_PLANTA_BAJA + (e.pisos - 1) * ALTO_DE_UN_PISO + ALTO_DEL_PRETIL
export const altoDelEdificio = (e) => altoDelCuerpo(e) + GROSOR_DEL_TECHO

/** El centro del edificio visto desde arriba. */
export const centroDelEdificio = (e) => [(e.x0 + e.x1) / 2, (e.z0 + e.z1) / 2]

/** Cuánto mide su fachada (el lado que mira al frente), en metros. */
export const largoDeLaFachada = (e) => (e.frente === 'x' ? e.z1 - e.z0 : e.x1 - e.x0)

/** Cuánto salen del cuerpo los toldos y balcones, en metros. */
const SALIENTE_MAXIMO = 0.95

/** Lo que ocupa visto desde arriba, con el vuelo del techo y lo que sobresale de la fachada: `{ x0, x1, z0, z1 }`. */
export function huellaDelEdificio(e) {
  const h = { x0: e.x0 - VUELO_DEL_TECHO, x1: e.x1 + VUELO_DEL_TECHO, z0: e.z0 - VUELO_DEL_TECHO, z1: e.z1 + VUELO_DEL_TECHO }
  if (e.frente === 'x') h.x1 = e.x1 + SALIENTE_MAXIMO
  else h.z1 = e.z1 + SALIENTE_MAXIMO
  return h
}

/** La caja que rodea a todo el edificio (techo y toldos incluidos), para los rayos de la prueba de visibilidad. */
export function cajaDelEdificio(e) {
  const h = huellaDelEdificio(e)
  return { nombre: `edificio ${e.clave}`, min: [h.x0, 0, h.z0], max: [h.x1, altoDelEdificio(e), h.z1] }
}

/** Distancia de un punto al centro del terreno, en metros. */
export const distanciaAlCentro = (x, z) => Math.hypot(x - TERRENO.centro[0], z - TERRENO.centro[2])

/**
 * Solo lo más lejano se desvanece: hasta `desde` metros del centro del terreno los colores
 * quedan tal cual, y de ahí a `hasta` se mezclan con el color del horizonte hasta `lejos`.
 */
export const NIEBLA_DE_LOS_EDIFICIOS = { cerca: 0, lejos: 0.5, desde: 38, hasta: 85 }

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
 * nombre del color de la escena (sin mezclar): el cuerpo y el techo, y en la fachada la
 * vitrina, la puerta y una ventana con reja en la planta baja, el toldo de rayas, el fondo
 * del letrero y, en cada piso de arriba, ventanas con marco y balcones.
 */
export function piezasDelEdificio(e) {
  const alto = altoDelCuerpo(e)
  const largo = largoDeLaFachada(e)
  const sobreX = e.frente === 'x'
  const inicio = sobreX ? e.z0 : e.x0
  const cara = sobreX ? e.x1 : e.z1
  const piezas = []
  const poner = (nombre, caja, color) => piezas.push({ nombre, ...caja, color })

  // `a` corre a lo largo de la fachada, `y` hacia arriba y `p` hacia afuera de ella.
  const enLaFachada = (a0, a1, y0, y1, p0, p1) =>
    sobreX
      ? { x0: cara + p0, x1: cara + p1, y0, y1, z0: inicio + a0, z1: inicio + a1 }
      : { x0: inicio + a0, x1: inicio + a1, y0, y1, z0: cara + p0, z1: cara + p1 }

  poner('cuerpo', { x0: e.x0, x1: e.x1, y0: 0, y1: alto, z0: e.z0, z1: e.z1 }, e.fachada)
  const h = huellaDelEdificio(e)
  poner('techo', { x0: h.x0, x1: sobreX ? e.x1 + VUELO_DEL_TECHO : h.x1, y0: alto, y1: alto + GROSOR_DEL_TECHO, z0: h.z0, z1: sobreX ? h.z1 : e.z1 + VUELO_DEL_TECHO }, 'edificioTecho')

  // Planta baja: la vitrina, la puerta y una ventana con reja, uno junto al otro.
  const margen = 0.7
  const anchoDeLaVitrina = Math.min(largo * e.vitrina, largo - 4.4)
  const marco = (nombre, a0, a1, y0, y1) => poner(`marco ${nombre}`, enLaFachada(a0 - 0.14, a1 + 0.14, y0 - 0.14, y1 + 0.14, 0, 0.06), e.acento)
  marco('vitrina', margen, margen + anchoDeLaVitrina, 0.3, 2.3)
  poner('vitrina', enLaFachada(margen, margen + anchoDeLaVitrina, 0.3, 2.3, 0, 0.1), 'edificioVidrio')
  const puertaDesde = margen + anchoDeLaVitrina + 0.4
  marco('puerta', puertaDesde, puertaDesde + 1.2, 0, 2.2)
  poner('puerta', enLaFachada(puertaDesde, puertaDesde + 1.2, 0, 2.2, 0, 0.12), 'edificioPuerta')
  const rejaDesde = puertaDesde + 1.2 + 0.5
  if (rejaDesde + 1.3 < largo - 0.4) {
    marco('ventana', rejaDesde, rejaDesde + 1.3, 0.9, 2.2)
    poner('ventana', enLaFachada(rejaDesde, rejaDesde + 1.3, 0.9, 2.2, 0, 0.1), 'edificioVidrio')
    for (let i = 0; i < 4; i += 1) {
      const a = rejaDesde + 0.1 + (i * 1.1) / 3
      poner(`reja ${i}`, enLaFachada(a, a + 0.05, 0.9, 2.2, 0.1, 0.17), 'edificioPuerta')
    }
  }

  // El toldo de rayas sobre la vitrina y la puerta: una lámina plana y su faldón, de dos colores.
  const hastaElToldo = Math.min(puertaDesde + 1.2 + 0.3, largo - 0.2)
  const franjas = Math.max(2, Math.round((hastaElToldo - 0.2) / 0.6))
  const ancho = (hastaElToldo - 0.2) / franjas
  for (let i = 0; i < franjas; i += 1) {
    const color = i % 2 === 0 ? e.toldo : 'casaBlanca'
    poner(`toldo ${i}`, enLaFachada(0.2 + i * ancho, 0.2 + (i + 1) * ancho, 2.46, 2.56, 0, SALIENTE_MAXIMO), color)
    poner(`faldón ${i}`, enLaFachada(0.2 + i * ancho, 0.2 + (i + 1) * ancho, 2.2, 2.56, SALIENTE_MAXIMO - 0.06, SALIENTE_MAXIMO), color)
  }

  // El fondo del letrero pintado, sobre el toldo: el texto va encima (ver `letreroDelEdificio`).
  const anchoDelLetrero = LETRERO.alto * LETRERO.proporcion
  const centro = largo / 2
  poner('fondo del letrero', enLaFachada(centro - anchoDelLetrero / 2 - 0.1, centro + anchoDelLetrero / 2 + 0.1, LETRERO.desde - 0.08, LETRERO.desde + LETRERO.alto + 0.08, 0, 0.1), e.rotulo)

  // Pisos de arriba: ventanas con marco y, bajo las de lugar par, un balcón con baranda.
  const ventanas = Math.max(2, Math.floor((largo - 1.6) / 3))
  const paso = (largo - 1.6) / ventanas
  for (let piso = 1; piso < e.pisos; piso += 1) {
    const base = ALTO_DE_LA_PLANTA_BAJA + (piso - 1) * ALTO_DE_UN_PISO
    for (let i = 0; i < ventanas; i += 1) {
      const a0 = 0.8 + i * paso + (paso - 1.3) / 2
      const a1 = a0 + 1.3
      marco(`${piso}.${i}`, a0, a1, base + 0.8, base + 2.2)
      poner(`ventana ${piso}.${i}`, enLaFachada(a0, a1, base + 0.8, base + 2.2, 0, 0.1), 'edificioVidrio')
      if (i % 2 === 0) {
        const b0 = a0 - 0.35
        const b1 = a1 + 0.35
        poner(`balcón ${piso}.${i}`, enLaFachada(b0, b1, base, base + 0.12, 0, 0.8), e.acento)
        poner(`baranda ${piso}.${i}`, enLaFachada(b0, b1, base + 0.98, base + 1.04, 0.75, 0.81), e.acento)
        for (let k = 0; k < 4; k += 1) {
          const a = b0 + (k * (b1 - b0 - 0.05)) / 3
          poner(`poste ${piso}.${i}.${k}`, enLaFachada(a, a + 0.05, base + 0.12, base + 0.98, 0.75, 0.8), e.acento)
        }
      }
    }
  }
  return piezas
}

/**
 * Dónde va el letrero pintado: el texto sobre su fondo, pegado a la cara de la fachada y
 * centrado en ella, con la proporción del cartel.
 *
 * @returns {{ texto: string, x: number, y: number, z: number, ancho: number, alto: number, giro: number, fondo: string, color: string }}
 */
export function letreroDelEdificio(e) {
  const sobreX = e.frente === 'x'
  const largo = largoDeLaFachada(e)
  const ancho = LETRERO.alto * LETRERO.proporcion
  const centro = (sobreX ? e.z0 : e.x0) + largo / 2
  const cara = sobreX ? e.x1 : e.z1
  const afuera = 0.115
  return {
    texto: e.letrero,
    x: sobreX ? cara + afuera : centro,
    y: LETRERO.desde + LETRERO.alto / 2,
    z: sobreX ? centro : cara + afuera,
    ancho,
    alto: LETRERO.alto,
    // El plano mira a +Z; para mirar a +X se gira un cuarto de vuelta.
    giro: sobreX ? Math.PI / 2 : 0,
    fondo: e.rotulo,
    color: 'textoDeLetrero',
  }
}
