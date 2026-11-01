import { describe, expect, it } from 'vitest'

import {
  ESTRUCTURA_DE_LA_PLACA,
  estructuraDeLaPlaca,
  medidasDeLaEstructura,
} from './geometriasDelEntorno.js'
import { muestrasDe } from './comprobacionesDeCaminos.js'
import {
  esDeAtras,
  estructuraEnElMundo,
  HOLGURA_DE_LA_RAMPA,
  LARGO_MAXIMO_DE_LA_RAMPA,
  largoDeLaRampa,
} from './rampasDeLasPlacas.js'
import {
  COLUMNAS_DEL_TECHO,
  MOTO,
  posicionDePlaca,
  posicionDePuesto,
  REJILLA_DE_DESAGUE,
  SERVIDOR,
} from './posiciones.js'
import {
  caminoDeSalida,
  caminoHacia,
  sitioDeEntrada,
  sitioEnFila,
  sitioEnPlaca,
  sitioEnPuesto,
} from './trayectorias.js'

const RADIO_DE_LA_COLUMNA = 0.16
const MEDIO_ANCHO_DE_MOTO = MOTO.ancho / 2

/** ¿Se montan dos rectángulos `{ x0, x1, z0, z1 }`? */
const seMontan = (a, b, margen = 0) =>
  a.x0 < b.x1 + margen && a.x1 > b.x0 - margen && a.z0 < b.z1 + margen && a.z1 > b.z0 - margen

const losa = ([x, , z]) => ({
  x0: x - SERVIDOR.ancho / 2,
  x1: x + SERVIDOR.ancho / 2,
  z0: z - SERVIDOR.fondo / 2,
  z1: z + SERVIDOR.fondo / 2,
})

const rejillaDelPiso = {
  x0: REJILLA_DE_DESAGUE.centroX - REJILLA_DE_DESAGUE.ancho / 2,
  x1: REJILLA_DE_DESAGUE.centroX + REJILLA_DE_DESAGUE.ancho / 2,
  z0: REJILLA_DE_DESAGUE.z - REJILLA_DE_DESAGUE.fondo / 2,
  z1: REJILLA_DE_DESAGUE.z + REJILLA_DE_DESAGUE.fondo / 2,
}

const TOTALES = Array.from({ length: 14 }, (_, i) => i + 1)
const PUESTOS = 7

describe('el largo de la rampa', () => {
  it('la de la fila de adelante mide casi lo que pide el diseño (80 cm menos la holgura)', () => {
    expect(largoDeLaRampa(false)).toBeCloseTo(LARGO_MAXIMO_DE_LA_RAMPA - HOLGURA_DE_LA_RAMPA, 2)
    expect(largoDeLaRampa(false)).toBeGreaterThan(0.7)
  })

  it('las de la fila de atrás no llevan rampa: solo hay 12 cm libres hasta el carril de las motos', () => {
    expect(largoDeLaRampa(true)).toBe(0)
    expect(medidasDeLaEstructura({ ancho: SERVIDOR.ancho, fondo: SERVIDOR.fondo, largoDeLaRampa: 0 }).rampa).toBeNull()
    expect(estructuraEnElMundo(3, 6).rampa).toBeNull()
    expect(estructuraEnElMundo(0, 6).rampa).not.toBeNull()
  })

  it('con 3 a 7 placas por fila la de adelante es siempre la de adelante y la de atrás la de atrás', () => {
    expect(esDeAtras(0, 6)).toBe(false)
    expect(esDeAtras(3, 6)).toBe(true)
    expect(esDeAtras(6, 14)).toBe(false)
    expect(esDeAtras(7, 14)).toBe(true)
  })
})

describe('la estructura de una placa', () => {
  const medidas = medidasDeLaEstructura({ ancho: SERVIDOR.ancho, fondo: SERVIDOR.fondo, largoDeLaRampa: 0.78 })

  it('tiene cuatro patas dentro de la placa, bien separadas entre sí', () => {
    expect(medidas.patas).toHaveLength(4)
    for (const { x, z, lado } of medidas.patas) {
      expect(Math.abs(x) + lado / 2).toBeLessThanOrEqual(SERVIDOR.ancho / 2)
      expect(Math.abs(z) + lado / 2).toBeLessThanOrEqual(SERVIDOR.fondo / 2)
    }
    const xs = [...new Set(medidas.patas.map((p) => p.x))]
    expect(xs).toHaveLength(2)
  })

  it('la rampa sale del frente (+Z), centrada y más ancha que la moto', () => {
    expect(medidas.rampa.z0).toBeCloseTo(SERVIDOR.fondo / 2, 9)
    expect(medidas.rampa.z1).toBeCloseTo(SERVIDOR.fondo / 2 + 0.78, 9)
    expect(medidas.rampa.x0).toBeCloseTo(-medidas.rampa.x1, 9)
    expect(medidas.rampa.x1 - medidas.rampa.x0).toBeGreaterThan(MOTO.ancho)
    expect(medidas.rampa.x1 - medidas.rampa.x0).toBeLessThan(SERVIDOR.ancho)
  })

  it('la geometría es una sola pieza de color de vértice que va del piso a la altura pedida', () => {
    const geometria = estructuraDeLaPlaca({ ancho: SERVIDOR.ancho, fondo: SERVIDOR.fondo, alto: SERVIDOR.altoOcupado, largoDeLaRampa: 0.78 })
    geometria.computeBoundingBox()
    const { min, max } = geometria.boundingBox
    expect(min.y).toBeCloseTo(0, 6)
    expect(max.y).toBeCloseTo(SERVIDOR.altoOcupado, 6)
    // llega hasta el final de la rampa por delante y no sobresale de la placa por los lados
    expect(max.z).toBeCloseTo(SERVIDOR.fondo / 2 + 0.78, 6)
    expect(max.x).toBeLessThanOrEqual(SERVIDOR.ancho / 2)
    expect(min.x).toBeGreaterThanOrEqual(-SERVIDOR.ancho / 2)
    expect(geometria.attributes.color).toBeDefined()
    expect(geometria.attributes.normal).toBeDefined()
    geometria.dispose()
  })

  it('la rampa es una cuña: alta pegada a la placa y a ras del piso en su otro extremo', () => {
    const geometria = estructuraDeLaPlaca({ ancho: SERVIDOR.ancho, fondo: SERVIDOR.fondo, alto: SERVIDOR.altoOcupado, largoDeLaRampa: 0.78 })
    const posiciones = geometria.attributes.position
    let alturaPegada = 0
    let alturaAlFinal = Infinity
    for (let i = 0; i < posiciones.count; i += 1) {
      if (Math.abs(posiciones.getX(i)) > ESTRUCTURA_DE_LA_PLACA.pata) {
        // vértices de la rampa (fuera de donde están las patas, que son de x = ±0,8 aprox.)
      }
      const z = posiciones.getZ(i)
      if (Math.abs(posiciones.getX(i)) < 0.56 && z >= SERVIDOR.fondo / 2 - 1e-6) {
        if (Math.abs(z - SERVIDOR.fondo / 2) < 1e-6) alturaPegada = Math.max(alturaPegada, posiciones.getY(i))
        if (Math.abs(z - (SERVIDOR.fondo / 2 + 0.78)) < 1e-6) alturaAlFinal = Math.min(alturaAlFinal, posiciones.getY(i))
      }
    }
    expect(alturaPegada).toBeCloseTo(SERVIDOR.altoOcupado, 6)
    expect(alturaAlFinal).toBeCloseTo(0, 6)
    geometria.dispose()
  })
})

describe.each(TOTALES)('con %i placas y 7 puestos', (total) => {
  const estructuras = Array.from({ length: total }, (_, i) => ({ indice: i, ...estructuraEnElMundo(i, total) }))
  const conRampa = estructuras.filter((e) => e.rampa !== null)
  const losas = [
    ...Array.from({ length: total }, (_, i) => ({ clase: `placa ${i}`, caja: losa(posicionDePlaca(i, total)) })),
    ...Array.from({ length: PUESTOS }, (_, i) => ({ clase: `puesto ${i}`, caja: losa(posicionDePuesto(i, PUESTOS)) })),
  ]

  it('ninguna rampa ni pata pisa otra placa o un puesto', () => {
    for (const { indice, patas, rampa } of estructuras) {
      for (const { clase, caja } of losas) {
        if (clase === `placa ${indice}`) continue
        if (rampa) expect(seMontan(rampa, caja), `rampa de la placa ${indice} con la ${clase}`).toBe(false)
        for (const pata of patas) expect(seMontan(pata, caja), `pata de la placa ${indice} con la ${clase}`).toBe(false)
      }
    }
  })

  it('las patas quedan dentro de su propia placa y la rampa, fuera de ella', () => {
    for (const { indice, patas, rampa } of estructuras) {
      const propia = losa(posicionDePlaca(indice, total))
      for (const pata of patas) {
        expect(pata.x0).toBeGreaterThanOrEqual(propia.x0 - 1e-9)
        expect(pata.x1).toBeLessThanOrEqual(propia.x1 + 1e-9)
        expect(pata.z0).toBeGreaterThanOrEqual(propia.z0 - 1e-9)
        expect(pata.z1).toBeLessThanOrEqual(propia.z1 + 1e-9)
      }
      if (rampa) expect(rampa.z0).toBeCloseTo(propia.z1, 9)
    }
  })

  it('ninguna rampa se monta con la rejilla de desagüe del piso ni con las rampas vecinas', () => {
    for (const { indice, rampa } of conRampa) {
      expect(seMontan(rampa, rejillaDelPiso), `rampa ${indice} con la rejilla`).toBe(false)
      for (const otra of conRampa) {
        if (otra.indice !== indice) expect(seMontan(rampa, otra.rampa), `rampa ${indice} con la ${otra.indice}`).toBe(false)
      }
    }
  })

  it('ninguna rampa ni pata toca una columna del techo', () => {
    for (const { indice, patas, rampa } of estructuras) {
      for (const [xc, , zc] of COLUMNAS_DEL_TECHO) {
        const columna = { x0: xc - RADIO_DE_LA_COLUMNA, x1: xc + RADIO_DE_LA_COLUMNA, z0: zc - RADIO_DE_LA_COLUMNA, z1: zc + RADIO_DE_LA_COLUMNA }
        if (rampa) expect(seMontan(rampa, columna), `rampa ${indice} con la columna (${xc}, ${zc})`).toBe(false)
        for (const pata of patas) expect(seMontan(pata, columna)).toBe(false)
      }
    }
  })

  it('ningún camino de las motos pasa por la rampa de otra placa', () => {
    const caminos = []
    for (let i = 0; i < total; i += 1) {
      const suyas = [i]
      for (const avenida of ['granColombia', 'guaimaral']) {
        caminos.push({ camino: caminoHacia(sitioDeEntrada(avenida), sitioEnPlaca(i, total)), suyas })
        caminos.push({ camino: caminoDeSalida(sitioEnPlaca(i, total), avenida), suyas })
      }
      for (const k of [0, 1, 4]) {
        caminos.push({ camino: caminoHacia(sitioEnFila('lavado', k), sitioEnPlaca(i, total)), suyas })
        caminos.push({ camino: caminoHacia(sitioEnPlaca(i, total), sitioEnFila('acabado', k)), suyas })
      }
      for (let p = 0; p < PUESTOS; p += 1) {
        caminos.push({ camino: caminoHacia(sitioEnPlaca(i, total), sitioEnPuesto(p, PUESTOS)), suyas })
      }
    }
    expect(caminos.length).toBeGreaterThan(total * 10)
    const invadidas = new Set()
    for (const { camino, suyas } of caminos) {
      for (const { punto } of muestrasDe(camino, 0.05)) {
        for (const { indice, rampa } of conRampa) {
          if (suyas.includes(indice)) continue
          const caja = {
            x0: punto[0] - MEDIO_ANCHO_DE_MOTO,
            x1: punto[0] + MEDIO_ANCHO_DE_MOTO,
            z0: punto[2] - MEDIO_ANCHO_DE_MOTO,
            z1: punto[2] + MEDIO_ANCHO_DE_MOTO,
          }
          if (seMontan(caja, rampa)) invadidas.add(`rampa de la placa ${indice} en (${punto[0].toFixed(2)}, ${punto[2].toFixed(2)})`)
        }
      }
    }
    expect([...invadidas].slice(0, 5)).toEqual([])
  })
})
