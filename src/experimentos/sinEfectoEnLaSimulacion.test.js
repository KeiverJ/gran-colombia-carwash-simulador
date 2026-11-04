import { describe, expect, it } from 'vitest'

import { useSimulacion } from '../store/simulacion.js'
import { ejecutarLote } from './lote.js'
import { MODO_BARRIDO, MODO_ESCENARIOS, MODO_LOTES, MODO_REPLICAS } from './plan.js'

/**
 * Un lote tiene su propio motor y sus propias semillas: no debe tocar la simulación
 * en vivo (su reloj, sus motos, sus métricas, su semilla ni sus parámetros) ni gastar
 * su generador aleatorio.
 */

const solicitud = (modo, parametros) => ({
  modo,
  parametros,
  semillaBase: 1,
  horas: 100,
  calentamientoPct: 10,
  replicas: 5,
  lotes: 10,
  mediaAcumulada: true,
  barrido: { parametro: 'puestos', inicio: 4, fin: 5, paso: 1 },
})

/** Lo que puede cambiar si un lote se mete con la simulación en vivo. */
function huellaDe(estado) {
  return JSON.stringify({
    reloj: estado.foto.relojMin,
    foto: estado.foto,
    metricas: estado.motor.metricas(),
    semilla: estado.semilla,
    parametros: estado.parametros,
    generacion: estado.generacion,
  })
}

describe('un lote no altera la simulación en vivo', () => {
  for (const modo of [MODO_REPLICAS, MODO_BARRIDO, MODO_ESCENARIOS, MODO_LOTES]) {
    it(`${modo}: lanzarlo y cancelarlo deja el reloj, las métricas, la semilla y los parámetros igual`, () => {
      const estado = useSimulacion.getState()
      estado.pausar()
      estado.avanzarCuadro(16)
      const pedido = solicitud(modo, { ...useSimulacion.getState().parametros })

      useSimulacion.getState().motor.avanzar(120)
      const antes = huellaDe(useSimulacion.getState())

      let vistos = 0
      ejecutarLote(pedido, { alAvanzar: () => { vistos += 1 }, estaCancelado: () => vistos >= 3 })
      expect(huellaDe(useSimulacion.getState())).toBe(antes)

      ejecutarLote(pedido)
      expect(huellaDe(useSimulacion.getState())).toBe(antes)
    })
  }

  it('la simulación en vivo sigue dando lo mismo que sin lote', () => {
    const solo = useSimulacion.getState()
    solo.cambiarSemilla(7)
    useSimulacion.getState().motor.avanzar(600)
    const sinLote = JSON.stringify(useSimulacion.getState().motor.metricas())

    useSimulacion.getState().cambiarSemilla(7)
    useSimulacion.getState().motor.avanzar(300)
    ejecutarLote(solicitud(MODO_REPLICAS, { ...useSimulacion.getState().parametros }))
    useSimulacion.getState().motor.avanzar(300)
    expect(JSON.stringify(useSimulacion.getState().motor.metricas())).toBe(sinLote)
  })
})
