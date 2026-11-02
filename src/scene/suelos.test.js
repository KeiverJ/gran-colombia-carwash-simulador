import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import { COLOR_DE_ESCENA } from '../estilos/colores.js'
import { HUELLA_DE_LA_CAFETERIA, seSolapan } from './cafeteria.js'
import { CALZADAS, zonasDeExclusion } from './colocacion.js'
import { EDIFICIOS, huellaDelEdificio } from './edificios.js'
import { geometriaDeLosSuelos } from './geometriasDeLosSuelos.js'
import { TERRENO } from './posiciones.js'
import { colorDelSuelo, RAYAS_DEL_PARQUEADERO, rayasDelParqueadero, SUELOS } from './suelos.js'

/** Las aceras de concreto de las avenidas (las que dibuja `Avenidas.jsx`), vistas desde arriba. */
const ACERAS = [
  { nombre: 'acera de la Guaimaral', x0: -19, x1: -16, z0: -102, z1: 98 },
  { nombre: 'acera del fondo', x0: -102, x1: 98, z0: -20, z1: -17 },
  { nombre: 'acera cercana de la Gran Colombia, al oeste', x0: -102, x1: -19, z0: -12, z1: -9 },
  { nombre: 'acera este de la Guaimaral', x0: -11, x1: -8, z0: -102, z1: -20 },
]

describe('el suelo de las manzanas vecinas', () => {
  it('hay pasto, tierra y parqueadero', () => {
    expect(new Set(SUELOS.map((s) => s.tipo))).toEqual(new Set(['pasto', 'tierra', 'parqueadero', 'acera']))
    expect(SUELOS.filter((s) => s.tipo === 'pasto').length).toBeGreaterThanOrEqual(3)
  })

  it('no pisan las calzadas (la calle sigue entre los edificios), las aceras, el local, la cafetería, las bocas ni las losas', () => {
    for (const suelo of SUELOS) {
      for (const calzada of Object.values(CALZADAS)) expect(seSolapan(suelo, calzada), `${suelo.nombre} con una calzada`).toBe(false)
      for (const acera of ACERAS) expect(seSolapan(suelo, acera), `${suelo.nombre} con la ${acera.nombre}`).toBe(false)
      // La acera del frente y la plaza de la cafetería rodean al local y a la cafetería: se miden contra el local mismo, no contra su margen.
      const zonas = suelo.tipo === 'acera'
        ? zonasDeExclusion(14, 7).filter(({ nombre }) => !['el local con la franja de espera', 'la cafetería'].includes(nombre))
        : zonasDeExclusion(14, 7)
      for (const zona of zonas) expect(seSolapan(suelo, zona), `${suelo.nombre} con «${zona.nombre}»`).toBe(false)
      if (suelo.tipo === 'acera') {
        expect(seSolapan(suelo, { x0: -11, x1: 14.5, z0: -12, z1: 12 }), `${suelo.nombre} con el local`).toBe(false)
        expect(seSolapan(suelo, HUELLA_DE_LA_CAFETERIA) && suelo.nombre === 'acera del frente del local').toBe(false)
      }
    }
  })

  it('no pisan ningún edificio ni se pisan entre sí', () => {
    for (const suelo of SUELOS) {
      for (const e of EDIFICIOS) expect(seSolapan(suelo, huellaDelEdificio(e)), `${suelo.nombre} con ${e.clave}`).toBe(false)
      for (const otro of SUELOS) if (otro !== suelo) expect(seSolapan(suelo, otro), `${suelo.nombre} con ${otro.nombre}`).toBe(false)
    }
  })

  it('quedan dentro del terreno que se ve, antes de que el velo lo disuelva', () => {
    for (const s of SUELOS) {
      for (const [x, z] of [[s.x0, s.z0], [s.x1, s.z0], [s.x0, s.z1], [s.x1, s.z1]]) {
        expect(Math.hypot(x - TERRENO.centro[0], z - TERRENO.centro[2]), s.nombre).toBeLessThan(TERRENO.desvanecerHasta)
      }
    }
  })

  it('cada tipo usa su color del tema, y ninguno es el del terreno', () => {
    for (const s of SUELOS) {
      expect(colorDelSuelo(s)).toMatch(/^#[0-9a-f]{6}$/i)
      expect(colorDelSuelo(s)).not.toBe(COLOR_DE_ESCENA.terreno)
    }
  })

  it('las rayas del parqueadero caen dentro de él, separadas', () => {
    for (const p of SUELOS.filter((s) => s.tipo === 'parqueadero')) {
      const rayas = rayasDelParqueadero(p)
      expect(rayas.length).toBeGreaterThan(4)
      for (const r of rayas) {
        expect(r.x0).toBeGreaterThan(p.x0)
        expect(r.x1).toBeLessThan(p.x1)
        expect(r.z0).toBeGreaterThan(p.z0)
        expect(r.z1).toBeLessThan(p.z1)
      }
      expect(rayas[1].x0 - rayas[0].x0).toBeCloseTo(RAYAS_DEL_PARQUEADERO.cada, 9)
    }
  })

  it('todo es una sola geometría de color de vértice, pegada al piso', () => {
    const g = geometriaDeLosSuelos()
    expect(g.getAttribute('color').count).toBe(g.getAttribute('position').count)
    g.computeBoundingBox()
    expect(g.boundingBox.max.y).toBeLessThan(0.12)
    expect(g.boundingBox.min.y).toBeGreaterThan(-0.02)
    g.dispose()
  })

  it('el componente no recibe clics, y no usa azar ni red', () => {
    const codigo = readFileSync('src/scene/Suelos.jsx', 'utf8')
    expect(codigo).toContain('raycast={() => null}')
    expect(codigo).not.toMatch(/Math\.random|https?:\/\//)
    expect(readFileSync('src/scene/EscenaDelLavadero.jsx', 'utf8')).toContain('<Suelos />')
  })
})
