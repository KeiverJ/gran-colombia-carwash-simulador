import { describe, expect, it } from 'vitest'

import { ACABADO_PLAN_MIN, LAVADO_MIN, LLEGADAS_POR_HORA, PROPORCION_PLAN_EXACTA } from '../data/parametros.js'
import { aCsv, celdaCsv, nombreDelArchivoCsv, numeroCsv } from './csv.js'
import { acumuladoVacio, acumularEvento, armarResultados, ejecutarLote } from './lote.js'
import { MODO_BARRIDO, MODO_ESCENARIOS, MODO_LOTES, MODO_REPLICAS } from './plan.js'

const parametros = (cambios = {}) => ({
  llegadasPorHora: LLEGADAS_POR_HORA,
  lavadoMin: LAVADO_MIN,
  acabadoPlanMin: { ...ACABADO_PLAN_MIN },
  proporcionPlan: { ...PROPORCION_PLAN_EXACTA },
  placas: 6,
  puestos: 5,
  modoAcabado: 'M/M/s',
  ...cambios,
})

const solicitud = (cambios = {}) => ({
  modo: MODO_REPLICAS,
  parametros: parametros(),
  semillaBase: 12,
  horas: 100,
  calentamientoPct: 10,
  replicas: 5,
  lotes: 10,
  mediaAcumulada: false,
  barrido: { parametro: 'puestos', inicio: 3, fin: 5, paso: 1 },
  ...cambios,
})

function correr(pedido, cancelarDespuesDe = Infinity) {
  let acumulado = acumuladoVacio()
  let vistos = 0
  ejecutarLote(pedido, {
    alAvanzar: (e) => {
      vistos += 1
      acumulado = acumularEvento(acumulado, e)
    },
    estaCancelado: () => vistos >= cancelarDespuesDe,
  })
  return armarResultados(pedido, acumulado)
}

/** Un lector de CSV sencillo (`;`, comillas dobles, `\r\n`) para leer de vuelta lo escrito. */
function leer(texto) {
  expect(texto.startsWith('﻿')).toBe(true)
  const filas = []
  let fila = []
  let celda = ''
  let entreComillas = false
  const cuerpo = texto.slice(1)
  for (let i = 0; i < cuerpo.length; i += 1) {
    const c = cuerpo[i]
    if (entreComillas) {
      if (c === '"' && cuerpo[i + 1] === '"') {
        celda += '"'
        i += 1
      } else if (c === '"') {
        entreComillas = false
      } else {
        celda += c
      }
    } else if (c === '"') {
      entreComillas = true
    } else if (c === ';') {
      fila.push(celda)
      celda = ''
    } else if (c === '\r' && cuerpo[i + 1] === '\n') {
      fila.push(celda)
      filas.push(fila)
      fila = []
      celda = ''
      i += 1
    } else {
      celda += c
    }
  }
  expect(entreComillas).toBe(false)
  expect(celda).toBe('')
  expect(fila).toEqual([])
  return filas
}

/** El valor que sigue a un rótulo del encabezado (los rótulos están en las posiciones pares). */
function dato(encabezado, rotulo) {
  for (let i = 0; i < encabezado.length; i += 2) {
    if (encabezado[i] === rotulo) return encabezado[i + 1]
  }
  return undefined
}

/** Las tablas del CSV: grupos de filas separados por una fila vacía, sin contar la de encabezado. */
function tablas(filas) {
  const grupos = []
  let actual = []
  for (const f of filas.slice(1)) {
    if (f.length === 1 && f[0] === '') {
      if (actual.length > 0) grupos.push(actual)
      actual = []
    } else {
      actual.push(f)
    }
  }
  if (actual.length > 0) grupos.push(actual)
  return grupos
}

const esNumeroConPunto = (celda) => /^-?\d+\.\d+$/u.test(celda)

function revisar(texto) {
  const filas = leer(texto)
  for (const tabla of tablas(filas)) {
    const ancho = tabla[0].length
    for (const f of tabla) {
      expect(f.length, f.join(' | ')).toBe(ancho)
      for (const celda of f) expect(esNumeroConPunto(celda), celda).toBe(false)
    }
  }
  return filas
}

describe('números y celdas', () => {
  it('los números llevan coma decimal y hasta 6 decimales', () => {
    expect(numeroCsv(0.4234)).toBe('0,4234')
    expect(numeroCsv(14.1935)).toBe('14,1935')
    expect(numeroCsv(1 / 3)).toBe('0,333333')
    expect(numeroCsv(12)).toBe('12')
    expect(numeroCsv(-0.58)).toBe('-0,58')
    expect(numeroCsv(1000000.5)).toBe('1000000,5')
    expect(numeroCsv(null)).toBe('')
    expect(numeroCsv(Number.NaN)).toBe('')
  })

  it('un texto con punto y coma, comillas o salto de línea va entre comillas', () => {
    expect(celdaCsv('a;b')).toBe('"a;b"')
    expect(celdaCsv('dijo "hola"')).toBe('"dijo ""hola"""')
    expect(celdaCsv('a\nb')).toBe('"a\nb"')
    expect(celdaCsv('normal, con coma')).toBe('normal, con coma')
    expect(celdaCsv(0.5)).toBe('0,5')
  })
})

describe('el CSV de Réplicas', () => {
  const resultados = correr(solicitud())
  const texto = aCsv(resultados)
  const filas = revisar(texto)

  it('empieza con la marca de orden de bytes, usa \\r\\n y deja una fila vacía tras el encabezado', () => {
    expect(texto.startsWith('﻿')).toBe(true)
    expect(texto.includes('\r\n')).toBe(true)
    expect(texto.replaceAll('\r\n', '').includes('\n')).toBe(false)
    expect(filas[1]).toEqual([''])
  })

  it('la primera fila dice los parámetros, la semilla base, las horas y las réplicas', () => {
    const e = filas[0]
    expect(dato(e, 'Experimento')).toBe('Réplicas')
    expect(dato(e, 'Parámetros')).toContain('λ = 14,1935 motos/h')
    expect(dato(e, 'Parámetros')).toContain('6 placas')
    expect(dato(e, 'Parámetros')).toContain('5 puestos')
    expect(dato(e, 'Semilla base')).toBe('12')
    expect(dato(e, 'Horas por réplica')).toBe('100')
    expect(dato(e, 'Calentamiento (%)')).toBe('10')
    expect(dato(e, 'Calentamiento (h)')).toBe('10')
    expect(dato(e, 'Réplicas')).toBe('5')
  })

  it('trae una fila por métrica de cada etapa y del total, con las tildes y la ρ intactas', () => {
    const [titulos, ...cuerpo] = tablas(filas)[0]
    expect(titulos).toContain('Desviación estándar')
    expect(titulos).toContain('Límite inferior (95 %)')
    expect(cuerpo).toHaveLength(5 + 5 + 2)
    expect(cuerpo[0][0]).toBe('Lavado')
    expect(cuerpo[0][1]).toBe('ρ (ocupación)')
    expect(cuerpo[0][titulos.indexOf('Promedio')]).toMatch(/^0,\d+$/u)
    expect(cuerpo[0][titulos.indexOf('Valor de las fórmulas')]).toMatch(/^0,42\d*$/u)
    expect(['dentro', 'fuera']).toContain(cuerpo[0][titulos.indexOf('¿Dentro del intervalo?')])
  })

  it('no hay números con punto decimal en ninguna celda', () => {
    expect(texto).not.toMatch(/\d\.\d/u)
  })

  it('el nombre del archivo dice el modo y la semilla base', () => {
    expect(nombreDelArchivoCsv(resultados)).toBe('experimentos-replicas-semilla12.csv')
  })
})

describe('etapas inestables', () => {
  it('escriben «inestable» donde irían el intervalo y las fórmulas, sin inventar cifras', () => {
    const resultados = correr(solicitud({ parametros: parametros({ puestos: 3 }) }))
    const filas = revisar(aCsv(resultados))
    const [titulos, ...cuerpo] = tablas(filas)[0]
    const lq2 = cuerpo.find((f) => f[0] === 'Acabado' && f[1].startsWith('Lq'))
    expect(lq2[titulos.indexOf('Límite inferior (95 %)')]).toBe('inestable')
    expect(lq2[titulos.indexOf('Límite superior (95 %)')]).toBe('inestable')
    expect(lq2[titulos.indexOf('Valor de las fórmulas')]).toBe('inestable')
    expect(lq2[titulos.indexOf('¿Dentro del intervalo?')]).toBe('inestable')
    const apoyo = cuerpo.filter((f) => f[0] === 'Acabado' && f[1].startsWith('Motos en la fila'))
    expect(apoyo).toHaveLength(2)
    expect(Number(apoyo[1][titulos.indexOf('Promedio')].replace(',', '.'))).toBeGreaterThan(Number(apoyo[0][titulos.indexOf('Promedio')].replace(',', '.')))
    const lavado = cuerpo.find((f) => f[0] === 'Lavado' && f[1].startsWith('Lq'))
    expect(lavado[titulos.indexOf('Límite inferior (95 %)')]).not.toBe('inestable')
  })
})

describe('un lote cancelado', () => {
  it('exporta lo terminado y su encabezado dice cuántas réplicas se hicieron', () => {
    const resultados = correr(solicitud({ replicas: 10 }), 4)
    const filas = revisar(aCsv(resultados))
    expect(dato(filas[0], 'Réplicas hechas')).toBe('4')
    expect(dato(filas[0], 'Réplicas')).toBe('10')
  })

  it('con una sola réplica terminada no inventa intervalo', () => {
    const filas = revisar(aCsv(correr(solicitud(), 1)))
    const [titulos, ...cuerpo] = tablas(filas)[0]
    expect(cuerpo[0][titulos.indexOf('Límite inferior (95 %)')]).toBe('sin intervalo')
  })

  it('sin corridas terminadas solo trae el encabezado', () => {
    const filas = leer(aCsv(correr(solicitud(), 0)))
    expect(filas).toHaveLength(2)
  })
})

describe('Barrido', () => {
  const resultados = correr(solicitud({ modo: MODO_BARRIDO }))
  const filas = revisar(aCsv(resultados))

  it('el encabezado dice el parámetro barrido', () => {
    expect(dato(filas[0], 'Parámetro barrido')).toBe('Puestos de acabado')
    expect(dato(filas[0], 'Desde')).toBe('3')
    expect(dato(filas[0], 'Hasta')).toBe('5')
  })

  it('trae una fila por valor, etapa y métrica', () => {
    const [titulos, ...cuerpo] = tablas(filas)[0]
    expect(titulos[0]).toBe('Puestos de acabado (puestos)')
    const valores = [...new Set(cuerpo.map((f) => f[0]))]
    expect(valores).toEqual(['3', '4', '5'])
    expect(cuerpo.filter((f) => f[0] === '4' && f[2] === 'Acabado' && f[3].startsWith('Lq'))).toHaveLength(1)
    const tres = cuerpo.find((f) => f[0] === '3' && f[2] === 'Acabado' && f[3].startsWith('Lq'))
    expect(tres[titulos.indexOf('Valor de las fórmulas')]).toBe('inestable')
  })
})

describe('Comparar escenarios', () => {
  const resultados = correr(solicitud({ modo: MODO_ESCENARIOS, parametros: parametros({ puestos: 3, modoAcabado: 'por-plan' }) }))
  const filas = revisar(aCsv(resultados))

  it('trae los cinco escenarios y el encabezado dice la referencia', () => {
    expect(dato(filas[0], 'Referencia de las diferencias')).toBe('Situación actual (6 placas, 3 puestos)')
    const [, ...cuerpo] = tablas(filas)[0]
    expect([...new Set(cuerpo.map((f) => f[0]))]).toEqual([
      'Situación actual (6 placas, 3 puestos)',
      '4 puestos de acabado',
      '5 puestos de acabado',
      '5 placas',
      '7 placas',
    ])
  })

  it('tras la tabla hay otra con las diferencias, con «inestable» donde no se calcula', () => {
    const grupos = tablas(filas)
    expect(grupos).toHaveLength(2)
    const [titulos, ...cuerpo] = grupos[1]
    expect(titulos[0]).toBe('Diferencias contra')
    const lista = grupos[1].slice(1)
    expect(lista.length).toBeGreaterThan(0)
    // Cuarta tabla de títulos: el segundo grupo empieza con la fila «Diferencias contra».
    expect(cuerpo[0][0]).toBe('Escenario')
    const wq = cuerpo.find((f) => f[0] === '4 puestos de acabado' && f[2].startsWith('Wq') && f[1] === 'Acabado')
    expect(wq[5]).toBe('inestable')
    expect(wq[9]).toBe('')
    expect(wq[10]).toContain('inestable en')
  })

  it('con otra referencia se calculan las diferencias entre 4 y 5 puestos', () => {
    const otros = correr(solicitud({ modo: MODO_ESCENARIOS, replicas: 10, horas: 1000, parametros: parametros({ puestos: 3, modoAcabado: 'por-plan' }) }))
    const texto = aCsv(otros, { referencia: 'cuatro-puestos' })
    const grupos = tablas(revisar(texto))
    const cuerpo = grupos[1].slice(2)
    const wq = cuerpo.find((f) => f[0] === '5 puestos de acabado' && f[1] === 'Acabado' && f[2].startsWith('Wq'))
    expect(wq[9]).toBe('significativa')
    expect(Number(wq[5].replace(',', '.'))).toBeLessThan(0)
  }, 60000)
})

describe('Medias por lotes', () => {
  it('tiene las mismas columnas que Réplicas y su encabezado dice cuántos lotes se usaron', () => {
    const replicas = revisar(aCsv(correr(solicitud())))
    const lotes = revisar(aCsv(correr(solicitud({ modo: MODO_LOTES, lotes: 12 }))))
    expect(tablas(lotes)[0][0]).toEqual(tablas(replicas)[0][0])
    expect(dato(lotes[0], 'Experimento')).toBe('Medias por lotes')
    expect(dato(lotes[0], 'Lotes')).toBe('12')
    expect(nombreDelArchivoCsv(correr(solicitud({ modo: MODO_LOTES, lotes: 12 })))).toBe('experimentos-medias-por-lotes-semilla12.csv')
  })

  it('cancelado dice cuántos lotes se hicieron', () => {
    const filas = revisar(aCsv(correr(solicitud({ modo: MODO_LOTES, lotes: 12 }), 5)))
    expect(dato(filas[0], 'Lotes hechos')).toBe('5')
  })
})
