import { BoxGeometry, Matrix4 } from 'three'
import { describe, expect, it } from 'vitest'

import { medirPiezas } from './medidaDeMoto.js'

describe('medirPiezas', () => {
  it('da el centro de la caja vista desde arriba y el punto más alto', () => {
    // una caja de 2 × 1 × 4 con su centro en (1, 0.5, -2) dentro de la moto
    const local = new Matrix4().makeTranslation(1, 0.5, -2)
    const medida = medirPiezas([{ geometry: new BoxGeometry(2, 1, 4), local }])
    expect(medida.centroX).toBeCloseTo(1, 6)
    expect(medida.centroZ).toBeCloseTo(-2, 6)
    expect(medida.alto).toBeCloseTo(1, 6)
  })

  it('aplica la escala y el traslado de cada pieza antes de medir', () => {
    const local = new Matrix4().makeTranslation(0, 1, 0).scale({ x: 2, y: 2, z: 2 })
    const medida = medirPiezas([{ geometry: new BoxGeometry(1, 1, 1), local }])
    expect(medida.alto).toBeCloseTo(2, 6) // 1 + (0,5 · 2)
  })

  it('une varias piezas en una sola caja', () => {
    const a = { geometry: new BoxGeometry(1, 1, 1), local: new Matrix4().makeTranslation(0, 0.5, 2) }
    const b = { geometry: new BoxGeometry(1, 3, 1), local: new Matrix4().makeTranslation(0, 1.5, -1) }
    const medida = medirPiezas([a, b])
    expect(medida.centroZ).toBeCloseTo(0.5, 6) // de -1,5 a 2,5
    expect(medida.alto).toBeCloseTo(3, 6)
  })

  it('sin piezas no inventa nada: todo en cero', () => {
    expect(medirPiezas([])).toEqual({ centroX: 0, centroZ: 0, alto: 0 })
  })
})
