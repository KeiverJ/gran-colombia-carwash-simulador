import { describe, expect, it } from 'vitest'

import { ALTURAS_DEL_LETRERO, FRANJA_DE_LA_PARED, franjaDeLaPared } from './franjaDeLaPared.js'
import { ALTO_MINIMO_DEL_LETRERO, LETRERO_DE_LA_PARED, colocacionDelLetreroDeLaPared } from './logoEnLaEscena.js'
import { LOCAL, PARED_DEL_FONDO } from './posiciones.js'
import { tramosConHuecos } from './geometriasDelEntorno.js'

const { aberturas, alto: altoDeLaPared, z, grosor } = PARED_DEL_FONDO
const huecos = aberturas.map(({ centroX, ancho }) => ({ centro: centroX, ancho }))
const macizos = tramosConHuecos(-LOCAL.ancho / 2, LOCAL.ancho / 2, huecos)

describe('la franja amarilla de la pared', () => {
  const cajas = franjaDeLaPared()

  it('hay una caja por cada tramo macizo de la pared', () => {
    expect(cajas).toHaveLength(macizos.length)
    expect(cajas.length).toBeGreaterThan(0)
  })

  it('no se solapa con el letrero horizontal: va por debajo de su borde de abajo', () => {
    const arribaDeLaFranja = FRANJA_DE_LA_PARED.desde + FRANJA_DE_LA_PARED.alto
    expect(arribaDeLaFranja).toBeLessThanOrEqual(ALTURAS_DEL_LETRERO.desde)
    for (const { y, alto } of cajas) {
      expect(y + alto / 2).toBeLessThanOrEqual(ALTURAS_DEL_LETRERO.desde)
      expect(y - alto / 2).toBeGreaterThanOrEqual(0)
    }
  })

  it('el letrero conserva su tamaño y su altura: 0,80 m de alto, de 1,0 a 1,8 m', () => {
    expect(LETRERO_DE_LA_PARED).toMatchObject({ alto: 0.8, bordeDeAbajo: 1 })
    expect(ALTURAS_DEL_LETRERO).toEqual({ desde: 1, hasta: 1.8 })
    expect(ALTO_MINIMO_DEL_LETRERO).toBe(0.75)
    const [desde, hasta] = macizos.reduce((mejor, tramo) => (tramo[1] - tramo[0] > mejor[1] - mejor[0] ? tramo : mejor))
    const { position } = colocacionDelLetreroDeLaPared({ z, grosor }, desde, hasta)
    expect(position[1] - LETRERO_DE_LA_PARED.alto / 2).toBeCloseTo(1, 6)
  })

  it('no cruza la abertura de la boca: queda cortada en sus bordes', () => {
    for (const { centroX, ancho } of aberturas) {
      for (const { x, ancho: largo } of cajas) {
        const [a, b] = [x - largo / 2, x + largo / 2]
        const [h0, h1] = [centroX - ancho / 2, centroX + ancho / 2]
        // la franja y el hueco no se montan: o termina antes o empieza después
        expect(b <= h0 + 1e-9 || a >= h1 - 1e-9).toBe(true)
      }
    }
  })

  it('cubre todo el ancho macizo de la pared (de punta a punta, menos la boca)', () => {
    const total = cajas.reduce((s, c) => s + c.ancho, 0)
    const hueco = aberturas.reduce((s, a) => s + a.ancho, 0)
    expect(total).toBeCloseTo(LOCAL.ancho - hueco, 6)
  })

  it('queda sobre la cara de adelante de la pared y dentro de su alto', () => {
    for (const caja of cajas) {
      expect(caja.z).toBeGreaterThan(z + grosor / 2)
      expect(caja.y + caja.alto / 2).toBeLessThan(altoDeLaPared)
    }
  })
});
