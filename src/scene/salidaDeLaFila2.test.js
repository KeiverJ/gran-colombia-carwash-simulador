import { describe, expect, it } from 'vitest'

import { estorbosDelCamino, losasDe, losasQuePisa, muestrasDe } from './comprobacionesDeCaminos.js'
import { giroMaximoDelCamino } from './medirRecorridos.js'
import { LOCAL, MOTO, posicionEnFila, TOPE_DE_MOTOS_DIBUJADAS } from './posiciones.js'
import {
  caminoDeSalida,
  curvaDeSalida,
  puntoDe,
  sitioEnFila,
  sitioEnPuesto,
  Z_CARRIL_A_LA_FILA_DEL_ACABADO,
} from './trayectorias.js'

const AVENIDAS = ['guaimaral', 'granColombia']
const PLACAS = [5, 6, 7]
const PUESTOS = [3, 4, 5]

/** Todos los lugares de la fila del acabado que se dibujan. */
const LUGARES = Array.from({ length: TOPE_DE_MOTOS_DIBUJADAS.acabado }, (_, i) => i)

/** Hasta dónde llega la línea de la fila por la izquierda: el último lugar donde se dibuja una moto. */
const xDelUltimoLugar = posicionEnFila(TOPE_DE_MOTOS_DIBUJADAS.acabado - 1, 'acabado')[0] - MOTO.largo / 2

describe('la salida directa desde un lugar de la fila del acabado', () => {
  it('cada lugar de la fila, cada avenida, 5, 6 y 7 placas y 3, 4 y 5 puestos: termina en la curva de salida de su avenida', () => {
    for (const avenida of AVENIDAS) {
      for (const lugar of LUGARES) {
        const camino = caminoDeSalida(sitioEnFila('acabado', lugar), avenida)
        expect(camino[0], `lugar ${lugar}`).toEqual(puntoDe(sitioEnFila('acabado', lugar)))
        expect(camino.at(-1), `${avenida}, lugar ${lugar}`).toEqual(curvaDeSalida(avenida).at(-1))
      }
    }
  })

  it('sale de costado al carril de al lado de la fila y lo sigue hasta el pasillo', () => {
    for (const lugar of LUGARES) {
      const [inicio, primero, segundo] = caminoDeSalida(sitioEnFila('acabado', lugar), 'granColombia')
      expect(primero, `lugar ${lugar}`).toEqual([inicio[0], 0, Z_CARRIL_A_LA_FILA_DEL_ACABADO])
      expect(segundo[2], `lugar ${lugar}`).toBeCloseTo(Z_CARRIL_A_LA_FILA_DEL_ACABADO, 9)
      expect(segundo[0], `lugar ${lugar}`).toBeLessThan(primero[0])
    }
  })

  it('no pisa losas, columnas ni postes', () => {
    for (const placas of PLACAS) {
      for (const puestos of PUESTOS) {
        const losas = losasDe(placas, puestos)
        for (const avenida of AVENIDAS) {
          for (const lugar of LUGARES) {
            const camino = caminoDeSalida(sitioEnFila('acabado', lugar), avenida)
            const etiqueta = `${placas} placas, ${puestos} puestos, ${avenida}, lugar ${lugar}`
            expect(losasQuePisa(camino, { losas, paso: 0.25 }), etiqueta).toEqual([])
            expect(estorbosDelCamino(camino, { placas, puestos }, 0.25), etiqueta).toEqual([])
          }
        }
      }
    }
  })

  it('ningún punto queda sobre la línea de la fila fuera de su propio lugar', () => {
    for (const avenida of AVENIDAS) {
      for (const lugar of LUGARES) {
        const camino = caminoDeSalida(sitioEnFila('acabado', lugar), avenida)
        const [xLugar, , zLugar] = camino[0]
        for (const { punto } of muestrasDe(camino, 0.1)) {
          if (punto[0] < xDelUltimoLugar) continue // más allá del último lugar ya no espera nadie (el pasillo)
          const sobreLaLinea = Math.abs(punto[2] - LOCAL.zFilaAcabado) < 0.4
          const lejosDeSuLugar = Math.hypot(punto[0] - xLugar, punto[2] - zLugar) > 0.5
          expect(sobreLaLinea && lejosDeSuLugar, `${avenida}, lugar ${lugar}: ${punto}`).toBe(false)
        }
      }
    }
  })

  it('no da vueltas atrás: no gira más que la salida desde un puesto', () => {
    for (const avenida of AVENIDAS) {
      const tope = Math.max(...[0, 1, 2].map((i) => giroMaximoDelCamino(caminoDeSalida(sitioEnPuesto(i, 3), avenida))))
      for (const lugar of LUGARES) {
        const camino = caminoDeSalida(sitioEnFila('acabado', lugar), avenida)
        expect(giroMaximoDelCamino(camino), `${avenida}, lugar ${lugar}`).toBeLessThanOrEqual(Math.max(tope, 90) + 1e-9)
      }
    }
  })

  it('la salida desde un puesto no cambia: baja recto al corredor de detrás', () => {
    for (const avenida of AVENIDAS) {
      const desde = sitioEnPuesto(1, 3)
      const camino = caminoDeSalida(desde, avenida)
      expect(camino[1][0]).toBeCloseTo(camino[0][0], 9)
    }
  })
})
