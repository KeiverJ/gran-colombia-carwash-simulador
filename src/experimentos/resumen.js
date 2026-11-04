/**
 * Del resultado de muchas corridas a las cifras que se muestran: por métrica,
 * promedio, desviación, intervalo del 95 % y el valor de las fórmulas M/M/s;
 * las diferencias entre escenarios; y cuántas réplicas harían falta.
 *
 * Las fórmulas son las de `src/engine/formulas.js`, sin tocarlas. Una etapa con
 * ρ ≥ 1 según las fórmulas es inestable: no se calcula su intervalo ni se
 * compara con las fórmulas, porque su fila crece sin límite y no hay valor al que
 * acercarse. JavaScript puro.
 */

import { metricasMMs } from '../engine/formulas.js'
import { MODO_MMS } from '../engine/simulador.js'
import { intervaloContiene, promedio, resumirMuestra } from './estadistica.js'
import {
  acabadoPromedioDeLosParametros,
  parametrosConElValor,
  REPLICAS_MAXIMAS,
  REPLICAS_MINIMAS,
  valoresDelBarrido,
} from './plan.js'

export const ETAPAS = ['lavado', 'acabado']

/** Las métricas de cada etapa, en el orden en que se muestran. */
export const METRICAS_DE_LA_ETAPA = [
  { clave: 'rho', texto: 'ρ (ocupación)', unidad: '' },
  { clave: 'lq', texto: 'Lq (motos en la fila)', unidad: 'motos' },
  { clave: 'wqMin', texto: 'Wq (espera en la fila)', unidad: 'min' },
  { clave: 'wMin', texto: 'W (tiempo en la etapa)', unidad: 'min' },
  { clave: 'l', texto: 'L (motos en la etapa)', unidad: 'motos' },
]

/** Las del tiempo total en el lavadero. */
export const METRICAS_DEL_TOTAL = [
  { clave: 'wMin', texto: 'Tiempo total en el lavadero', unidad: 'min' },
  { clave: 'l', texto: 'Motos en el lavadero', unidad: 'motos' },
]

/**
 * Lo que dicen las fórmulas M/M/s para unos parámetros, por etapa y para el
 * total. μ₂ sale del acabado promedio E[S₂] de esos mismos parámetros, igual que
 * en la tabla de Métricas, y no de la constante del documento.
 *
 * El total no tiene fórmula propia en la especificación: en serie y sin
 * bloqueo es la suma de las dos etapas (W = W₁ + W₂ y L = L₁ + L₂), y solo vale
 * si las dos son estables.
 */
export function formulasDe(parametros) {
  const lavado = metricasMMs({
    llegadasPorHora: parametros.llegadasPorHora,
    servicioPorHora: 60 / parametros.lavadoMin,
    servidores: parametros.placas,
  })
  const acabado = metricasMMs({
    llegadasPorHora: parametros.llegadasPorHora,
    servicioPorHora: 60 / acabadoPromedioDeLosParametros(parametros),
    servidores: parametros.puestos,
  })
  const total =
    lavado.estable && acabado.estable
      ? { estable: true, wMin: lavado.wMin + acabado.wMin, l: lavado.l + acabado.l }
      : { estable: false }
  return { lavado, acabado, total }
}

/** En el modo «por plan» la etapa 2 (y el total) no es exactamente una M/M/s. */
function esAproximada(parametros) {
  return parametros.modoAcabado !== MODO_MMS
}

/**
 * Resume las muestras de cada métrica.
 *
 * @param {object} entrada
 * @param {{ lavado: Record<string, number[]>, acabado: Record<string, number[]>,
 *           total: Record<string, number[]> }} entrada.muestras un valor por réplica (o por lote)
 * @param {{ antes: {lavado: number[], acabado: number[]}, despues: {lavado: number[], acabado: number[]} }} [entrada.filas]
 *   motos en cada fila en dos momentos de la corrida, para ver si crece
 * @param {object} entrada.parametros los de la corrida, para las fórmulas
 */
export function resumirMuestras({ muestras, filas = null, parametros }) {
  const formulas = formulasDe(parametros)
  const aproximadas = { lavado: false, acabado: esAproximada(parametros), total: esAproximada(parametros) }

  const dePartes = (nombre, lista) => {
    const etapa = formulas[nombre]
    const estable = etapa.estable
    const metricas = {}
    for (const { clave } of lista) {
      const valores = muestras[nombre][clave]
      if (estable) {
        const resumen = resumirMuestra(valores)
        metricas[clave] = {
          resumen,
          promedio: resumen.promedio,
          formula: etapa[clave],
          dentro: intervaloContiene(resumen, etapa[clave]),
        }
      } else {
        // Sin intervalo ni comparación: solo el promedio, que no se estabiliza.
        metricas[clave] = { resumen: null, promedio: promedio(valores), formula: null, dentro: null }
      }
    }
    return {
      estable,
      aproximada: aproximadas[nombre],
      rhoDeLasFormulas: etapa.rho ?? null,
      metricas,
    }
  }

  const resultado = {
    lavado: dePartes('lavado', METRICAS_DE_LA_ETAPA),
    acabado: dePartes('acabado', METRICAS_DE_LA_ETAPA),
    total: dePartes('total', METRICAS_DEL_TOTAL),
  }
  for (const nombre of ETAPAS) {
    resultado[nombre].filas = filas
      ? { antes: promedio(filas.antes[nombre]), despues: promedio(filas.despues[nombre]) }
      : null
  }
  return resultado
}

/** Los números de cada réplica a las muestras por métrica (una lista de valores por métrica). */
export function muestrasDeLasReplicas(replicas) {
  const muestras = { lavado: {}, acabado: {}, total: {} }
  for (const { clave } of METRICAS_DE_LA_ETAPA) {
    muestras.lavado[clave] = replicas.map((r) => r.lavado[clave])
    muestras.acabado[clave] = replicas.map((r) => r.acabado[clave])
  }
  for (const { clave } of METRICAS_DEL_TOTAL) {
    muestras.total[clave] = replicas.map((r) => r.total[clave])
  }
  return muestras
}

/**
 * El resumen del modo Réplicas.
 *
 * @param {Array<object>} replicas lo que devuelve `correrReplica`, de las réplicas terminadas
 * @param {object} parametros los de la corrida
 */
export function resumirReplicas(replicas, parametros) {
  return {
    n: replicas.length,
    ...resumirMuestras({
      muestras: muestrasDeLasReplicas(replicas),
      filas: {
        antes: {
          lavado: replicas.map((r) => r.filas.mitad.lavado),
          acabado: replicas.map((r) => r.filas.mitad.acabado),
        },
        despues: {
          lavado: replicas.map((r) => r.filas.final.lavado),
          acabado: replicas.map((r) => r.filas.final.acabado),
        },
      },
      parametros,
    }),
  }
}

/**
 * El resumen del modo Medias por lotes: las medias de los lotes terminados hacen de
 * muestra. Un lote sin motos que salieron no aporta a las métricas por moto
 * (W y Wq); `n` de cada métrica dice con cuántos lotes se calculó.
 *
 * @param {Array<{ numero: number, medias: object, filas: object }>} lotes
 * @param {object} parametros
 */
export function resumirLotes(lotes, parametros) {
  const conValor = (etapa, clave) => lotes.map((l) => l.medias[etapa][clave]).filter((v) => v !== null && v !== undefined)
  const muestras = { lavado: {}, acabado: {}, total: {} }
  for (const { clave } of METRICAS_DE_LA_ETAPA) {
    muestras.lavado[clave] = conValor('lavado', clave)
    muestras.acabado[clave] = conValor('acabado', clave)
  }
  for (const { clave } of METRICAS_DEL_TOTAL) {
    muestras.total[clave] = conValor('total', clave)
  }
  const primero = lotes[0]
  const ultimo = lotes[lotes.length - 1]
  return {
    n: lotes.length,
    ...resumirMuestras({
      muestras,
      filas: {
        antes: { lavado: [primero.filas.lavado], acabado: [primero.filas.acabado] },
        despues: { lavado: [ultimo.filas.lavado], acabado: [ultimo.filas.acabado] },
      },
      parametros,
    }),
  }
}

/* ------------------------------------------------------ réplicas necesarias -- */

/**
 * Cuántas réplicas harían falta para que el semiancho del intervalo baje de `semiancho`
 * (h, con n réplicas) a `deseado` (h*): n* = n · (h / h*)², redondeado hacia arriba.
 * La cuenta se redondea a 9 decimales antes de subir, para que un entero exacto
 * (10 · (0,02 / 0,01)² = 40) no pase a 41 por el error de la coma flotante.
 *
 * @returns {{ disponible: false } | { disponible: true, necesarias: number, alcanza: boolean,
 *            aCorrer: number, pasaDelMaximo: boolean }}
 *   `aCorrer` es lo que se correría: nunca menos del mínimo de réplicas.
 */
export function replicasNecesarias({ n, semiancho, deseado }) {
  if (!Number.isInteger(n) || n < 2) return { disponible: false }
  if (typeof semiancho !== 'number' || !Number.isFinite(semiancho) || semiancho < 0) return { disponible: false }
  if (typeof deseado !== 'number' || !Number.isFinite(deseado) || deseado <= 0) return { disponible: false }
  const necesarias = Math.ceil(Number((n * (semiancho / deseado) ** 2).toFixed(9)))
  return {
    disponible: true,
    necesarias,
    alcanza: necesarias <= n,
    aCorrer: Math.max(necesarias, REPLICAS_MINIMAS),
    pasaDelMaximo: necesarias > REPLICAS_MAXIMAS,
  }
}

/* ------------------------------------------------ diferencias entre escenarios -- */

/**
 * La diferencia de cada escenario contra el de referencia, métrica por métrica,
 * calculada réplica a réplica: la diferencia de la réplica con la semilla s es
 * (valor del escenario con s) − (valor de la referencia con s). Con las mismas
 * semillas el azar común se cancela en buena parte y el intervalo sale más
 * angosto que comparando dos promedios por separado.
 *
 * Una diferencia no se calcula si la etapa es inestable en el escenario o en la
 * referencia (por las fórmulas); el total tampoco si lo es alguna de las dos
 * etapas de alguno de los dos.
 *
 * @param {Array<{ id: string, parametros: object, replicas: object[] }>} escenarios
 * @param {string} referencia el `id` del escenario de referencia
 * @returns {Record<string, { pares: number, lavado: object, acabado: object, total: object }>}
 *   por `id`, sin la referencia
 */
export function diferenciasContra(escenarios, referencia) {
  const base = escenarios.find((e) => e.id === referencia)
  if (!base) throw new RangeError(`No hay un escenario de referencia llamado ${referencia}.`)
  const formulasBase = formulasDe(base.parametros)
  const delaReferencia = new Map(base.replicas.map((r) => [r.semilla, r]))
  const salida = {}

  for (const escenario of escenarios) {
    if (escenario.id === referencia) continue
    const formulas = formulasDe(escenario.parametros)
    const pares = escenario.replicas
      .filter((r) => delaReferencia.has(r.semilla))
      .map((r) => [r, delaReferencia.get(r.semilla)])

    const diferenciaDe = (nombre, lista) => {
      const inestableEn = []
      if (!formulas[nombre].estable) inestableEn.push(escenario.id)
      if (!formulasBase[nombre].estable) inestableEn.push(referencia)
      const metricas = {}
      for (const { clave } of lista) {
        if (inestableEn.length > 0) {
          metricas[clave] = { calculada: false, resumen: null, significativa: null }
          continue
        }
        const resumen = resumirMuestra(pares.map(([a, b]) => a[nombre][clave] - b[nombre][clave]))
        metricas[clave] = {
          calculada: resumen.inferior !== null,
          resumen,
          significativa: resumen.inferior === null ? null : !(resumen.inferior <= 0 && resumen.superior >= 0),
        }
      }
      return { inestableEn, metricas }
    }

    salida[escenario.id] = {
      pares: pares.length,
      lavado: diferenciaDe('lavado', METRICAS_DE_LA_ETAPA),
      acabado: diferenciaDe('acabado', METRICAS_DE_LA_ETAPA),
      total: diferenciaDe('total', METRICAS_DEL_TOTAL),
    }
  }
  return salida
}

/* ------------------------------------------------------ inestabilidad del barrido -- */

/**
 * Dónde pasa cada etapa a ser inestable (ρ ≥ 1 según las fórmulas) a lo largo de
 * un barrido.
 *
 * Para cada etapa: `estables` (uno por valor del barrido), `cambio` (el índice del
 * primer valor cuyo estado difiere del anterior, o `null`) y `critico`, el valor
 * exacto donde ρ = 1 si el parámetro barrido afecta a la etapa y cae dentro del
 * rango (λ* = s·μ; tiempo* = s·60/λ; con placas o puestos, a = λ/μ).
 *
 * @returns {{ valores: number[], lavado: object, acabado: object }}
 */
export function inestabilidadDelBarrido(parametros, barrido) {
  const valores = valoresDelBarrido(barrido)
  const { parametro } = barrido
  const minimo = Math.min(...valores)
  const maximo = Math.max(...valores)
  const lambda = parametros.llegadasPorHora
  const acabadoPromedio = acabadoPromedioDeLosParametros(parametros)

  const criticos = {
    lavado: {
      llegadasPorHora: parametros.placas * (60 / parametros.lavadoMin),
      lavadoMin: (parametros.placas * 60) / lambda,
      placas: (lambda * parametros.lavadoMin) / 60,
    },
    acabado: {
      llegadasPorHora: parametros.puestos * (60 / acabadoPromedio),
      acabadoMin: (parametros.puestos * 60) / lambda,
      puestos: (lambda * acabadoPromedio) / 60,
    },
  }

  const deLaEtapa = (etapa) => {
    const estables = valores.map(
      (valor) => formulasDe(parametrosConElValor(parametros, parametro, valor))[etapa].estable,
    )
    const cambio = estables.findIndex((estable, i) => i > 0 && estable !== estables[i - 1])
    const critico = criticos[etapa][parametro]
    return {
      estables,
      cambio: cambio === -1 ? null : cambio,
      critico: critico !== undefined && critico >= minimo && critico <= maximo ? critico : null,
    }
  }
  return { valores, lavado: deLaEtapa('lavado'), acabado: deLaEtapa('acabado') }
}
