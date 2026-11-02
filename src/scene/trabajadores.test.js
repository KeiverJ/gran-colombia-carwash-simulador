import { describe, expect, it } from 'vitest'

import { cajasDeLosa, postesDeLasLosas, puntosDeLosCaminos } from './charcos.js'
import { NIVELES_DE_CALIDAD } from './calidad.js'
import { posicionDePlaca, posicionDePuesto, SERVIDOR } from './posiciones.js'
import {
  DESPLAZAMIENTO_DEL_TRABAJADOR,
  sitiosDeLosTrabajadores,
  TRABAJADORES_COMO_MAXIMO,
  trabajadoresDeLasLosas,
} from './trabajadores.js'

const estados = (placas, puestos, ocupadas) => [
  ...Array.from({ length: placas }, (_, i) => (ocupadas.placas?.includes(i) ? 'ocupada' : (ocupadas.otros ?? 'libre'))),
  ...Array.from({ length: puestos }, (_, i) => (ocupadas.puestos?.includes(i) ? 'ocupada' : (ocupadas.otros ?? 'libre'))),
]
const todas = (cuantas) => Array.from({ length: cuantas }, (_, i) => i)
const donde = (trabajadores, etapa) => trabajadores.filter((t) => t.etapa === etapa).map((t) => t.indice)

describe('cuántos trabajadores hay y dónde', () => {
  it('con las 6 placas ocupadas solo las placas 1 y 2 tienen un trabajador con manguera', () => {
    const t = trabajadoresDeLasLosas({ placas: 6, puestos: 3, estados: estados(6, 3, { placas: todas(6) }) })
    expect(donde(t, 'lavado')).toEqual([0, 1])
    expect(t.filter((x) => x.etapa === 'lavado').every((x) => x.herramienta === 'manguera')).toBe(true)
    expect(donde(t, 'acabado')).toEqual([])
  })

  it('con los 3 puestos ocupados cada puesto tiene un trabajador con trapo', () => {
    const t = trabajadoresDeLasLosas({ placas: 6, puestos: 3, estados: estados(6, 3, { puestos: todas(3) }) })
    expect(donde(t, 'acabado')).toEqual([0, 1, 2])
    expect(t.every((x) => x.herramienta === 'trapo')).toBe(true)
  })

  it('con 7 puestos ocupados solo los puestos 1, 2 y 3 tienen trabajador', () => {
    const t = trabajadoresDeLasLosas({ placas: 6, puestos: 7, estados: estados(6, 7, { puestos: todas(7) }) })
    expect(donde(t, 'acabado')).toEqual([0, 1, 2])
    expect(t).toHaveLength(3)
  })

  it('con la placa 1 libre y las placas 2, 3 y 4 ocupadas, los dos del lavado van junto a las placas 2 y 3', () => {
    const t = trabajadoresDeLasLosas({ placas: 6, puestos: 3, estados: estados(6, 3, { placas: [1, 2, 3] }) })
    expect(donde(t, 'lavado')).toEqual([1, 2])
  })

  it('una losa cerrada, libre o reservada no tiene trabajador al lado', () => {
    for (const otros of ['libre', 'cerrada', 'reservada']) {
      expect(trabajadoresDeLasLosas({ placas: 6, puestos: 3, estados: estados(6, 3, { otros }) }), otros).toEqual([])
    }
  })

  it('una losa que se está cerrando con su moto encima todavía cuenta como ocupada', () => {
    const lista = estados(6, 3, {})
    lista[0] = 'cerrandose'
    expect(donde(trabajadoresDeLasLosas({ placas: 6, puestos: 3, estados: lista }), 'lavado')).toEqual([0])
  })

  it('nunca hay más de 2 en el lavado ni más de 3 en el acabado, con cualquier número de losas', () => {
    expect(TRABAJADORES_COMO_MAXIMO).toEqual({ lavado: 2, acabado: 3 })
    for (const [placas, puestos] of [[1, 1], [6, 3], [10, 5], [14, 7]]) {
      const t = trabajadoresDeLasLosas({ placas, puestos, estados: estados(placas, puestos, { placas: todas(placas), puestos: todas(puestos) }) })
      expect(t.filter((x) => x.etapa === 'lavado').length).toBeLessThanOrEqual(2)
      expect(t.filter((x) => x.etapa === 'acabado').length).toBeLessThanOrEqual(3)
    }
  })

  it('el trabajador mira a su losa y va a un costado de ella, del lado del frente o de atrás', () => {
    const t = trabajadoresDeLasLosas({ placas: 6, puestos: 3, estados: estados(6, 3, { placas: [0, 3], puestos: [0] }) })
    const de = (etapa, indice) => t.find((x) => x.etapa === etapa && x.indice === indice)
    const [px, , pz] = posicionDePlaca(0, 6)
    expect(de('lavado', 0).x).toBeCloseTo(px + DESPLAZAMIENTO_DEL_TRABAJADOR.alLado, 9)
    expect(de('lavado', 0).z).toBeGreaterThan(pz + SERVIDOR.fondo / 2)
    // una placa de la fila de atrás se atiende por detrás
    const [, , qz] = posicionDePlaca(3, 6)
    expect(de('lavado', 3).z).toBeLessThan(qz - SERVIDOR.fondo / 2)
    // y el puesto, por detrás (por delante están el número y el camino de la moto)
    const [, , uz] = posicionDePuesto(0, 3)
    expect(de('acabado', 0).z).toBeLessThan(uz - SERVIDOR.fondo / 2)
  })
})

describe('con las filas apretadas: nadie se mete entre las losas', () => {
  const CONFIGURACIONES = [[1, 1], [6, 3], [8, 4], [10, 5], [14, 7]]

  describe.each(CONFIGURACIONES)('con %i placas y %i puestos', (placas, puestos) => {
    const sitios = sitiosDeLosTrabajadores(placas, puestos)
    const todosLosSitios = [...sitios.placas, ...sitios.puestos].filter(Boolean)

    it('ningún trabajador queda sobre una losa, una rampa, un poste ni un camino de las motos', () => {
      for (const { x, z } of todosLosSitios) {
        for (const c of cajasDeLosa(placas, puestos)) {
          const dentro = x > c.x0 && x < c.x1 && z > c.z0 && z < c.z1
          expect(dentro, `(${x.toFixed(2)}, ${z.toFixed(2)}) sobre una losa o una rampa`).toBe(false)
        }
        for (const [px, pz] of postesDeLasLosas(placas, puestos)) expect(Math.hypot(x - px, z - pz)).toBeGreaterThan(0.3)
        for (const [cx, cz] of puntosDeLosCaminos(placas, puestos)) expect(Math.hypot(x - cx, z - cz)).toBeGreaterThan(0.3)
      }
    })

    it('ningún par de trabajadores se solapa', () => {
      for (let a = 0; a < todosLosSitios.length; a += 1) {
        for (let b = a + 1; b < todosLosSitios.length; b += 1) {
          expect(Math.hypot(todosLosSitios[a].x - todosLosSitios[b].x, todosLosSitios[a].z - todosLosSitios[b].z)).toBeGreaterThan(0.6)
        }
      }
    })

    it('todos los ocupados a la vez dan solo los que caben', () => {
      const t = trabajadoresDeLasLosas({ placas, puestos, estados: estados(placas, puestos, { placas: todas(placas), puestos: todas(puestos) }) })
      expect(t.length).toBeLessThanOrEqual(5)
      for (const x of t) {
        const sitio = (x.etapa === 'lavado' ? sitios.placas : sitios.puestos)[x.indice]
        expect(sitio).not.toBeNull()
      }
    })
  })

  it('los sitios son siempre los mismos para la misma configuración', () => {
    expect(sitiosDeLosTrabajadores(14, 7)).toEqual(sitiosDeLosTrabajadores(14, 7))
  })
})

describe('los trabajadores y la calidad adaptable', () => {
  it('se apagan con el interruptor de las personas (nivel 5)', () => {
    expect(NIVELES_DE_CALIDAD[4].personas).toBe(true)
    expect(NIVELES_DE_CALIDAD[5].personas).toBe(false)
  })
})
