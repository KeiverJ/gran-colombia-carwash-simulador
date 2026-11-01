import { renderToStaticMarkup } from 'react-dom/server'
import { BoxGeometry, MeshStandardMaterial } from 'three'
import { describe, expect, it } from 'vitest'

import { LogoDelLocal } from './LogoDelLocal.jsx'
import { crearMaterialesDelLogo } from './logoDelLocal.js'
import {
  ALTURA_DE_LOS_SOPORTES,
  ANCHO_DEL_LOGO,
  altoDelLogo,
  colocacionDelLogoDelTecho,
  geometriaDeLosSoportes,
  queSeDibujaDelLogo,
} from './logoEnLaEscena.js'
import { TECHO } from './posiciones.js'
import { CENTRO_DEL_SUELO_CUBIERTO, estadoDeLaOpacidad, medidasDelTecho, opacidadDelTecho } from './techo.js'

describe('cuándo se dibuja el logo', () => {
  it('listo: el logo va sobre el techo', () => {
    expect(queSeDibujaDelLogo('listo')).toEqual({ techo: true })
  })

  it('cargando o fallo: no se dibuja nada en el techo', () => {
    expect(queSeDibujaDelLogo('cargando')).toEqual({ techo: false })
    expect(queSeDibujaDelLogo('fallo')).toEqual({ techo: false })
  })

  it('el logo no tiene una copia en la pared: ese lugar es del letrero de texto', () => {
    expect(queSeDibujaDelLogo('listo')).not.toHaveProperty('pared')
  })
})

describe('el logo del techo', () => {
  const c = colocacionDelLogoDelTecho()
  const { centro, fondo, ancho: anchoDelTecho } = medidasDelTecho()

  it('está pegado al borde delantero del techo, sin pasarse de él', () => {
    const bordeDelantero = centro[2] + fondo / 2
    expect(c.position[2]).toBeLessThan(bordeDelantero)
    expect(c.position[2]).toBeGreaterThan(bordeDelantero - 1)
  })

  it('está centrado a lo ancho y cabe dentro del techo', () => {
    expect(c.position[0]).toBeCloseTo(centro[0], 6)
    expect(c.ancho).toBeLessThan(anchoDelTecho)
  })

  it('está de pie sobre la losa, con sus soportes entre la losa y el óvalo', () => {
    const base = c.position[1] - c.alto / 2
    expect(base).toBeCloseTo(TECHO.alto + TECHO.grosor + ALTURA_DE_LOS_SOPORTES, 6)
  })

  it('el alto es dos tercios del ancho', () => {
    expect(c.alto).toBeCloseTo((c.ancho * 2) / 3, 9)
    expect(altoDelLogo(3)).toBeCloseTo(2, 9)
  })

  it('los soportes son una sola geometría que sube desde la losa hasta el óvalo', () => {
    const g = geometriaDeLosSoportes(c.ancho)
    g.computeBoundingBox()
    expect(g.boundingBox.min.y).toBeCloseTo(0, 6)
    expect(g.boundingBox.max.y).toBeGreaterThan(ALTURA_DE_LOS_SOPORTES)
    // Dos tacos, uno a cada lado del centro.
    expect(g.boundingBox.min.x).toBeLessThan(0)
    expect(g.boundingBox.max.x).toBeGreaterThan(0)
  })
})

describe('el logo del techo se aparta junto con el techo', () => {
  /** Una cámara a la elevación dada (en grados), a 40 m del centro del suelo cubierto. */
  const camaraA = (grados) => {
    const r = (grados * Math.PI) / 180
    const [cx, cy, cz] = CENTRO_DEL_SUELO_CUBIERTO
    return [cx, cy + 40 * Math.sin(r), cz + 40 * Math.cos(r)]
  }

  it('a 10° el logo se ve entero y sólido', () => {
    const e = estadoDeLaOpacidad(opacidadDelTecho(camaraA(10)))
    expect(e).toEqual({ visible: true, transparent: false, depthWrite: true })
  })

  it('a 20° se está desvaneciendo: visible, transparente y sin escribir profundidad', () => {
    const opacidad = opacidadDelTecho(camaraA(20))
    expect(opacidad).toBeGreaterThan(0)
    expect(opacidad).toBeLessThan(1)
    expect(estadoDeLaOpacidad(opacidad)).toEqual({ visible: true, transparent: true, depthWrite: false })
  })

  it('a 30° ya desapareció, igual que el techo', () => {
    const opacidad = opacidadDelTecho(camaraA(30))
    expect(opacidad).toBe(0)
    expect(estadoDeLaOpacidad(opacidad).visible).toBe(false)
  })
})

describe('las mallas del logo', () => {
  const piezas = ['white', 'navy', 'blue', 'gold', 'red'].map((color) => ({
    color,
    geometria: new BoxGeometry(1, 1, 1),
  }))
  const logo = { piezas }
  const materiales = crearMaterialesDelLogo(piezas)
  const cuentaMallas = (html) => (html.match(/<mesh\b/g) ?? []).length

  it('el logo dibuja una malla por color: cinco', () => {
    const html = renderToStaticMarkup(<LogoDelLocal logo={logo} materiales={materiales} ancho={3} position={[0, 0, 0]} />)
    expect(cuentaMallas(html)).toBe(5)
  })

  it('con los soportes suma una malla más: seis, el máximo', () => {
    const soportes = { geometria: new BoxGeometry(1, 1, 1), material: new MeshStandardMaterial(), abajo: -1 }
    const html = renderToStaticMarkup(
      <LogoDelLocal logo={logo} materiales={materiales} ancho={3} position={[0, 0, 0]} soportes={soportes} />,
    )
    expect(cuentaMallas(html)).toBe(6)
  })
})
