import { describe, expect, it } from 'vitest'

import {
  DISTANCIA_DEL_SOL,
  direccionDeLaSombra,
  direccionDelSol,
  esquinasDeLaZona,
  largoDeLaSombra,
  recorteDeLaSombra,
  SOL,
  ZONA_DE_SOMBRA,
} from './luz.js'

describe('el sol de la tarde', () => {
  it('está a una elevación baja pero no rasante: entre 25° y 40°', () => {
    expect(SOL.elevacion).toBeGreaterThanOrEqual(25)
    expect(SOL.elevacion).toBeLessThanOrEqual(40)
    const [x, y, z] = direccionDelSol()
    expect((Math.asin(y) * 180) / Math.PI).toBeCloseTo(SOL.elevacion, 6)
    expect(Math.hypot(x, y, z)).toBeCloseTo(1, 10)
  })

  it('entra desde la derecha y un poco desde el frente (+X y +Z)', () => {
    const [x, y, z] = direccionDelSol()
    expect(x).toBeGreaterThan(0)
    expect(z).toBeGreaterThan(0)
    expect(y).toBeGreaterThan(0)
    // más de lado que de frente
    expect(x).toBeGreaterThan(z)
  })

  it('las sombras caen hacia la izquierda y hacia el fondo', () => {
    const [x, z] = direccionDeLaSombra()
    expect(x).toBeLessThan(0)
    expect(z).toBeLessThan(0)
    expect(Math.hypot(x, z)).toBeCloseTo(1, 10)
  })

  it('la sombra de una columna de 4,2 m mide unos 6,7 m, y la de algo más alto, más', () => {
    expect(largoDeLaSombra(4.2)).toBeCloseTo(4.2 / Math.tan((SOL.elevacion * Math.PI) / 180), 10)
    expect(largoDeLaSombra(4.2)).toBeGreaterThan(5)
    expect(largoDeLaSombra(4.2)).toBeLessThan(9)
    expect(largoDeLaSombra(8)).toBeGreaterThan(largoDeLaSombra(4.2))
  })
})

describe('el recorte de la sombra', () => {
  it('cubre las ocho esquinas de la zona, con holgura', () => {
    const puntos = esquinasDeLaZona()
    expect(puntos).toHaveLength(8)
    const recorte = recorteDeLaSombra(puntos)
    expect(recorte.derecha).toBeGreaterThan(recorte.izquierda)
    expect(recorte.arriba).toBeGreaterThan(recorte.abajo)
    expect(recorte.lejos).toBeGreaterThan(recorte.cerca)
    expect(recorte.cerca).toBeGreaterThan(0)
  })

  it('con otra zona el recorte la sigue: una zona más grande da un recorte más grande', () => {
    const chica = recorteDeLaSombra(esquinasDeLaZona({ x: [-5, 5], z: [-5, 5], alto: 4 }))
    const grande = recorteDeLaSombra(esquinasDeLaZona({ x: [-30, 14], z: [-22, 28], alto: 8 }))
    expect(grande.derecha - grande.izquierda).toBeGreaterThan(chica.derecha - chica.izquierda)
    expect(grande.arriba - grande.abajo).toBeGreaterThan(chica.arriba - chica.abajo)
  })

  it('la zona incluye el local, la cafetería y las avenidas cercanas', () => {
    // local: x -11 a 11, z -12 a 12; cafetería: x -11 a -4,5 y z +17 a +24; avenidas: hasta el borde del recuadro
    expect(ZONA_DE_SOMBRA.x[0]).toBeLessThanOrEqual(-15)
    expect(ZONA_DE_SOMBRA.x[1]).toBeGreaterThanOrEqual(11)
    expect(ZONA_DE_SOMBRA.z[0]).toBeLessThanOrEqual(-16)
    expect(ZONA_DE_SOMBRA.z[1]).toBeGreaterThanOrEqual(24)
    expect(ZONA_DE_SOMBRA.alto).toBeGreaterThanOrEqual(6)
    expect(DISTANCIA_DEL_SOL).toBeGreaterThan(40)
  })
})
