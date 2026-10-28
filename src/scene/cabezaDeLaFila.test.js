import { describe, expect, it } from 'vitest'

import { proyectarPunto, vistaPlanta } from './camara.js'
import {
  COLUMNAS_DEL_TECHO,
  FILA_DEL_LAVADO,
  FRANJA_DE_ESPERA,
  MOTO,
  posicionEnFila,
  TECHO,
  TOPE_DE_MOTOS_DIBUJADAS,
} from './posiciones.js'

const RADIO_DE_LA_COLUMNA = 0.16

describe('la fila 1 y las columnas del techo', () => {
  it('ninguna moto de la fila queda a menos de dos metros y medio de una columna', () => {
    for (let i = 0; i < TOPE_DE_MOTOS_DIBUJADAS.lavado; i += 1) {
      const [x, , z] = posicionEnFila(i, 'lavado')
      for (const [xc, , zc] of COLUMNAS_DEL_TECHO) {
        expect(Math.hypot(x - xc, z - zc), `lugar ${i + 1}`).toBeGreaterThanOrEqual(2.5)
      }
    }
  })

  it('la cabeza queda a más de cuatro metros y medio de la columna de la esquina del frente', () => {
    const [xc, , zc] = COLUMNAS_DEL_TECHO[1]
    expect(Math.hypot(FILA_DEL_LAVADO.x - xc, FILA_DEL_LAVADO.zCabeza - zc)).toBeGreaterThan(4.5)
  })

  it('la fila cabe dentro de su franja, con la moto entera', () => {
    const borde = FRANJA_DE_ESPERA.x0 + FRANJA_DE_ESPERA.ancho
    expect(FILA_DEL_LAVADO.x + MOTO.ancho / 2).toBeLessThan(borde)
    expect(FILA_DEL_LAVADO.x - MOTO.ancho / 2).toBeGreaterThan(FRANJA_DE_ESPERA.x0 + RADIO_DE_LA_COLUMNA)
  })

  it.each([
    [1366, 768],
    [1920, 1080],
    [390, 844],
  ])('en la planta (%s × %s) la columna de la esquina no cae sobre la moto de la cabeza', (ancho, alto) => {
    const aspecto = ancho / alto
    const vista = vistaPlanta(aspecto)
    const aPixeles = ([x, y]) => [((x + 1) / 2) * ancho, ((1 - y) / 2) * alto]
    const [xc, , zc] = COLUMNAS_DEL_TECHO[1]
    const [xh, , zh] = [FILA_DEL_LAVADO.x, 0, FILA_DEL_LAVADO.zCabeza]
    // La columna se ve desde arriba como una línea del suelo a su punta, y la punta se corre hacia afuera.
    const base = aPixeles(proyectarPunto([xc, 0, zc], vista, aspecto))
    const punta = aPixeles(proyectarPunto([xc, TECHO.alto, zc], vista, aspecto))
    const cabeza = aPixeles(proyectarPunto([xh, 0, zh], vista, aspecto))
    const masUnMetro = aPixeles(proyectarPunto([xh, 0, zh + 1], vista, aspecto))
    const pixelesPorMetro = Math.hypot(masUnMetro[0] - cabeza[0], masUnMetro[1] - cabeza[1])
    // La moto, en la planta, ocupa un óvalo de su largo; la columna no debe entrar en él.
    const holgura = (MOTO.largo / 2) * pixelesPorMetro
    for (const punto of [base, punta]) {
      expect(Math.hypot(punto[0] - cabeza[0], punto[1] - cabeza[1])).toBeGreaterThan(holgura)
    }
  })
})
