import { entreDe, fraccionDe } from './hashPropio.js'
import { CURVAS_DE_ENTRADA, HACIA_EL_CARRIL_DE_SALIDA, SEPARACION_DE_CARRILES, TERRENO } from './posiciones.js'

/**
 * El tráfico de ambiente: carros (nunca motos) que pasan por las dos avenidas.
 * JavaScript puro, sin Three.js y **sin tocar el motor**: no le pide números
 * aleatorios ni lee su estado. Todo lo que se reparte sale del hash propio de la
 * escena (`hashPropio.js`) aplicado a la semilla de los parámetros.
 *
 * - Cuatro carriles, los mismos por los que entran y salen las motos: en la
 *   Guaimaral, x = −12,25 hacia −Z y x = −14,75 hacia +Z; en la Gran Colombia,
 *   z = −13 hacia +X y z = −15,5 hacia −X (se circula por la derecha).
 * - Los carros avanzan con los segundos de animación (`pasoDeLaAnimacion`: 0 en
 *   pausa), guardan su distancia y esperan antes de la zona de una boca mientras
 *   haya una moto en ella, y antes del cruce si pasa un carro de la otra avenida.
 * - Si una moto aparece justo encima de un carro (las motos nacen donde empieza su
 *   camino y no pueden esperar), ese carro se esconde mientras coincidan, y sigue
 *   su camino sin que se note.
 * - El carro banana y la patrulla pasan **una sola vez** por corrida, en un momento
 *   (entre el minuto 10 y el 80 simulados desde que se recoloca la escena) que sale
 *   de la semilla y de un identificador fijo.
 */

/** Cuánto mide cada carril, en metros: más que lo que se ve, para que nazcan y se vayan dentro de la niebla. */
export const LARGO_DEL_CARRIL = 180

/** Cuántos carros normales lleva cada carril al recolocar. */
export const CARROS_POR_CARRIL = 5

/** Metros por segundo de animación (unos 22 km/h). */
export const VELOCIDAD_DEL_TRAFICO = 6

/** Espacio libre que guarda un carro con el de adelante, en metros. */
export const HUECO_ENTRE_CARROS = 3

/** Cuánto antes de la zona o del cruce se detiene un carro que espera, en metros. */
const MARGEN_DE_ESPERA = 0.5

/** Cuánto mide cada modelo de carro, de largo, en metros (la tabla de modelos de ambiente). */
export const LARGO_DE_LOS_MODELOS = { mazda: 4.2, deportivo: 4.2, patrulla: 4.2, banano: 3.6 }

/** Los carros normales: se reparten entre estos dos. */
export const MODELOS_DE_CARROS = ['mazda', 'deportivo']

/** Las apariciones especiales: cada una pasa una sola vez. */
export const MODELOS_ESPECIALES = ['patrulla', 'banano']

/** Todos los modelos del tráfico (ninguno es una moto). */
export const MODELOS_DEL_TRAFICO = [...MODELOS_DE_CARROS, ...MODELOS_ESPECIALES]

/** Entre qué minutos simulados (desde que se recoloca la escena) pasa cada aparición especial. */
export const VENTANA_DE_LAS_APARICIONES = { desde: 10, hasta: 80 }

/** En la visita no hay semilla: las apariciones salen de este valor fijo. */
export const SEMILLA_DEL_TRAFICO_EN_LA_VISITA = 20261017

/** Los identificadores fijos de las apariciones (con la semilla dan su momento). */
const IDENTIFICADOR_DE_LA_APARICION = { patrulla: 9001, banano: 9002 }

/** Cuánto antes del extremo de un carril un carro empieza a crecer (o a encogerse al irse), en metros. */
const TRAMO_DE_LA_NIEBLA = 14

const SEPARACION = SEPARACION_DE_CARRILES
const [CARRIL_DE_ENTRADA_X] = CURVAS_DE_ENTRADA.guaimaral[0]
const CARRIL_DE_ENTRADA_Z = CURVAS_DE_ENTRADA.granColombia[0][2]

/**
 * Los cuatro carriles. `eje` es el eje en que avanza el carro, `fijo` la otra coordenada
 * (el centro del carril) y `sentido` hacia dónde crece su avance (+1 o −1).
 */
export const CARRILES = [
  { clave: 'guaimaralA', avenida: 'guaimaral', eje: 'z', fijo: CARRIL_DE_ENTRADA_X, sentido: -1 },
  {
    clave: 'guaimaralB',
    avenida: 'guaimaral',
    eje: 'z',
    fijo: CARRIL_DE_ENTRADA_X + SEPARACION * HACIA_EL_CARRIL_DE_SALIDA.guaimaral[0],
    sentido: 1,
  },
  { clave: 'granColombiaA', avenida: 'granColombia', eje: 'x', fijo: CARRIL_DE_ENTRADA_Z, sentido: 1 },
  {
    clave: 'granColombiaB',
    avenida: 'granColombia',
    eje: 'x',
    fijo: CARRIL_DE_ENTRADA_Z + SEPARACION * HACIA_EL_CARRIL_DE_SALIDA.granColombia[2],
    sentido: -1,
  },
]

/**
 * La zona de cada avenida donde puede haber motos (de la entrada a la calzada hasta
 * la boca, con las dos curvas y los carriles de salida): `along` es el tramo en el eje
 * de la avenida y `lateral` lo ancho de la calzada. Mientras haya una moto dentro, los
 * carros que van a entrar esperan.
 */
export const ZONAS_DE_MOTOS = {
  guaimaral: { eje: 'z', desde: -3, hasta: 19, lateral: [-16, -11] },
  granColombia: { eje: 'x', desde: -21, hasta: -2.5, lateral: [-17, -12] },
}

/** El cruce de las dos avenidas, en el eje de cada una: por ahí no puede haber dos carros a la vez. */
export const CRUCE = { guaimaral: { eje: 'z', desde: -17, hasta: -12 }, granColombia: { eje: 'x', desde: -16, hasta: -11 } }

const centroDelEje = (eje) => (eje === 'z' ? TERRENO.centro[2] : TERRENO.centro[0])
const origenDelCarril = (carril) => centroDelEje(carril.eje) - (carril.sentido * LARGO_DEL_CARRIL) / 2

/** La coordenada del mundo (en el eje del carril) de un punto a `u` metros del inicio del carril. */
export const coordenadaDelCarril = (carril, u) => origenDelCarril(carril) + carril.sentido * u

/** Los metros desde el inicio del carril de una coordenada del mundo en el eje del carril. */
export const uDelCarril = (carril, coordenada) => (coordenada - origenDelCarril(carril)) * carril.sentido

/** El tramo `[menor, mayor]` en `u` de un tramo del mundo `[a, b]`. */
function tramoEnU(carril, a, b) {
  const ua = uDelCarril(carril, a)
  const ub = uDelCarril(carril, b)
  return [Math.min(ua, ub), Math.max(ua, ub)]
}

/** Para cada carril, dónde empieza (en `u`) la zona de motos y el cruce, calculado una vez. */
const GEOMETRIA_DEL_CARRIL = new Map(
  CARRILES.map((carril) => {
    const zona = ZONAS_DE_MOTOS[carril.avenida]
    const cruce = CRUCE[carril.avenida]
    return [carril.clave, { zona: tramoEnU(carril, zona.desde, zona.hasta), cruce: tramoEnU(carril, cruce.desde, cruce.hasta) }]
  }),
)

/** Un entero estable a partir de la semilla de la corrida (la del motor se lee, nunca se le pide nada). */
const baseDeLaSemilla = (semilla) => Math.trunc(Math.abs(Number(semilla) || 0))

/** El momento (en minutos simulados desde que se recoloca) en que pasa una aparición especial. */
export function momentoDeLaAparicion(semilla, modelo) {
  const { desde, hasta } = VENTANA_DE_LAS_APARICIONES
  return entreDe(baseDeLaSemilla(semilla), IDENTIFICADOR_DE_LA_APARICION[modelo], desde, hasta)
}

/**
 * Un tráfico nuevo, recién colocado: los carros normales repartidos por cada carril con el
 * hash propio, y las dos apariciones especiales esperando su momento.
 *
 * @param {{ semilla?: number, enLaVisita?: boolean }} [datos] `enLaVisita` usa un valor fijo en lugar de la semilla
 */
export function crearTrafico({ semilla = 0, enLaVisita = false } = {}) {
  const base = enLaVisita ? SEMILLA_DEL_TRAFICO_EN_LA_VISITA : baseDeLaSemilla(semilla)
  const carros = []
  const espacio = LARGO_DEL_CARRIL / CARROS_POR_CARRIL
  CARRILES.forEach((carril, c) => {
    const [desdeCruce, hastaCruce] = GEOMETRIA_DEL_CARRIL.get(carril.clave).cruce
    for (let i = 0; i < CARROS_POR_CARRIL; i += 1) {
      const modelo = MODELOS_DE_CARROS[fraccionDe(base, c * 100 + i + 50) < 0.5 ? 0 : 1]
      const largo = LARGO_DE_LOS_MODELOS[modelo]
      // Con 36 m por turno y hasta 16 m de corrimiento quedan al menos 20 m entre dos carros.
      let u = i * espacio + entreDe(base, c * 100 + i, 0, espacio - 20)
      // Ninguno arranca sobre el cruce: se pasa justo después (como mucho 11 m, que sobran de los 20).
      if (u + largo / 2 > desdeCruce - MARGEN_DE_ESPERA && u - largo / 2 < hastaCruce + MARGEN_DE_ESPERA) {
        u = hastaCruce + largo / 2 + 1
      }
      carros.push({
        id: c * 100 + i,
        carril: carril.clave,
        modelo,
        largo,
        u,
        oculto: false,
        esperando: false,
        especial: false,
      })
    }
  })
  const especiales = MODELOS_ESPECIALES.map((modelo, i) => ({
    modelo,
    momento: momentoDeLaAparicion(base, modelo),
    carril: CARRILES[Math.floor(fraccionDe(base, 900 + i) * CARRILES.length)].clave,
    salio: false,
  }))
  return { base, carros, especiales, minutos: 0 }
}

/** El carril con esa clave. */
const carrilDe = (clave) => CARRILES.find((carril) => carril.clave === clave)

/** Dónde está un carro: `{ x, z, rumbo }` con el rumbo como giro sobre Y (los modelos miran a +Z). */
export function posicionDelCarro(carro) {
  const carril = carrilDe(carro.carril)
  const coordenada = coordenadaDelCarril(carril, carro.u)
  const x = carril.eje === 'x' ? coordenada : carril.fijo
  const z = carril.eje === 'z' ? coordenada : carril.fijo
  const rumbo = carril.eje === 'z' ? (carril.sentido > 0 ? 0 : Math.PI) : carril.sentido > 0 ? Math.PI / 2 : -Math.PI / 2
  return { x, z, rumbo }
}

/** De 0 a 1: cuánto de su tamaño tiene un carro; nace y se va dentro de la niebla de los extremos del carril. */
export function escalaDelCarro(carro) {
  const t = Math.min(1, Math.max(0, Math.min(carro.u, LARGO_DEL_CARRIL - carro.u) / TRAMO_DE_LA_NIEBLA))
  return t * t * (3 - 2 * t)
}

/** ¿Hay una moto dentro de la zona de cada avenida? */
export function motosEnLasZonas(motos) {
  const resultado = { guaimaral: false, granColombia: false }
  for (const { punto } of motos) {
    for (const [avenida, zona] of Object.entries(ZONAS_DE_MOTOS)) {
      const along = zona.eje === 'z' ? punto[2] : punto[0]
      const lateral = zona.eje === 'z' ? punto[0] : punto[2]
      if (along >= zona.desde && along <= zona.hasta && lateral >= zona.lateral[0] && lateral <= zona.lateral[1]) {
        resultado[avenida] = true
      }
    }
  }
  return resultado
}

/** ¿Está el carro, aunque sea en parte, sobre el cruce de las avenidas? */
export function estaEnElCruce(carro) {
  const [desde, hasta] = GEOMETRIA_DEL_CARRIL.get(carro.carril).cruce
  return carro.u + carro.largo / 2 > desde && carro.u - carro.largo / 2 < hasta
}

/** Cuánto se acercan una moto y un carro sin tocarse: medio ancho del carro más medio de la moto. */
const MEDIO_ANCHO_DE_CONTACTO = 1.5
/** El colchón a lo largo, además de la mitad del carro. */
const COLCHON_A_LO_LARGO = 1.2

/** ¿Coincide el carro con alguna de las motos? */
function coincideConUnaMoto(carro, motos) {
  const carril = carrilDe(carro.carril)
  const { x, z } = posicionDelCarro(carro)
  for (const { punto } of motos) {
    const dx = Math.abs(punto[0] - x)
    const dz = Math.abs(punto[2] - z)
    const [a, l] = carril.eje === 'z' ? [dz, dx] : [dx, dz]
    if (a < carro.largo / 2 + COLCHON_A_LO_LARGO && l < MEDIO_ANCHO_DE_CONTACTO) return true
  }
  return false
}

/** ¿Hay sitio al inicio del carril para un carro más? */
function hayLugarAlInicio(carros, carril) {
  return carros.every((carro) => carro.carril !== carril.clave || carro.u - carro.largo / 2 >= HUECO_ENTRE_CARROS)
}

/**
 * Avanza el tráfico un cuadro.
 *
 * @param {object} trafico lo que devuelve `crearTrafico` (se va actualizando)
 * @param {object} cuadro
 * @param {number} cuadro.segundos segundos de animación (`pasoDeLaAnimacion`): 0 en pausa
 * @param {number} cuadro.minutos minutos simulados que pasaron desde el cuadro anterior (0 en pausa)
 * @param {Array<{ punto: number[] }>} cuadro.motos las motos que la escena dibujó este cuadro
 */
export function avanzarElTrafico(trafico, { segundos = 0, minutos = 0, motos = [] } = {}) {
  trafico.minutos += minutos
  const { carros } = trafico

  // Las apariciones especiales: nacen al inicio de su carril cuando les toca y hay lugar.
  for (const aparicion of trafico.especiales) {
    if (aparicion.salio || trafico.minutos < aparicion.momento) continue
    const carril = carrilDe(aparicion.carril)
    const largo = LARGO_DE_LOS_MODELOS[aparicion.modelo]
    if (!hayLugarAlInicio(carros, carril)) continue
    carros.push({
      id: IDENTIFICADOR_DE_LA_APARICION[aparicion.modelo],
      carril: carril.clave,
      modelo: aparicion.modelo,
      largo,
      u: -largo / 2,
      oculto: false,
      esperando: false,
      especial: true,
    })
    aparicion.salio = true
  }

  const paso = VELOCIDAD_DEL_TRAFICO * segundos
  const hayMotos = motosEnLasZonas(motos)

  for (const carril of CARRILES) {
    const { zona, cruce } = GEOMETRIA_DEL_CARRIL.get(carril.clave)
    const delCarril = carros.filter((carro) => carro.carril === carril.clave).sort((a, b) => b.u - a.u)
    let lider = null
    for (const carro of delCarril) {
      let limite = Infinity
      // Guardar la distancia con el de adelante.
      if (lider) limite = lider.u - lider.largo / 2 - HUECO_ENTRE_CARROS - carro.largo / 2
      let esperando = false
      const frente = carro.u + carro.largo / 2
      // Esperar antes de la zona de una boca mientras haya una moto en ella.
      if (hayMotos[carril.avenida] && frente <= zona[0]) {
        limite = Math.min(limite, zona[0] - MARGEN_DE_ESPERA - carro.largo / 2)
        esperando = true
      }
      // Esperar antes del cruce si pasa un carro de la otra avenida.
      if (frente <= cruce[0] && carros.some((otro) => carrilDe(otro.carril).avenida !== carril.avenida && estaEnElCruce(otro))) {
        limite = Math.min(limite, cruce[0] - MARGEN_DE_ESPERA - carro.largo / 2)
        esperando = true
      }
      carro.u = Math.min(carro.u + paso, Math.max(limite, carro.u))
      carro.esperando = esperando && carro.u >= limite - 1e-6
      lider = carro
    }
  }

  // Los que salieron del carril: los especiales no vuelven; los demás vuelven a entrar por el inicio si hay lugar.
  for (let i = carros.length - 1; i >= 0; i -= 1) {
    const carro = carros[i]
    if (carro.u - carro.largo / 2 <= LARGO_DEL_CARRIL) continue
    if (carro.especial) {
      carros.splice(i, 1)
    } else if (hayLugarAlInicio(carros, carrilDe(carro.carril))) {
      carro.u = -carro.largo / 2
    }
  }

  for (const carro of carros) carro.oculto = coincideConUnaMoto(carro, motos)
  return trafico
}
