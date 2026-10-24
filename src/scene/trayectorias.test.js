import { describe, expect, it } from 'vitest'

import {
  AVENIDAS,
  LOCAL,
  MOTO,
  PASILLO,
  posicionDePlaca,
  posicionDePuesto,
  SERVIDOR,
  TOPE_DE_MOTOS_DIBUJADAS,
} from './posiciones.js'
import {
  caminoHacia,
  conArranqueYFrenado,
  esDeLaFilaDeAtras,
  girarHacia,
  largoDelCamino,
  puntoEnElCamino,
  puntoDe,
  SITIO_DE_SALIDA,
  sitioDeEntrada,
  sitioEnFila,
  sitioEnPlaca,
  sitioEnPuesto,
} from './trayectorias.js'

const PLACAS = 6
const PUESTOS = 3

/** Las losas que hay en el suelo con una configuración dada. */
const losasDe = (placas, puestos) => [
  ...Array.from({ length: placas }, (_, i) => ({
    clase: `placa ${i + 1}`,
    indice: i,
    es: 'placa',
    punto: posicionDePlaca(i, placas),
  })),
  ...Array.from({ length: puestos }, (_, i) => ({
    clase: `puesto ${i + 1}`,
    indice: i,
    es: 'puesto',
    punto: posicionDePuesto(i, puestos),
  })),
]

/**
 * ¿Este punto cae encima de esa losa?
 *
 * Se mira el centro de la moto con holgura de medio ancho: pasar rozando una
 * losa cuenta como pasar por encima.
 */
const pisa = ([x, , z], losa) =>
  Math.abs(x - losa.punto[0]) < (SERVIDOR.ancho + MOTO.ancho) / 2 - 1e-9 &&
  Math.abs(z - losa.punto[2]) < (SERVIDOR.fondo + MOTO.ancho) / 2 - 1e-9

/** Recorre un camino tomando muestras densas de todos sus tramos. */
function* muestrasDe(camino, paso = 0.1) {
  for (let i = 1; i < camino.length; i += 1) {
    const [x0, , z0] = camino[i - 1]
    const [x1, , z1] = camino[i]
    const largo = Math.hypot(x1 - x0, z1 - z0)
    const cuantas = Math.max(1, Math.ceil(largo / paso))
    for (let k = 0; k <= cuantas; k += 1) {
      const t = k / cuantas
      yield { punto: [x0 + (x1 - x0) * t, 0, z0 + (z1 - z0) * t], tramo: i }
    }
  }
}

/**
 * Comprueba que un camino no pisa ninguna losa, salvo la de donde sale y la
 * de donde llega: a esas la moto tiene que subirse.
 */
function noPisaLosas(camino, { losas, suyas = [] }) {
  const ajenas = losas.filter((losa) => !suyas.includes(losa.clase))
  const pisadas = []
  for (const { punto } of muestrasDe(camino)) {
    for (const losa of ajenas) {
      if (pisa(punto, losa) && !pisadas.includes(losa.clase)) pisadas.push(losa.clase)
    }
  }
  return pisadas
}

const losas = losasDe(PLACAS, PUESTOS)

describe('los sitios del lavadero', () => {
  it('cada uno está donde dice la planta', () => {
    expect(puntoDe(sitioDeEntrada('guaimaral'))).toEqual(AVENIDAS.guaimaral.posicion)
    expect(puntoDe(SITIO_DE_SALIDA)[2]).toBe(LOCAL.zSalida)
    // Sobre una losa, la moto va encima y echada atrás para no tapar el número.
    const [, alto, z] = puntoDe(sitioEnPlaca(0, PLACAS))
    expect(alto).toBe(SERVIDOR.altoOcupado)
    expect(z).toBeLessThan(posicionDePlaca(0, PLACAS)[2])
  })

  it('sabe qué placas son de la fila de atrás', () => {
    expect(esDeLaFilaDeAtras(0, 6)).toBe(false)
    expect(esDeLaFilaDeAtras(2, 6)).toBe(false)
    expect(esDeLaFilaDeAtras(3, 6)).toBe(true)
    expect(esDeLaFilaDeAtras(4, 7)).toBe(true)
    expect(esDeLaFilaDeAtras(3, 7)).toBe(false)
  })

  it('rechaza un sitio que no existe', () => {
    expect(() => puntoDe({ zona: 'cafeteria' })).toThrow(/cafeteria/)
  })
})

describe('todo camino empieza y acaba donde se pide', () => {
  const pares = [
    [sitioDeEntrada('granColombia'), sitioEnFila('lavado', 0)],
    [sitioDeEntrada('guaimaral'), sitioEnFila('lavado', 3)],
    [sitioDeEntrada('granColombia'), sitioEnPlaca(5, PLACAS)],
    [sitioEnFila('lavado', 0), sitioEnPlaca(1, PLACAS)],
    [sitioEnFila('lavado', 0), sitioEnPlaca(4, PLACAS)],
    [sitioEnPlaca(1, PLACAS), sitioEnFila('acabado', 0)],
    [sitioEnPlaca(4, PLACAS), sitioEnFila('acabado', 2)],
    [sitioEnFila('acabado', 0), sitioEnPuesto(2, PUESTOS)],
    [sitioEnPuesto(1, PUESTOS), SITIO_DE_SALIDA],
    [sitioEnFila('lavado', 3), sitioEnFila('lavado', 0)],
  ]

  it.each(pares)('de %o a %o', (desde, hasta) => {
    const camino = caminoHacia(desde, hasta)
    expect(camino.length).toBeGreaterThan(0)
    expect(camino[0]).toEqual(puntoDe(desde))
    expect(camino.at(-1)).toEqual(puntoDe(hasta))
  })

  it('ningún camino queda vacío ni repite el mismo punto seguido', () => {
    for (const [desde, hasta] of pares) {
      const camino = caminoHacia(desde, hasta)
      expect(camino.length).toBeGreaterThanOrEqual(1)
      for (let i = 1; i < camino.length; i += 1) {
        const salto = Math.hypot(
          camino[i][0] - camino[i - 1][0],
          camino[i][2] - camino[i - 1][2],
        )
        expect(salto).toBeGreaterThan(1e-9)
      }
    }
  })
})

describe('ningún camino pasa por encima de una losa', () => {
  it('de la fila a cualquier placa, con 5, 6 y 7 placas', () => {
    for (const total of [5, 6, 7]) {
      const delLocal = losasDe(total, PUESTOS)
      for (let i = 0; i < total; i += 1) {
        const camino = caminoHacia(sitioEnFila('lavado', 0), sitioEnPlaca(i, total))
        const pisadas = noPisaLosas(camino, { losas: delLocal, suyas: [`placa ${i + 1}`] })
        expect(pisadas, `con ${total} placas, al entrar a la ${i + 1}`).toEqual([])
      }
    }
  })

  it('de cualquier placa a la fila del acabado', () => {
    for (const total of [5, 6, 7]) {
      const delLocal = losasDe(total, PUESTOS)
      for (let i = 0; i < total; i += 1) {
        const camino = caminoHacia(sitioEnPlaca(i, total), sitioEnFila('acabado', 0))
        const pisadas = noPisaLosas(camino, { losas: delLocal, suyas: [`placa ${i + 1}`] })
        expect(pisadas, `con ${total} placas, al salir de la ${i + 1}`).toEqual([])
      }
    }
  })

  it('de la fila del acabado a cualquier puesto, con 3, 4 y 5 puestos', () => {
    for (const total of [3, 4, 5]) {
      const delLocal = losasDe(PLACAS, total)
      for (let i = 0; i < total; i += 1) {
        const camino = caminoHacia(sitioEnFila('acabado', 0), sitioEnPuesto(i, total))
        const pisadas = noPisaLosas(camino, { losas: delLocal, suyas: [`puesto ${i + 1}`] })
        expect(pisadas, `con ${total} puestos, al entrar al ${i + 1}`).toEqual([])
      }
    }
  })

  it('de cualquier puesto a la salida', () => {
    for (let i = 0; i < PUESTOS; i += 1) {
      const camino = caminoHacia(sitioEnPuesto(i, PUESTOS), SITIO_DE_SALIDA)
      const pisadas = noPisaLosas(camino, { losas, suyas: [`puesto ${i + 1}`] })
      expect(pisadas, `al salir del puesto ${i + 1}`).toEqual([])
    }
  })

  it('de las dos entradas a cualquier sitio de la fila del lavado', () => {
    for (const avenida of ['granColombia', 'guaimaral']) {
      for (let i = 0; i < TOPE_DE_MOTOS_DIBUJADAS; i += 1) {
        const camino = caminoHacia(sitioDeEntrada(avenida), sitioEnFila('lavado', i))
        expect(noPisaLosas(camino, { losas }), `${avenida}, sitio ${i + 1}`).toEqual([])
      }
    }
  })

  it('de las dos entradas a una placa libre, sin pasar por la fila', () => {
    // Pasa de verdad: si hay placa libre, el motor no hace esperar a la moto.
    for (const avenida of ['granColombia', 'guaimaral']) {
      for (let i = 0; i < PLACAS; i += 1) {
        const camino = caminoHacia(sitioDeEntrada(avenida), sitioEnPlaca(i, PLACAS))
        const pisadas = noPisaLosas(camino, { losas, suyas: [`placa ${i + 1}`] })
        expect(pisadas, `${avenida} a la placa ${i + 1}`).toEqual([])
      }
    }
  })
})

describe('rodear la fila de adelante', () => {
  it('para entrar a una de atrás se pasa por el pasillo y por el hueco', () => {
    const camino = caminoHacia(sitioEnFila('lavado', 0), sitioEnPlaca(4, PLACAS))
    const porElPasillo = camino.some(([x]) => Math.abs(x - PASILLO.centroX) < 1e-9)
    expect(porElPasillo).toBe(true)
  })

  it('para entrar a una de adelante no hace falta rodear: es más corto', () => {
    const corto = largoDelCamino(caminoHacia(sitioEnFila('lavado', 0), sitioEnPlaca(1, PLACAS)))
    const largo = largoDelCamino(caminoHacia(sitioEnFila('lavado', 0), sitioEnPlaca(4, PLACAS)))
    expect(corto).toBeLessThan(largo)
  })

  it('salir de una de adelante también rodea, y de una de atrás no', () => {
    const deAdelante = caminoHacia(sitioEnPlaca(1, PLACAS), sitioEnFila('acabado', 0))
    const deAtras = caminoHacia(sitioEnPlaca(4, PLACAS), sitioEnFila('acabado', 0))
    expect(largoDelCamino(deAdelante)).toBeGreaterThan(largoDelCamino(deAtras))
  })
})

describe('los caminos se quedan dentro del local', () => {
  it('ningún punto se sale por los bordes', () => {
    const pares = [
      [sitioEnFila('lavado', 0), sitioEnPlaca(5, PLACAS)],
      [sitioEnPlaca(0, PLACAS), sitioEnFila('acabado', 0)],
      [sitioEnFila('acabado', 0), sitioEnPuesto(2, PUESTOS)],
    ]
    for (const [desde, hasta] of pares) {
      for (const { punto } of muestrasDe(caminoHacia(desde, hasta), 0.25)) {
        expect(Math.abs(punto[0])).toBeLessThanOrEqual(LOCAL.ancho / 2)
        expect(Math.abs(punto[2])).toBeLessThanOrEqual(LOCAL.fondo / 2)
      }
    }
  })

  it('avanzar un sitio en la misma fila es ir de frente, sin rodeos', () => {
    const camino = caminoHacia(sitioEnFila('lavado', 3), sitioEnFila('lavado', 2))
    expect(camino).toHaveLength(2)
    expect(camino[0][2]).toBe(camino[1][2])
  })
})

describe('avanzar por el camino', () => {
  const camino = [
    [0, 0, 0],
    [0, 0, 4],
    [3, 0, 4],
  ]

  it('al principio está en el primer punto y al final en el último', () => {
    expect(puntoEnElCamino(camino, 0).punto).toEqual([0, 0, 0])
    expect(puntoEnElCamino(camino, largoDelCamino(camino)).punto).toEqual([3, 0, 4])
  })

  it('no se sale del camino ni pidiéndole de más o de menos', () => {
    expect(puntoEnElCamino(camino, -5).punto).toEqual([0, 0, 0])
    expect(puntoEnElCamino(camino, 999).punto).toEqual([3, 0, 4])
  })

  it('a mitad del primer tramo va por la mitad', () => {
    expect(puntoEnElCamino(camino, 2).punto).toEqual([0, 0, 2])
  })

  it('el rumbo es el del tramo que recorre', () => {
    // Primer tramo hacia +Z: rumbo 0. Segundo hacia +X: un cuarto de vuelta.
    expect(puntoEnElCamino(camino, 1).rumbo).toBeCloseTo(0, 10)
    expect(puntoEnElCamino(camino, 5).rumbo).toBeCloseTo(Math.PI / 2, 10)
  })

  it('un camino de un solo punto no da rumbo, para no girar sin motivo', () => {
    expect(puntoEnElCamino([[1, 0, 2]], 0)).toEqual({ punto: [1, 0, 2], rumbo: null })
  })
})

describe('el arranque y el frenado', () => {
  it('empieza en 0 y acaba en 1', () => {
    expect(conArranqueYFrenado(0)).toBe(0)
    expect(conArranqueYFrenado(1)).toBe(1)
  })

  it('va más lento al principio y al final que por el medio', () => {
    const velocidadEn = (p) => conArranqueYFrenado(p + 0.01) - conArranqueYFrenado(p)
    expect(velocidadEn(0)).toBeLessThan(velocidadEn(0.5))
    expect(velocidadEn(0.9)).toBeLessThan(velocidadEn(0.5))
  })

  it('no se sale de 0 a 1 aunque se le pida de más', () => {
    expect(conArranqueYFrenado(-1)).toBe(0)
    expect(conArranqueYFrenado(2)).toBe(1)
  })
})

describe('girar hacia donde se avanza', () => {
  it('llegando del todo, queda mirando al destino', () => {
    expect(girarHacia(0, Math.PI / 2, 1)).toBeCloseTo(Math.PI / 2, 10)
  })

  it('gira por el lado corto, no dando la vuelta entera', () => {
    // De casi media vuelta a media vuelta: el camino corto cruza el ±PI.
    const resultado = girarHacia(3, -3, 0.5)
    const avance = Math.abs(resultado - 3)
    expect(avance).toBeLessThan(Math.PI / 2)
  })

  it('a medio camino se queda a medio camino', () => {
    expect(girarHacia(0, 1, 0.5)).toBeCloseTo(0.5, 10)
  })

  it('si ya mira donde debe, no gira', () => {
    expect(girarHacia(1.2, 1.2, 0.5)).toBeCloseTo(1.2, 10)
  })
})
