import { createHash } from 'node:crypto'

import { describe, expect, it } from 'vitest'

import referencia from './referencia.json'
import referenciaLarga from './referenciaLarga.json'
import { crearSimulador } from './simulador.js'

/**
 * Sin cerrar ningún servidor, el motor da exactamente lo mismo que antes de que
 * existieran los cierres. `referencia.json` trae corridas cortas con la foto
 * completa; `referenciaLarga.json`, corridas de más de mil horas con la
 * huella de la foto y todas las métricas. Ambas se guardaron con el motor de
 * antes del cambio: si alguna de estas pruebas falla, algo cambió en los
 * resultados.
 */

/**
 * La foto tal como era antes de los cierres: sin el `estado` de cada servidor ni
 * el largo de las filas. Las referencias se guardaron así.
 */
function fotoComoAntes(foto) {
  const sinEstado = ({ numero, moto, libre }) => ({ numero, moto, libre })
  const { largoColaLavado: _largoLavado, largoColaAcabado: _largoAcabado, ...resto } = foto
  return { ...resto, placas: foto.placas.map(sinEstado), puestos: foto.puestos.map(sinEstado) }
}

const huella = (foto) => createHash('sha1').update(JSON.stringify(fotoComoAntes(foto))).digest('hex')

const sinOcupacionPorServidor = (metricas) => {
  const { ocupacionPorServidor: _lavado, ...lavado } = metricas.lavado
  const { ocupacionPorServidor: _acabado, ...acabado } = metricas.acabado
  return { ...metricas, lavado, acabado }
}

describe('corridas cortas: la foto y las métricas son las de antes', () => {
  it.each(referencia.map((caso) => [caso.nombre, caso]))('%s', (_nombre, caso) => {
    const motor = crearSimulador(caso.opciones)
    for (const { accion, cantidad, estado, metricas } of caso.registros) {
      motor[accion](cantidad)
      expect(fotoComoAntes(motor.estado())).toEqual(estado)
      expect(sinOcupacionPorServidor(motor.metricas())).toEqual(metricas)
    }
  })
})

describe('corridas largas: mil horas con 6/3, 5/4 y 7/5 y los dos modos de acabado', () => {
  it('la referencia trae las corridas esperadas', () => {
    expect(referenciaLarga).toHaveLength(6)
  })

  it.each(referenciaLarga.map((caso) => [caso.nombre, caso]))('por pasos: %s', (_nombre, caso) => {
    const motor = crearSimulador(caso.opciones)
    for (const { accion, cantidad, huellaDeLaFoto, metricas } of caso.registros) {
      motor[accion](cantidad)
      expect(huella(motor.estado())).toBe(huellaDeLaFoto)
      expect(motor.metricas()).toEqual(metricas)
    }
  })

  it.each(referenciaLarga.map((caso) => [caso.nombre, caso]))('de golpe: %s', (_nombre, caso) => {
    // Todo el recorrido de una vez: los sucesos son los mismos, así que la foto
    // final es idéntica; las métricas, con la tolerancia del redondeo, porque
    // cortar el intervalo puede mover la última cifra de una suma.
    const motor = crearSimulador(caso.opciones)
    const minutos = caso.registros.reduce(
      (suma, { accion, cantidad }) => suma + (accion === 'correrHoras' ? cantidad * 60 : cantidad),
      0,
    )
    motor.avanzar(minutos)
    const ultimo = caso.registros.at(-1)
    expect(huella(motor.estado())).toBe(ultimo.huellaDeLaFoto)
    for (const etapa of ['lavado', 'acabado']) {
      const obtenida = motor.metricas()[etapa]
      const esperada = ultimo.metricas[etapa]
      for (const clave of ['rho', 'l', 'lq', 'wMin', 'wqMin']) {
        expect(obtenida[clave]).toBeCloseTo(esperada[clave], 6)
      }
      expect(obtenida.motosContadas).toBe(esperada.motosContadas)
    }
  })
})
