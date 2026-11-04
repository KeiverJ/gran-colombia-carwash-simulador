import { describe, expect, it } from 'vitest'

import { ACABADO_PLAN_MIN, LAVADO_MIN, LLEGADAS_POR_HORA, PROPORCION_PLAN_EXACTA } from '../data/parametros.js'
import { acumuladoVacio, acumularEvento, armarResultados, ejecutarLote } from '../experimentos/lote.js'
import { MODO_BARRIDO, MODO_REPLICAS } from '../experimentos/plan.js'
import {
  comoTiempoRestante,
  descripcionDeLaMedia,
  descripcionDelBarrido,
  modeloDeLaMediaAcumulada,
  modeloDelBarrido,
  resumenDeLosParametros,
  tablaDeLaMedia,
  tablaDelBarrido,
  tablasDeUnResumen,
  TEXTO_DE_LA_AYUDA,
  TEXTO_DEL_INTERVALO,
} from './presentacionDeExperimentos.js'

const parametros = (cambios = {}) => ({
  llegadasPorHora: LLEGADAS_POR_HORA,
  lavadoMin: LAVADO_MIN,
  acabadoPlanMin: { ...ACABADO_PLAN_MIN },
  proporcionPlan: { ...PROPORCION_PLAN_EXACTA },
  placas: 6,
  puestos: 3,
  modoAcabado: 'por-plan',
  ...cambios,
})

const solicitud = (cambios = {}) => ({
  modo: MODO_REPLICAS,
  parametros: parametros(),
  semillaBase: 1,
  horas: 100,
  calentamientoPct: 10,
  replicas: 5,
  lotes: 10,
  mediaAcumulada: false,
  barrido: { parametro: 'llegadasPorHora', inicio: 8, fin: 16, paso: 0.5 },
  ...cambios,
})

function correr(pedido) {
  let acumulado = acumuladoVacio()
  ejecutarLote(pedido, { alAvanzar: (e) => { acumulado = acumularEvento(acumulado, e) } })
  return armarResultados(pedido, acumulado)
}

describe('el barrido de λ con 3 puestos', () => {
  const resultados = correr(solicitud({ modo: MODO_BARRIDO, horas: 100, replicas: 5 }))
  const acabado = modeloDelBarrido(resultados, { etapa: 'acabado', clave: 'wqMin' })
  const lavado = modeloDelBarrido(resultados, { etapa: 'lavado', clave: 'wqMin' })

  it('marca el acabado inestable desde 11,5 con el valor crítico en 11,34', () => {
    expect(acabado.hayInestables).toBe(true)
    expect(acabado.todosInestables).toBe(false)
    expect(acabado.primerInestable).toBe(11.5)
    expect(acabado.critico).toBeCloseTo(11.3424, 3)
    expect(acabado.tramosInestables).toHaveLength(1)
    // El tramo empieza en el valor crítico, entre 11 y 11,5, y llega al final del rango.
    expect(acabado.tramosInestables[0].x1).toBeCloseTo(11.3424, 3)
    expect(acabado.tramosInestables[0].x2).toBe(16)
  })

  it('los valores inestables no llevan franja ni fórmulas, y su promedio va aparte', () => {
    for (const fila of acabado.filas) {
      if (fila.valor >= 11.5) {
        expect(fila.banda).toBeNull()
        expect(fila.formula).toBeNull()
        expect(fila.promedioEstable).toBeNull()
        expect(fila.promedioInestable).not.toBeNull()
        expect(fila.estable).toBe(false)
      } else {
        expect(fila.estable).toBe(true)
        expect(fila.formula).not.toBeNull()
        expect(fila.banda).toHaveLength(2)
        expect(fila.promedioInestable).toBeNull()
      }
    }
  })

  it('el lavado es estable en todo el rango', () => {
    expect(lavado.hayInestables).toBe(false)
    expect(lavado.tramosInestables).toEqual([])
    expect(lavado.critico).toBeNull()
  })

  it('la descripción dice el valor crítico y la tabla trae los mismos números que la gráfica', () => {
    const descripcion = descripcionDelBarrido(acabado)
    expect(descripcion).toContain('11,34')
    expect(descripcion).toContain('11,50')
    expect(descripcion).toContain('17 valores')
    const tabla = tablaDelBarrido(acabado)
    expect(tabla.filas).toHaveLength(acabado.filas.length)
    expect(tabla.filas[0][0]).toBe('8,00')
    // El promedio y la fórmula de la tabla son los de la gráfica.
    const primero = acabado.filas[0]
    expect(tabla.filas[0][1]).toBe(primero.promedio.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }))
    expect(tabla.filas[0][3]).toBe(primero.formula.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }))
    const ultima = tabla.filas.at(-1)
    expect(ultima[3]).toBe('inestable')
    expect(ultima[4]).toBe('inestable')
  })

  it('un barrido sin datos todavía lo dice', () => {
    const vacio = { ...resultados, puntos: resultados.puntos.map((p) => ({ ...p, hechas: 0, replicas: [], resumen: null })) }
    const modelo = modeloDelBarrido(vacio, { etapa: 'acabado', clave: 'wqMin' })
    expect(modelo.hayDatos).toBe(false)
    expect(descripcionDelBarrido(modelo)).toContain('Todavía no hay datos')
    // Las fórmulas y la zona inestable salen de los parámetros, aunque no haya corridas.
    expect(modelo.filas.filter((f) => f.formula !== null).length).toBeGreaterThan(0)
    expect(modelo.hayInestables).toBe(true)
  })
})

describe('el barrido de puestos de 3 a 5', () => {
  it('con 3 puestos es inestable y con 4 y 5 no', () => {
    const resultados = correr(solicitud({ modo: MODO_BARRIDO, barrido: { parametro: 'puestos', inicio: 3, fin: 5, paso: 1 } }))
    const modelo = modeloDelBarrido(resultados, { etapa: 'acabado', clave: 'rho' })
    expect(modelo.filas.map((f) => f.estable)).toEqual([false, true, true])
    expect(modelo.primerInestable).toBe(3)
    expect(modelo.tramosInestables).toHaveLength(1)
    expect(descripcionDelBarrido(modelo)).toContain('inestable')
  })
})

describe('las tablas de un resumen', () => {
  it('trae tres grupos, y el estado de cada fila con palabras', () => {
    const { resumen } = correr(solicitud({ parametros: parametros({ puestos: 5, modoAcabado: 'M/M/s' }), replicas: 10, horas: 1000 }))
    const tablas = tablasDeUnResumen(resumen)
    expect(tablas.map((t) => t.id)).toEqual(['lavado', 'acabado', 'total'])
    expect(tablas[0].filas).toHaveLength(5)
    expect(tablas[2].filas).toHaveLength(2)
    for (const fila of tablas[0].filas) expect(['dentro', 'fuera']).toContain(fila.estado)
    expect(tablas[1].aproximada).toBe(false)
  }, 30000)

  it('una etapa inestable trae sus filas de apoyo y estado inestable', () => {
    const { resumen } = correr(solicitud({ replicas: 5 }))
    const acabado = tablasDeUnResumen(resumen)[1]
    expect(acabado.estable).toBe(false)
    expect(acabado.apoyo.despues).toBeGreaterThan(acabado.apoyo.antes)
    expect(acabado.filas.every((f) => f.estado === 'inestable' && f.formula === null && f.inferior === null)).toBe(true)
    expect(acabado.aproximada).toBe(true)
  })
})

describe('la media acumulada', () => {
  const resultados = correr(solicitud({ parametros: parametros({ puestos: 5, modoAcabado: 'M/M/s' }), mediaAcumulada: true, horas: 100 }))

  it('sin observación no hay modelo', () => {
    const sin = correr(solicitud({ mediaAcumulada: false }))
    expect(modeloDeLaMediaAcumulada(sin, { etapa: 'lavado', clave: 'rho' })).toBeNull()
  })

  it('trae los puntos, el fin del calentamiento y la línea de las fórmulas si es estable', () => {
    const modelo = modeloDeLaMediaAcumulada(resultados, { etapa: 'lavado', clave: 'rho' })
    expect(modelo.estable).toBe(true)
    expect(modelo.puntos).toHaveLength(200)
    expect(modelo.calentamientoHoras).toBe(10)
    expect(modelo.formula).toBeCloseTo(0.4234, 4)
    expect(descripcionDeLaMedia(modelo)).toContain('línea de las fórmulas')
    const tabla = tablaDeLaMedia(modelo)
    expect(tabla.filas.length).toBeLessThanOrEqual(24)
    expect(tabla.filas[0]).toHaveLength(3)
  })

  it('cambiar de métrica sale de la misma serie', () => {
    const a = modeloDeLaMediaAcumulada(resultados, { etapa: 'lavado', clave: 'lq' })
    const b = modeloDeLaMediaAcumulada(resultados, { etapa: 'acabado', clave: 'wqMin' })
    expect(a.puntos.length).toBeGreaterThan(0)
    expect(b.puntos.length).toBeGreaterThan(0)
  })

  it('una etapa inestable no lleva línea de fórmulas', () => {
    const inestable = correr(solicitud({ mediaAcumulada: true }))
    const modelo = modeloDeLaMediaAcumulada(inestable, { etapa: 'acabado', clave: 'lq' })
    expect(modelo.estable).toBe(false)
    expect(modelo.formula).toBeNull()
    expect(descripcionDeLaMedia(modelo)).toContain('no se estabiliza')
    expect(tablaDeLaMedia(modelo).filas[0][2]).toBe('inestable')
  })
})

describe('textos y formatos', () => {
  it('el tiempo restante se dice en segundos o en minutos', () => {
    expect(comoTiempoRestante(null)).toBeNull()
    expect(comoTiempoRestante(400)).toBe('unos 1 s')
    expect(comoTiempoRestante(42000)).toBe('unos 42 s')
    expect(comoTiempoRestante(60000)).toBe('unos 1 min')
    expect(comoTiempoRestante(130000)).toBe('unos 2 min 10 s')
  })

  it('el resumen de los parámetros dice lo que hace falta para repetir', () => {
    const texto = resumenDeLosParametros(solicitud({ semillaBase: 12, horas: 1000, replicas: 30 }))
    expect(texto).toContain('λ = 14,19 motos/h')
    expect(texto).toContain('6 placas')
    expect(texto).toContain('3 puestos')
    expect(texto).toContain('semilla base 12')
    expect(texto).toContain('1.000 h por réplica')
    expect(texto).toContain('calentamiento 10 % (100 h)')
    expect(texto).toContain('30 réplicas')
    expect(resumenDeLosParametros(solicitud({ modo: 'lotes', lotes: 25 }))).toContain('25 lotes')
  })

  it('la explicación del intervalo está en tres párrafos y la Ayuda trae los cuatro modos', () => {
    expect(TEXTO_DEL_INTERVALO).toHaveLength(3)
    expect(TEXTO_DEL_INTERVALO.join(' ')).toContain('95')
    const ayuda = TEXTO_DE_LA_AYUDA.join(' ')
    for (const modo of ['Réplicas', 'Barrido', 'Comparar escenarios', 'Medias por lotes']) {
      expect(ayuda).toContain(modo)
    }
    expect(ayuda).toContain('CSV')
  })
})
