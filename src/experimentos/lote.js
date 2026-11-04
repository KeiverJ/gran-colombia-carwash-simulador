/**
 * Ejecución de un lote de experimentos y armado de sus resultados.
 *
 * `ejecutarLote` recorre los trabajos de la solicitud en orden, uno tras otro,
 * y avisa de cada pieza terminada con un «evento». Los eventos son datos simples
 * (caben en un `postMessage`), así que la misma función corre dentro del
 * trabajador y en las pruebas con Node. Quien recibe los eventos los junta con
 * `acumularEvento` y, en cualquier momento (también con el lote a medias o
 * cancelado), arma las cifras con `armarResultados`.
 *
 * Cada trabajo depende solo de su semilla y de sus parámetros: el orden no
 * cambia ningún resultado. JavaScript puro.
 */

import { ESCENARIOS } from '../data/escenarios.js'
import { correrReplica } from './corrida.js'
import { correrObservacion } from './observacion.js'
import { correrPorLotes } from './porLotes.js'
import {
  MODO_BARRIDO,
  MODO_ESCENARIOS,
  MODO_LOTES,
  MODO_REPLICAS,
  horasTotales,
  parametrosConElValor,
  trabajosDe,
  validarSolicitud,
} from './plan.js'
import { resumirLotes, resumirReplicas } from './resumen.js'

/** Cuántas piezas de avance tiene un lote (una por réplica, por lote de medias y por observación). */
export function piezasDeAvance(solicitud) {
  const piezas = trabajosDe(solicitud).map((t) => (t.tipo === 'lotes' ? t.lotes : 1))
  return piezas.reduce((suma, p) => suma + p, 0)
}

/**
 * Corre el lote.
 *
 * @param {object} solicitud ver `plan.js`
 * @param {object} [opciones]
 * @param {(evento: object) => void} [opciones.alAvanzar] se llama al terminar cada pieza
 * @param {() => boolean} [opciones.estaCancelado] se consulta antes de cada pieza
 * @returns {{ estado: 'terminado' | 'cancelado', hechas: number, pedidas: number }}
 */
export function ejecutarLote(solicitud, { alAvanzar = () => {}, estaCancelado = () => false } = {}) {
  const validacion = validarSolicitud(solicitud)
  if (!validacion.valida) {
    throw new RangeError(validacion.mensaje)
  }
  const pedidas = piezasDeAvance(solicitud)
  const horasPedidas = horasTotales(solicitud)
  let hechas = 0
  let horasHechas = 0

  const avisar = (evento, horas) => {
    hechas += 1
    horasHechas += horas
    alAvanzar({ ...evento, hechas, pedidas, horasHechas, horasPedidas })
  }

  for (const trabajo of trabajosDe(solicitud)) {
    if (estaCancelado()) {
      return { estado: 'cancelado', hechas, pedidas }
    }
    if (trabajo.tipo === 'replica') {
      avisar(
        {
          tipo: 'replica',
          clave: trabajo.clave,
          indice: trabajo.indice,
          resultado: correrReplica(trabajo),
        },
        trabajo.horas,
      )
    } else if (trabajo.tipo === 'observacion') {
      avisar({ tipo: 'observacion', serie: correrObservacion(trabajo) }, trabajo.horas)
    } else if (trabajo.tipo === 'lotes') {
      const { terminado } = correrPorLotes(trabajo, {
        alLote: ({ horas, ...lote }) => avisar({ tipo: 'lote', ...lote }, horas),
        estaCancelado,
      })
      if (!terminado) {
        return { estado: 'cancelado', hechas, pedidas }
      }
    }
  }
  return { estado: hechas === pedidas ? 'terminado' : 'cancelado', hechas, pedidas }
}

/* ---------------------------------------------------------- acumular eventos -- */

/** Un acumulado vacío para la solicitud. */
export function acumuladoVacio() {
  return { grupos: {}, hechas: 0, horasHechas: 0 }
}

/**
 * Suma un evento al acumulado y devuelve uno nuevo (el anterior no cambia).
 * Un evento repetido (misma clave e índice) reemplaza al anterior.
 */
export function acumularEvento(acumulado, evento) {
  const siguiente = {
    ...acumulado,
    hechas: evento.hechas ?? acumulado.hechas + 1,
    horasHechas: evento.horasHechas ?? acumulado.horasHechas,
  }
  if (evento.tipo === 'replica') {
    const clave = String(evento.clave)
    const lista = (acumulado.grupos[clave] ?? []).filter((r) => r.indice !== evento.indice)
    lista.push({ indice: evento.indice, ...evento.resultado })
    lista.sort((a, b) => a.indice - b.indice)
    siguiente.grupos = { ...acumulado.grupos, [clave]: lista }
  } else if (evento.tipo === 'observacion') {
    siguiente.grupos = { ...acumulado.grupos, observacion: evento.serie }
  } else if (evento.tipo === 'lote') {
    const lista = (acumulado.grupos.lotes ?? []).filter((l) => l.numero !== evento.numero)
    lista.push({ numero: evento.numero, medias: evento.medias, filas: evento.filas })
    lista.sort((a, b) => a.numero - b.numero)
    siguiente.grupos = { ...acumulado.grupos, lotes: lista }
  }
  return siguiente
}

/* ---------------------------------------------------------- armar resultados -- */

/** Los resultados del modo Réplicas con lo terminado hasta ahora. */
function resultadosDeReplicas(solicitud, acumulado) {
  const replicas = acumulado.grupos.replicas ?? []
  return {
    pedidas: solicitud.replicas,
    hechas: replicas.length,
    replicas,
    resumen: replicas.length > 0 ? resumirReplicas(replicas, solicitud.parametros) : null,
  }
}

/** Los resultados de Medias por lotes con los lotes terminados hasta ahora. */
function resultadosDeLosLotes(solicitud, acumulado) {
  const lotes = acumulado.grupos.lotes ?? []
  return {
    pedidos: solicitud.lotes,
    hechos: lotes.length,
    lotes,
    resumen: lotes.length > 0 ? resumirLotes(lotes, solicitud.parametros) : null,
  }
}

/** Los resultados del barrido: un punto por valor, con las réplicas que alcanzaron a terminar. */
function resultadosDelBarrido(solicitud, acumulado) {
  const puntos = []
  const { parametro } = solicitud.barrido
  for (const trabajo of trabajosDe(solicitud)) {
    if (trabajo.indice !== 0) continue
    const replicas = acumulado.grupos[String(trabajo.clave)] ?? []
    const parametros = parametrosConElValor(solicitud.parametros, parametro, trabajo.clave)
    puntos.push({
      valor: trabajo.clave,
      parametros,
      pedidas: solicitud.replicas,
      hechas: replicas.length,
      replicas,
      resumen: replicas.length > 0 ? resumirReplicas(replicas, parametros) : null,
    })
  }
  return { pedidas: solicitud.replicas, puntos }
}

/** Los resultados de Comparar escenarios: un bloque por escenario. */
function resultadosDeLosEscenarios(solicitud, acumulado) {
  const escenarios = ESCENARIOS.map((escenario) => {
    const parametros = { ...solicitud.parametros, placas: escenario.placas, puestos: escenario.puestos }
    const replicas = acumulado.grupos[escenario.id] ?? []
    return {
      id: escenario.id,
      nombre: escenario.nombre,
      parametros,
      pedidas: solicitud.replicas,
      hechas: replicas.length,
      replicas,
      resumen: replicas.length > 0 ? resumirReplicas(replicas, parametros) : null,
    }
  })
  return { pedidas: solicitud.replicas, escenarios }
}

/**
 * Las cifras de un lote con lo que haya llegado, también si se canceló. El
 * resultado dice con qué parámetros se obtuvo (`solicitud`) para poder
 * repetirlo.
 */
export function armarResultados(solicitud, acumulado) {
  const base = {
    modo: solicitud.modo,
    solicitud,
    piezasHechas: acumulado.hechas,
    observacion: acumulado.grupos.observacion ?? null,
  }
  if (solicitud.modo === MODO_REPLICAS) return { ...base, ...resultadosDeReplicas(solicitud, acumulado) }
  if (solicitud.modo === MODO_BARRIDO) return { ...base, ...resultadosDelBarrido(solicitud, acumulado) }
  if (solicitud.modo === MODO_ESCENARIOS) return { ...base, ...resultadosDeLosEscenarios(solicitud, acumulado) }
  if (solicitud.modo === MODO_LOTES) return { ...base, ...resultadosDeLosLotes(solicitud, acumulado) }
  throw new RangeError(`Modo desconocido: ${solicitud.modo}`)
}
