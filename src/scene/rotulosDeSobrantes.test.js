import { describe, expect, it } from 'vitest'

import { BOTONES_DE_VISTA, proyectarPunto } from './camara.js'
import {
  ALTO_DEL_ROTULO_DE_SOBRANTES_EN_PANTALLA,
  ANCLA_DEL_ROTULO_DE_SOBRANTES,
  posicionDePlaca,
  posicionDePuesto,
  posicionDelRotuloDeSobrantes,
  posicionEnFila,
  TOPE_DE_MOTOS_DIBUJADAS,
} from './posiciones.js'
import { altoDelCuadroDe, anclaDentroDelLienzo, escalaParaPixeles } from './tamanoEnPantalla.js'

describe('el tamaño de un rótulo en pantalla', () => {
  it('la escala sale de los píxeles pedidos: una fracción fija de la altura del cuadro', () => {
    const fov = 48
    const escala = escalaParaPixeles(26, 768, fov)
    // lo que mide en pantalla = escala / tan(fov/2) × (alto/2)
    expect((escala / Math.tan((fov * Math.PI) / 360)) * (768 / 2)).toBeCloseTo(26, 9)
  })

  it('con un cuadro más alto hace falta menos escala para los mismos píxeles', () => {
    expect(escalaParaPixeles(26, 1080, 48)).toBeLessThan(escalaParaPixeles(26, 768, 48))
  })

  it('no depende de dónde esté la cámara: solo del cuadro y del ángulo de visión', () => {
    expect(escalaParaPixeles(26, 768, 48)).toBe(escalaParaPixeles(26, 768, 48))
  })

  it('usa el cuadro virtual de las capas si la cámara lo tiene puesto, y si no el del lienzo', () => {
    expect(altoDelCuadroDe({ view: { enabled: true, fullHeight: 500 } }, 768)).toBe(500)
    expect(altoDelCuadroDe({ view: { enabled: false, fullHeight: 500 } }, 768)).toBe(768)
    expect(altoDelCuadroDe({ view: null }, 768)).toBe(768)
  })
})

describe('que el rótulo no se salga del lienzo', () => {
  it('si cabe, deja el ancla que se quería', () => {
    expect(anclaDentroDelLienzo(200, 100, 0, 390)).toBe(0)
    expect(anclaDentroDelLienzo(200, 100, 1, 390)).toBe(1)
    expect(anclaDentroDelLienzo(200, 100, 0.5, 390)).toBe(0.5)
  })

  it('si se saldría por la derecha, se corre a la izquierda hasta quedar pegado al borde', () => {
    const ancla = anclaDentroDelLienzo(360, 100, 0, 390)
    const izquierda = 360 - ancla * 100
    expect(izquierda + 100).toBeCloseTo(390 - 4, 9)
  })

  it('si se saldría por la izquierda, se corre a la derecha hasta quedar pegado al borde', () => {
    const ancla = anclaDentroDelLienzo(30, 100, 1, 390)
    expect(30 - ancla * 100).toBeCloseTo(4, 9)
  })

  it('un rótulo más ancho que el lienzo se queda pegado a la izquierda, sin dar NaN', () => {
    const ancla = anclaDentroDelLienzo(100, 500, 0.5, 390)
    expect(Number.isFinite(ancla)).toBe(true)
    expect(100 - ancla * 500).toBeCloseTo(4, 9)
  })

  it('con un ancho cero o raro no rompe', () => {
    expect(anclaDentroDelLienzo(100, 0, 0.3, 390)).toBe(0.3)
    expect(anclaDentroDelLienzo(100, Number.NaN, 0.3, 390)).toBe(0.3)
  })
})

describe('el rótulo se extiende hacia afuera de su fila', () => {
  it('el del lavado queda a la derecha del final de su fila y el del acabado a la izquierda', () => {
    expect(ANCLA_DEL_ROTULO_DE_SOBRANTES.lavado[0]).toBe(0)
    expect(ANCLA_DEL_ROTULO_DE_SOBRANTES.acabado[0]).toBe(1)
  })
})

/** El ancho más grande que puede tener el rótulo: «+99.999 motos más», en píxeles. */
const ANCHO_MAXIMO_DEL_ROTULO = 200

const TAMANOS = [
  [1366, 768],
  [1920, 1080],
  [390, 844],
]

describe.each(TAMANOS)('con un lienzo de %s × %s', (ancho, alto) => {
  const aspecto = ancho / alto
  const aPixeles = ([x, y]) => [((x + 1) / 2) * ancho, ((1 - y) / 2) * alto]

  it.each(BOTONES_DE_VISTA.map(({ nombre, calcular }) => [nombre, calcular]))(
    'en «%s» no tapa ninguna placa, puesto ni moto dibujada de las filas',
    (_nombre, calcular) => {
      const vista = calcular(aspecto)
      for (const [placas, puestos] of [[5, 3], [6, 3], [7, 5]]) {
        const obstaculos = [
          ...Array.from({ length: placas }, (_, i) => posicionDePlaca(i, placas)),
          ...Array.from({ length: puestos }, (_, i) => posicionDePuesto(i, puestos)),
          ...Array.from({ length: TOPE_DE_MOTOS_DIBUJADAS.lavado }, (_, i) => posicionEnFila(i, 'lavado')),
          ...Array.from({ length: TOPE_DE_MOTOS_DIBUJADAS.acabado }, (_, i) => posicionEnFila(i, 'acabado')),
        ]
        for (const etapa of ['lavado', 'acabado']) {
          const proyectado = proyectarPunto(posicionDelRotuloDeSobrantes(etapa), vista, aspecto)
          if (!proyectado) continue
          const [x, y] = aPixeles(proyectado)
          const [ancla] = ANCLA_DEL_ROTULO_DE_SOBRANTES[etapa]
          const izquierda = x - ancla * ANCHO_MAXIMO_DEL_ROTULO
          const derecha = izquierda + ANCHO_MAXIMO_DEL_ROTULO
          const mitad = ALTO_DEL_ROTULO_DE_SOBRANTES_EN_PANTALLA / 2
          for (const lugar of obstaculos) {
            // el centro de la moto o de la losa, al nivel del piso
            const p = proyectarPunto([lugar[0], 0.5, lugar[2]], vista, aspecto)
            if (!p) continue
            const [px, py] = aPixeles(p)
            const tapado = px > izquierda && px < derecha && Math.abs(py - y) < mitad
            expect(tapado, `${etapa}: ${lugar} con ${placas} placas y ${puestos} puestos`).toBe(false)
          }
        }
      }
    },
  )
})
