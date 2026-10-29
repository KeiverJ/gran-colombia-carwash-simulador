import { describe, expect, it } from 'vitest'

import { INICIO_OBSERVACION_MIN, MOTOS_VISITA } from '../data/visita.js'
import { crearSimulador } from '../engine/simulador.js'
import { crearReproductor } from '../visita/reproductor.js'
import {
  descripcionDeLaOcupacion,
  descripcionDeLasFilas,
  descripcionDeLasMotos,
  descripcionDelDesglose,
  MAXIMO_DE_FILAS_DE_LA_TABLA,
  repartir,
  tablaDeLaOcupacion,
  tablaDeLasFilas,
  tablaDeLasMotos,
  tablaDelDesglose,
} from './descripcionesDeLasGraficas.js'
import { desgloseDeLaSimulacion } from './desgloseDelTiempo.js'
import { metricasCalculadas } from './metricas.js'
import { ocupacionDeLaSimulacion } from './ocupacion.js'
import { useSimulacion } from './simulacion.js'
import { tiemposDeLaVisita } from './tiemposDeLaVisita.js'

const punto = (minuto, colaLavado, colaAcabado) => ({ minuto, colaLavado, colaAcabado })

describe('repartir filas para la tabla', () => {
  const lista = Array.from({ length: 10000 }, (_, i) => i)

  it('una lista corta se devuelve entera', () => {
    expect(repartir([1, 2, 3], 24)).toEqual([1, 2, 3])
  })

  it('una lista larga se reduce al límite, con el primero y el último', () => {
    const elegidos = repartir(lista, 24)
    expect(elegidos.length).toBeLessThanOrEqual(24)
    expect(elegidos[0]).toBe(0)
    expect(elegidos.at(-1)).toBe(9999)
  })

  it('los elegidos van en orden y repartidos a lo largo de toda la lista', () => {
    const elegidos = repartir(lista, 24)
    expect(elegidos).toEqual([...elegidos].sort((a, b) => a - b))
    const saltos = elegidos.slice(1).map((valor, i) => valor - elegidos[i])
    expect(Math.max(...saltos) - Math.min(...saltos)).toBeLessThanOrEqual(1)
  })
})

describe('las dos filas en el tiempo', () => {
  const puntos = [punto(0, 0, 0), punto(60, 2, 5), punto(120, 1, 11), punto(180, 0, 14)]

  it('la descripción nombra la gráfica y sus valores principales', () => {
    const texto = descripcionDeLasFilas(puntos)
    expect(texto).toMatch(/Gráfica de líneas/)
    expect(texto).toMatch(/fila del lavado/)
    expect(texto).toMatch(/3,0 horas simuladas/)
    expect(texto).toMatch(/0 motos en la fila 1 y 14 en la fila 2/)
    expect(texto).toMatch(/máximo fue de 2 en la fila 1 y de 14 en la fila 2/)
  })

  it('con el mismo dato dice lo mismo', () => {
    expect(descripcionDeLasFilas(puntos)).toBe(descripcionDeLasFilas([...puntos]))
  })

  it('sin datos lo dice', () => {
    expect(descripcionDeLasFilas([])).toMatch(/Todavía no hay datos/)
  })

  it('la tabla trae las horas con coma y cada fila', () => {
    const { columnas, filas } = tablaDeLasFilas(puntos)
    expect(columnas).toEqual(['Horas simuladas', 'Motos en la fila 1', 'Motos en la fila 2'])
    expect(filas).toEqual([
      ['0,0', '0', '0'],
      ['1,0', '2', '5'],
      ['2,0', '1', '11'],
      ['3,0', '0', '14'],
    ])
  })

  it('la tabla de diez mil puntos no pasa del límite e incluye el primero y el último', () => {
    const muchos = Array.from({ length: 10000 }, (_, i) => punto(i, i % 7, i % 11))
    const { filas, nota } = tablaDeLasFilas(muchos)
    expect(filas.length).toBeLessThanOrEqual(MAXIMO_DE_FILAS_DE_LA_TABLA)
    expect(filas[0][0]).toBe('0,0')
    expect(filas.at(-1)[0]).toBe(((9999) / 60).toLocaleString('es-CO', { minimumFractionDigits: 1, maximumFractionDigits: 1 }))
    expect(nota).toMatch(/10000 puntos/)
  })
})

describe('la ocupación de cada servidor', () => {
  const motor = crearSimulador({ semilla: 2 })
  motor.correrHoras(30)
  const modelo = ocupacionDeLaSimulacion(motor.metricas())

  it('la descripción nombra la placa y el puesto más y menos ocupados, con porcentajes', () => {
    const texto = descripcionDeLaOcupacion(modelo)
    expect(texto).toMatch(/Barras horizontales/)
    expect(texto).toMatch(/Placas: la más ocupada es Placa \d con \d+,\d %/)
    expect(texto).toMatch(/la menos ocupada Placa \d con/)
    expect(texto).toMatch(/Puestos: la más ocupada es Puesto \d/)
    expect(texto).toMatch(/promedio \d+,\d %/)
  })

  it('sin datos lo dice', () => {
    expect(descripcionDeLaOcupacion(ocupacionDeLaSimulacion(null))).toMatch(/Todavía no hay datos/)
  })

  it('la tabla tiene una fila por servidor y el promedio de cada etapa', () => {
    const { columnas, filas } = tablaDeLaOcupacion(modelo)
    expect(columnas).toEqual(['Etapa', 'Servidor', 'Ocupado'])
    expect(filas).toHaveLength(6 + 1 + 3 + 1)
    expect(filas[0][1]).toBe('Placa 1')
    expect(filas.filter((fila) => fila[1] === 'Promedio de la etapa')).toHaveLength(2)
    for (const fila of filas) {
      expect(fila[2]).toMatch(/^\d+,\d %$/)
    }
  })
})

describe('el desglose del tiempo', () => {
  const parametros = { ...useSimulacion.getState().parametros, puestos: 5 }
  const motor = crearSimulador({ semilla: 1, puestos: 5 })
  motor.correrHoras(200)
  const modelo = desgloseDeLaSimulacion({
    metricas: motor.metricas(),
    calculadas: metricasCalculadas(parametros),
    parametros,
  })

  it('la descripción dice los cuatro tramos y el total de cada barra', () => {
    const texto = descripcionDelDesglose(modelo)
    expect(texto).toMatch(/Barra apilada/)
    expect(texto).toMatch(/Simulado: espera en la fila 1 \d+,\d\d min, lavado/)
    expect(texto).toMatch(/Fórmulas: espera en la fila 1/)
    expect(texto).toMatch(/total \d+,\d\d min/)
  })

  it('sin datos lo dice', () => {
    expect(descripcionDelDesglose({ vacia: true, barras: [], notas: [] })).toMatch(/Todavía no hay datos/)
  })

  it('la tabla trae un tramo por fila, una columna por barra y el total', () => {
    const { columnas, filas } = tablaDelDesglose(modelo)
    expect(columnas).toEqual(['Tramo (min)', 'Simulado', 'Fórmulas'])
    expect(filas.map((fila) => fila[0])).toEqual([
      'Espera en la fila 1', 'Lavado', 'Espera en la fila 2', 'Acabado', 'Total',
    ])
    expect(filas[4][1]).toBe(modelo.barras[0].total.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }))
  })
})

describe('el tiempo de cada moto', () => {
  function visitaA(relojMin) {
    const reproductor = crearReproductor()
    reproductor.avanzar(relojMin)
    return tiemposDeLaVisita({
      motos: MOTOS_VISITA,
      detalle: reproductor.detalleDeLaEtapa2(),
      inicioMin: INICIO_OBSERVACION_MIN,
      relojMin,
    })
  }

  it('la descripción dice cuántas salieron, el promedio, los extremos y las motos sin puesto', () => {
    const texto = descripcionDeLasMotos(visitaA(140))
    expect(texto).toMatch(/Han salido 23 de 23 motos; el promedio es 31,13 min/)
    expect(texto).toMatch(/más rápida fue la moto \d+ con \d+,\d\d min/)
    expect(texto).toMatch(/Las motos 5 y 16 salieron desde la fila 2 sin puesto/)
  })

  it('antes de que salga la primera lo dice', () => {
    expect(descripcionDeLasMotos(visitaA(0))).toMatch(/Todavía no ha salido ninguna/)
  })

  it('la tabla trae las 23 motos, con — para las que no han salido', () => {
    const { columnas, filas } = tablaDeLasMotos(visitaA(50))
    expect(columnas).toEqual(['Moto', 'Tiempo en el lavadero (min)', 'Nota'])
    expect(filas).toHaveLength(23)
    expect(filas.some((fila) => fila[1] === '—')).toBe(true)
    expect(filas[0][0]).toBe('1')
  })

  it('al terminar la tabla marca las motos 5 y 16', () => {
    const { filas, nota } = tablaDeLasMotos(visitaA(140))
    expect(filas.filter((fila) => fila[2] !== '').map((fila) => fila[0])).toEqual(['5', '16'])
    expect(filas.filter((fila) => fila[1] === '—')).toHaveLength(0)
    expect(nota).toMatch(/31,13 min/)
  })
})
