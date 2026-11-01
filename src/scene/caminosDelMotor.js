/**
 * Los caminos que traza la escena para los cambios de sitio que produce el motor
 * aleatorio **sin replanificar**: cada uno sale de un sitio de reposo y llega a
 * otro. Sirven de referencia para las pruebas: `caminosDelMotor.json` guarda lo que
 * daba el código antes de pulir los recorridos de la visita, y estos caminos no
 * deben cambiar ni un punto.
 *
 * Es JavaScript puro, solo para pruebas.
 */

import { TOPE_DE_MOTOS_DIBUJADAS } from './posiciones.js'
import {
  caminoDeAjusteEnLaFila,
  caminoDeLlegada,
  caminoDeSalida,
  caminoHacia,
  puntoDe,
  sitioEnFila,
  sitioEnPlaca,
  sitioEnPuesto,
} from './trayectorias.js'

export const AVENIDAS_DE_REFERENCIA = ['guaimaral', 'granColombia']
export const PLACAS_DE_REFERENCIA = [5, 6, 7]
export const PUESTOS_DE_REFERENCIA = [3, 4, 5]

/** Los lugares de la fila que se prueban: la cabeza, los siguientes y el último dibujado. */
const lugaresDe = (etapa) => [...new Set([0, 1, 2, TOPE_DE_MOTOS_DIBUJADAS[etapa] - 1])]

/**
 * @returns {Record<string, number[][]>} nombre del recorrido → puntos del camino
 */
export function caminosDelMotor() {
  const caminos = {}
  const poner = (nombre, camino) => {
    caminos[nombre] = camino.map((punto) => [...punto])
  }

  for (let i = 0; i < TOPE_DE_MOTOS_DIBUJADAS.lavado; i += 1) {
    for (const avenida of AVENIDAS_DE_REFERENCIA) {
      poner(`${avenida} a la fila del lavado, lugar ${i}`, caminoDeLlegada(avenida, sitioEnFila('lavado', i)))
    }
    if (i > 0) {
      poner(
        `fila del lavado, de ${i} a ${i - 1} (ajuste)`,
        caminoDeAjusteEnLaFila(puntoDe(sitioEnFila('lavado', i)), sitioEnFila('lavado', i - 1)),
      )
      poner(`fila del lavado, de ${i} a ${i - 1}`, caminoHacia(sitioEnFila('lavado', i), sitioEnFila('lavado', i - 1)))
    }
  }

  for (const placas of PLACAS_DE_REFERENCIA) {
    for (let p = 0; p < placas; p += 1) {
      const placa = sitioEnPlaca(p, placas)
      for (const avenida of AVENIDAS_DE_REFERENCIA) {
        poner(`${avenida} a la placa ${p + 1} de ${placas}`, caminoDeLlegada(avenida, placa))
      }
      for (const lugar of lugaresDe('lavado')) {
        poner(`fila del lavado, lugar ${lugar}, a la placa ${p + 1} de ${placas}`, caminoHacia(sitioEnFila('lavado', lugar), placa))
      }
      for (const lugar of lugaresDe('acabado')) {
        poner(`placa ${p + 1} de ${placas} a la fila del acabado, lugar ${lugar}`, caminoHacia(placa, sitioEnFila('acabado', lugar)))
      }
    }
  }

  for (const puestos of PUESTOS_DE_REFERENCIA) {
    for (let m = 0; m < puestos; m += 1) {
      const puesto = sitioEnPuesto(m, puestos)
      for (const avenida of AVENIDAS_DE_REFERENCIA) {
        poner(`puesto ${m + 1} de ${puestos} a la salida por ${avenida}`, caminoDeSalida(puesto, avenida))
      }
      for (const lugar of lugaresDe('acabado')) {
        poner(`fila del acabado, lugar ${lugar}, al puesto ${m + 1} de ${puestos}`, caminoHacia(sitioEnFila('acabado', lugar), puesto))
      }
      for (const placas of PLACAS_DE_REFERENCIA) {
        for (let p = 0; p < placas; p += 1) {
          poner(
            `placa ${p + 1} de ${placas} al puesto ${m + 1} de ${puestos}`,
            caminoHacia(sitioEnPlaca(p, placas), puesto),
          )
        }
      }
    }
  }

  for (let k = 1; k < TOPE_DE_MOTOS_DIBUJADAS.acabado; k += 1) {
    poner(`fila del acabado, de ${k} a ${k - 1} (ajuste)`, caminoDeAjusteEnLaFila(puntoDe(sitioEnFila('acabado', k)), sitioEnFila('acabado', k - 1)))
    poner(`fila del acabado, de ${k} a ${k - 1}`, caminoHacia(sitioEnFila('acabado', k), sitioEnFila('acabado', k - 1)))
  }

  return caminos
}
