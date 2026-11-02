import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import { BOTONES_DE_VISTA, distanciaDe, LIMITES_DE_CAMARA, vistaPlanta } from './camara.js'
import {
  acotarLaCamara,
  ALTURA_MAXIMA_DEL_OBJETIVO,
  ALTURA_MINIMA_DE_LA_CAMARA,
  distanciaMaximaDeLaCamara,
  RADIO_DEL_OBJETIVO,
} from './limitesDeLaCamara.js'
import { TERRENO } from './posiciones.js'

const ASPECTOS = [16 / 9, 4 / 3, 390 / 844, 844 / 390, 1]
const hacia = ({ posicion, objetivo }, desplazamiento) => ({
  posicion: posicion.map((c, i) => c + desplazamiento[i]),
  objetivo: objetivo.map((c, i) => c + desplazamiento[i]),
})

describe('los botones de vista cumplen los límites del desplazamiento', () => {
  it.each(ASPECTOS)('con la proporción %s ninguna vista necesita corrección', (aspecto) => {
    for (const { clave, calcular } of BOTONES_DE_VISTA) {
      const vista = calcular(aspecto)
      const acotada = acotarLaCamara(vista)
      expect(acotada.cambio, clave).toBe(false)
      expect(distanciaDe(vista), clave).toBeLessThanOrEqual(distanciaMaximaDeLaCamara(aspecto) + 1e-9)
    }
  })

  it('«Planta» es la vista más lejana: el límite de distancia es su distancia (y nunca pasa del tope general)', () => {
    for (const aspecto of ASPECTOS) {
      const planta = distanciaDe(vistaPlanta(aspecto))
      expect(distanciaMaximaDeLaCamara(aspecto)).toBeGreaterThanOrEqual(planta - 1e-9)
      expect(distanciaMaximaDeLaCamara(aspecto)).toBeLessThanOrEqual(LIMITES_DE_CAMARA.distanciaMaxima)
      for (const { calcular } of BOTONES_DE_VISTA) expect(distanciaDe(calcular(aspecto))).toBeLessThanOrEqual(distanciaMaximaDeLaCamara(aspecto) + 1e-9)
    }
  })
})

describe('el desplazamiento respeta los límites', () => {
  const vista = BOTONES_DE_VISTA[0].calcular(16 / 9)

  it('hacia un lado, la escena se recorre sin límite hasta el borde del terreno visible', () => {
    const cerca = acotarLaCamara(hacia(vista, [10, 0, 0]))
    expect(cerca.cambio).toBe(false)
  })

  it('el punto al que mira no se sale del terreno: se frena en el círculo', () => {
    const [cx, , cz] = TERRENO.centro
    for (const desplazamiento of [[200, 0, 0], [-200, 0, 0], [0, 0, 200], [0, 0, -200], [150, 0, 150]]) {
      const { objetivo } = acotarLaCamara(hacia(vista, desplazamiento))
      expect(Math.hypot(objetivo[0] - cx, objetivo[2] - cz)).toBeLessThanOrEqual(RADIO_DEL_OBJETIVO + 1e-9)
    }
  })

  it('al frenarse, la cámara se mueve lo mismo que el objetivo (la vista no cambia de ángulo)', () => {
    const lejos = hacia(vista, [200, 0, 0])
    const acotada = acotarLaCamara(lejos)
    const antes = lejos.posicion.map((c, i) => c - lejos.objetivo[i])
    const despues = acotada.posicion.map((c, i) => c - acotada.objetivo[i])
    despues.forEach((c, i) => expect(c).toBeCloseTo(antes[i], 9))
  })

  it('arriba y abajo cambia la altura, pero el objetivo no baja del piso ni sube más de su tope', () => {
    expect(acotarLaCamara(hacia(vista, [0, -50, 0])).objetivo[1]).toBeGreaterThanOrEqual(0)
    expect(acotarLaCamara(hacia(vista, [0, 80, 0])).objetivo[1]).toBeLessThanOrEqual(ALTURA_MAXIMA_DEL_OBJETIVO)
    const subida = acotarLaCamara(hacia(vista, [0, 2, 0]))
    expect(subida.cambio).toBe(false)
    expect(subida.objetivo[1]).toBeCloseTo(vista.objetivo[1] + 2, 9)
  })

  it('la cámara no baja del piso ni de una altura mínima, aunque se la empuje hacia abajo', () => {
    for (const abajo of [-3, -10, -100]) {
      const { posicion } = acotarLaCamara(hacia(vista, [0, abajo, 0]))
      expect(posicion[1]).toBeGreaterThanOrEqual(ALTURA_MINIMA_DE_LA_CAMARA - 1e-9)
    }
    // una cámara ya baja se sube hasta la altura mínima
    expect(acotarLaCamara({ posicion: [0, 0.1, 30], objetivo: [0, 1, 0] }).posicion[1]).toBe(ALTURA_MINIMA_DE_LA_CAMARA)
  })

  it('un movimiento dentro de los límites no se toca', () => {
    const quieta = acotarLaCamara(vista)
    expect(quieta.cambio).toBe(false)
    expect(quieta.posicion).toEqual(vista.posicion)
    expect(quieta.objetivo).toEqual(vista.objetivo)
  })

  it('es determinista y no cambia lo que recibe', () => {
    const entrada = hacia(vista, [200, -50, 40])
    const copia = JSON.stringify(entrada)
    expect(acotarLaCamara(entrada)).toEqual(acotarLaCamara(entrada))
    expect(JSON.stringify(entrada)).toBe(copia)
  })
})

describe('el control de la cámara', () => {
  const codigo = readFileSync('src/scene/ControlesDeCamara.jsx', 'utf8')

  it('deja desplazar con el clic derecho (y con dos dedos en el celular) en el plano de la pantalla, y aplica los límites', () => {
    expect(codigo).toMatch(/\benablePan\b/)
    expect(codigo).not.toMatch(/enablePan=\{false\}/)
    expect(codigo).toContain('screenSpacePanning')
    expect(codigo).toContain('acotarLaCamara')
    expect(codigo).toContain('distanciaMaximaDeLaCamara')
  })

  it('el clic izquierdo gira y el derecho desplaza (los botones del ratón y de los dedos son los de siempre)', async () => {
    const { MOUSE, TOUCH } = await import('three')
    // OrbitControls de Three: izquierdo gira, rueda acerca, derecho desplaza; un dedo gira y dos desplazan y acercan.
    expect([MOUSE.ROTATE, MOUSE.DOLLY, MOUSE.PAN]).toEqual([0, 1, 2])
    expect([TOUCH.ROTATE, TOUCH.PAN, TOUCH.DOLLY_PAN]).toEqual([0, 1, 2])
    expect(codigo).not.toMatch(/mouseButtons|touches=/)
  })

  it('los botones de vista siguen pidiendo la vista y la transición la lleva a su sitio', () => {
    expect(codigo).toContain('vistaDeLaClave(pedida, aspecto)')
    expect(codigo).toContain('transicion.current = {')
  })
})
