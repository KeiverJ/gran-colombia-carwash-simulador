import { describe, expect, it } from 'vitest'

import {
  AVENIDAS,
  entradaDeLaMoto,
  LOCAL,
  motosVisibles,
  posicionDePlaca,
  posicionEnFila,
  posicionDePuesto,
  SEPARACION_EN_FILA,
  SERVIDOR,
  sobrantesDe,
  TOPE_DE_MOTOS_DIBUJADAS,
} from './posiciones.js'

const equisDe = (cuantos, posicion) =>
  Array.from({ length: cuantos }, (_, i) => posicion(i, cuantos)[0])

const cabeEnElLocal = (x) => Math.abs(x) + SERVIDOR.ancho / 2 <= LOCAL.ancho / 2 + 1e-9

describe('las placas de lavado', () => {
  it('no se solapan con 5, 6 ni 7 placas', () => {
    for (const total of [5, 6, 7]) {
      const xs = equisDe(total, posicionDePlaca)
      for (let i = 1; i < xs.length; i += 1) {
        expect(
          xs[i] - xs[i - 1],
          `con ${total} placas, la ${i} y la ${i + 1} se solapan`,
        ).toBeGreaterThanOrEqual(SERVIDOR.ancho)
      }
    }
  })

  it('todas caben dentro del local', () => {
    for (const total of [5, 6, 7]) {
      for (const x of equisDe(total, posicionDePlaca)) {
        expect(cabeEnElLocal(x)).toBe(true)
      }
    }
  })

  it('quedan centradas y en orden de izquierda a derecha', () => {
    const xs = equisDe(6, posicionDePlaca)
    expect(xs).toEqual([...xs].sort((a, b) => a - b))
    expect(xs[0] + xs[xs.length - 1]).toBeCloseTo(0, 10)
  })

  it('todas están en la zona de lavado, al frente', () => {
    for (let i = 0; i < 6; i += 1) {
      expect(posicionDePlaca(i, 6)[2]).toBe(LOCAL.zPlacas)
    }
  })

  it('rechaza índices imposibles', () => {
    expect(() => posicionDePlaca(6, 6)).toThrow(/fuera de/)
    expect(() => posicionDePlaca(-1, 6)).toThrow(/fuera de/)
    expect(() => posicionDePlaca(0, 0)).toThrow(/mayor o igual que 1/)
  })
})

describe('los puestos de acabado', () => {
  it('no se solapan con 3, 4 ni 5 puestos y caben', () => {
    for (const total of [3, 4, 5]) {
      const xs = equisDe(total, posicionDePuesto)
      for (let i = 1; i < xs.length; i += 1) {
        expect(xs[i] - xs[i - 1]).toBeGreaterThanOrEqual(SERVIDOR.ancho)
      }
      for (const x of xs) {
        expect(cabeEnElLocal(x)).toBe(true)
      }
    }
  })

  it('están detrás de las placas', () => {
    expect(posicionDePuesto(0, 3)[2]).toBeGreaterThan(posicionDePlaca(0, 6)[2])
  })
})

describe('las filas de espera', () => {
  it('la del lavado y la del acabado están en planos distintos', () => {
    expect(posicionEnFila(0, 'lavado')[2]).not.toBe(posicionEnFila(0, 'acabado')[2])
  })

  it('cada fila está delante de su etapa', () => {
    expect(posicionEnFila(0, 'lavado')[2]).toBeLessThan(LOCAL.zPlacas)
    expect(posicionEnFila(0, 'acabado')[2]).toBeLessThan(LOCAL.zPuestos)
    expect(posicionEnFila(0, 'acabado')[2]).toBeGreaterThan(LOCAL.zPlacas)
  })

  it('las motos de una fila se separan entre sí y van en orden', () => {
    const primera = posicionEnFila(0, 'lavado')[0]
    const segunda = posicionEnFila(1, 'lavado')[0]
    expect(primera - segunda).toBeCloseTo(SEPARACION_EN_FILA, 10)
  })

  it('todas las motos dibujables caben dentro del local', () => {
    for (const etapa of ['lavado', 'acabado']) {
      for (let i = 0; i < TOPE_DE_MOTOS_DIBUJADAS; i += 1) {
        expect(Math.abs(posicionEnFila(i, etapa)[0])).toBeLessThanOrEqual(LOCAL.ancho / 2)
      }
    }
  })

  it('rechaza una etapa que no existe', () => {
    expect(() => posicionEnFila(0, 'pintura')).toThrow(/lavado/)
  })
})

describe('cuántas motos se dibujan de una fila', () => {
  const colaDe = (cuantas) =>
    Array.from({ length: cuantas }, (_, i) => ({ n: i + 1, plan: 2 }))

  it('con la cola vacía no hay nada que dibujar', () => {
    expect(motosVisibles([])).toEqual({ visibles: [], sobrantes: 0 })
  })

  it('cuando caben, se dibujan todas', () => {
    const cola = colaDe(5)
    const { visibles, sobrantes } = motosVisibles(cola)
    expect(visibles).toEqual(cola)
    expect(sobrantes).toBe(0)
  })

  it('justo en el tope no hay sobrantes', () => {
    const { visibles, sobrantes } = motosVisibles(colaDe(TOPE_DE_MOTOS_DIBUJADAS))
    expect(visibles).toHaveLength(TOPE_DE_MOTOS_DIBUJADAS)
    expect(sobrantes).toBe(0)
  })

  it('con la fila del acabado desbordada se dibujan las primeras y se cuentan las demás', () => {
    // Lo que pasa de verdad con 3 puestos tras mil horas simuladas.
    const { visibles, sobrantes } = motosVisibles(colaDe(3090))
    expect(visibles).toHaveLength(12)
    expect(sobrantes).toBe(3078)
    expect(visibles.length + sobrantes).toBe(3090)
  })

  it('ni pierde ni duplica motos', () => {
    const cola = colaDe(100)
    const { visibles, sobrantes } = motosVisibles(cola, 7)
    expect(visibles.length + sobrantes).toBe(cola.length)
    expect(new Set(visibles.map((m) => m.n)).size).toBe(visibles.length)
    expect(visibles[0]).toBe(cola[0]) // las primeras de la fila, no unas cualesquiera
  })

  it('no modifica la cola que recibe', () => {
    const cola = colaDe(20)
    const copia = [...cola]
    motosVisibles(cola, 5)
    expect(cola).toEqual(copia)
  })

  it('sobrantesDe cuenta lo mismo sabiendo solo cuántas hay en la fila', () => {
    // El rótulo de la escena solo conoce el número; tiene que coincidir con
    // lo que se dibuja o diría una cosa distinta de la que se ve.
    for (const cuantas of [0, 5, 12, 13, 100, 3090]) {
      const cola = colaDe(cuantas)
      expect(sobrantesDe(cuantas)).toBe(motosVisibles(cola).sobrantes)
    }
  })

  it('sobrantesDe nunca es negativo', () => {
    expect(sobrantesDe(0)).toBe(0)
    expect(sobrantesDe(3)).toBe(0)
  })

  it('rechaza un tope imposible', () => {
    expect(() => motosVisibles([], -1)).toThrow(/mayor o igual que 0/)
  })
})

describe('por qué avenida entra cada moto', () => {
  it('es siempre la misma para la misma moto', () => {
    for (const n of [1, 2, 37, 1000]) {
      expect(entradaDeLaMoto(n).nombre).toBe(entradaDeLaMoto(n).nombre)
    }
  })

  it('reparte entre las dos avenidas', () => {
    const nombres = new Set(
      Array.from({ length: 20 }, (_, i) => entradaDeLaMoto(i + 1).nombre),
    )
    expect(nombres.size).toBe(2)
    expect(nombres).toContain(AVENIDAS.granColombia.nombre)
    expect(nombres).toContain(AVENIDAS.guaimaral.nombre)
  })

  it('las dos entradas están al frente del local, cada una a un lado', () => {
    const una = entradaDeLaMoto(1)
    const otra = entradaDeLaMoto(2)
    expect(una.posicion[2]).toBe(LOCAL.zEntrada)
    expect(otra.posicion[2]).toBe(LOCAL.zEntrada)
    expect(Math.sign(una.posicion[0])).not.toBe(Math.sign(otra.posicion[0]))
  })
})
