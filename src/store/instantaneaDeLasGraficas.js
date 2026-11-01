/**
 * Lo que necesitan las gráficas, en una sola instantánea, y los modelos que se
 * arman a partir de ella.
 *
 * `tomarLaInstantanea` lee del store lo justo (los puntos, las métricas, los
 * parámetros, el modo y, en la visita, el detalle del reproductor); se llama
 * como mucho cuatro veces por segundo (ver `frenoDeActualizacion.js`).
 * `modelosDeLasGraficas` es una función pura de esa instantánea: cada modelo
 * trae si está vacío, el texto que lo describe y, como función, su tabla de
 * datos, que solo se arma cuando alguien la abre. Está aparte de los
 * componentes para probar los números con Node.
 */

import { INICIO_OBSERVACION_MIN, MOTOS_VISITA } from '../data/visita.js'
import {
  descripcionDeLaOcupacion,
  descripcionDeLasFilas,
  descripcionDeLasMotos,
  descripcionDelDesglose,
  tablaDeLaOcupacion,
  tablaDeLasFilas,
  tablaDeLasMotos,
  tablaDelDesglose,
} from './descripcionesDeLasGraficas.js'
import { desgloseDeLaSimulacion, desgloseDeLaVisita } from './desgloseDelTiempo.js'
import { metricasCalculadas } from './metricas.js'
import { ocupacionDeLaSimulacion, ocupacionDeLaVisita } from './ocupacion.js'
import { MODO_VISITA } from './simulacion.js'
import { tiemposDeLaVisita } from './tiemposDeLaVisita.js'

export const MENSAJE_SIN_DATOS = 'Los datos aparecerán cuando la simulación avance.'
export const MENSAJE_SIN_MOTOS_QUE_SALIERON = 'Aparecerá cuando salga la primera moto.'

/** El detalle de la visita; si el reproductor falla, las gráficas siguen sin él. */
function detalleSeguro(motor) {
  try {
    return motor.detalleDeLaEtapa2()
  } catch {
    return null
  }
}

/** Lo que las gráficas leen del store, y nada más. */
export function tomarLaInstantanea(estado) {
  const enLaVisita = estado.modo === MODO_VISITA
  return {
    modo: estado.modo,
    parametros: estado.parametros,
    puntos: estado.puntos,
    metricas: estado.metricas,
    relojMin: estado.resumen.relojMin,
    placasActivas: estado.resumen.placasActivas,
    puestosActivos: estado.resumen.puestosActivos,
    // El detalle de los puestos solo existe en el reproductor de la visita.
    detalle: enLaVisita ? detalleSeguro(estado.motor) : null,
  }
}

/**
 * Los modelos de las gráficas de la pestaña, en el orden en que se ven. La de
 * las motos de la visita solo existe en el modo visita.
 *
 * @param {object} instantanea lo que entrega `tomarLaInstantanea`
 */
export function modelosDeLasGraficas(instantanea) {
  const { modo, parametros, puntos, metricas, relojMin, detalle, placasActivas, puestosActivos } =
    instantanea
  const enLaVisita = modo === MODO_VISITA

  const filas = {
    id: 'filas',
    titulo: 'Las dos filas en el tiempo',
    vacia: puntos.length < 2,
    mensajeVacio: MENSAJE_SIN_DATOS,
    puntos,
    descripcion: descripcionDeLasFilas(puntos),
    tabla: () => tablaDeLasFilas(puntos),
  }

  const ocupacionModelo = enLaVisita
    ? ocupacionDeLaVisita({
        motos: MOTOS_VISITA,
        detalle,
        inicioMin: INICIO_OBSERVACION_MIN,
        relojMin,
        placas: parametros.placas,
        puestos: parametros.puestos,
      })
    : ocupacionDeLaSimulacion(metricas)
  const ocupacion = {
    id: 'ocupacion',
    titulo: 'Ocupación de cada servidor',
    mensajeVacio: MENSAJE_SIN_DATOS,
    ...ocupacionModelo,
    descripcion: descripcionDeLaOcupacion(ocupacionModelo),
    tabla: () => tablaDeLaOcupacion(ocupacionModelo),
  }

  const desgloseModelo = enLaVisita
    ? desgloseDeLaVisita({ motos: MOTOS_VISITA, detalle, inicioMin: INICIO_OBSERVACION_MIN, relojMin })
    : desgloseDeLaSimulacion({
        metricas,
        calculadas: metricasCalculadas(parametros, { placasActivas, puestosActivos }),
        parametros,
      })
  const desglose = {
    id: 'desglose',
    titulo: 'En qué se va el tiempo promedio',
    mensajeVacio: enLaVisita ? MENSAJE_SIN_MOTOS_QUE_SALIERON : MENSAJE_SIN_DATOS,
    ...desgloseModelo,
    descripcion: descripcionDelDesglose(desgloseModelo),
    tabla: () => tablaDelDesglose(desgloseModelo),
  }

  const graficas = [filas, ocupacion, desglose]

  if (enLaVisita) {
    const tiempos = tiemposDeLaVisita({
      motos: MOTOS_VISITA,
      detalle,
      inicioMin: INICIO_OBSERVACION_MIN,
      relojMin,
    })
    graficas.push({
      id: 'motos',
      titulo: 'Tiempo de cada moto en el lavadero',
      mensajeVacio: MENSAJE_SIN_MOTOS_QUE_SALIERON,
      ...tiempos,
      descripcion: descripcionDeLasMotos(tiempos),
      tabla: () => tablaDeLasMotos(tiempos),
    })
  }

  return graficas
}
