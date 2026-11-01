import { readFileSync } from 'node:fs'
import { BufferGeometry, Float32BufferAttribute, ShapePath } from 'three'
import { describe, expect, it } from 'vitest'

import {
  CAPAS_DEL_LOGO,
  EMISION_DEL_LOGO,
  REBAJA_DEL_CONTORNO,
  TOPE_DE_TRIANGULOS,
  construirLogo,
  crearMaterialesDelLogo,
  extruirBanda,
  liberarLogo,
  triangulosDe,
} from './logoDelLocal.js'

/** Los límites en z de una geometría. */
function rangoZ(geometria) {
  const pos = geometria.getAttribute('position')
  let min = Infinity
  let max = -Infinity
  for (let i = 0; i < pos.count; i += 1) {
    min = Math.min(min, pos.getZ(i))
    max = Math.max(max, pos.getZ(i))
  }
  return [min, max]
}

/** Una banda plana con los triángulos dados (sin índice, en el plano XY). */
function plana(...triangulos) {
  const g = new BufferGeometry()
  g.setAttribute('position', new Float32BufferAttribute(triangulos.flat().flatMap(([x, y]) => [x, y, 0]), 3))
  return g
}

describe('extruirBanda', () => {
  const cuadrado = [
    [[0, 0], [1, 0], [1, 1]],
    [[0, 0], [1, 1], [0, 1]],
  ]

  it('un cuadrado hecho de dos triángulos da tapa y cuatro paredes, sin pared en la diagonal compartida', () => {
    const g = extruirBanda(plana(...cuadrado), 2, 5)
    // 2 triángulos de tapa + 4 aristas del borde × 2 triángulos de pared.
    expect(triangulosDe(g)).toBe(2 + 4 * 2)
    expect(rangoZ(g)).toEqual([2, 5])
  })

  it('todas las normales miran hacia afuera: la tapa hacia arriba y las paredes lejos del centro', () => {
    const g = extruirBanda(plana(...cuadrado), 0, 1)
    const pos = g.getAttribute('position')
    const normal = g.getAttribute('normal')
    for (let i = 0; i < pos.count; i += 1) {
      const nz = normal.getZ(i)
      if (Math.abs(nz) > 0.5) {
        expect(nz).toBeGreaterThan(0)
      } else {
        const hacia = normal.getX(i) * (pos.getX(i) - 0.5) + normal.getY(i) * (pos.getY(i) - 0.5)
        expect(hacia).toBeGreaterThan(0)
      }
    }
  })

  it('un triángulo con el sentido contrario se ordena igual: la tapa sigue mirando hacia arriba', () => {
    const g = extruirBanda(plana([[0, 0], [0, 1], [1, 0]]), 0, 1)
    const normal = g.getAttribute('normal')
    const arriba = [...Array(normal.count).keys()].filter((i) => Math.abs(normal.getZ(i)) > 0.5)
    expect(arriba.length).toBe(3)
    expect(arriba.every((i) => normal.getZ(i) > 0)).toBe(true)
  })

  it('descarta los triángulos sin área', () => {
    const g = extruirBanda(plana([[0, 0], [1, 1], [2, 2]]), 0, 1)
    expect(triangulosDe(g)).toBe(0)
  })
})

/** Un `ShapePath` rectangular con el estilo dado, como los que entrega SVGLoader. */
function rectangulo(x, y, ancho, alto, estilo) {
  const trazado = new ShapePath()
  trazado.userData = { style: { fill: 'none', stroke: undefined, strokeWidth: 1, strokeLineJoin: 'miter', strokeLineCap: 'butt', strokeMiterLimit: 4, ...estilo } }
  trazado.moveTo(x, y).lineTo(x + ancho, y).lineTo(x + ancho, y + alto).lineTo(x, y + alto)
  trazado.currentPath.autoClose = true
  return trazado
}

/** Un logo de juguete: borde (anillo) y base, un relleno con contorno y un trazo suelto. */
const CAPAS_DE_PRUEBA = [
  { papel: 'borde', desde: 0, hasta: 14, bisel: 2.5, agujero: 1 },
  { papel: 'base', desde: 0, hasta: 8 },
  { papel: 'texto', desde: 8, hasta: 19 },
  { papel: 'trazo', desde: 8, hasta: 13 },
]
const MEDIDA_DE_PRUEBA = { ancho: 600, alto: 400 }
const trazadosDePrueba = () => [
  rectangulo(0, 0, 600, 400, { fill: '#ffffff', stroke: '#0B1F4D', strokeWidth: 6 }),
  rectangulo(20, 20, 560, 360, { fill: '#1F3FA6' }),
  rectangulo(100, 100, 100, 50, { fill: '#FFD21F', stroke: '#0B1F4D', strokeWidth: 7, strokeLineJoin: 'round' }),
  rectangulo(300, 100, 100, 50, { fill: 'none', stroke: '#ffffff', strokeWidth: 7 }),
]
const construirDePrueba = (ancho = 3) =>
  construirLogo(trazadosDePrueba(), { ancho, capas: CAPAS_DE_PRUEBA, medida: MEDIDA_DE_PRUEBA })

describe('construirLogo', () => {
  it('da una pieza por color, con el color del propio trazado', () => {
    const { piezas } = construirDePrueba()
    expect(piezas.map((p) => p.color).sort()).toEqual(['#0b1f4d', '#1f3fa6', '#ffd21f', '#ffffff'])
    for (const { geometria } of piezas) expect(triangulosDe(geometria)).toBeGreaterThan(0)
  })

  it('el blanco del borde y el del trazo suelto van en la misma pieza', () => {
    const { piezas } = construirDePrueba()
    expect(piezas.filter((p) => p.color === '#ffffff')).toHaveLength(1)
  })

  it('mide en metros: el ancho pedido, el alto en proporción 3 : 2, centrado en el origen', () => {
    const logo = construirDePrueba(3)
    expect(logo.ancho).toBe(3)
    expect(logo.alto).toBeCloseTo(2, 6)
    const todos = logo.piezas.flatMap(({ geometria }) => {
      geometria.computeBoundingBox()
      return [geometria.boundingBox]
    })
    const minX = Math.min(...todos.map((c) => c.min.x))
    const maxX = Math.max(...todos.map((c) => c.max.x))
    const minY = Math.min(...todos.map((c) => c.min.y))
    const maxY = Math.max(...todos.map((c) => c.max.y))
    // El contorno oscuro sobresale medio trazo (3 unidades = 0,015 m) del borde.
    expect(minX).toBeCloseTo(-1.5, 1)
    expect(maxX).toBeCloseTo(1.5, 1)
    expect(minY).toBeCloseTo(-1, 1)
    expect(maxY).toBeCloseTo(1, 1)
    expect((minX + maxX) / 2).toBeCloseTo(0, 2)
    expect((minY + maxY) / 2).toBeCloseTo(0, 2)
  })

  it('el eje Y está invertido: lo que está arriba en el SVG queda arriba en 3D', () => {
    const { piezas } = construirDePrueba()
    // El texto amarillo está en y = 100..150 del SVG, por encima del centro (200).
    const amarillo = piezas.find((p) => p.color === '#ffd21f').geometria
    amarillo.computeBoundingBox()
    expect(amarillo.boundingBox.min.y).toBeGreaterThan(0)
  })

  it('cada capa queda entre su «desde» y su «hasta»', () => {
    const escala = 3 / 600
    const { piezas } = construirDePrueba(3)
    const [, maxAzul] = rangoZ(piezas.find((p) => p.color === '#1f3fa6').geometria)
    const [minAmarillo, maxAmarillo] = rangoZ(piezas.find((p) => p.color === '#ffd21f').geometria)
    expect(maxAzul).toBeCloseTo(8 * escala, 6)
    expect(minAmarillo).toBeCloseTo(8 * escala, 6)
    expect(maxAmarillo).toBeCloseTo(19 * escala, 6)
  })

  it('el contorno oscuro queda por debajo del relleno que tapa', () => {
    const escala = 3 / 600
    const { piezas } = construirDePrueba(3)
    const [, maxOscuro] = rangoZ(piezas.find((p) => p.color === '#0b1f4d').geometria)
    // El oscuro más alto es el del texto: llega a 19 − REBAJA, no a 19.
    expect(maxOscuro).toBeCloseTo((19 - REBAJA_DEL_CONTORNO) * escala, 6)
  })

  it('el borde blanco es un anillo con bisel: su hueco deja ver la base y el bisel no lo agranda', () => {
    const escala = 3 / 600
    const { piezas } = construirDePrueba(3)
    const blanco = piezas.find((p) => p.color === '#ffffff').geometria
    const [min, max] = rangoZ(blanco)
    expect(min).toBeCloseTo(0, 6)
    expect(max).toBeCloseTo(14 * escala, 6)
    // Ningún vértice de la tapa del anillo cae dentro del hueco, salvo el del propio hueco.
    const pos = blanco.getAttribute('position')
    let dentro = 0
    for (let i = 0; i < pos.count; i += 1) {
      if (pos.getZ(i) < 13 * escala) continue
      const x = pos.getX(i) / escala + 300
      const y = 200 - pos.getY(i) / escala
      if (x > 30 && x < 570 && y > 30 && y < 370 && (x < 100 || x > 400 || y < 90 || y > 160)) dentro += 1
    }
    expect(dentro).toBe(0)
  })

  it('es determinista: dos llamadas dan las mismas geometrías', () => {
    const a = construirDePrueba()
    const b = construirDePrueba()
    expect(b.piezas.map((p) => p.color)).toEqual(a.piezas.map((p) => p.color))
    a.piezas.forEach((p, i) => {
      expect(Array.from(b.piezas[i].geometria.getAttribute('position').array)).toEqual(
        Array.from(p.geometria.getAttribute('position').array),
      )
    })
  })

  it('cuenta los triángulos y no pasa del tope', () => {
    const logo = construirDePrueba()
    const suma = logo.piezas.reduce((s, p) => s + triangulosDe(p.geometria), 0)
    expect(logo.triangulos).toBe(suma)
    expect(logo.triangulos).toBeLessThan(TOPE_DE_TRIANGULOS)
  })

  it('cada pieza lleva solo posición y normales', () => {
    for (const { geometria } of construirDePrueba().piezas) {
      expect(Object.keys(geometria.attributes).sort()).toEqual(['normal', 'position'])
      expect(geometria.index).toBeNull()
    }
  })

  it('las caras miran hacia afuera: ningún triángulo de la tapa del frente queda al revés', () => {
    const { piezas } = construirDePrueba()
    const azul = piezas.find((p) => p.color === '#1f3fa6').geometria
    const normal = azul.getAttribute('normal')
    const pos = azul.getAttribute('position')
    const zArriba = Math.max(...Array.from({ length: pos.count }, (_, i) => pos.getZ(i)))
    for (let i = 0; i < pos.count; i += 1) {
      if (Math.abs(pos.getZ(i) - zArriba) < 1e-9 && Math.abs(normal.getZ(i)) > 0.5) {
        expect(normal.getZ(i)).toBeGreaterThan(0)
      }
    }
  })

  it('rechaza un logo con otra cantidad de trazados que de capas', () => {
    expect(() => construirLogo(trazadosDePrueba().slice(0, 3), { capas: CAPAS_DE_PRUEBA })).toThrow(/espera 4/)
  })

  it('liberarLogo suelta las geometrías sin fallar con null', () => {
    expect(() => liberarLogo(null)).not.toThrow()
    expect(() => liberarLogo(construirDePrueba())).not.toThrow()
  })
})

describe('la tabla de capas del logo', () => {
  const svg = readFileSync('public/logo-gran-colombia.svg', 'utf8')
  const elementos = [...svg.matchAll(/<(ellipse|circle|path|polygon)\b/g)].map((m) => m[1])
  const PAPELES = {
    borde: 'ellipse',
    base: 'ellipse',
    burbuja: 'circle',
    'linea-del-carro': 'path',
    'texto-amarillo': 'path',
    recuadro: 'polygon',
    'texto-blanco': 'path',
    'rojo-grande': 'path',
    'rojo-pequeno': 'path',
  }

  it('tiene una capa por cada elemento del SVG, en su orden', () => {
    expect(CAPAS_DEL_LOGO.map((c) => PAPELES[c.papel])).toEqual(elementos)
  })

  it('cada capa sube más que lo que baja, y la que se apoya en otra arranca donde esa termina', () => {
    for (const capa of CAPAS_DEL_LOGO) {
      expect(capa.hasta, capa.papel).toBeGreaterThan(capa.desde)
    }
    const base = CAPAS_DEL_LOGO.find((c) => c.papel === 'base')
    const recuadro = CAPAS_DEL_LOGO.find((c) => c.papel === 'recuadro')
    for (const capa of CAPAS_DEL_LOGO) {
      if (['burbuja', 'linea-del-carro', 'texto-amarillo', 'recuadro', 'texto-blanco', 'rojo-pequeno'].includes(capa.papel)) {
        expect(capa.desde, capa.papel).toBe(base.hasta)
        expect(capa.hasta, capa.papel).toBeGreaterThan(base.hasta)
      }
    }
    const rojo = CAPAS_DEL_LOGO.find((c) => c.papel === 'rojo-grande')
    expect(rojo.desde).toBe(recuadro.hasta)
  })

  it('el borde blanco sobresale de la base azul y le resta su forma', () => {
    const borde = CAPAS_DEL_LOGO[0]
    expect(borde.hasta).toBeGreaterThan(CAPAS_DEL_LOGO[1].hasta)
    expect(borde.agujero).toBe(1)
    expect(borde.bisel).toBeGreaterThan(0)
  })

  it('el texto, el recuadro, la línea del carro y las burbujas sobresalen de la base', () => {
    const base = CAPAS_DEL_LOGO[1].hasta
    for (const capa of CAPAS_DEL_LOGO.slice(2)) expect(capa.hasta, capa.papel).toBeGreaterThan(base)
  })
})

describe('crearMaterialesDelLogo', () => {
  const piezas = [{ color: '#ffd21f' }, { color: '#0b1f4d' }, { color: '#e11d2a' }]
  const materiales = crearMaterialesDelLogo(piezas)

  it('hay un material por color, en el mismo orden', () => {
    expect(materiales).toHaveLength(3)
    expect(`#${materiales[0].color.getHexString()}`).toBe('#ffd21f')
    expect(`#${materiales[1].color.getHexString()}`).toBe('#0b1f4d')
  })

  it('la luz propia es del mismo color, mayor que cero y menor que 0,5', () => {
    for (const material of materiales) {
      expect(material.emissive.equals(material.color)).toBe(true)
      expect(material.emissiveIntensity).toBeGreaterThan(0)
      expect(material.emissiveIntensity).toBeLessThan(0.5)
    }
  })

  it('el color oscuro lleva menos luz propia que los claros', () => {
    expect(materiales[1].emissiveIntensity).toBe(EMISION_DEL_LOGO.oscura)
    expect(materiales[0].emissiveIntensity).toBe(EMISION_DEL_LOGO.clara)
    expect(EMISION_DEL_LOGO.oscura).toBeLessThan(EMISION_DEL_LOGO.clara)
  })

  it('ninguno lleva textura ni mapas', () => {
    for (const material of materiales) {
      for (const mapa of ['map', 'emissiveMap', 'normalMap', 'roughnessMap', 'metalnessMap', 'bumpMap', 'envMap']) {
        expect(material[mapa], mapa).toBeNull()
      }
      expect(material.metalness).toBe(0)
    }
  })
})

describe('el logo no toca la simulación', () => {
  it.each(['logoDelLocal.js', 'logoEnLaEscena.js', 'cargaDelLogo.js', 'LogoDelLocal.jsx'])(
    '%s no importa el motor ni el estado ni usa el azar',
    (archivo) => {
      const codigo = readFileSync(`src/scene/${archivo}`, 'utf8')
      expect(codigo).not.toMatch(/from '\.\.\/engine/)
      expect(codigo).not.toMatch(/from '\.\.\/store/)
      expect(codigo).not.toMatch(/from '\.\.\/visita/)
      expect(codigo).not.toMatch(/Math\.random/)
    },
  )
})
