import { describe, expect, it } from 'vitest'

import {
  alturaParaVerLaFilaDeAtras,
  DIAGONAL_DEL_LOCAL,
  distanciaDe,
  LIMITES_DE_CAMARA,
  medioAltoVisible,
  VISTA_INICIAL,
  vistaRecentrada,
  VISTAS,
} from './camara.js'
import { LOCAL } from './posiciones.js'

describe('la vista inicial', () => {
  it('mira de frente, desde el lado abierto del local', () => {
    const [x, , z] = VISTA_INICIAL.posicion
    expect(z).toBeGreaterThan(LOCAL.zFrente)
    expect(x).toBe(0)
  })

  it('es baja: mira casi de canto, no desde arriba', () => {
    const [, alto, z] = VISTA_INICIAL.posicion
    const anguloSobreElSuelo = Math.atan2(alto, z) * (180 / Math.PI)
    expect(anguloSobreElSuelo).toBeLessThan(25)
  })

  it('pero no tanto como para que la fila de adelante tape la de atrás', () => {
    const [, alto, z] = VISTA_INICIAL.posicion
    expect(alto).toBeGreaterThan(alturaParaVerLaFilaDeAtras(z))
  })

  it('deja ver el local entero', () => {
    const [, alto, z] = VISTA_INICIAL.posicion
    expect(Math.hypot(alto, z)).toBeGreaterThan(DIAGONAL_DEL_LOCAL / 2)
  })

  it('no se mete por debajo del suelo', () => {
    expect(VISTA_INICIAL.posicion[1]).toBeGreaterThan(0)
  })
})

describe('la altura mínima para ver las dos filas', () => {
  it('crece con la distancia: cuanto más lejos, más alto hay que estar', () => {
    expect(alturaParaVerLaFilaDeAtras(30)).toBeGreaterThan(alturaParaVerLaFilaDeAtras(20))
  })

  it('a ras de suelo nunca alcanza', () => {
    // Es lo que descarta la vista "desde la acera" literal: se vería la
    // primera fila y nada más.
    for (const distancia of [16, 20, 23, 30]) {
      expect(alturaParaVerLaFilaDeAtras(distancia)).toBeGreaterThan(2)
    }
  })
})

describe('la vista de plano', () => {
  it('mira desde arriba, casi en vertical', () => {
    const [x, alto, z] = VISTAS.desdeArriba.posicion
    expect(alto).toBeGreaterThan(LOCAL.fondo)
    expect(Math.hypot(x, z)).toBeLessThan(alto / 10)
  })

  it('está lo bastante alto para que entre el local entero', () => {
    // Lo que decide si cabe no es la diagonal, sino cuánto mundo abarca la
    // cámara a esa altura con su ángulo de visión.
    expect(medioAltoVisible(VISTAS.desdeArriba.posicion[1])).toBeGreaterThan(
      LOCAL.fondo / 2,
    )
  })
})

describe('los límites del control', () => {
  it('el ángulo polar no llega a la horizontal, así que no se baja del piso', () => {
    expect(LIMITES_DE_CAMARA.anguloPolarMaximo).toBeLessThan(Math.PI / 2)
    expect(LIMITES_DE_CAMARA.anguloPolarMaximo).toBeGreaterThan(1)
  })

  it('las dos vistas caben dentro de las distancias permitidas', () => {
    for (const vista of Object.values(VISTAS)) {
      const [x, alto, z] = vista.posicion
      const [ox, oy, oz] = vista.objetivo
      const distancia = Math.hypot(x - ox, alto - oy, z - oz)
      expect(distancia, vista.nombre).toBeGreaterThanOrEqual(
        LIMITES_DE_CAMARA.distanciaMinima,
      )
      expect(distancia, vista.nombre).toBeLessThanOrEqual(
        LIMITES_DE_CAMARA.distanciaMaxima,
      )
    }
  })
})

describe('recentrar', () => {
  it('devuelve el objetivo al centro del local', () => {
    const { objetivo } = vistaRecentrada([30, 2, 5])
    expect(objetivo).toEqual(VISTA_INICIAL.objetivo)
  })

  it('conserva desde dónde se mira', () => {
    // Mirando desde la izquierda y arriba, se sigue mirando desde ahí.
    const desde = [-20, 12, 6]
    const { posicion, objetivo } = vistaRecentrada(desde)
    const direccionAntes = desde.map((c, i) => c - VISTA_INICIAL.objetivo[i])
    const direccionDespues = posicion.map((c, i) => c - objetivo[i])
    const largoAntes = Math.hypot(...direccionAntes)
    const largoDespues = Math.hypot(...direccionDespues)
    for (let i = 0; i < 3; i += 1) {
      expect(direccionDespues[i] / largoDespues).toBeCloseTo(direccionAntes[i] / largoAntes, 10)
    }
  })

  it('si se había acercado de más, se aleja hasta encuadrar', () => {
    const muyCerca = [0, 2, 4]
    const { posicion, objetivo } = vistaRecentrada(muyCerca)
    expect(distanciaDe({ posicion, objetivo })).toBeCloseTo(distanciaDe(VISTA_INICIAL), 6)
  })

  it('si estaba lejos, no lo acerca', () => {
    const lejos = [0, 10, 50]
    const { posicion, objetivo } = vistaRecentrada(lejos)
    const distancia = distanciaDe({ posicion, objetivo })
    expect(distancia).toBeGreaterThanOrEqual(distanciaDe(VISTA_INICIAL))
    expect(distancia).toBeCloseTo(
      distanciaDe({ posicion: lejos, objetivo: VISTA_INICIAL.objetivo }),
      6,
    )
  })

  it('con la cámara justo en el objetivo no se rompe: vuelve a la vista inicial', () => {
    const { posicion } = vistaRecentrada([...VISTA_INICIAL.objetivo])
    expect(posicion).toEqual(VISTA_INICIAL.posicion)
  })
})
