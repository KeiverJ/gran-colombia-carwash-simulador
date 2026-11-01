import { tramosConHuecos } from './geometriasDelEntorno.js'
import { LETRERO_DE_LA_PARED } from './logoEnLaEscena.js'
import { LOCAL, PARED_DEL_FONDO } from './posiciones.js'

/**
 * La franja amarilla de la pared del fondo (#FFD21F, el amarillo del logo).
 *
 * Va por debajo del letrero horizontal del logo: el letrero ocupa de 1,0 a
 * 1,8 m de altura (ver `LETRERO_DE_LA_PARED`) y la franja, de 0,30 a 0,70 m, sin
 * tocarlo. Recorre solo los tramos macizos de la pared: la abertura de la boca
 * queda intacta. Todo en metros.
 */
export const FRANJA_DE_LA_PARED = { desde: 0.3, alto: 0.4, saliente: 0.015 }

/**
 * Las cajas de la franja, una por tramo macizo de la pared: `{ x, y, z, ancho,
 * alto, fondo }` con el centro de cada una.
 */
export function franjaDeLaPared(pared = PARED_DEL_FONDO, franja = FRANJA_DE_LA_PARED) {
  const huecos = pared.aberturas.map(({ centroX, ancho }) => ({ centro: centroX, ancho }))
  const macizos = tramosConHuecos(-LOCAL.ancho / 2, LOCAL.ancho / 2, huecos)
  return macizos.map(([a, b]) => ({
    x: (a + b) / 2,
    y: franja.desde + franja.alto / 2,
    // sobresale un poco de la cara de adelante de la pared, para que no parpadee
    z: pared.z + pared.grosor / 2 + franja.saliente / 2,
    ancho: b - a,
    alto: franja.alto,
    fondo: franja.saliente,
  }))
}

/** Hasta qué altura llega el letrero de la pared y desde cuál empieza (para comprobar que no se solapan). */
export const ALTURAS_DEL_LETRERO = {
  desde: LETRERO_DE_LA_PARED.bordeDeAbajo,
  hasta: LETRERO_DE_LA_PARED.bordeDeAbajo + LETRERO_DE_LA_PARED.alto,
}
