import { beforeEach, describe, expect, it } from 'vitest'

import { LIMITES_DE_CUADROS_POR_SEGUNDO } from './CalidadAdaptable.jsx'
import {
  INTERRUPTORES_DE_CALIDAD,
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
  it('hay ocho niveles y el nivel 0 lo tiene todo encendido', () => {
    expect(NIVELES_DE_CALIDAD).toHaveLength(8)
    expect(NIVEL_MAS_BAJO).toBe(7)
    expect(NIVELES_DE_CALIDAD[0]).toEqual({
      trafico: true,
      particulas: true,
      charcos: true,
      personas: true,
      sombras: true,
      ambiente: true,
      resolucion: 1,
    })
  })

  it('todos los niveles tienen los mismos campos', () => {
    for (const nivel of NIVELES_DE_CALIDAD) {
      expect(Object.keys(nivel).sort()).toEqual([...INTERRUPTORES_DE_CALIDAD, 'resolucion'].sort())
    }
  })

  it('cada nivel apaga más que el anterior y nunca vuelve a encender nada', () => {
    for (let i = 1; i < NIVELES_DE_CALIDAD.length; i += 1) {
      const antes = NIVELES_DE_CALIDAD[i - 1]
      const ahora = NIVELES_DE_CALIDAD[i]
      for (const efecto of INTERRUPTORES_DE_CALIDAD) {
        expect(ahora[efecto] && !antes[efecto], `${efecto} en el nivel ${i}`).toBe(false)
      }
      expect(ahora.resolucion).toBeLessThanOrEqual(antes.resolucion)
      const algoMenos =
        INTERRUPTORES_DE_CALIDAD.some((efecto) => antes[efecto] && !ahora[efecto]) ||
        ahora.resolucion < antes.resolucion
      expect(algoMenos, `el nivel ${i} no cambia nada`).toBe(true)
    }
  })

  it('cada nivel apaga solo un grupo más que el anterior (el último solo baja la resolución)', () => {
    for (let i = 1; i < NIVELES_DE_CALIDAD.length; i += 1) {
      const antes = NIVELES_DE_CALIDAD[i - 1]
      const ahora = NIVELES_DE_CALIDAD[i]
      const apagados = INTERRUPTORES_DE_CALIDAD.filter((efecto) => antes[efecto] && !ahora[efecto])
      expect(apagados.length, `nivel ${i}`).toBe(i === NIVEL_MAS_BAJO ? 0 : 1)
    }
  })

  it('el orden es: tráfico, partículas y espuma, charcos, personas, sombras, entorno y, al final, la resolución', () => {
    const nivelEnQueSeApaga = (efecto) => NIVELES_DE_CALIDAD.findIndex((nivel) => !nivel[efecto])
    expect(INTERRUPTORES_DE_CALIDAD.map(nivelEnQueSeApaga)).toEqual([1, 2, 3, 4, 5, 6])
    expect(NIVELES_DE_CALIDAD[6].resolucion).toBe(0.75)
    expect(NIVELES_DE_CALIDAD[7].resolucion).toBe(0.5)
    for (let i = 0; i <= 5; i += 1) expect(NIVELES_DE_CALIDAD[i].resolucion).toBe(1)
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

  it('si mejora, lo devuelve paso a paso, en el orden contrario, hasta el nivel 0', () => {
    for (let i = 0; i < NIVEL_MAS_BAJO; i += 1) calidad().empeorar()
    for (let i = NIVEL_MAS_BAJO - 1; i >= 0; i -= 1) {
      calidad().mejorar()
      expect(calidad().nivel).toBe(i)
    }
    calidad().mejorar()
    expect(calidad().nivel).toBe(0)
  })

  it('al subir, lo último que se apagó es lo primero que vuelve', () => {
    for (let i = 0; i < 5; i += 1) calidad().empeorar() // nivel 5: sin sombras
    expect(NIVELES_DE_CALIDAD[calidad().nivel].sombras).toBe(false)
    calidad().mejorar()
    expect(NIVELES_DE_CALIDAD[calidad().nivel].sombras).toBe(true)
    expect(NIVELES_DE_CALIDAD[calidad().nivel].personas).toBe(false)
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

describe('la escena sigue el nivel de calidad', () => {
  it('el lienzo anota el nivel en el que va', async () => {
    const { anotarElNivel } = await import('./CalidadAdaptable.jsx')
    const lienzo = { dataset: {} }
    for (let nivel = 0; nivel <= NIVEL_MAS_BAJO; nivel += 1) {
      anotarElNivel(lienzo, nivel)
      expect(lienzo.dataset.calidad).toBe(String(nivel))
    }
  })

  it('en una pantalla normal, los dos últimos niveles dan 0,75 y 0,5 de resolución', () => {
    expect(resolucionDelNivel(NIVEL_MAS_BAJO - 1, 1)).toBe(0.75)
    expect(resolucionDelNivel(NIVEL_MAS_BAJO, 1)).toBe(0.5)
    for (let nivel = 0; nivel <= NIVEL_MAS_BAJO - 2; nivel += 1) {
      expect(resolucionDelNivel(nivel, 1)).toBe(1)
    }
  })

  it('un nivel fuera de rango se acota a los extremos', () => {
    expect(resolucionDelNivel(-3, 1)).toBe(1)
    expect(resolucionDelNivel(99, 1)).toBe(0.5)
  })
})
