import { readFileSync } from 'node:fs'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { HUELLA_DE_LA_CAFETERIA } from './cafeteria.js'
import { cajasDeLosa, puntosDeLosCaminos } from './charcos.js'
import {
  ALCANCE_DE_LA_VEGETACION,
  BANDAS_DE_ACERA,
  CALZADAS,
  cajasDeLaVegetacion,
  DISTANCIA_A_UN_CAMINO,
  MODELOS_DE_VEGETACION,
  queEstorbaALaVegetacion,
  sitiosDeLaVegetacion,
  sitiosPorModelo,
  zonasDeExclusion,
} from './colocacion.js'
import { CLAVES_DE_AMBIENTE } from './cargaDeModelos.js'
import { TERRENO } from './posiciones.js'
import { Vegetacion } from './Vegetacion.jsx'

const sitios = sitiosDeLaVegetacion()

describe('los sitios de la vegetación', () => {
  it('son siempre los mismos: salen del hash propio, no del azar', () => {
    expect(sitiosDeLaVegetacion()).toEqual(sitios)
  })

  it('hay una veintena de árboles y plantas, de los modelos que existen', () => {
    expect(sitios.length).toBeGreaterThanOrEqual(15)
    expect(sitios.length).toBeLessThanOrEqual(40)
    for (const { modelo } of sitios) {
      expect(Object.keys(MODELOS_DE_VEGETACION)).toContain(modelo)
      expect(CLAVES_DE_AMBIENTE).toContain(modelo)
    }
  })

  it('la Guaimaral, que es muy arborizada, tiene más que la Gran Colombia', () => {
    const de = (avenida) => sitios.filter((s) => s.avenida === avenida).length
    expect(de('guaimaral')).toBeGreaterThan(de('granColombia'))
    expect(de('guaimaral')).toBeGreaterThanOrEqual(2 * de('granColombia') - 2)
  })

  it('van en las aceras: cada árbol cae dentro de una banda de acera (las plantas de esquina, en la acera del cruce)', () => {
    for (const s of sitios.filter((x) => x.banda !== 'esquina')) {
      const banda = BANDAS_DE_ACERA.find((b) => b.nombre === s.banda)
      expect(s.x, s.banda).toBeGreaterThanOrEqual(banda.x0 - 1e-9)
      expect(s.x).toBeLessThanOrEqual(banda.x1 + 1e-9)
      expect(s.z).toBeGreaterThanOrEqual(banda.z0 - 1e-9)
      expect(s.z).toBeLessThanOrEqual(banda.z1 + 1e-9)
    }
  })

  it('quedan dentro del terreno que se ve, antes del velo que lo disuelve', () => {
    for (const { x, z } of sitios) {
      expect(Math.hypot(x - TERRENO.centro[0], z - TERRENO.centro[2])).toBeLessThanOrEqual(ALCANCE_DE_LA_VEGETACION + 6)
    }
    expect(ALCANCE_DE_LA_VEGETACION + 6).toBeLessThan(TERRENO.desvanecerHasta)
  })

  it('los giros y las escalas son razonables', () => {
    for (const { giro, escala } of sitios) {
      expect(giro).toBeGreaterThanOrEqual(0)
      expect(giro).toBeLessThanOrEqual(Math.PI * 2)
      expect(escala).toBeGreaterThan(0.8)
      expect(escala).toBeLessThan(1.25)
    }
  })
})

describe('la vegetación no estorba (con 14 placas y 7 puestos)', () => {
  it('ninguno cae en una zona de exclusión: calzada, local, franja de espera, cafetería, bocas ni losas', () => {
    const zonas = zonasDeExclusion(14, 7)
    expect(zonas.length).toBeGreaterThan(20)
    for (const s of sitios) {
      expect(queEstorbaALaVegetacion(s.x, s.z), `(${s.x.toFixed(1)}, ${s.z.toFixed(1)})`).toBeNull()
    }
  })

  it('ninguno pisa una calzada, una losa ni una fila: ni siquiera con la copa', () => {
    const calzadas = Object.values(CALZADAS)
    for (const caja of cajasDeLaVegetacion(sitios)) {
      const r = { x0: caja.min[0], x1: caja.max[0], z0: caja.min[2], z1: caja.max[2] }
      for (const c of calzadas) {
        const montan = r.x0 < c.x1 && r.x1 > c.x0 && r.z0 < c.z1 && r.z1 > c.z0
        expect(montan, `${caja.nombre} con una calzada`).toBe(false)
      }
      for (const l of cajasDeLosa(14, 7)) {
        expect(r.x0 < l.x1 && r.x1 > l.x0 && r.z0 < l.z1 && r.z1 > l.z0, `${caja.nombre} con una losa`).toBe(false)
      }
      expect(r.x0 < HUELLA_DE_LA_CAFETERIA.x1 && r.x1 > HUELLA_DE_LA_CAFETERIA.x0 && r.z0 < HUELLA_DE_LA_CAFETERIA.z1 && r.z1 > HUELLA_DE_LA_CAFETERIA.z0, `${caja.nombre} con la cafetería`).toBe(false)
    }
  })

  it('ninguno queda a menos de 3 m de un camino de las motos', () => {
    const caminos = puntosDeLosCaminos(14, 7)
    for (const { x, z } of sitios) {
      for (const [px, pz] of caminos) expect(Math.hypot(x - px, z - pz)).toBeGreaterThanOrEqual(DISTANCIA_A_UN_CAMINO)
    }
  })

  it('el detector sí encuentra lo que estorba: una calzada y el local', () => {
    expect(queEstorbaALaVegetacion(-13.5, 20)).toBe('calzada de la Guaimaral')
    expect(queEstorbaALaVegetacion(0, 0)).toBe('el local con la franja de espera')
    expect(queEstorbaALaVegetacion(-8, 26)).toBe('la cafetería')
  })
})

describe('agrupados por modelo y dibujados con respaldo', () => {
  it('los grupos suman todos los sitios y solo usan los tres modelos', () => {
    const grupos = sitiosPorModelo(sitios)
    expect(Object.keys(grupos).sort()).toEqual(['arbol1', 'arbol2', 'planta'])
    expect(Object.values(grupos).flat()).toHaveLength(sitios.length)
  })

  it('si los modelos no cargan (todavía o nunca), el componente no dibuja nada y no falla', () => {
    const html = renderToStaticMarkup(<Vegetacion />)
    expect(html).not.toContain('error')
    expect(typeof html).toBe('string')
  })

  it('el componente omite el modelo que falta y no usa azar ni red', () => {
    const codigo = readFileSync('src/scene/Vegetacion.jsx', 'utf8')
    expect(codigo).toMatch(/modelos\[clave\] && grupos\[clave\]\.length > 0/)
    expect(codigo).not.toMatch(/Math\.random|https?:\/\//)
  })
})
