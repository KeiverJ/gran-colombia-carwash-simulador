import { describe, expect, it, vi } from 'vitest'

import { useServidorSenalado } from '../store/servidorSenalado.js'
import {
  alHacerClicEnUnServidor,
  esUnArrastre,
  textoDelRotulo,
  UMBRAL_DE_ARRASTRE_PX,
} from './interaccionConServidores.js'

const abiertas = (n) => Array(n).fill('activo')

describe('el clic sobre un servidor ignora los arrastres', () => {
  it('el umbral es de 2 píxeles', () => {
    expect(UMBRAL_DE_ARRASTRE_PX).toBe(2)
  })

  it('hasta 2 px es un clic; más de 2 px es un arrastre', () => {
    expect(esUnArrastre(0)).toBe(false)
    expect(esUnArrastre(1.9)).toBe(false)
    expect(esUnArrastre(2)).toBe(false)
    expect(esUnArrastre(2.01)).toBe(true)
    expect(esUnArrastre(40)).toBe(true)
  })

  it('un delta que no es un número cuenta como arrastre: no se cierra nada por error', () => {
    expect(esUnArrastre(undefined)).toBe(true)
    expect(esUnArrastre(Number.NaN)).toBe(true)
  })

  it('un clic pide alternar el servidor y un arrastre no pide nada', () => {
    const alternarServidor = vi.fn()
    expect(alHacerClicEnUnServidor({ delta: 1, etapa: 'lavado', indice: 2, alternarServidor })).toBe(true)
    expect(alternarServidor).toHaveBeenCalledWith('lavado', 2)
    alternarServidor.mockClear()
    expect(alHacerClicEnUnServidor({ delta: 25, etapa: 'lavado', indice: 2, alternarServidor })).toBe(false)
    expect(alternarServidor).not.toHaveBeenCalled()
  })
})

describe('el rótulo de abrir y cerrar', () => {
  const base = { enLaVisita: false, enCorridaLarga: false }

  it('en un servidor abierto ofrece cerrarlo: placa y puesto', () => {
    expect(textoDelRotulo({ ...base, etapa: 'lavado', indice: 2, estados: abiertas(6) })).toBe('Cerrar placa 3')
    expect(textoDelRotulo({ ...base, etapa: 'acabado', indice: 0, estados: abiertas(3) })).toBe('Cerrar puesto 1')
  })

  it('en uno cerrado o cerrándose ofrece abrirlo', () => {
    const estados = ['activo', 'activo', 'cerrado', 'cerrandose', 'activo', 'activo']
    expect(textoDelRotulo({ ...base, etapa: 'lavado', indice: 2, estados })).toBe('Abrir placa 3')
    expect(textoDelRotulo({ ...base, etapa: 'lavado', indice: 3, estados })).toBe('Abrir placa 4')
  })

  it('en el último activo explica por qué no se cierra', () => {
    const estados = ['cerrado', 'cerrado', 'activo']
    expect(textoDelRotulo({ ...base, etapa: 'lavado', indice: 2, estados })).toBe(
      'Placa 3: es la única abierta, no se puede cerrar',
    )
    expect(textoDelRotulo({ ...base, etapa: 'acabado', indice: 0, estados: ['activo'] })).toBe(
      'Puesto 1: es el único abierto, no se puede cerrar',
    )
  })

  it('uno cerrándose no cuenta como activo para decidir cuál es el último', () => {
    const estados = ['cerrandose', 'activo']
    expect(textoDelRotulo({ ...base, etapa: 'lavado', indice: 1, estados })).toContain('no se puede cerrar')
  })

  it('en la visita y en la corrida larga no ofrece nada', () => {
    const datos = { etapa: 'lavado', indice: 0, estados: abiertas(6) }
    expect(textoDelRotulo({ ...datos, enLaVisita: true, enCorridaLarga: false })).toBeNull()
    expect(textoDelRotulo({ ...datos, enLaVisita: false, enCorridaLarga: true })).toBeNull()
  })

  it('un servidor que no existe no tiene rótulo', () => {
    expect(textoDelRotulo({ ...base, etapa: 'lavado', indice: 9, estados: abiertas(6) })).toBeNull()
    expect(textoDelRotulo({ ...base, etapa: 'otra', indice: 0, estados: abiertas(6) })).toBeNull()
  })
})

describe('el servidor señalado', () => {
  it('señalar uno y soltarlo; soltar otro no lo quita', () => {
    const { senalar, soltar, limpiar } = useServidorSenalado.getState()
    limpiar()
    senalar('lavado', 2)
    expect(useServidorSenalado.getState().senalado).toEqual({ etapa: 'lavado', indice: 2 })
    soltar('lavado', 3)
    expect(useServidorSenalado.getState().senalado).toEqual({ etapa: 'lavado', indice: 2 })
    soltar('lavado', 2)
    expect(useServidorSenalado.getState().senalado).toBeNull()
  })

  it('pasar de uno a otro sin soltar el primero deja el segundo', () => {
    const { senalar, soltar, limpiar } = useServidorSenalado.getState()
    limpiar()
    senalar('lavado', 0)
    senalar('acabado', 1)
    soltar('lavado', 0)
    expect(useServidorSenalado.getState().senalado).toEqual({ etapa: 'acabado', indice: 1 })
    limpiar()
  })
})
