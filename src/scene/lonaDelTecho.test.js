import { describe, expect, it } from 'vitest'

import {
  alturaAbsolutaDeLaLona,
  alturaDeLaLona,
  arcosDeLaLona,
  crestaDelArcoDelantero,
  LONA,
  posicionesDeLosArcos,
  semianchoEntreVigas,
  superficieDeLaLona,
} from './lonaDelTecho.js'
import { COLUMNAS_DEL_TECHO, TECHO } from './posiciones.js'
import { CENTRO_DEL_SUELO_CUBIERTO, medidasDelTecho } from './techo.js'

const cajaDe = (geometria) => {
  geometria.computeBoundingBox()
  return geometria.boundingBox
}

describe('la curva de la lona', () => {
  const semiancho = semianchoEntreVigas()

  it('arranca en las vigas laterales: la mitad de la distancia entre ellas', () => {
    const xs = COLUMNAS_DEL_TECHO.map(([x]) => x)
    expect(semiancho).toBeCloseTo((Math.max(...xs) - Math.min(...xs)) / 2, 9)
  })

  it('sube la flecha en el centro y nada sobre las vigas', () => {
    expect(alturaDeLaLona(0)).toBeCloseTo(LONA.flecha, 9)
    expect(alturaDeLaLona(semiancho)).toBeCloseTo(0, 9)
    expect(alturaDeLaLona(-semiancho)).toBeCloseTo(0, 9)
    expect(alturaAbsolutaDeLaLona(0)).toBeCloseTo(TECHO.alto + LONA.flecha, 9)
    expect(alturaAbsolutaDeLaLona(semiancho)).toBeCloseTo(TECHO.alto, 9)
  })

  it('es simétrica y baja sin saltos del centro a los lados', () => {
    let anterior = alturaDeLaLona(0)
    for (let x = 0.25; x <= semiancho; x += 0.25) {
      const ahora = alturaDeLaLona(x)
      expect(ahora).toBeCloseTo(alturaDeLaLona(-x), 9)
      expect(ahora).toBeLessThan(anterior)
      expect(anterior - ahora).toBeLessThan(0.15)
      anterior = ahora
    }
  })

  it('más allá de las vigas cuelga un poco, como una lona tensada: menos de 25 cm', () => {
    const { ancho } = medidasDelTecho()
    const alBorde = alturaDeLaLona(ancho / 2)
    expect(alBorde).toBeLessThan(0)
    expect(alBorde).toBeGreaterThan(-0.25)
  })
})

describe('la superficie de la lona', () => {
  const lona = superficieDeLaLona()
  const caja = cajaDe(lona)
  const { ancho, fondo } = medidasDelTecho()

  it('cubre lo mismo que cubría el techo: sus medidas, con el vuelo', () => {
    expect(caja.max.x - caja.min.x).toBeCloseTo(ancho, 4)
    expect(caja.max.z - caja.min.z).toBeCloseTo(fondo, 4)
    expect(caja.min.x).toBeCloseTo(-ancho / 2, 4)
    expect(caja.min.z).toBeCloseTo(-fondo / 2, 4)
  })

  it('su borde de abajo queda a la altura de las columnas y su cresta, a esa altura más la flecha', () => {
    expect(caja.max.y).toBeCloseTo(TECHO.alto + LONA.flecha, 4)
    // sobre las vigas laterales (x = ±semiancho) la lona está a TECHO.alto
    const posiciones = lona.attributes.position
    const sobreLasVigas = []
    for (let i = 0; i < posiciones.count; i += 1) {
      if (Math.abs(Math.abs(posiciones.getX(i)) - semianchoEntreVigas()) < 0.3) sobreLasVigas.push(posiciones.getY(i))
    }
    expect(sobreLasVigas.length).toBeGreaterThan(0)
    for (const y of sobreLasVigas) expect(Math.abs(y - TECHO.alto)).toBeLessThan(0.1)
    // y nunca baja de 25 cm bajo las vigas
    expect(caja.min.y).toBeGreaterThan(TECHO.alto - 0.25)
  })

  it('tiene normales (se ilumina) y es una sola malla de pocos triángulos', () => {
    expect(lona.attributes.normal).toBeDefined()
    expect(lona.index.count / 3).toBeLessThanOrEqual(128)
    lona.dispose()
  })
})

describe('los arcos de tubo', () => {
  const [, , cz] = CENTRO_DEL_SUELO_CUBIERTO

  it('son cuatro, de la viga de adelante a la de atrás, repartidos parejo', () => {
    const zs = posicionesDeLosArcos()
    expect(zs).toHaveLength(4)
    const delanteras = COLUMNAS_DEL_TECHO.map(([, , z]) => z)
    expect(zs[0]).toBeCloseTo(Math.max(...delanteras), 9)
    expect(zs[3]).toBeCloseTo(Math.min(...delanteras), 9)
    const paso = zs[0] - zs[1]
    expect(zs[1] - zs[2]).toBeCloseTo(paso, 9)
    expect(zs[2] - zs[3]).toBeCloseTo(paso, 9)
  })

  it('arrancan en las vigas laterales y se apoyan sobre la lona', () => {
    const arcos = arcosDeLaLona()
    const caja = cajaDe(arcos)
    // del lado de una viga a la del otro (más el grosor del tubo)
    expect(caja.max.x - caja.min.x).toBeGreaterThanOrEqual(2 * semianchoEntreVigas() - 1e-6)
    expect(caja.max.x - caja.min.x).toBeLessThan(2 * semianchoEntreVigas() + 0.5)
    // su parte más baja está sobre la viga (no por debajo) y la más alta, sobre la cresta
    expect(caja.min.y).toBeGreaterThanOrEqual(TECHO.alto - 1e-6)
    expect(caja.max.y).toBeCloseTo(TECHO.alto + LONA.flecha + 2 * LONA.radioDelArco, 2)
    // el primero y el último están sobre las vigas de adelante y de atrás
    const zs = posicionesDeLosArcos()
    expect(caja.max.z + cz).toBeCloseTo(zs[0] + LONA.radioDelArco, 1)
    expect(caja.min.z + cz).toBeCloseTo(zs[3] - LONA.radioDelArco, 1)
    arcos.dispose()
  })

  it('no hay columnas nuevas: siguen siendo las cuatro de siempre', () => {
    expect(COLUMNAS_DEL_TECHO).toHaveLength(4)
  })

  it('la cresta del arco delantero es donde se apoya el logo', () => {
    const cresta = crestaDelArcoDelantero()
    expect(cresta.x).toBeCloseTo(CENTRO_DEL_SUELO_CUBIERTO[0], 9)
    expect(cresta.z).toBeCloseTo(posicionesDeLosArcos()[0], 9)
    expect(cresta.y).toBeCloseTo(TECHO.alto + LONA.flecha + 2 * LONA.radioDelArco, 9)
  })
})
