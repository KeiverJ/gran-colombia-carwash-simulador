import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

import { COLOR_DE_ESCENA, COLOR_DE_PLAN, COLOR_DE_SERIE, PALETA_DE_ROPA } from '../estilos/colores.js'
import { coloresQueUsurpan } from '../estilos/distanciaDeColor.js'
import { ASIENTOS_OCUPADOS, CLIENTES_DE_LA_CAJA, MOSTRADOR } from './cafeteria.js'
import { clientesDePieDeRespaldo, clientesSentados, LUGAR_DE_LA_MULTITUD } from './clientes.js'
import { piezasDeLaPersona, POSTURAS, ropaDeLaPersona } from './personas.js'

const RESERVADOS = {
  etapa1: COLOR_DE_SERIE.colaLavado,
  etapa2: COLOR_DE_SERIE.colaAcabado,
  plan1: COLOR_DE_PLAN[1],
  plan2: COLOR_DE_PLAN[2],
  plan3: COLOR_DE_PLAN[3],
  ambar: COLOR_DE_ESCENA.barreraDeCierre,
  rojo: COLOR_DE_ESCENA.rotuloDeAlerta,
}

describe('los clientes sentados en la sala de espera', () => {
  const sentados = clientesSentados()

  it('hay tres, sentados, uno en cada asiento ocupado y mirando al lavadero (−Z)', () => {
    expect(sentados).toHaveLength(3)
    sentados.forEach((cliente, i) => {
      expect(cliente.postura).toBe(POSTURAS.sentada)
      expect(cliente.x).toBe(ASIENTOS_OCUPADOS[i].x)
      expect(cliente.z).toBe(ASIENTOS_OCUPADOS[i].z)
      expect(cliente.rumbo).toBeCloseTo(Math.PI, 9)
    })
  })

  it('su ropa es de colores variados y nunca roja ni parecida a una etapa, un plan o una advertencia', () => {
    const ropas = sentados.map((c) => ropaDeLaPersona(c))
    expect(new Set(ropas.map((r) => r.ropa)).size).toBe(3)
    for (const ropa of ropas) {
      expect(PALETA_DE_ROPA).toContain(ropa.ropa)
      expect(PALETA_DE_ROPA).toContain(ropa.pantalon)
    }
    const colores = Object.fromEntries(ropas.flatMap((r, i) => [[`ropa ${i}`, r.ropa], [`pantalón ${i}`, r.pantalon]]))
    expect(coloresQueUsurpan(colores, RESERVADOS, 22)).toEqual([])
  })

  it('la ropa y la postura salen del número de la persona: la misma persona, siempre igual', () => {
    expect(clientesSentados()).toEqual(sentados)
    expect(ropaDeLaPersona(sentados[0])).toEqual(ropaDeLaPersona(sentados[0]))
    const a = piezasDeLaPersona(sentados[0], 2).map((p) => `${p.tipo}:${p.color}`)
    const b = piezasDeLaPersona(sentados[0], 2).map((p) => `${p.tipo}:${p.color}`)
    expect(a).toEqual(b)
  })

  it('quedan sentados a la altura de una silla: la pelvis a unos 55 cm del piso', () => {
    const [primero] = sentados
    const pelvis = piezasDeLaPersona(primero, 0).find((p) => p.tipo === 'pelvis')
    expect(pelvis.matriz.elements[13]).toBeGreaterThan(0.5)
    expect(pelvis.matriz.elements[13]).toBeLessThan(0.65)
  })
})

describe('los clientes de pie junto a la caja', () => {
  it('la multitud (el modelo «crowd») va junto a la caja, del lado del cliente del mostrador y mirando a él', () => {
    expect(LUGAR_DE_LA_MULTITUD.z).toBeLessThan(MOSTRADOR.z0)
    expect(LUGAR_DE_LA_MULTITUD.rumbo).toBe(0)
    expect(LUGAR_DE_LA_MULTITUD.x).toBeCloseTo(CLIENTES_DE_LA_CAJA.x, 9)
  })

  it('el respaldo en código es un par de clientes de pie, también junto a la caja', () => {
    const respaldo = clientesDePieDeRespaldo()
    expect(respaldo).toHaveLength(2)
    for (const cliente of respaldo) {
      expect(cliente.postura).toBe(POSTURAS.dePie)
      expect(Math.abs(cliente.x - CLIENTES_DE_LA_CAJA.x)).toBeLessThan(1)
      expect(cliente.z).toBeLessThan(MOSTRADOR.z0)
    }
    expect(respaldo[0].x).not.toBe(respaldo[1].x)
  })

  it('no usan el generador aleatorio ni nada del motor', () => {
    const codigo = readFileSync('src/scene/clientes.js', 'utf8')
    expect(codigo).not.toMatch(/Math\.random|engine\//)
  })
})
