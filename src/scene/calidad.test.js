import { beforeEach, describe, expect, it } from 'vitest'

import { LIMITES_DE_CUADROS_POR_SEGUNDO } from './CalidadAdaptable.jsx'
import {
  NIVEL_MAS_BAJO,
  NIVELES_DE_CALIDAD,
  RESOLUCION_MAXIMA,
  RESOLUCION_MINIMA,
  resolucionDelNivel,
  useCalidad,
  VAIVENES_PERMITIDOS,
} from './calidad.js'

const calidad = () => useCalidad.getState()

beforeEach(() => calidad().restablecer())

describe('los niveles de calidad', () => {
  it('el nivel 0 lo tiene todo encendido', () => {
    expect(NIVELES_DE_CALIDAD[0]).toEqual({ particulas: true, sombras: true, ambiente: true, resolucion: 1 })
  })

  it('cada nivel apaga más que el anterior y nunca vuelve a encender nada', () => {
    for (let i = 1; i < NIVELES_DE_CALIDAD.length; i += 1) {
      const antes = NIVELES_DE_CALIDAD[i - 1]
      const ahora = NIVELES_DE_CALIDAD[i]
      for (const efecto of ['particulas', 'sombras', 'ambiente']) {
        expect(ahora[efecto] && !antes[efecto], `${efecto} en el nivel ${i}`).toBe(false)
      }
      expect(ahora.resolucion).toBeLessThanOrEqual(antes.resolucion)
      const algoMenos =
        ['particulas', 'sombras', 'ambiente'].some((efecto) => antes[efecto] && !ahora[efecto]) ||
        ahora.resolucion < antes.resolucion
      expect(algoMenos, `el nivel ${i} no cambia nada`).toBe(true)
    }
  })

  it('se apagan primero las gotas, luego las sombras, luego el entorno, y la resolución al final', () => {
    expect(NIVELES_DE_CALIDAD[1].particulas).toBe(false)
    expect(NIVELES_DE_CALIDAD[1].sombras).toBe(true)
    expect(NIVELES_DE_CALIDAD[2].sombras).toBe(false)
    expect(NIVELES_DE_CALIDAD[2].ambiente).toBe(true)
    expect(NIVELES_DE_CALIDAD[3].ambiente).toBe(false)
    expect(NIVELES_DE_CALIDAD[4].resolucion).toBeLessThan(NIVELES_DE_CALIDAD[3].resolucion)
  })

  it('la resolución no pasa de 2× ni baja de media en ninguna pantalla', () => {
    for (let nivel = 0; nivel <= NIVEL_MAS_BAJO; nivel += 1) {
      for (const densidad of [0.5, 1, 1.5, 2, 3, 4]) {
        const r = resolucionDelNivel(nivel, densidad)
        expect(r).toBeLessThanOrEqual(RESOLUCION_MAXIMA)
        expect(r).toBeGreaterThanOrEqual(RESOLUCION_MINIMA)
      }
    }
  })

  it('en una pantalla normal el nivel 0 es la resolución entera y el último, la mitad', () => {
    expect(resolucionDelNivel(0, 1)).toBe(1)
    expect(resolucionDelNivel(NIVEL_MAS_BAJO, 1)).toBe(0.5)
    expect(resolucionDelNivel(0, 2)).toBe(2)
  })
})

describe('bajar y subir', () => {
  it('empieza con todo encendido', () => {
    expect(calidad().nivel).toBe(0)
  })

  it('cada bajada de cuadros por segundo apaga un paso, hasta el último', () => {
    for (let i = 1; i <= NIVEL_MAS_BAJO; i += 1) {
      calidad().empeorar()
      expect(calidad().nivel).toBe(i)
    }
    calidad().empeorar()
    expect(calidad().nivel).toBe(NIVEL_MAS_BAJO)
  })

  it('si mejora, lo devuelve paso a paso, hasta el nivel 0', () => {
    for (let i = 0; i < 3; i += 1) calidad().empeorar()
    for (let i = 2; i >= 0; i -= 1) {
      calidad().mejorar()
      expect(calidad().nivel).toBe(i)
    }
    calidad().mejorar()
    expect(calidad().nivel).toBe(0)
  })

  it('si subir hace que vuelva a bajar una y otra vez, deja de subir más allá del nivel donde aguanta', () => {
    calidad().empeorar() // 1
    calidad().empeorar() // 2
    for (let vuelta = 0; vuelta < VAIVENES_PERMITIDOS; vuelta += 1) {
      calidad().mejorar()
      calidad().empeorar()
    }
    const { techo } = calidad()
    expect(techo).toBeGreaterThanOrEqual(2)
    for (let i = 0; i < 6; i += 1) calidad().mejorar()
    expect(calidad().nivel).toBe(techo)
  })

  it('mientras no haya vaivenes, el techo es el nivel 0: se puede volver a todo encendido', () => {
    calidad().empeorar()
    calidad().mejorar()
    expect(calidad().techo).toBe(0)
    expect(calidad().nivel).toBe(0)
  })

  it('restablecer lo deja todo encendido y sin techo', () => {
    for (let i = 0; i < 4; i += 1) calidad().empeorar()
    calidad().restablecer()
    expect(calidad().nivel).toBe(0)
    expect(calidad().techo).toBe(0)
  })
})

describe('los límites de cuadros por segundo', () => {
  it('con una pantalla de 60 Hz se baja por debajo de 45 y se sube pasando de 55', () => {
    expect(LIMITES_DE_CUADROS_POR_SEGUNDO(60)).toEqual([45, 55])
  })

  it('con una pantalla (o una medida) de más de 100 imágenes por segundo se exige más', () => {
    const [bajo, alto] = LIMITES_DE_CUADROS_POR_SEGUNDO(144)
    expect(bajo).toBeGreaterThanOrEqual(60)
    expect(alto).toBeGreaterThan(bajo)
  })
})
