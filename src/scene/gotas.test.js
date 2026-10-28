import { describe, expect, it } from 'vitest'

import { posicionDeLaGota, BOQUILLA, GOTAS_POR_PLACA } from './gotas.js'
import { SERVIDOR } from './posiciones.js'

describe('posicionDeLaGota', () => {
  it('siempre queda entre la losa y la boquilla', () => {
    for (let k = 0; k < GOTAS_POR_PLACA; k += 1) {
      for (let t = 0; t < 3; t += 0.07) {
        const [, y] = posicionDeLaGota(k, t, SERVIDOR.altoOcupado)
        expect(y).toBeLessThanOrEqual(BOQUILLA.y + 1e-9)
        expect(y).toBeGreaterThanOrEqual(SERVIDOR.altoOcupado - 1e-9)
      }
    }
  })

  it('no usa azar: la misma gota en el mismo instante está en el mismo sitio', () => {
    expect(posicionDeLaGota(3, 1.234, 0.5)).toEqual(posicionDeLaGota(3, 1.234, 0.5))
  })

  it('las gotas de una placa no van todas juntas', () => {
    const alturas = new Set(Array.from({ length: GOTAS_POR_PLACA }, (_, k) => posicionDeLaGota(k, 0.4, 0.5)[1].toFixed(3)))
    expect(alturas.size).toBeGreaterThan(GOTAS_POR_PLACA / 2)
  })
})
