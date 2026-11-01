import { readFileSync } from 'node:fs'
import { Box3, Matrix4, Vector3 } from 'three'
import { describe, expect, it } from 'vitest'

import { COLOR_DE_ESCENA, PALETA_DE_ROPA } from '../estilos/colores.js'
import {
  ALTO_DE_LA_CABEZA,
  ALTURA_DE_LA_PERSONA,
  PIEZAS_POR_PERSONA,
  piezasDeLaPersona,
  POSTURAS,
  ropaDeLaPersona,
  TIPOS_DE_PIEZA,
} from './personas.js'

const persona = (extra = {}) => ({ postura: POSTURAS.dePie, x: 0, z: 0, numero: 3, ...extra })
const posicionDe = (matriz) => new Vector3().setFromMatrixPosition(matriz)
/** La caja que ocupa una pieza (una caja unitaria transformada por su matriz). */
const cajaDe = (matriz) => {
  const caja = new Box3()
  for (const x of [-0.5, 0.5]) {
    for (const y of [-0.5, 0.5]) {
      for (const z of [-0.5, 0.5]) caja.expandByPoint(new Vector3(x, y, z).applyMatrix4(matriz))
    }
  }
  return caja
}
const cajaDeLaPersona = (piezas) => {
  const caja = new Box3()
  for (const { tipo, matriz } of piezas) if (tipo !== 'accesorio') caja.union(cajaDe(matriz))
  return caja
}
const numeros = (piezas) => piezas.map((p) => p.matriz.toArray().map((v) => +v.toFixed(5)))

describe('las proporciones de una persona', () => {
  it('la cabeza mide entre 1/7 y 1/8 de la altura de un adulto (sin cabezas de caricatura)', () => {
    expect(ALTURA_DE_LA_PERSONA / ALTO_DE_LA_CABEZA).toBeGreaterThanOrEqual(7)
    expect(ALTURA_DE_LA_PERSONA / ALTO_DE_LA_CABEZA).toBeLessThanOrEqual(8)
    const cabeza = piezasDeLaPersona(persona()).find((p) => p.tipo === 'cabeza')
    const caja = cajaDe(cabeza.matriz)
    expect(caja.max.y - caja.min.y).toBeCloseTo(ALTO_DE_LA_CABEZA, 1)
  })

  it('de pie mide lo que un adulto: entre 1,70 y 1,82 m con la gorra, y pisa el suelo', () => {
    const caja = cajaDeLaPersona(piezasDeLaPersona(persona()))
    expect(caja.min.y).toBeCloseTo(0, 6)
    expect(caja.max.y).toBeGreaterThan(1.7)
    expect(caja.max.y).toBeLessThan(1.82)
  })

  it('el ancho de los hombros es de adulto: entre 40 y 70 cm con los brazos', () => {
    const caja = cajaDeLaPersona(piezasDeLaPersona(persona()))
    expect(caja.max.x - caja.min.x).toBeGreaterThan(0.4)
    expect(caja.max.x - caja.min.x).toBeLessThan(0.7)
  })
})

describe('las tres posturas', () => {
  const piezasEn = (postura, extra = {}) => piezasDeLaPersona(persona({ postura, ...extra }), 1.3)

  it('cada una lleva el número de piezas que dice la tabla, todas de tipos conocidos', () => {
    for (const postura of Object.values(POSTURAS)) {
      const piezas = piezasEn(postura, { herramienta: 'manguera' })
      expect(piezas, postura).toHaveLength(PIEZAS_POR_PERSONA[postura])
      for (const { tipo } of piezas) expect(TIPOS_DE_PIEZA).toContain(tipo)
    }
  })

  it('dan matrices distintas: de pie, sentada y lavando no se parecen', () => {
    const de = (postura) => numeros(piezasEn(postura).filter((p) => p.tipo !== 'accesorio'))
    expect(de(POSTURAS.dePie)).not.toEqual(de(POSTURAS.sentada))
    expect(de(POSTURAS.dePie)).not.toEqual(de(POSTURAS.lavando))
    expect(de(POSTURAS.sentada)).not.toEqual(de(POSTURAS.lavando))
  })

  it('sentada es más baja que de pie y con los muslos horizontales hacia adelante', () => {
    const sentada = cajaDeLaPersona(piezasEn(POSTURAS.sentada))
    const dePie = cajaDeLaPersona(piezasEn(POSTURAS.dePie))
    expect(sentada.max.y).toBeLessThan(dePie.max.y - 0.3)
    const muslo = piezasEn(POSTURAS.sentada).find((p) => p.tipo === 'muslo')
    const caja = cajaDe(muslo.matriz)
    expect(caja.max.z - caja.min.z).toBeGreaterThan(0.35)
    expect(caja.max.y - caja.min.y).toBeLessThan(0.2)
  })

  it('lavando lleva un brazo extendido hacia adelante con la manguera o el trapo', () => {
    const conManguera = piezasEn(POSTURAS.lavando, { herramienta: 'manguera' })
    const accesorio = conManguera.find((p) => p.tipo === 'accesorio')
    expect(accesorio).toBeDefined()
    expect(cajaDe(accesorio.matriz).max.z).toBeGreaterThan(0.5)
    const conTrapo = piezasEn(POSTURAS.lavando, { herramienta: 'trapo' })
    const trapo = cajaDe(conTrapo.find((p) => p.tipo === 'accesorio').matriz)
    expect(trapo.max.z - trapo.min.z).toBeLessThan(0.3)
    // de pie y sentada no llevan nada en la mano
    expect(piezasEn(POSTURAS.dePie).some((p) => p.tipo === 'accesorio')).toBe(false)
    expect(piezasEn(POSTURAS.sentada).some((p) => p.tipo === 'accesorio')).toBe(false)
  })

  it('el que lava se inclina un poco hacia adelante', () => {
    const centro = (postura) => cajaDe(piezasEn(postura).find((p) => p.tipo === 'torso').matriz).getCenter(new Vector3())
    expect(centro(POSTURAS.lavando).z).toBeGreaterThan(centro(POSTURAS.dePie).z + 0.05)
  })
})

describe('el movimiento sutil y la pausa', () => {
  it('con el mismo tiempo (la simulación en pausa) las matrices son idénticas, cuadro tras cuadro', () => {
    for (const postura of Object.values(POSTURAS)) {
      const a = numeros(piezasDeLaPersona(persona({ postura }), 7))
      const b = numeros(piezasDeLaPersona(persona({ postura }), 7))
      expect(a).toEqual(b)
    }
  })

  it('con 0 minutos simulados el tiempo no avanza y nada se mueve', () => {
    expect(numeros(piezasDeLaPersona(persona(), 0))).toEqual(numeros(piezasDeLaPersona(persona(), 0)))
  })

  it('al avanzar el tiempo el brazo se mueve, pero poco: unos grados, no una animación compleja', () => {
    const lavando = (t) => piezasDeLaPersona(persona({ postura: POSTURAS.lavando }), t)
    const a = lavando(0).find((p) => p.tipo === 'accesorio')
    const b = lavando(0.36).find((p) => p.tipo === 'accesorio')
    expect(a.matriz.toArray()).not.toEqual(b.matriz.toArray())
    expect(posicionDe(a.matriz).distanceTo(posicionDe(b.matriz))).toBeLessThan(0.45)
    // y todo el movimiento está acotado: la persona nunca se sale de su sitio
    for (let t = 0; t < 6; t += 0.25) {
      const caja = cajaDeLaPersona(lavando(t))
      expect(caja.max.x - caja.min.x).toBeLessThan(0.9)
      expect(caja.max.y).toBeLessThan(1.85)
    }
  })

  it('cada persona se mueve con su desfase (sale de su número, no de un azar)', () => {
    const a = numeros(piezasDeLaPersona(persona({ numero: 1 }), 1))
    const b = numeros(piezasDeLaPersona(persona({ numero: 2 }), 1))
    expect(a).not.toEqual(b)
  })
})

describe('la ropa', () => {
  it('un trabajador va de negro, con gorra y botas de caucho', () => {
    const colores = ropaDeLaPersona({ tipo: 'trabajador', numero: 0 })
    expect(colores.ropa).toBe(COLOR_DE_ESCENA.ropaDeTrabajo)
    expect(colores.pantalon).toBe(COLOR_DE_ESCENA.ropaDeTrabajo)
    expect(colores.gorra).toBe(COLOR_DE_ESCENA.ropaDeTrabajo)
    expect(colores.botas).toBe(COLOR_DE_ESCENA.botasDeCaucho)
    const piezas = piezasDeLaPersona({ postura: POSTURAS.lavando, x: 0, z: 0, tipo: 'trabajador', numero: 0 }, 0)
    expect(piezas.find((p) => p.tipo === 'torso').color).toBe(COLOR_DE_ESCENA.ropaDeTrabajo)
    expect(piezas.find((p) => p.tipo === 'gorra').color).toBe(COLOR_DE_ESCENA.ropaDeTrabajo)
    expect(piezas.filter((p) => p.tipo === 'bota').every((p) => p.color === COLOR_DE_ESCENA.botasDeCaucho)).toBe(true)
  })

  it('un cliente lleva ropa de la paleta, sin rojo, y la misma persona siempre se viste igual', () => {
    for (let n = 0; n < 12; n += 1) {
      const colores = ropaDeLaPersona({ tipo: 'cliente', numero: n })
      expect(PALETA_DE_ROPA).toContain(colores.ropa)
      expect(PALETA_DE_ROPA).toContain(colores.pantalon)
      expect(colores).toEqual(ropaDeLaPersona({ tipo: 'cliente', numero: n }))
    }
  })

  it('los clientes no se visten todos igual', () => {
    const ropas = new Set(Array.from({ length: 6 }, (_, n) => ropaDeLaPersona({ tipo: 'cliente', numero: n }).ropa))
    expect(ropas.size).toBeGreaterThanOrEqual(5)
  })
})

describe('se dibuja con pocas llamadas', () => {
  it('cuatro personas y cuarenta usan los mismos tipos de pieza: las mismas llamadas de dibujo', () => {
    const tiposDe = (cuantas) => {
      const tipos = new Set()
      for (let i = 0; i < cuantas; i += 1) {
        const postura = Object.values(POSTURAS)[i % 3]
        for (const { tipo } of piezasDeLaPersona(persona({ postura, numero: i, x: i }), 0)) tipos.add(tipo)
      }
      return tipos.size
    }
    expect(tiposDe(4)).toBe(tiposDe(40))
    expect(tiposDe(40)).toBe(TIPOS_DE_PIEZA.length)
  })
})

describe('sin generador aleatorio', () => {
  it.each(['personas.js', 'trabajadores.js', 'Personas.jsx', 'clientes.js'])('%s no usa Math.random ni el generador del motor', (nombre) => {
    let codigo = null
    try {
      codigo = readFileSync(`src/scene/${nombre}`, 'utf8')
    } catch {
      return // todavía no existe: se comprueba cuando exista
    }
    expect(codigo).not.toMatch(/Math\.random/)
    expect(codigo).not.toMatch(/engine\/aleatorio|crearGenerador|generadorAleatorio/)
  })
})

it('una matriz es una Matrix4 de three', () => {
  expect(piezasDeLaPersona(persona())[0].matriz).toBeInstanceOf(Matrix4)
})
