import { describe, expect, it } from 'vitest'

import { OBSERVADO_EN_LA_VISITA } from './censo.js'

describe('conteos observados en la visita', () => {
  it('son 15 conteos con los seis valores de la especificación', () => {
    expect(OBSERVADO_EN_LA_VISITA).toEqual({
      conteos: 15,
      placasOcupadas: 2.33,
      enCola1: 0.6,
      enCola2: 3.27,
      puestosOcupados: 2.8,
      esperaAntesDeLaPlacaMin: 2.0,
      tiempoTotalMin: 31.1,
    })
  })
})
