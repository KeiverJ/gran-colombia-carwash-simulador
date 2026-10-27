import { describe, expect, it } from 'vitest'

import {
  ALTO_DEL_TECHO,
  alturaParaVerLaFilaDeAtras,
  cajaDelLocalEnPantalla,
  DIAGONAL_DEL_LOCAL,
  distanciaDe,
  elevacionDeVista,
  encuadreParaLasCapas,
  ESQUINAS_DEL_LOCAL,
  LIMITES_DE_CAMARA,
  medioAltoVisible,
  proyectarPunto,
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

describe('proyectar un punto', () => {
  it('el objetivo de la vista cae en el centro de la imagen', () => {
    for (const vista of Object.values(VISTAS)) {
      const [x, y] = proyectarPunto(vista.objetivo, vista, 16 / 9)
      expect(x).toBeCloseTo(0, 9)
      expect(y).toBeCloseTo(0, 9)
    }
  })

  it('lo que está a la derecha cae a la derecha y lo que está arriba, arriba', () => {
    const vista = VISTA_INICIAL
    const [aLaDerecha] = proyectarPunto([5, 0.8, -2], vista, 16 / 9)
    const [, arriba] = proyectarPunto([0, 4, -2], vista, 16 / 9)
    expect(aLaDerecha).toBeGreaterThan(0)
    expect(arriba).toBeGreaterThan(0)
  })

  it('lo que queda detrás de la cámara no se proyecta', () => {
    expect(proyectarPunto([0, 5, 40], VISTA_INICIAL, 16 / 9)).toBeNull()
  })

  it('un aspecto más ancho reparte lo mismo en más píxeles: la x se achica', () => {
    const [angosto] = proyectarPunto([5, 0.8, -2], VISTA_INICIAL, 1)
    const [ancho] = proyectarPunto([5, 0.8, -2], VISTA_INICIAL, 2)
    expect(ancho).toBeCloseTo(angosto / 2, 9)
  })
})

describe('el encuadre con las capas abiertas', () => {
  const LIENZO = { ancho: 1302, alto: 679 }
  const capas = (izquierda, derecha) => encuadreParaLasCapas({ ...LIENZO, izquierda, derecha })

  /** Dónde cae, en píxeles del lienzo, un punto de la imagen normalizada con un encuadre. */
  const columnaEnElLienzo = (x, encuadre) => {
    const centroDelCuadro = encuadre.fullWidth / 2 - encuadre.offsetX
    return centroDelCuadro + x * (encuadre.fullWidth / 2)
  }

  const extremosDelLocal = (vista, encuadre) => {
    const caja = cajaDelLocalEnPantalla(vista, LIENZO.ancho / LIENZO.alto)
    return [columnaEnElLienzo(caja.minX, encuadre), columnaEnElLienzo(caja.maxX, encuadre)]
  }

  it('nunca agranda: la escala no pasa de 1', () => {
    for (const [i, d] of [[0, 0], [360, 0], [0, 360], [360, 360], [100, 20]]) {
      expect(capas(i, d).escala).toBeLessThanOrEqual(1)
    }
    expect(encuadreParaLasCapas({ ancho: 6000, alto: 1000, izquierda: 0, derecha: 0 }).escala).toBe(1)
  })

  it('con más capas abiertas el local se achica más', () => {
    expect(capas(360, 0).escala).toBeLessThan(capas(0, 0).escala + 1e-9)
    expect(capas(360, 360).escala).toBeLessThan(capas(360, 0).escala)
    expect(capas(360, 0).escala).toBeCloseTo(capas(0, 360).escala, 9)
  })

  it('el local de la vista inicial queda centrado en el área libre', () => {
    for (const [i, d] of [[0, 0], [360, 0], [0, 360], [360, 360], [240, 90]]) {
      const [izquierdo, derecho] = extremosDelLocal(VISTA_INICIAL, capas(i, d))
      const centroLibre = i + (LIENZO.ancho - i - d) / 2
      expect((izquierdo + derecho) / 2).toBeCloseTo(centroLibre, 6)
    }
  })

  it('el local cabe en el área libre, con margen, en las dos vistas con botón', () => {
    for (const [i, d] of [[0, 0], [360, 0], [0, 360], [360, 360]]) {
      const libre = LIENZO.ancho - i - d
      for (const vista of Object.values(VISTAS)) {
        const [izquierdo, derecho] = extremosDelLocal(vista, capas(i, d))
        expect(izquierdo).toBeGreaterThan(i)
        expect(derecho).toBeLessThan(i + libre)
        expect(derecho - izquierdo).toBeLessThanOrEqual(libre * 0.95)
      }
    }
  })

  it('el local también cabe a lo alto', () => {
    const encuadre = capas(360, 360)
    for (const vista of Object.values(VISTAS)) {
      const caja = cajaDelLocalEnPantalla(vista, LIENZO.ancho / LIENZO.alto)
      const alto = ((caja.maxY - caja.minY) / 2) * encuadre.height * encuadre.escala
      expect(alto).toBeLessThan(LIENZO.alto)
    }
  })

  it('el cuadro virtual conserva el aspecto del lienzo y entrega un lienzo del mismo tamaño', () => {
    const encuadre = capas(360, 0)
    expect(encuadre.fullWidth / encuadre.fullHeight).toBeCloseTo(LIENZO.ancho / LIENZO.alto, 9)
    expect(encuadre.width).toBe(LIENZO.ancho)
    expect(encuadre.height).toBe(LIENZO.alto)
  })

  it('no depende de dónde esté la cámara: solo de las medidas', () => {
    expect(capas(360, 0)).toEqual(capas(360, 0))
  })

  it('con capas absurdas o sin tamaño no produce NaN', () => {
    for (const medidas of [
      { ancho: 1302, alto: 679, izquierda: 5000, derecha: 5000 },
      { ancho: 1302, alto: 679, izquierda: -50, derecha: Number.NaN },
      { ancho: 1302, alto: 679, izquierda: 1302, derecha: 0 },
    ]) {
      const encuadre = encuadreParaLasCapas(medidas)
      for (const valor of Object.values(encuadre)) {
        expect(Number.isFinite(valor)).toBe(true)
      }
      expect(encuadre.escala).toBeGreaterThan(0)
    }
    expect(encuadreParaLasCapas({ ancho: 0, alto: 679, izquierda: 0, derecha: 0 })).toBeNull()
    expect(encuadreParaLasCapas({ ancho: 1302, alto: 0, izquierda: 0, derecha: 0 })).toBeNull()
  })

  it('las esquinas del local salen de las columnas del techo', () => {
    expect(ESQUINAS_DEL_LOCAL).toHaveLength(8)
    const alturas = new Set(ESQUINAS_DEL_LOCAL.map(([, y]) => y))
    expect([...alturas].sort((a, b) => a - b)).toEqual([0, ALTO_DEL_TECHO])
  })
})

describe('el encuadre con los controles de arriba y el panel de abajo', () => {
  const LIENZO = { ancho: 1310, alto: 679 }
  const ARRIBA = 52
  const ABAJO = 261 + 8 + 88 + 4

  const filaEnElLienzo = (y, encuadre) => {
    const centroDelCuadro = encuadre.fullHeight / 2 - encuadre.offsetY
    return centroDelCuadro - y * (encuadre.fullHeight / 2)
  }
  const columnaEnElLienzo = (x, encuadre) => {
    const centroDelCuadro = encuadre.fullWidth / 2 - encuadre.offsetX
    return centroDelCuadro + x * (encuadre.fullWidth / 2)
  }
  const aspecto = LIENZO.ancho / LIENZO.alto

  it('el local de la foto queda centrado a lo alto en lo que dejan libre arriba y abajo', () => {
    const encuadre = encuadreParaLasCapas({ ...LIENZO, izquierda: 360, arriba: ARRIBA, abajo: ABAJO })
    const caja = cajaDelLocalEnPantalla(VISTA_INICIAL, aspecto)
    const arribaDelLocal = filaEnElLienzo(caja.maxY, encuadre)
    const abajoDelLocal = filaEnElLienzo(caja.minY, encuadre)
    expect((arribaDelLocal + abajoDelLocal) / 2).toBeCloseTo(ARRIBA + (LIENZO.alto - ARRIBA - ABAJO) / 2, 6)
    expect(arribaDelLocal).toBeGreaterThanOrEqual(ARRIBA)
    expect(abajoDelLocal).toBeLessThanOrEqual(LIENZO.alto - ABAJO + 1e-6)
  })

  it('y también a lo ancho, junto a la capa de Ajustes', () => {
    const encuadre = encuadreParaLasCapas({ ...LIENZO, izquierda: 360, arriba: ARRIBA, abajo: ABAJO })
    const caja = cajaDelLocalEnPantalla(VISTA_INICIAL, aspecto)
    const izquierdo = columnaEnElLienzo(caja.minX, encuadre)
    const derecho = columnaEnElLienzo(caja.maxX, encuadre)
    expect((izquierdo + derecho) / 2).toBeCloseTo(360 + (LIENZO.ancho - 360) / 2, 6)
  })

  it('cuanto más tapa el panel de abajo, más se achica el local', () => {
    const escala = (abajo) => encuadreParaLasCapas({ ...LIENZO, arriba: ARRIBA, abajo }).escala
    expect(escala(100)).toBeGreaterThanOrEqual(escala(300))
    expect(escala(300)).toBeGreaterThan(escala(420))
    expect(escala(420)).toBeGreaterThan(escala(480))
  })

  it('con el panel plegado (solo la barra) el local no se achica por lo de abajo', () => {
    expect(encuadreParaLasCapas({ ...LIENZO, arriba: ARRIBA, abajo: 40 + 8 + 88 + 4 }).escala).toBe(1)
  })

  it('con el alto inicial y Ajustes abiertas a 1366 × 768 el local cabe y es de buen tamaño', () => {
    const encuadre = encuadreParaLasCapas({ ...LIENZO, izquierda: 360, arriba: ARRIBA, abajo: ABAJO })
    expect(encuadre.escala).toBeGreaterThan(0.7)
    expect(encuadre.escala).toBeLessThan(1)
  })

  it('una cámara que mira desde arriba necesita más alto: la escala baja con la inclinación', () => {
    const base = { ...LIENZO, arriba: ARRIBA, abajo: ABAJO }
    const deFrente = encuadreParaLasCapas({ ...base, elevacion: elevacionDeVista(VISTAS.comoEnLaFoto) })
    const aMedias = encuadreParaLasCapas({ ...base, elevacion: 50 })
    const deArriba = encuadreParaLasCapas({ ...base, elevacion: elevacionDeVista(VISTAS.desdeArriba) })
    expect(deFrente.escala).toBeGreaterThan(aMedias.escala)
    expect(aMedias.escala).toBeGreaterThan(deArriba.escala)
  })

  it('la vista de plano también cabe en lo que queda libre', () => {
    const elevacion = elevacionDeVista(VISTAS.desdeArriba)
    const encuadre = encuadreParaLasCapas({ ...LIENZO, arriba: ARRIBA, abajo: ABAJO, elevacion })
    const caja = cajaDelLocalEnPantalla(VISTAS.desdeArriba, aspecto)
    expect(filaEnElLienzo(caja.maxY, encuadre)).toBeGreaterThanOrEqual(ARRIBA - 1e-6)
    expect(filaEnElLienzo(caja.minY, encuadre)).toBeLessThanOrEqual(LIENZO.alto - ABAJO + 1e-6)
  })

  it('las elevaciones de las dos vistas con botón son las esperadas', () => {
    expect(elevacionDeVista(VISTAS.comoEnLaFoto)).toBeGreaterThan(5)
    expect(elevacionDeVista(VISTAS.comoEnLaFoto)).toBeLessThan(20)
    expect(elevacionDeVista(VISTAS.desdeArriba)).toBeGreaterThan(80)
  })

  it('acercar o alejar la cámara no cambia el encuadre: solo importa la inclinación', () => {
    const base = { ...LIENZO, arriba: ARRIBA, abajo: ABAJO }
    expect(encuadreParaLasCapas({ ...base, elevacion: 30 })).toEqual(encuadreParaLasCapas({ ...base, elevacion: 30 }))
  })

  it('con una elevación que no es un número usa la de la foto', () => {
    const base = { ...LIENZO, arriba: ARRIBA, abajo: ABAJO }
    expect(encuadreParaLasCapas({ ...base, elevacion: Number.NaN })).toEqual(encuadreParaLasCapas(base))
  })

  it('con medidas absurdas arriba y abajo no produce NaN', () => {
    const encuadre = encuadreParaLasCapas({ ...LIENZO, arriba: 5000, abajo: Number.NaN })
    for (const valor of Object.values(encuadre)) {
      expect(Number.isFinite(valor)).toBe(true)
    }
  })
})
