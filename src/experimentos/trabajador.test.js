import { describe, expect, it } from 'vitest'

import { ACABADO_PLAN_MIN, LAVADO_MIN, LLEGADAS_POR_HORA, PROPORCION_PLAN_EXACTA } from '../data/parametros.js'
import { acumuladoVacio, acumularEvento, armarResultados, ejecutarLote } from './lote.js'
import { MODO_REPLICAS } from './plan.js'
import { atender } from './trabajador.js'

const solicitud = (cambios = {}) => ({
  modo: MODO_REPLICAS,
  parametros: {
    llegadasPorHora: LLEGADAS_POR_HORA,
    lavadoMin: LAVADO_MIN,
    acabadoPlanMin: { ...ACABADO_PLAN_MIN },
    proporcionPlan: { ...PROPORCION_PLAN_EXACTA },
    placas: 6,
    puestos: 5,
    modoAcabado: 'M/M/s',
  },
  semillaBase: 1,
  horas: 100,
  calentamientoPct: 10,
  replicas: 5,
  lotes: 10,
  mediaAcumulada: false,
  ...cambios,
})

describe('el trabajador', () => {
  it('contesta con un avance por pieza y un fin', () => {
    const mensajes = []
    atender({ tipo: 'iniciar', solicitud: solicitud() }, (m) => mensajes.push(m))
    expect(mensajes.map((m) => m.tipo)).toEqual(['avance', 'avance', 'avance', 'avance', 'avance', 'fin'])
    expect(mensajes.at(-1)).toEqual({ tipo: 'fin', estado: 'terminado', hechas: 5, pedidas: 5 })
  })

  it('sus mensajes cuentan igual que ejecutar el lote directamente', () => {
    const mensajes = []
    atender({ tipo: 'iniciar', solicitud: solicitud() }, (m) => mensajes.push(m))
    let porElTrabajador = acumuladoVacio()
    for (const m of mensajes) if (m.tipo === 'avance') porElTrabajador = acumularEvento(porElTrabajador, m.evento)

    let directo = acumuladoVacio()
    ejecutarLote(solicitud(), { alAvanzar: (e) => { directo = acumularEvento(directo, e) } })
    expect(armarResultados(solicitud(), porElTrabajador)).toEqual(armarResultados(solicitud(), directo))
  })

  it('los mensajes se pueden copiar con structuredClone, como hace postMessage', () => {
    const mensajes = []
    atender({ tipo: 'iniciar', solicitud: solicitud({ mediaAcumulada: true }) }, (m) => mensajes.push(m))
    for (const m of mensajes) expect(structuredClone(m)).toEqual(m)
  })

  it('una solicitud que no sirve contesta con un error en español, sin caerse', () => {
    const mensajes = []
    atender({ tipo: 'iniciar', solicitud: solicitud({ replicas: 4 }) }, (m) => mensajes.push(m))
    expect(mensajes).toEqual([{ tipo: 'error', mensaje: expect.stringContaining('5 a 100') }])
  })

  it('un mensaje desconocido contesta con un error', () => {
    const mensajes = []
    atender({ tipo: 'otra-cosa' }, (m) => mensajes.push(m))
    expect(mensajes[0].tipo).toBe('error')
    atender(undefined, (m) => mensajes.push(m))
    expect(mensajes).toHaveLength(2)
  })

  it('importarlo fuera de un trabajador no hace nada', () => {
    expect(typeof self).toBe('undefined')
  })
})
