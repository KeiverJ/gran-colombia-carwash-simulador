import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

import { caminosDelMotor } from './caminosDelMotor.js'

const referencia = JSON.parse(readFileSync(new URL('./caminosDelMotor.json', import.meta.url), 'utf8'))

describe('los recorridos del motor no cambian al pulir la visita', () => {
  const actuales = caminosDelMotor()

  it('hay los mismos recorridos que en la referencia', () => {
    expect(Object.keys(actuales).sort()).toEqual(Object.keys(referencia).sort())
    expect(Object.keys(referencia).length).toBeGreaterThan(300)
  })

  it('cada uno tiene exactamente los mismos puntos, con 5, 6 y 7 placas y 3, 4 y 5 puestos', () => {
    for (const [nombre, camino] of Object.entries(referencia)) {
      expect(actuales[nombre], nombre).toEqual(camino)
    }
  })
})
