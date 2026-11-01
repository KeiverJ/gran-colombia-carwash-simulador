import { describe, expect, it } from 'vitest'

import { NIVELES_DE_CALIDAD } from './calidad.js'
import {
  cajasDeLosa,
  CHARCOS,
  geometriaDeLosCharcos,
  postesDeLasLosas,
  puntosDeLosCaminos,
  repartoDeLosCharcos,
  ZONA_MOJADA,
} from './charcos.js'
import { LOCAL, SERVIDOR } from './posiciones.js'

const CONFIGURACIONES = [
  [1, 1],
  [6, 3],
  [8, 4],
  [10, 5],
  [14, 7],
]

/** Los vértices del contorno de cada charco, tal como los dibuja la geometría (el primero de cada grupo es el centro). */
const contornosDe = (charcos) => {
  const geometria = geometriaDeLosCharcos(charcos)
  const posiciones = geometria.attributes.position
  const porCharco = CHARCOS.lados + 1
  const contornos = charcos.map((_, c) =>
    Array.from({ length: CHARCOS.lados }, (__, k) => [posiciones.getX(c * porCharco + 1 + k), posiciones.getZ(c * porCharco + 1 + k)]),
  )
  geometria.dispose()
  return contornos
}

/** ¿Está el punto dentro del polígono? (rayo hacia +x) */
const dentroDe = ([x, z], poligono) => {
  let dentro = false
  for (let i = 0, j = poligono.length - 1; i < poligono.length; j = i, i += 1) {
    const [xi, zi] = poligono[i]
    const [xj, zj] = poligono[j]
    if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) dentro = !dentro
  }
  return dentro
}

describe('el reparto de los charcos', () => {
  it('es determinista: las mismas placas y puestos dan los mismos charcos', () => {
    expect(repartoDeLosCharcos(6, 3)).toEqual(repartoDeLosCharcos(6, 3))
    expect(repartoDeLosCharcos(14, 7)).toEqual(repartoDeLosCharcos(14, 7))
  })

  it('hay algunos charcos con la configuración de siempre y nunca más del máximo', () => {
    expect(repartoDeLosCharcos(6, 3).length).toBeGreaterThanOrEqual(3)
    for (const [placas, puestos] of CONFIGURACIONES) {
      expect(repartoDeLosCharcos(placas, puestos).length).toBeLessThanOrEqual(CHARCOS.maximo)
    }
  })

  it('la zona mojada cubre las dos filas de placas, con un margen', () => {
    expect(ZONA_MOJADA.fondo).toBeCloseTo(LOCAL.zPlacasAdelante - LOCAL.zPlacasAtras + SERVIDOR.fondo + 1, 9)
    expect(ZONA_MOJADA.fondo).toBeGreaterThan(SERVIDOR.fondo * 2)
    expect(ZONA_MOJADA.z - ZONA_MOJADA.fondo / 2).toBeLessThan(LOCAL.zPlacasAtras - SERVIDOR.fondo / 2)
    expect(ZONA_MOJADA.z + ZONA_MOJADA.fondo / 2).toBeGreaterThan(LOCAL.zPlacasAdelante + SERVIDOR.fondo / 2)
  })

  describe.each(CONFIGURACIONES)('con %i placas y %i puestos', (placas, puestos) => {
    const charcos = repartoDeLosCharcos(placas, puestos)
    const contornos = contornosDe(charcos)

    it('ningún charco queda debajo de una losa ni de una rampa', () => {
      for (const cajas of cajasDeLosa(placas, puestos)) {
        for (const contorno of contornos) {
          for (const [x, z] of contorno) {
            const dentro = x > cajas.x0 && x < cajas.x1 && z > cajas.z0 && z < cajas.z1
            expect(dentro, `punto (${x.toFixed(2)}, ${z.toFixed(2)})`).toBe(false)
          }
        }
      }
    })

    it('ningún camino de las motos pasa por encima de un charco', () => {
      const puntos = puntosDeLosCaminos(placas, puestos)
      expect(puntos.length).toBeGreaterThan(100)
      for (const contorno of contornos) {
        for (const punto of puntos) expect(dentroDe(punto, contorno)).toBe(false)
      }
    })

    it('ningún charco cubre un poste y todos quedan dentro de la zona mojada', () => {
      for (const [px, pz] of postesDeLasLosas(placas, puestos)) {
        for (const contorno of contornos) expect(dentroDe([px, pz], contorno)).toBe(false)
      }
      for (const contorno of contornos) {
        for (const [x, z] of contorno) {
          expect(Math.abs(x - ZONA_MOJADA.centroX)).toBeLessThanOrEqual(ZONA_MOJADA.ancho / 2)
          expect(Math.abs(z - ZONA_MOJADA.z)).toBeLessThanOrEqual(ZONA_MOJADA.fondo / 2)
        }
      }
    })

    it('no se montan entre sí', () => {
      for (let a = 0; a < charcos.length; a += 1) {
        for (let b = a + 1; b < charcos.length; b += 1) {
          for (const punto of contornos[a]) expect(dentroDe(punto, contornos[b])).toBe(false)
        }
      }
    })
  })
})

describe('la geometría de los charcos', () => {
  it('es una sola malla acostada, a ras del piso, con las normales hacia arriba', () => {
    const charcos = repartoDeLosCharcos(6, 3)
    const geometria = geometriaDeLosCharcos(charcos)
    const posiciones = geometria.attributes.position
    const normales = geometria.attributes.normal
    expect(posiciones.count).toBe(charcos.length * (CHARCOS.lados + 1))
    for (let i = 0; i < posiciones.count; i += 1) {
      expect(posiciones.getY(i)).toBeCloseTo(CHARCOS.altura, 9)
      expect(normales.getY(i)).toBe(1)
    }
    expect(geometria.index.count).toBe(charcos.length * CHARCOS.lados * 3)
    geometria.dispose()
  })

  it('sin charcos es una geometría vacía y no falla', () => {
    const geometria = geometriaDeLosCharcos([])
    expect(geometria.attributes.position.count).toBe(0)
    geometria.dispose()
  })
})

describe('los charcos y la calidad adaptable', () => {
  it('desaparecen en el nivel 3 y no antes', () => {
    expect(NIVELES_DE_CALIDAD[2].charcos).toBe(true)
    expect(NIVELES_DE_CALIDAD[3].charcos).toBe(false)
  })
})
