import { describe, expect, it } from 'vitest'

import { CAMPO_DE_VISION, proyectarPunto, vistaDeLaClave } from './camara.js'
import {
  posicionDePlaca,
  posicionDePuesto,
  posteDeLaPlaca,
  posteDelPuesto,
} from './posiciones.js'
import { trabajadoresDeLasLosas } from './trabajadores.js'

/**
 * Los trabajadores no tapan el número de ninguna losa, vistos desde la vista
 * general y desde «Lavado» a 1366 × 768: se comparan, en píxeles de la pantalla, la
 * caja de cada trabajador (de pie, de 1,8 m) con la tarjeta del número de cada placa
 * y de cada puesto (en el poste, a 1,65 m / 1,3 m del piso, de 0,6 m de alto en el
 * mundo y nunca de menos de 18 px).
 */
const ANCHO = 1366
const ALTO = 768
const ALTO_DEL_POSTE = { placa: 1.55, puesto: 1.2 }
const ALTO_DE_LA_TARJETA = 0.6
const PIXELES_MINIMOS = 18
/** La tarjeta de un número de una o dos cifras es casi cuadrada: ancho = 1,1 × alto. */
const PROPORCION_DE_LA_TARJETA = 1.1

const aPixeles = ([x, y]) => [(x * ANCHO) / 2, (y * ALTO) / 2]

function cajaDelTrabajador({ x, z }, vista) {
  const puntos = []
  for (const dx of [-0.25, 0.25]) {
    for (const dz of [-0.25, 0.25]) {
      for (const y of [0, 1.8]) puntos.push(proyectarPunto([x + dx, y, z + dz], vista, ANCHO / ALTO))
    }
  }
  const px = puntos.map(aPixeles)
  return {
    x0: Math.min(...px.map(([x]) => x)),
    x1: Math.max(...px.map(([x]) => x)),
    y0: Math.min(...px.map(([, y]) => y)),
    y1: Math.max(...px.map(([, y]) => y)),
  }
}

function cajaDeLaTarjeta(base, vista) {
  const [bx, by] = aPixeles(proyectarPunto(base, vista, ANCHO / ALTO))
  const distancia = Math.hypot(...base.map((v, i) => v - vista.posicion[i]))
  const pixelesPorMetro = ALTO / 2 / (Math.tan((CAMPO_DE_VISION * Math.PI) / 360) * distancia)
  const alto = Math.max(ALTO_DE_LA_TARJETA * pixelesPorMetro, PIXELES_MINIMOS)
  return { x0: bx - (alto * PROPORCION_DE_LA_TARJETA) / 2, x1: bx + (alto * PROPORCION_DE_LA_TARJETA) / 2, y0: by, y1: by + alto }
}

const seTocan = (a, b) => a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0

describe.each([['general'], ['lavado']])('desde «%s» a 1366 × 768', (clave) => {
  const vista = vistaDeLaClave(clave, ANCHO / ALTO)

  it.each([
    [6, 3],
    [8, 4],
    [14, 7],
  ])('con %i placas y %i puestos ocupados, ningún trabajador tapa un número', (placas, puestos) => {
    const estados = [...Array(placas).fill('ocupada'), ...Array(puestos).fill('ocupada')]
    const trabajadores = trabajadoresDeLasLosas({ placas, puestos, estados })
    expect(trabajadores.length).toBeGreaterThan(0)

    const tarjetas = [
      ...Array.from({ length: placas }, (_, i) => {
        const [x, , z] = posicionDePlaca(i, placas)
        const poste = posteDeLaPlaca(i, placas)
        return { nombre: `placa ${i + 1}`, distancia: Math.hypot(x + poste.x - vista.posicion[0], z + poste.z - vista.posicion[2]), caja: cajaDeLaTarjeta([x + poste.x, ALTO_DEL_POSTE.placa + 0.1, z + poste.z], vista) }
      }),
      ...Array.from({ length: puestos }, (_, i) => {
        const [x, , z] = posicionDePuesto(i, puestos)
        const poste = posteDelPuesto(i, puestos)
        return { nombre: `puesto ${i + 1}`, distancia: Math.hypot(x + poste.x - vista.posicion[0], z + poste.z - vista.posicion[2]), caja: cajaDeLaTarjeta([x + poste.x, ALTO_DEL_POSTE.puesto + 0.1, z + poste.z], vista) }
      }),
    ]
    // Solo puede tapar un número el trabajador que está más cerca de la cámara que él: si está detrás,
    // es la tarjeta la que lo tapa a él.
    const distanciaA = (x, z) => Math.hypot(x - vista.posicion[0], z - vista.posicion[2])
    for (const trabajador of trabajadores) {
      const caja = cajaDelTrabajador(trabajador, vista)
      for (const { nombre, caja: tarjeta, distancia } of tarjetas) {
        if (distanciaA(trabajador.x, trabajador.z) >= distancia) continue
        expect(seTocan(caja, tarjeta), `el trabajador de la ${trabajador.etapa === 'lavado' ? 'placa' : 'puesto'} ${trabajador.indice + 1} tapa el número de la ${nombre}`).toBe(false)
      }
    }
  })
})

describe('el número se lee desde «Planta» a 1366 × 768', () => {
  it('la tarjeta mide al menos 18 px aunque la cámara esté lejos', () => {
    const vista = vistaDeLaClave('planta', ANCHO / ALTO)
    const [x, , z] = posicionDePlaca(0, 6)
    const poste = posteDeLaPlaca(0, 6)
    const tarjeta = cajaDeLaTarjeta([x + poste.x, ALTO_DEL_POSTE.placa + 0.1, z + poste.z], vista)
    expect(tarjeta.y1 - tarjeta.y0).toBeGreaterThanOrEqual(PIXELES_MINIMOS)
    // sin el mínimo, a la distancia de «Planta» la tarjeta de 0,6 m mediría menos de 12 px
    const distancia = Math.hypot(x + poste.x - vista.posicion[0], 1.65 - vista.posicion[1], z + poste.z - vista.posicion[2])
    const sinMinimo = ALTO_DE_LA_TARJETA * (ALTO / 2 / (Math.tan((CAMPO_DE_VISION * Math.PI) / 360) * distancia))
    expect(sinMinimo).toBeLessThan(18)
  })
})
