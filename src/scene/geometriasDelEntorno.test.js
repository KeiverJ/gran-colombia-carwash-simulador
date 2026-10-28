import { Color } from 'three'
import { describe, expect, it } from 'vitest'

import { COLOR_DE_ESCENA } from '../estilos/colores.js'
import {
  bordillos,
  juntasDelPiso,
  lineaDiscontinua,
  marcoDeLosa,
  opacidadDelBorde,
  pasoDeCebra,
  posteConManguera,
  rejillaDeDesague,
  tableroDeHerramientas,
  tramosConHuecos,
  veloDelBorde,
} from './geometriasDelEntorno.js'

const cajaDe = (geometria) => {
  geometria.computeBoundingBox()
  return geometria.boundingBox
}

describe('tramosConHuecos', () => {
  it('sin huecos devuelve la línea entera', () => {
    expect(tramosConHuecos(-10, 10)).toEqual([[-10, 10]])
  })

  it('parte la línea en los huecos', () => {
    expect(tramosConHuecos(-10, 10, [{ centro: 0, ancho: 4 }])).toEqual([
      [-10, -2],
      [2, 10],
    ])
  })

  it('maneja varios huecos, en cualquier orden', () => {
    expect(
      tramosConHuecos(0, 20, [
        { centro: 15, ancho: 2 },
        { centro: 5, ancho: 2 },
      ]),
    ).toEqual([
      [0, 4],
      [6, 14],
      [16, 20],
    ])
  })

  it('un hueco en el extremo no deja un tramo vacío', () => {
    expect(tramosConHuecos(0, 10, [{ centro: 0, ancho: 2 }])).toEqual([[1, 10]])
    expect(tramosConHuecos(0, 10, [{ centro: 10, ancho: 2 }])).toEqual([[0, 9]])
  })

  it('un hueco fuera de la línea no la toca, y uno que la cubre entera la deja sin tramos', () => {
    expect(tramosConHuecos(0, 10, [{ centro: 50, ancho: 2 }])).toEqual([[0, 10]])
    expect(tramosConHuecos(0, 10, [{ centro: 5, ancho: 30 }])).toEqual([])
  })

  it('dos huecos que se montan no dejan un tramo negativo', () => {
    expect(
      tramosConHuecos(0, 20, [
        { centro: 8, ancho: 6 },
        { centro: 10, ancho: 6 },
      ]),
    ).toEqual([
      [0, 5],
      [13, 20],
    ])
  })
})

describe('bordillos', () => {
  it('pone una caja baja por tramo, a lo largo de su eje y apoyada en el piso', () => {
    const g = bordillos([
      { eje: 'x', fijo: -17, desde: -16, hasta: 14 },
      { eje: 'z', fijo: -16, desde: -17, hasta: 12 },
    ])
    expect(g.index.count / 3).toBe(2 * 12) // dos cajas de 12 triángulos
    const caja = cajaDe(g)
    expect(caja.min.y).toBeCloseTo(0, 6)
    expect(caja.max.y).toBeCloseTo(0.15, 6)
    expect(caja.min.x).toBeCloseTo(-16.1, 6)
    expect(caja.max.x).toBeCloseTo(14, 6)
    expect(caja.min.z).toBeCloseTo(-17.1, 6)
    expect(caja.max.z).toBeCloseTo(12, 6)
  })
})

describe('lineaDiscontinua', () => {
  it('reparte rayas de largo `raya` separadas `hueco` y no se sale del tramo', () => {
    const g = lineaDiscontinua({ eje: 'x', desde: 0, hasta: 20, fijo: 3, raya: 2, hueco: 2 })
    // rayas en 0-2, 4-6, 8-10, 12-14, 16-18 → 5 rayas de 2 triángulos
    expect(g.index.count / 3).toBe(5 * 2)
    const caja = cajaDe(g)
    expect(caja.min.x).toBeCloseTo(0, 6)
    expect(caja.max.x).toBeLessThanOrEqual(20)
    expect(caja.min.z).toBeCloseTo(3 - 0.07, 6)
    expect(caja.max.z).toBeCloseTo(3 + 0.07, 6)
  })

  it('a lo largo de Z corre en Z y queda a la altura pedida', () => {
    const g = lineaDiscontinua({ eje: 'z', desde: -10, hasta: 10, fijo: -13.5, y: 0.02 })
    const caja = cajaDe(g)
    expect(caja.min.z).toBeGreaterThanOrEqual(-10)
    expect(caja.max.z).toBeLessThanOrEqual(10)
    expect(caja.min.y).toBeCloseTo(0.02, 6)
    expect(caja.max.y).toBeCloseTo(0.02, 6)
  })
})

describe('pasoDeCebra', () => {
  it('pone la mitad de las franjas (las otras son el hueco) dentro del ancho dado', () => {
    const g = pasoDeCebra({ x0: -16, ancho: 5, z: -10, rayas: 8, largo: 1.6 })
    expect(g.index.count / 3).toBe(4 * 2)
    const caja = cajaDe(g)
    expect(caja.min.x).toBeGreaterThanOrEqual(-16)
    expect(caja.max.x).toBeLessThanOrEqual(-11)
    expect(caja.min.z).toBeCloseTo(-10.8, 6)
    expect(caja.max.z).toBeCloseTo(-9.2, 6)
  })
})

describe('juntasDelPiso', () => {
  it('quedan dentro del piso', () => {
    const caja = cajaDe(juntasDelPiso({ ancho: 22, fondo: 24 }))
    expect(caja.min.x).toBeGreaterThanOrEqual(-11)
    expect(caja.max.x).toBeLessThanOrEqual(11)
    expect(caja.min.z).toBeGreaterThanOrEqual(-12)
    expect(caja.max.z).toBeLessThanOrEqual(12)
  })
})

describe('piezas de las placas y los puestos', () => {
  it('el marco de una losa no se sale de ella', () => {
    const caja = cajaDe(marcoDeLosa({ ancho: 2.2, fondo: 3 }))
    expect(caja.max.x).toBeCloseTo(1.1, 6)
    expect(caja.min.z).toBeCloseTo(-1.5, 6)
    expect(caja.min.y).toBeCloseTo(0, 6)
  })

  it('la rejilla, el poste con manguera y el tablero llevan color de vértice', () => {
    for (const g of [rejillaDeDesague({}), posteConManguera({}), tableroDeHerramientas({})]) {
      expect(g.attributes.color).toBeDefined()
      expect(g.attributes.color.count).toBe(g.attributes.position.count)
      expect(g.attributes.normal).toBeDefined()
    }
  })

  it('el poste con manguera nace en el piso, mide su alto y la manguera llega a `alcance`', () => {
    const caja = cajaDe(posteConManguera({ alto: 1.55, alcance: 0.95 }))
    expect(caja.min.y).toBeCloseTo(0, 5)
    expect(caja.max.y).toBeCloseTo(1.55, 1) // la manguera sube un poco sobre el tubo
    expect(caja.max.x).toBeGreaterThanOrEqual(0.95)
    expect(caja.max.x).toBeLessThan(1.1)
  })

  it('la rejilla es una chapa baja', () => {
    const caja = cajaDe(rejillaDeDesague({ ancho: 1.4, fondo: 0.45 }))
    expect(caja.max.y).toBeLessThan(0.06)
    expect(caja.max.x).toBeCloseTo(0.7, 5)
  })
})

describe('el velo del borde del terreno', () => {
  it('no tapa nada hasta donde empieza, lo tapa todo desde donde acaba y crece sin saltos', () => {
    expect(opacidadDelBorde(10, 45, 90)).toBe(0)
    expect(opacidadDelBorde(45, 45, 90)).toBe(0)
    expect(opacidadDelBorde(90, 45, 90)).toBe(1)
    expect(opacidadDelBorde(500, 45, 90)).toBe(1)
    let anterior = 0
    for (let r = 45; r <= 90; r += 0.5) {
      const ahora = opacidadDelBorde(r, 45, 90)
      expect(ahora).toBeGreaterThanOrEqual(anterior)
      expect(ahora - anterior).toBeLessThan(0.06)
      anterior = ahora
    }
  })

  it('es un anillo acostado cuya opacidad por vértice sube de 0 a 1 y es del color del fondo', () => {
    const velo = veloDelBorde({ desde: 45, hasta: 90, radioExterior: 130 })
    const posiciones = velo.attributes.position
    const colores = velo.attributes.color
    expect(colores.itemSize).toBe(4)
    const fondo = new Color(COLOR_DE_ESCENA.fondo)
    let minimo = 1
    let maximo = 0
    for (let i = 0; i < posiciones.count; i += 1) {
      expect(posiciones.getY(i)).toBeCloseTo(0, 6)
      const radio = Math.hypot(posiciones.getX(i), posiciones.getZ(i))
      expect(radio).toBeGreaterThanOrEqual(45 - 1e-3)
      expect(radio).toBeLessThanOrEqual(130 + 1e-3)
      expect(colores.getX(i)).toBeCloseTo(fondo.r, 5)
      expect(colores.getY(i)).toBeCloseTo(fondo.g, 5)
      expect(colores.getZ(i)).toBeCloseTo(fondo.b, 5)
      minimo = Math.min(minimo, colores.getW(i))
      maximo = Math.max(maximo, colores.getW(i))
    }
    expect(minimo).toBe(0)
    expect(maximo).toBe(1)
    velo.dispose()
  })
})
