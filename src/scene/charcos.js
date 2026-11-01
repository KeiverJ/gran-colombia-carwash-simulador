import { BufferGeometry, Float32BufferAttribute } from 'three'

import { muestrasDe } from './comprobacionesDeCaminos.js'
import { entreDe } from './hashPropio.js'
import {
  FRANJA_DE_ESPERA,
  LOCAL,
  posicionDePlaca,
  posicionDePuesto,
  posteDeLaPlaca,
  posteDelPuesto,
  SERVIDOR,
  ZONA_DE_SERVIDORES,
} from './posiciones.js'
import { estructuraEnElMundo } from './rampasDeLasPlacas.js'
import {
  caminoDeSalida,
  caminoHacia,
  sitioDeEntrada,
  sitioEnFila,
  sitioEnPlaca,
  sitioEnPuesto,
} from './trayectorias.js'

/**
 * Los charcos del piso del lavado: óvalos irregulares de agua quieta, repartidos
 * de manera determinista con el hash propio (`hashPropio.js`) y **solo donde no
 * estorban**: no debajo de una losa, de una rampa o de un poste, ni sobre un
 * camino de las motos, una rejilla, una línea de pintura o una junta del piso.
 *
 * Es JavaScript puro. La escena los dibuja como una sola malla (`Charcos.jsx`).
 */

/** La zona mojada: cubre las dos filas de placas con un margen alrededor (la misma del piso mojado). */
export const ZONA_MOJADA = {
  centroX: ZONA_DE_SERVIDORES.centroX,
  z: (LOCAL.zPlacasAdelante + LOCAL.zPlacasAtras) / 2,
  ancho: ZONA_DE_SERVIDORES.ancho + 2,
  fondo: LOCAL.zPlacasAdelante - LOCAL.zPlacasAtras + SERVIDOR.fondo + 1,
}

/** Cuántos charcos como máximo, cuántos candidatos se prueban, la semilla del reparto, la altura sobre el piso y los vértices de cada óvalo. */
export const CHARCOS = { maximo: 14, candidatos: 200, semilla: 20261101, altura: 0.012, lados: 12 }

/** Lo que se deja libre alrededor de cada cosa, en metros. */
const HOLGURA = { losa: 0.25, camino: 0.2, linea: 0.15, poste: 0.3 }

/** Las líneas de pintura de la franja de espera (x), su grosor y cada cuánto están las juntas del piso. */
const LINEAS_DE_LA_FRANJA = [FRANJA_DE_ESPERA.x0 + 0.2, FRANJA_DE_ESPERA.x0 + FRANJA_DE_ESPERA.ancho - 0.2]
const GROSOR_DE_LA_LINEA = 0.12
const CADA_JUNTA = 5.5

/** Los puntos (x, z) por donde pasan las motos con esta configuración, cada 25 cm. */
export function puntosDeLosCaminos(placas, puestos) {
  const caminos = []
  for (let i = 0; i < placas; i += 1) {
    for (const avenida of ['granColombia', 'guaimaral']) {
      caminos.push(caminoHacia(sitioDeEntrada(avenida), sitioEnPlaca(i, placas)))
      caminos.push(caminoDeSalida(sitioEnPlaca(i, placas), avenida))
    }
    for (const k of [0, 1, 4]) {
      caminos.push(caminoHacia(sitioEnFila('lavado', k), sitioEnPlaca(i, placas)))
      caminos.push(caminoHacia(sitioEnPlaca(i, placas), sitioEnFila('acabado', k)))
    }
    for (let p = 0; p < puestos; p += 1) caminos.push(caminoHacia(sitioEnPlaca(i, placas), sitioEnPuesto(p, puestos)))
  }
  for (let p = 0; p < puestos; p += 1) {
    for (const avenida of ['granColombia', 'guaimaral']) caminos.push(caminoDeSalida(sitioEnPuesto(p, puestos), avenida))
  }
  const puntos = []
  for (const camino of caminos) for (const { punto } of muestrasDe(camino, 0.25)) puntos.push([punto[0], punto[2]])
  return puntos
}

/** Las cajas `{ x0, x1, z0, z1 }` que ocupan las losas y las rampas con esta configuración. */
export function cajasDeLosa(placas, puestos) {
  const caja = ([x, , z]) => ({
    x0: x - SERVIDOR.ancho / 2,
    x1: x + SERVIDOR.ancho / 2,
    z0: z - SERVIDOR.fondo / 2,
    z1: z + SERVIDOR.fondo / 2,
  })
  const cajas = [
    ...Array.from({ length: placas }, (_, i) => caja(posicionDePlaca(i, placas))),
    ...Array.from({ length: puestos }, (_, i) => caja(posicionDePuesto(i, puestos))),
  ]
  for (let i = 0; i < placas; i += 1) {
    const { rampa } = estructuraEnElMundo(i, placas)
    if (rampa) cajas.push(rampa)
  }
  return cajas
}

/** Los postes (centros `[x, z]`) con sus rótulos. */
export function postesDeLasLosas(placas, puestos) {
  return [
    ...Array.from({ length: placas }, (_, i) => {
      const [x, , z] = posicionDePlaca(i, placas)
      const p = posteDeLaPlaca(i, placas)
      return [x + p.x, z + p.z]
    }),
    ...Array.from({ length: puestos }, (_, i) => {
      const [x, , z] = posicionDePuesto(i, puestos)
      const p = posteDelPuesto(i, puestos)
      return [x + p.x, z + p.z]
    }),
  ]
}

/** Distancia de un punto a una caja `{ x0, x1, z0, z1 }` (0 si está dentro). */
const distanciaALaCaja = (x, z, c) => Math.hypot(Math.max(c.x0 - x, 0, x - c.x1), Math.max(c.z0 - z, 0, z - c.z1))

/** Distancia de `valor` a la junta más cercana de un eje (las juntas están cada `CADA_JUNTA` desde el borde). */
const distanciaALaJunta = (valor, inicio) => {
  const resto = (((valor - inicio) % CADA_JUNTA) + CADA_JUNTA) % CADA_JUNTA
  return Math.min(resto, CADA_JUNTA - resto)
}

/**
 * ¿Estorba un charco de radio `radio` centrado en (x, z)? Devuelve el motivo o
 * `null`. Se mide con el círculo que contiene al óvalo.
 */
export function queEstorba(x, z, radio, { cajas, puntos, postes }) {
  const fueraEnX = Math.abs(x - ZONA_MOJADA.centroX) + radio > ZONA_MOJADA.ancho / 2
  const fueraEnZ = Math.abs(z - ZONA_MOJADA.z) + radio > ZONA_MOJADA.fondo / 2
  if (fueraEnX || fueraEnZ) return 'fuera de la zona mojada'
  for (const caja of cajas) if (distanciaALaCaja(x, z, caja) < radio + HOLGURA.losa) return 'una losa o una rampa'
  for (const [px, pz] of postes) if (Math.hypot(x - px, z - pz) < radio + HOLGURA.poste) return 'un poste'
  for (const lineaX of LINEAS_DE_LA_FRANJA) {
    if (Math.abs(x - lineaX) < radio + GROSOR_DE_LA_LINEA / 2 + HOLGURA.linea) return 'una línea de pintura'
  }
  if (distanciaALaJunta(x, -LOCAL.ancho / 2) < radio + HOLGURA.linea) return 'una junta del piso'
  if (distanciaALaJunta(z, -LOCAL.fondo / 2) < radio + HOLGURA.linea) return 'una junta del piso'
  // Se aparta de la línea por donde pasa el centro de la moto, no de todo lo que ocupa la moto.
  const libre = radio + HOLGURA.camino
  for (const [cx, cz] of puntos) if (Math.hypot(x - cx, z - cz) < libre) return 'un camino de las motos'
  return null
}

/**
 * Los charcos de esta configuración: `[{ x, z, rx, rz, giro, contorno }]`, donde
 * `contorno` son los factores (de 0,8 a 1,2) de cada vértice del óvalo irregular.
 * Siempre salen los mismos para las mismas placas y puestos.
 */
export function repartoDeLosCharcos(placas, puestos) {
  const contexto = {
    cajas: cajasDeLosa(placas, puestos),
    puntos: puntosDeLosCaminos(placas, puestos),
    postes: postesDeLasLosas(placas, puestos),
  }
  const { maximo, candidatos, semilla, lados } = CHARCOS
  const charcos = []
  for (let c = 0; c < candidatos && charcos.length < maximo; c += 1) {
    const base = semilla + c * 17
    const rx = entreDe(base, 1, 0.3, 0.7)
    const rz = entreDe(base, 2, 0.2, 0.42)
    const x = entreDe(base, 3, ZONA_MOJADA.centroX - ZONA_MOJADA.ancho / 2, ZONA_MOJADA.centroX + ZONA_MOJADA.ancho / 2)
    const z = entreDe(base, 4, ZONA_MOJADA.z - ZONA_MOJADA.fondo / 2, ZONA_MOJADA.z + ZONA_MOJADA.fondo / 2)
    // Los charcos tampoco se pegan entre sí.
    const seToca = charcos.some((otro) => Math.hypot(otro.x - x, otro.z - z) < Math.max(rx, rz) + Math.max(otro.rx, otro.rz) + 0.3)
    if (seToca || queEstorba(x, z, Math.max(rx, rz) * 1.2, contexto)) continue
    charcos.push({
      x,
      z,
      rx,
      rz,
      giro: entreDe(base, 5, 0, Math.PI),
      contorno: Array.from({ length: lados }, (_, k) => entreDe(base, 10 + k, 0.8, 1.2)),
    })
  }
  return charcos
}

/**
 * Los charcos juntos en una sola geometría acostada: cada uno es un abanico de
 * triángulos desde su centro, con sus normales hacia arriba.
 */
export function geometriaDeLosCharcos(charcos) {
  const posiciones = []
  const indices = []
  for (const { x, z, rx, rz, giro, contorno } of charcos) {
    const centro = posiciones.length / 3
    posiciones.push(x, CHARCOS.altura, z)
    const n = contorno.length
    for (let k = 0; k < n; k += 1) {
      const angulo = (k / n) * Math.PI * 2
      const px = Math.cos(angulo) * rx * contorno[k]
      const pz = Math.sin(angulo) * rz * contorno[k]
      posiciones.push(
        x + px * Math.cos(giro) - pz * Math.sin(giro),
        CHARCOS.altura,
        z + px * Math.sin(giro) + pz * Math.cos(giro),
      )
    }
    for (let k = 0; k < n; k += 1) indices.push(centro, centro + 1 + ((k + 1) % n), centro + 1 + k)
  }
  const geometria = new BufferGeometry()
  geometria.setAttribute('position', new Float32BufferAttribute(posiciones, 3))
  geometria.setAttribute('normal', new Float32BufferAttribute(posiciones.map((_, i) => (i % 3 === 1 ? 1 : 0)), 3))
  geometria.setIndex(indices)
  return geometria
}
