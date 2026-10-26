import { describe, expect, it } from 'vitest'

import { hojasDeLaAplicacion } from './hojasDeEstilo.js'

/**
 * La interfaz no lleva adornos: ni franjas de color en el borde de una tarjeta,
 * un aviso o un panel, ni degradados, ni sombras de color, ni brillos. La única
 * sombra es la de las capas flotantes (`--sombra-capa`, neutra y suave).
 *
 * Las pruebas abren las hojas de estilo como texto y fallan nombrando el
 * archivo y la línea.
 */
const GRADIENTE = /\b(?:linear|radial|conic|repeating-linear|repeating-radial)-gradient\(/
/** Un borde de 3 px o más en un solo lado: eso es una franja, no una línea fina. */
const FRANJA =
  /\bborder-(?:top|right|bottom|left)(?:-width)?\s*:\s*(?:(?:[3-9]|\d{2,})(?:\.\d+)?px|(?:0?\.(?:1[89]\d*|[2-9]\d*)|[1-9]\d*(?:\.\d+)?)rem)\b/
const BRILLO = /\b(?:text-shadow|drop-shadow)\b/
/** Una sombra permitida: ninguna o la de las capas. */
const SOMBRA_PERMITIDA = /^(?:none|var\(--sombra-capa\))$/

const lineasQueCumplen = (css, condicion) =>
  css.split('\n').flatMap((linea, i) => (condicion(linea) ? [`línea ${i + 1}: ${linea.trim()}`] : []))

describe('las hojas de estilo no llevan adornos', () => {
  const hojas = hojasDeLaAplicacion()

  it('hay hojas que revisar', () => {
    expect(hojas.length).toBeGreaterThanOrEqual(6)
  })

  describe.each(hojas.map((hoja) => [hoja.nombre, hoja.css]))('%s', (_nombre, css) => {
    it('no usa degradados', () => {
      expect(lineasQueCumplen(css, (linea) => GRADIENTE.test(linea))).toEqual([])
    })

    it('no tiene franjas de color de 3 px o más en un solo lado', () => {
      expect(lineasQueCumplen(css, (linea) => FRANJA.test(linea))).toEqual([])
    })

    it('no usa brillos ni sombras de texto', () => {
      expect(lineasQueCumplen(css, (linea) => BRILLO.test(linea))).toEqual([])
    })

    it('solo usa la sombra de las capas (o ninguna)', () => {
      const sombras = [...css.matchAll(/(?<![-\w])box-shadow\s*:\s*([^;]+);/g)].map((m) => m[1].trim())
      const sueltas = sombras.filter((sombra) => !SOMBRA_PERMITIDA.test(sombra))
      expect(sueltas, 'usa var(--sombra-capa) o quita la sombra').toEqual([])
    })
  })

  it('los detectores sí encuentran lo que buscan', () => {
    expect(GRADIENTE.test('background: linear-gradient(red, blue);')).toBe(true)
    expect(FRANJA.test('border-left: 4px solid var(--etapa-1);')).toBe(true)
    expect(FRANJA.test('border-top: 0.25rem solid var(--etapa-1);')).toBe(true)
    expect(FRANJA.test('border-left: 1px solid var(--borde);')).toBe(false)
    expect(FRANJA.test('border-bottom: 2px solid transparent;')).toBe(false)
    expect(BRILLO.test('filter: drop-shadow(0 0 4px red);')).toBe(true)
    expect(SOMBRA_PERMITIDA.test('0 0 8px var(--etapa-1)')).toBe(false)
    expect(SOMBRA_PERMITIDA.test('var(--sombra-capa)')).toBe(true)
  })
})
