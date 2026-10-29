/**
 * El texto de cada gráfica para quien no la ve (su descripción) y sus datos como
 * tabla. Salen de los mismos modelos que dibujan las gráficas, así que dicen
 * exactamente los mismos números. Está aparte de los componentes para poder
 * probarlo con Node.
 */

import { comoNumero } from '../components/formato.js'
import { ROTULO_SIN_PUESTO } from './tiemposDeLaVisita.js'

/** Cuántas filas, como mucho, tiene la tabla de las dos filas (más repartidas, nunca todas). */
export const MAXIMO_DE_FILAS_DE_LA_TABLA = 24

const conPorcentaje = (proporcion) => `${comoNumero(proporcion * 100, 1)} %`
const conMinutos = (minutos) => `${comoNumero(minutos, 2)} min`

/**
 * Elige hasta `maximo` elementos repartidos a lo largo de toda la lista, siempre
 * el primero y el último.
 */
export function repartir(lista, maximo = MAXIMO_DE_FILAS_DE_LA_TABLA) {
  if (lista.length <= maximo) {
    return [...lista]
  }
  const indices = new Set()
  for (let i = 0; i < maximo; i += 1) {
    indices.add(Math.round((i * (lista.length - 1)) / (maximo - 1)))
  }
  return [...indices].sort((a, b) => a - b).map((indice) => lista[indice])
}

/* --------------------------------------------------- las dos filas en el tiempo -- */

/** @param {Array<{ minuto: number, colaLavado: number, colaAcabado: number }>} puntos */
export function descripcionDeLasFilas(puntos) {
  if (puntos.length < 2) {
    return 'Gráfica de líneas con las motos esperando en cada fila a lo largo del tiempo simulado. Todavía no hay datos.'
  }
  const ultimo = puntos[puntos.length - 1]
  const maximo = (clave) => Math.max(...puntos.map((punto) => punto[clave]))
  return (
    'Gráfica de líneas con las motos esperando en la fila del lavado y en la fila del acabado a lo ' +
    `largo de ${comoNumero(ultimo.minuto / 60, 1)} horas simuladas. Al final hay ` +
    `${ultimo.colaLavado} motos en la fila 1 y ${ultimo.colaAcabado} en la fila 2; el máximo fue de ` +
    `${maximo('colaLavado')} en la fila 1 y de ${maximo('colaAcabado')} en la fila 2.`
  )
}

export function tablaDeLasFilas(puntos) {
  return {
    columnas: ['Horas simuladas', 'Motos en la fila 1', 'Motos en la fila 2'],
    filas: repartir(puntos).map((punto) => [
      comoNumero(punto.minuto / 60, 1),
      String(punto.colaLavado),
      String(punto.colaAcabado),
    ]),
    nota:
      puntos.length > MAXIMO_DE_FILAS_DE_LA_TABLA
        ? `Son ${puntos.length} puntos; la tabla muestra ${MAXIMO_DE_FILAS_DE_LA_TABLA} repartidos a lo largo de todo el tiempo.`
        : null,
  }
}

/* ------------------------------------------------------------------- la ocupación -- */

function extremosDe(etapa) {
  const orden = [...etapa.servidores].sort((a, b) => b.proporcion - a.proporcion)
  return { masOcupado: orden[0], menosOcupado: orden[orden.length - 1] }
}

/** @param {{ vacia: boolean, etapas: Array }} modelo el de `ocupacion.js` */
export function descripcionDeLaOcupacion(modelo) {
  if (modelo.vacia) {
    return 'Barras horizontales con el porcentaje del tiempo que estuvo ocupada cada placa y cada puesto. Todavía no hay datos.'
  }
  const frases = modelo.etapas.map((etapa) => {
    const { masOcupado, menosOcupado } = extremosDe(etapa)
    const quienes = etapa.id === 'lavado' ? 'Placas' : 'Puestos'
    return (
      `${quienes}: la más ocupada es ${masOcupado.nombre} con ${conPorcentaje(masOcupado.proporcion)} ` +
      `y la menos ocupada ${menosOcupado.nombre} con ${conPorcentaje(menosOcupado.proporcion)}; ` +
      `promedio ${conPorcentaje(etapa.promedio)}.`
    )
  })
  return `Barras horizontales con el porcentaje del tiempo que estuvo ocupada cada placa y cada puesto. ${frases.join(' ')}`
}

export function tablaDeLaOcupacion(modelo) {
  const filas = []
  for (const etapa of modelo.etapas) {
    for (const servidor of etapa.servidores) {
      filas.push([etapa.titulo, servidor.nombre, conPorcentaje(servidor.proporcion)])
    }
    filas.push([etapa.titulo, 'Promedio de la etapa', conPorcentaje(etapa.promedio)])
  }
  return { columnas: ['Etapa', 'Servidor', 'Ocupado'], filas, nota: modelo.nota }
}

/* ---------------------------------------------------------------- el desglose -- */

/** @param {{ vacia: boolean, barras: Array }} modelo el de `desgloseDelTiempo.js` */
export function descripcionDelDesglose(modelo) {
  if (modelo.vacia) {
    return 'Barra apilada con en qué se va el tiempo promedio de una moto: espera en la fila 1, lavado, espera en la fila 2 y acabado. Todavía no hay datos.'
  }
  const frases = modelo.barras.map((barra) => {
    const tramos = barra.tramos.map((tramo) => `${tramo.nombre.toLowerCase()} ${conMinutos(tramo.minutos)}`)
    return `${barra.nombre}: ${tramos.join(', ')}; total ${conMinutos(barra.total)}.`
  })
  return (
    'Barra apilada con en qué se va el tiempo promedio de una moto en el lavadero, en minutos. ' +
    frases.join(' ')
  )
}

export function tablaDelDesglose(modelo) {
  const nombresDeTramos = modelo.barras[0]?.tramos.map((tramo) => tramo.nombre) ?? []
  const filas = nombresDeTramos.map((nombre, i) => [
    nombre,
    ...modelo.barras.map((barra) => comoNumero(barra.tramos[i].minutos, 2)),
  ])
  filas.push(['Total', ...modelo.barras.map((barra) => comoNumero(barra.total, 2))])
  return {
    columnas: ['Tramo (min)', ...modelo.barras.map((barra) => barra.nombre)],
    filas,
    nota: modelo.notas?.length ? modelo.notas.join(' ') : null,
  }
}

/* ------------------------------------------------------- el tiempo de cada moto -- */

/** @param {object} tiempos lo que entrega `tiemposDeLaVisita` */
export function descripcionDeLasMotos(tiempos) {
  const total = tiempos.motos.length
  if (tiempos.vacia) {
    return `Barras con el tiempo que estuvo cada una de las ${total} motos en el lavadero, de la llegada a la salida. Todavía no ha salido ninguna.`
  }
  const conTiempo = tiempos.motos.filter((moto) => moto.minutos !== null)
  const masRapida = conTiempo.reduce((a, b) => (b.minutos < a.minutos ? b : a))
  const masLenta = conTiempo.reduce((a, b) => (b.minutos > a.minutos ? b : a))
  const sinPuesto = conTiempo.filter((moto) => moto.sinPuesto).map((moto) => moto.n)
  const frases = [
    `Han salido ${tiempos.cuantasSalieron} de ${total} motos; el promedio es ${conMinutos(tiempos.promedio)}.`,
    `La más rápida fue la moto ${masRapida.n} con ${conMinutos(masRapida.minutos)} y la más lenta la moto ${masLenta.n} con ${conMinutos(masLenta.minutos)}.`,
  ]
  if (sinPuesto.length > 0) {
    frases.push(`Las motos ${sinPuesto.join(' y ')} ${ROTULO_SIN_PUESTO.replace('salió', 'salieron')}.`)
  }
  return `Barras con el tiempo que estuvo cada moto en el lavadero, de la llegada a la salida. ${frases.join(' ')}`
}

export function tablaDeLasMotos(tiempos) {
  return {
    columnas: ['Moto', 'Tiempo en el lavadero (min)', 'Nota'],
    filas: tiempos.motos.map((moto) => [
      String(moto.n),
      moto.minutos === null ? '—' : comoNumero(moto.minutos, 0),
      moto.sinPuesto ? ROTULO_SIN_PUESTO : '',
    ]),
    nota: tiempos.promedio === null ? null : `Promedio de las que ya salieron: ${conMinutos(tiempos.promedio)}.`,
  }
}
