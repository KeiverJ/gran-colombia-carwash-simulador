import { describe, expect, it } from 'vitest'

import { INICIO_OBSERVACION_MIN, MOTOS_VISITA } from '../data/visita.js'
import { crearReproductor } from '../visita/reproductor.js'
import { motosQueYaSalieron, tiemposDeLaVisita } from './tiemposDeLaVisita.js'

/** Los tiempos a la hora del reloj, con los datos y el reproductor de verdad. */
function visitaA(relojMin) {
  const reproductor = crearReproductor()
  reproductor.avanzar(relojMin)
  return {
    tiempos: tiemposDeLaVisita({
      motos: MOTOS_VISITA,
      detalle: reproductor.detalleDeLaEtapa2(),
      inicioMin: INICIO_OBSERVACION_MIN,
      relojMin,
    }),
    reproductor,
  }
}

describe('el tiempo de cada moto en el lavadero', () => {
  it('al terminar la visita hay 23 motos y suman 716 minutos', () => {
    const { tiempos } = visitaA(140)
    expect(tiempos.motos).toHaveLength(23)
    expect(tiempos.cuantasSalieron).toBe(23)
    expect(tiempos.sumaMin).toBe(716)
    expect(tiempos.motos.reduce((suma, moto) => suma + moto.minutos, 0)).toBe(716)
  })

  it('el promedio es 31,13 minutos', () => {
    const { tiempos } = visitaA(140)
    expect(tiempos.promedio).toBeCloseTo(31.13, 2)
    expect(tiempos.promedio).toBeCloseTo(716 / 23, 12)
  })

  it('coincide con el tiempo total de la pestaña Visita', () => {
    for (const reloj of [60, 100, 140]) {
      const { tiempos, reproductor } = visitaA(reloj)
      expect(tiempos.promedio).toBeCloseTo(reproductor.metricas().porMoto.tiempoTotalMin, 9)
    }
  })

  it('el tiempo de cada moto es de su llegada a su salida, en minutos', () => {
    const { tiempos } = visitaA(140)
    const moto1 = tiempos.motos.find((moto) => moto.n === 1)
    // Llega a las 3:11 y sale a las 3:27.
    expect(moto1.minutos).toBe(16)
    for (const fila of tiempos.motos) {
      const moto = MOTOS_VISITA.find((m) => m.n === fila.n)
      expect(fila.minutos).toBe(moto.finAcabadoMin - moto.llegadaMin)
    }
  })

  it('las motos van en orden de número', () => {
    const { tiempos } = visitaA(140)
    expect(tiempos.motos.map((moto) => moto.n)).toEqual(Array.from({ length: 23 }, (_, i) => i + 1))
  })

  it('solo las motos 5 y 16 salieron desde la fila 2 sin puesto', () => {
    const { tiempos } = visitaA(140)
    expect(tiempos.motos.filter((moto) => moto.sinPuesto).map((moto) => moto.n)).toEqual([5, 16])
  })

  it('la lista de motos sin puesto sale del reproductor, no de una lista fija', () => {
    const { tiempos, reproductor } = visitaA(140)
    const delReproductor = reproductor
      .detalleDeLaEtapa2()
      .filter((d) => d.puesto === null)
      .map((d) => d.n)
    expect(tiempos.motos.filter((moto) => moto.sinPuesto).map((moto) => moto.n)).toEqual(delReproductor)
  })
})

describe('cada moto aparece cuando sale', () => {
  it('antes de que salga la primera no hay nada que dibujar', () => {
    const { tiempos } = visitaA(10)
    expect(tiempos.vacia).toBe(true)
    expect(tiempos.promedio).toBeNull()
    expect(tiempos.motos).toHaveLength(23)
    expect(tiempos.motos.every((moto) => moto.minutos === null)).toBe(true)
  })

  it('a las 4:00 p. m. solo tienen tiempo las que ya salieron', () => {
    // Las 4:00 p. m. son el minuto 50 del reloj (3:10 + 50 min).
    const { tiempos } = visitaA(50)
    const quienes = tiempos.motos.filter((moto) => moto.minutos !== null).map((moto) => moto.n)
    const esperadas = MOTOS_VISITA.filter((m) => m.finAcabadoMin <= INICIO_OBSERVACION_MIN + 50).map((m) => m.n)
    expect(quienes).toEqual(esperadas.sort((a, b) => a - b))
    expect(quienes.length).toBeGreaterThan(0)
    expect(quienes.length).toBeLessThan(23)
  })

  it('el promedio es el de las motos que ya salieron', () => {
    const { tiempos } = visitaA(50)
    const salidas = MOTOS_VISITA.filter((m) => m.finAcabadoMin <= INICIO_OBSERVACION_MIN + 50)
    const promedio = salidas.reduce((suma, m) => suma + (m.finAcabadoMin - m.llegadaMin), 0) / salidas.length
    expect(tiempos.promedio).toBeCloseTo(promedio, 12)
  })

  it('una moto sin puesto solo se marca cuando sale', () => {
    // La moto 5 llega en el minuto 23 de la tabla y sale en el 46 (el 36 del
    // reloj); antes no tiene ni barra ni marca.
    const antes = visitaA(35.9).tiempos.motos.find((moto) => moto.n === 5)
    const despues = visitaA(36).tiempos.motos.find((moto) => moto.n === 5)
    expect(antes).toEqual({ n: 5, minutos: null, sinPuesto: false })
    expect(despues).toEqual({ n: 5, minutos: 23, sinPuesto: true })
  })

  it('cuántas salieron coincide con las salidas de la foto del reproductor', () => {
    for (const reloj of [30, 70, 110, 140]) {
      const { tiempos, reproductor } = visitaA(reloj)
      expect(tiempos.cuantasSalieron).toBe(reproductor.estado().motosSalidas)
    }
  })
})

describe('la regla de qué motos ya salieron', () => {
  it('cuenta la moto en el minuto exacto de su salida', () => {
    // La moto 1 termina el acabado en el minuto 27 de la tabla, el 17 del reloj.
    expect(motosQueYaSalieron(MOTOS_VISITA, INICIO_OBSERVACION_MIN, 16.9).some((m) => m.n === 1)).toBe(false)
    expect(motosQueYaSalieron(MOTOS_VISITA, INICIO_OBSERVACION_MIN, 17).some((m) => m.n === 1)).toBe(true)
  })
})
