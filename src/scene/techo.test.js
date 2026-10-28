import { describe, expect, it } from 'vitest'

import { vistaAcabado, vistaGeneral, vistaLavado, vistaPlanta } from './camara.js'
import { COLUMNAS_DEL_TECHO, TECHO } from './posiciones.js'
import { elevacionSobreElSuelo, ELEVACION_DEL_TECHO, medidasDelTecho, opacidadDelTecho } from './techo.js'

describe('el techo según la cámara', () => {
  it('con la vista general, de frente y baja, se ve entero (en un celular vertical, que sube, se aparta)', () => {
    expect(opacidadDelTecho(vistaGeneral(16 / 9).posicion)).toBe(1)
    // en un celular vertical la cámara sube y el techo se aparta del todo: se ve lo de adentro
    expect(opacidadDelTecho(vistaGeneral(390 / 844).posicion)).toBe(0)
  })

  it('en el lavado y el acabado, que miran de cerca desde arriba, se aparta del todo', () => {
    for (const aspecto of [16 / 9, 1366 / 768, 390 / 844]) {
      expect(opacidadDelTecho(vistaLavado(aspecto).posicion), `lavado ${aspecto}`).toBe(0)
      expect(opacidadDelTecho(vistaAcabado(aspecto).posicion), `acabado ${aspecto}`).toBe(0)
    }
  })

  it('en la vista de plano desaparece del todo', () => {
    expect(opacidadDelTecho(vistaPlanta(16 / 9).posicion)).toBe(0)
    expect(opacidadDelTecho(vistaPlanta(390 / 844).posicion)).toBe(0)
  })

  it('baja de forma continua y sin saltos al subir la cámara', () => {
    let anterior = 1
    for (let alto = 2; alto <= 40; alto += 1) {
      const actual = opacidadDelTecho([2, alto, 19])
      expect(actual).toBeLessThanOrEqual(anterior + 1e-9)
      expect(anterior - actual).toBeLessThan(0.4)
      anterior = actual
    }
  })

  it('es opaco hasta la elevación en que el rayo cruzaría la losa y transparente a partir de la otra', () => {
    const { opaco, invisible } = ELEVACION_DEL_TECHO
    const aElevacion = (grados) => {
      const distancia = 20
      return [2, 0.5 + distancia * Math.tan((grados * Math.PI) / 180), -2 + distancia]
    }
    expect(opacidadDelTecho(aElevacion(opaco - 1))).toBe(1)
    expect(opacidadDelTecho(aElevacion(invisible + 1))).toBe(0)
    const mitad = opacidadDelTecho(aElevacion((opaco + invisible) / 2))
    expect(mitad).toBeGreaterThan(0.3)
    expect(mitad).toBeLessThan(0.7)
  })

  it('no cambia por el lado desde el que se mira, solo por la elevación', () => {
    const a = opacidadDelTecho([2, 9, 19])
    const b = opacidadDelTecho([2 + 21, 9, -2])
    expect(a).toBeCloseTo(b, 6)
  })

  it('mide la elevación sobre el centro del suelo cubierto', () => {
    expect(elevacionSobreElSuelo([2, 0.5, 30])).toBeCloseTo(0, 6)
    expect(elevacionSobreElSuelo([2, 20.5, -2])).toBeCloseTo(90, 6)
  })
})

describe('medidasDelTecho', () => {
  it('cubre las cuatro columnas y sobresale el vuelo por cada lado', () => {
    const { ancho, fondo, centro } = medidasDelTecho()
    const xs = COLUMNAS_DEL_TECHO.map(([x]) => x)
    const zs = COLUMNAS_DEL_TECHO.map(([, , z]) => z)
    expect(ancho).toBeCloseTo(Math.max(...xs) - Math.min(...xs) + 2 * TECHO.vuelo, 6)
    expect(fondo).toBeCloseTo(Math.max(...zs) - Math.min(...zs) + 2 * TECHO.vuelo, 6)
    expect(centro[0] - ancho / 2).toBeLessThan(Math.min(...xs))
    expect(centro[0] + ancho / 2).toBeGreaterThan(Math.max(...xs))
  })

  it('apoya su cara de abajo en el alto de las columnas', () => {
    const { centro } = medidasDelTecho()
    expect(centro[1] - TECHO.grosor / 2).toBeCloseTo(TECHO.alto, 6)
  })
})
