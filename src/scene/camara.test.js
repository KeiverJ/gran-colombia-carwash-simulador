import { describe, expect, it } from 'vitest'

import {
  ALTO_DEL_TECHO,
  alturaParaVerLaFilaDeAtras,
  ASPECTO_INICIAL,
  BOTONES_DE_VISTA,
  CAJA_DEL_LOCAL,
  cajaDelLocalEnPantalla,
  DIAGONAL_DEL_LOCAL,
  distanciaDe,
  ELEVACION_DE_LA_VISTA_GENERAL,
  elevacionDeLaVistaGeneral,
  ELEVACION_EN_VERTICAL,
  elevacionDeVista,
  encuadreParaLasCapas,
  esquinasDeLaCaja,
  ESQUINAS_DEL_LOCAL,
  LIMITES_DE_CAMARA,
  proyectarPunto,
  VISTA_INICIAL,
  vistaAcabado,
  vistaDeLaClave,
  vistaGeneral,
  vistaLavado,
  vistaPlanta,
  ZONA_DEL_ACABADO,
  ZONA_DEL_LAVADO,
} from './camara.js'
import { FILA_DEL_LAVADO, FRANJA_DE_ESPERA, LOCAL } from './posiciones.js'

/** Las proporciones que importan: escritorio, 1366 × 768, 1920 × 1080, celular vertical y celular girado. */
const ASPECTOS = {
  'escritorio 16:9': 16 / 9,
  '1366 × 768': 1366 / 768,
  '1920 × 1080': 1920 / 1080,
  '390 × 844 (celular vertical)': 390 / 844,
  '844 × 390 (celular girado)': 844 / 390,
  'cuadrada': 1,
}

/** ¿Un punto del mundo cae dentro de la imagen de la vista? */
const cabe = (punto, vista, aspecto) => {
  const proyectado = proyectarPunto(punto, vista, aspecto)
  return proyectado !== null && Math.abs(proyectado[0]) <= 1 && Math.abs(proyectado[1]) <= 1
}

describe.each(Object.entries(ASPECTOS))('la vista general con %s', (_nombre, aspecto) => {
  const vista = vistaGeneral(aspecto)

  it('muestra el local completo, de la Guaimaral a la franja de espera, a lo ancho y a lo alto', () => {
    for (const esquina of ESQUINAS_DEL_LOCAL) {
      expect(cabe(esquina, vista, aspecto), `esquina ${esquina}`).toBe(true)
    }
  })

  it('incluye la franja de espera completa y la fila del lavado de la cabeza al último lugar', () => {
    const franja = FRANJA_DE_ESPERA.x0 + FRANJA_DE_ESPERA.ancho
    for (const z of [-LOCAL.fondo / 2, LOCAL.zFrente]) {
      for (const x of [FRANJA_DE_ESPERA.x0, franja]) {
        expect(cabe([x, 0, z], vista, aspecto), `franja en (${x}, ${z})`).toBe(true)
      }
    }
    expect(cabe([FILA_DEL_LAVADO.x, 0, FILA_DEL_LAVADO.zCabeza], vista, aspecto)).toBe(true)
  })

  it('mira de frente, desde el lado abierto del local', () => {
    const [x, alto, z] = vista.posicion
    const [xObjetivo] = vista.objetivo
    expect(z).toBeGreaterThan(LOCAL.zFrente)
    expect(x).toBeCloseTo(xObjetivo, 9)
    expect(alto).toBeGreaterThan(0)
  })

  it('es baja si el lienzo es ancho y sube (poco a poco) si es estrecho', () => {
    const elevacion = elevacionDeVista(vista)
    expect(elevacion).toBeCloseTo(elevacionDeLaVistaGeneral(aspecto), 6)
    expect(elevacion).toBeGreaterThanOrEqual(ELEVACION_DE_LA_VISTA_GENERAL - 1e-9)
    if (aspecto >= 0.9) expect(elevacion).toBeCloseTo(ELEVACION_DE_LA_VISTA_GENERAL, 6)
    if (aspecto >= 1) expect(elevacion).toBeLessThan(25)
    if (aspecto <= 0.5) expect(elevacion).toBeCloseTo(ELEVACION_EN_VERTICAL, 6)
  })

  it('pero no tanto como para que la fila de adelante tape la de atrás', () => {
    const [, alto, z] = vista.posicion
    expect(alto).toBeGreaterThan(alturaParaVerLaFilaDeAtras(z))
  })

  it('queda dentro de las distancias que permite el control', () => {
    expect(distanciaDe(vista)).toBeGreaterThanOrEqual(LIMITES_DE_CAMARA.distanciaMinima)
    expect(distanciaDe(vista)).toBeLessThanOrEqual(LIMITES_DE_CAMARA.distanciaMaxima)
  })

  it('es la más corta que deja ver el local: un 10 % más cerca y ya no cabría', () => {
    const [px, py, pz] = vista.posicion
    const [ox, oy, oz] = vista.objetivo
    const cerca = {
      posicion: [ox + (px - ox) * 0.9, oy + (py - oy) * 0.9, oz + (pz - oz) * 0.9],
      objetivo: vista.objetivo,
    }
    expect(ESQUINAS_DEL_LOCAL.every((e) => cabe(e, cerca, aspecto))).toBe(false)
  })

  it('el objetivo cae en el centro de la imagen', () => {
    const [x, y] = proyectarPunto(vista.objetivo, vista, aspecto)
    expect(x).toBeCloseTo(0, 9)
    expect(y).toBeCloseTo(0, 9)
  })
})

describe('la vista general llena el ancho del lienzo', () => {
  /** Qué parte del ancho del lienzo ocupa lo que tiene que verse (de 0 a 1). */
  const anchoOcupado = (aspecto) => {
    const vista = vistaGeneral(aspecto)
    const xs = ESQUINAS_DEL_LOCAL.map((esquina) => proyectarPunto(esquina, vista, aspecto)[0])
    return (Math.max(...xs) - Math.min(...xs)) / 2
  }

  it('en un celular vertical de 390 × 844, el local y la franja de espera ocupan más del 90 % del ancho', () => {
    expect(anchoOcupado(390 / 844)).toBeGreaterThan(0.9)
  })

  it('en un celular más ancho (0,6) también, y nunca menos que con la cámara baja', () => {
    expect(anchoOcupado(0.6)).toBeGreaterThan(0.88)
  })

  it('en un escritorio de 16:9 ocupa lo que dejan los controles del encuadre', () => {
    expect(anchoOcupado(16 / 9)).toBeGreaterThan(0.75)
  })

  it('en 390 × 844 mira desde bastante arriba, sin dejar mucho cielo: el horizonte queda fuera o en el borde', () => {
    // un punto muy lejano al fondo del local cae en la mitad de arriba, no en el centro
    const vista = vistaGeneral(390 / 844)
    const [, y] = proyectarPunto([vista.objetivo[0], 0, -300], vista, 390 / 844) ?? [0, 1]
    expect(y).toBeGreaterThan(0.9)
  })
})

describe('la vista general en vertical se aleja más que en horizontal', () => {
  it('en un celular de 390 × 844 está más lejos que en un escritorio', () => {
    expect(distanciaDe(vistaGeneral(390 / 844))).toBeGreaterThan(distanciaDe(vistaGeneral(16 / 9)) * 1.5)
  })
})

describe('la vista inicial', () => {
  it('es la vista general con la proporción de arranque', () => {
    expect(VISTA_INICIAL.posicion).toEqual(vistaGeneral(ASPECTO_INICIAL).posicion)
    expect(VISTA_INICIAL.objetivo).toEqual(vistaGeneral(ASPECTO_INICIAL).objetivo)
  })

  it('mira al centro del local completo, no solo al de las columnas', () => {
    expect(VISTA_INICIAL.objetivo[0]).toBeCloseTo((CAJA_DEL_LOCAL.minX + CAJA_DEL_LOCAL.maxX) / 2, 9)
    expect(VISTA_INICIAL.objetivo[2]).toBeCloseTo((CAJA_DEL_LOCAL.minZ + CAJA_DEL_LOCAL.maxZ) / 2, 9)
  })

  it('deja ver el local entero', () => {
    expect(distanciaDe(VISTA_INICIAL)).toBeGreaterThan(DIAGONAL_DEL_LOCAL / 2)
  })
})

describe('los cuatro botones de vista', () => {
  it('se llaman Vista general, Lavado, Acabado y Planta, y solo esos', () => {
    expect(BOTONES_DE_VISTA.map((b) => b.nombre)).toEqual(['Vista general', 'Lavado', 'Acabado', 'Planta'])
  })

  it('cada clave da su vista y una clave que no existe falla en voz alta', () => {
    for (const { clave, nombre } of BOTONES_DE_VISTA) {
      expect(vistaDeLaClave(clave, 16 / 9).nombre).toBe(nombre)
    }
    expect(() => vistaDeLaClave('recentrar', 16 / 9)).toThrow(RangeError)
  })
})

describe.each(Object.entries(ASPECTOS))('lavado y acabado con %s', (_nombre, aspecto) => {
  it('el lavado muestra las placas y la fila de espera, de la cabeza hacia el fondo', () => {
    const vista = vistaLavado(aspecto)
    for (const esquina of esquinasDeLaCaja(ZONA_DEL_LAVADO)) {
      expect(cabe(esquina, vista, aspecto), `lavado, esquina ${esquina}`).toBe(true)
    }
    expect(cabe([FILA_DEL_LAVADO.x, 0, FILA_DEL_LAVADO.zCabeza], vista, aspecto)).toBe(true)
    expect(cabe([2, 0, 4], vista, aspecto)).toBe(true) // una placa de adelante
    expect(cabe([2, 0, 0], vista, aspecto)).toBe(true) // y una de atrás
  })

  it('el acabado muestra los puestos y su fila', () => {
    const vista = vistaAcabado(aspecto)
    for (const esquina of esquinasDeLaCaja(ZONA_DEL_ACABADO)) {
      expect(cabe(esquina, vista, aspecto), `acabado, esquina ${esquina}`).toBe(true)
    }
    expect(cabe([2, 0, LOCAL.zPuestos], vista, aspecto)).toBe(true)
    expect(cabe([2, 0, LOCAL.zFilaAcabado], vista, aspecto)).toBe(true)
  })

  it('ninguna de las dos se sale de lo que permite el control', () => {
    for (const vista of [vistaLavado(aspecto), vistaAcabado(aspecto)]) {
      expect(distanciaDe(vista)).toBeGreaterThanOrEqual(LIMITES_DE_CAMARA.distanciaMinima)
      expect(distanciaDe(vista)).toBeLessThanOrEqual(LIMITES_DE_CAMARA.distanciaMaxima)
    }
  })

  it('y no se alejan más que la vista general (en una pantalla muy baja y ancha, la altura manda)', () => {
    expect(distanciaDe(vistaLavado(aspecto))).toBeLessThan(distanciaDe(vistaGeneral(aspecto)) * 1.1)
    expect(distanciaDe(vistaAcabado(aspecto))).toBeLessThan(distanciaDe(vistaGeneral(aspecto)) * 1.1)
  })
})

it('en un escritorio de 16:9 acercan más que la vista general', () => {
  expect(distanciaDe(vistaLavado(16 / 9))).toBeLessThan(distanciaDe(vistaGeneral(16 / 9)) * 0.95)
  expect(distanciaDe(vistaAcabado(16 / 9))).toBeLessThan(distanciaDe(vistaGeneral(16 / 9)) * 0.95)
})

describe.each(Object.entries(ASPECTOS))('la planta con %s', (_nombre, aspecto) => {
  const vista = vistaPlanta(aspecto)

  it('mira desde arriba, casi en vertical, y muestra el local completo con la franja de espera', () => {
    expect(elevacionDeVista(vista)).toBeGreaterThan(80)
    const [x, , z] = vista.posicion
    expect(Math.hypot(x - vista.objetivo[0], z - vista.objetivo[2])).toBeLessThan(distanciaDe(vista) / 10)
    for (const esquina of ESQUINAS_DEL_LOCAL) {
      expect(cabe([esquina[0], 0, esquina[2]], vista, aspecto), `esquina ${esquina}`).toBe(true)
    }
  })

  it('queda dentro de las distancias que permite el control', () => {
    expect(distanciaDe(vista)).toBeLessThanOrEqual(LIMITES_DE_CAMARA.distanciaMaxima)
    expect(distanciaDe(vista)).toBeGreaterThanOrEqual(LIMITES_DE_CAMARA.distanciaMinima)
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

describe('los límites del control', () => {
  it('el ángulo polar no llega a la horizontal, así que no se baja del piso', () => {
    expect(LIMITES_DE_CAMARA.anguloPolarMaximo).toBeLessThan(Math.PI / 2)
    expect(LIMITES_DE_CAMARA.anguloPolarMaximo).toBeGreaterThan(1)
  })

  it('la distancia máxima deja ver el local completo en un celular vertical', () => {
    expect(distanciaDe(vistaGeneral(390 / 844))).toBeLessThan(LIMITES_DE_CAMARA.distanciaMaxima)
  })
})

describe('proyectar un punto', () => {
  const VISTA = vistaGeneral(16 / 9)

  it('el objetivo de cada vista cae en el centro de la imagen', () => {
    for (const { calcular } of BOTONES_DE_VISTA) {
      const vista = calcular(16 / 9)
      const [x, y] = proyectarPunto(vista.objetivo, vista, 16 / 9)
      expect(x).toBeCloseTo(0, 9)
      expect(y).toBeCloseTo(0, 9)
    }
  })

  it('lo que está a la derecha cae a la derecha y lo que está arriba, arriba', () => {
    const [aLaDerecha] = proyectarPunto([VISTA.objetivo[0] + 5, 0.8, VISTA.objetivo[2]], VISTA, 16 / 9)
    const [, arriba] = proyectarPunto([VISTA.objetivo[0], 4, VISTA.objetivo[2]], VISTA, 16 / 9)
    expect(aLaDerecha).toBeGreaterThan(0)
    expect(arriba).toBeGreaterThan(0)
  })

  it('lo que queda detrás de la cámara no se proyecta', () => {
    expect(proyectarPunto([0, 5, 400], VISTA, 16 / 9)).toBeNull()
  })

  it('un aspecto más ancho reparte lo mismo en más píxeles: la x se achica', () => {
    const [angosto] = proyectarPunto([5, 0.8, -2], VISTA, 1)
    const [ancho] = proyectarPunto([5, 0.8, -2], VISTA, 2)
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

  const ASPECTO = LIENZO.ancho / LIENZO.alto
  const GENERAL = vistaGeneral(ASPECTO)

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
      const [izquierdo, derecho] = extremosDelLocal(GENERAL, capas(i, d))
      const centroLibre = i + (LIENZO.ancho - i - d) / 2
      expect((izquierdo + derecho) / 2).toBeCloseTo(centroLibre, 6)
    }
  })

  it('el local cabe en el área libre, con margen, en la vista general y en la planta', () => {
    for (const [i, d] of [[0, 0], [360, 0], [0, 360], [360, 360]]) {
      const libre = LIENZO.ancho - i - d
      for (const vista of [GENERAL, vistaPlanta(ASPECTO)]) {
        const [izquierdo, derecho] = extremosDelLocal(vista, capas(i, d))
        expect(izquierdo).toBeGreaterThan(i)
        expect(derecho).toBeLessThan(i + libre)
        expect(derecho - izquierdo).toBeLessThanOrEqual(libre * 0.95)
      }
    }
  })

  it('el local también cabe a lo alto', () => {
    const encuadre = capas(360, 360)
    for (const vista of [GENERAL, vistaPlanta(ASPECTO)]) {
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

  it('los puntos del local completo llegan a la franja de espera y al borde izquierdo', () => {
    expect(Math.max(...ESQUINAS_DEL_LOCAL.map(([x]) => x))).toBe(FRANJA_DE_ESPERA.x0 + FRANJA_DE_ESPERA.ancho)
    expect(Math.min(...ESQUINAS_DEL_LOCAL.map(([x]) => x))).toBe(-LOCAL.ancho / 2)
    const alturas = new Set(ESQUINAS_DEL_LOCAL.map(([, y]) => y))
    expect(Math.min(...alturas)).toBe(0)
    expect(Math.max(...alturas)).toBeGreaterThanOrEqual(ALTO_DEL_TECHO)
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
  const GENERAL = vistaGeneral(aspecto)
  const PLANTA = vistaPlanta(aspecto)

  it('el local de la vista general queda centrado a lo alto en lo que dejan libre arriba y abajo', () => {
    const encuadre = encuadreParaLasCapas({ ...LIENZO, izquierda: 360, arriba: ARRIBA, abajo: ABAJO })
    const caja = cajaDelLocalEnPantalla(GENERAL, aspecto)
    const arribaDelLocal = filaEnElLienzo(caja.maxY, encuadre)
    const abajoDelLocal = filaEnElLienzo(caja.minY, encuadre)
    expect((arribaDelLocal + abajoDelLocal) / 2).toBeCloseTo(ARRIBA + (LIENZO.alto - ARRIBA - ABAJO) / 2, 6)
    expect(arribaDelLocal).toBeGreaterThanOrEqual(ARRIBA)
    expect(abajoDelLocal).toBeLessThanOrEqual(LIENZO.alto - ABAJO + 1e-6)
  })

  it('y también a lo ancho, junto a la capa de Ajustes', () => {
    const encuadre = encuadreParaLasCapas({ ...LIENZO, izquierda: 360, arriba: ARRIBA, abajo: ABAJO })
    const caja = cajaDelLocalEnPantalla(GENERAL, aspecto)
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
    const deFrente = encuadreParaLasCapas({ ...base, elevacion: elevacionDeVista(GENERAL) })
    const aMedias = encuadreParaLasCapas({ ...base, elevacion: 50 })
    const deArriba = encuadreParaLasCapas({ ...base, elevacion: elevacionDeVista(PLANTA) })
    expect(deFrente.escala).toBeGreaterThan(aMedias.escala)
    expect(aMedias.escala).toBeGreaterThan(deArriba.escala)
  })

  it('la vista de plano también cabe en lo que queda libre', () => {
    const elevacion = elevacionDeVista(PLANTA)
    const encuadre = encuadreParaLasCapas({ ...LIENZO, arriba: ARRIBA, abajo: ABAJO, elevacion })
    const caja = cajaDelLocalEnPantalla(PLANTA, aspecto)
    expect(filaEnElLienzo(caja.maxY, encuadre)).toBeGreaterThanOrEqual(ARRIBA - 1e-6)
    expect(filaEnElLienzo(caja.minY, encuadre)).toBeLessThanOrEqual(LIENZO.alto - ABAJO + 1e-6)
  })

  it('las elevaciones de la vista general y de la planta son las esperadas', () => {
    expect(elevacionDeVista(GENERAL)).toBeGreaterThan(5)
    expect(elevacionDeVista(GENERAL)).toBeLessThan(20)
    expect(elevacionDeVista(PLANTA)).toBeGreaterThan(80)
  })

  it('con una proporción de celular vertical también cabe el local completo con la capa y los paneles', () => {
    const vertical = { ancho: 390, alto: 700 }
    const encuadre = encuadreParaLasCapas({ ...vertical, arriba: 44, abajo: 120 })
    const general = vistaGeneral(vertical.ancho / vertical.alto)
    const caja = cajaDelLocalEnPantalla(general, vertical.ancho / vertical.alto)
    const centro = encuadre.fullWidth / 2 - encuadre.offsetX
    expect(centro + caja.minX * (encuadre.fullWidth / 2)).toBeGreaterThanOrEqual(-1e-6)
    expect(centro + caja.maxX * (encuadre.fullWidth / 2)).toBeLessThanOrEqual(vertical.ancho + 1e-6)
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
