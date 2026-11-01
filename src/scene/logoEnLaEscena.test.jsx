import { renderToStaticMarkup } from 'react-dom/server'
import { BoxGeometry, MeshStandardMaterial } from 'three'
import { describe, expect, it } from 'vitest'

import { LogoDelLocal } from './LogoDelLocal.jsx'
import { crearMaterialesDelLogo } from './logoDelLocal.js'
import {
  ALTURA_DE_LOS_SOPORTES,
  ANCHO_DEL_LOGO,
  altoDelLogo,
  colocacionDelLogoDeLaPared,
  colocacionDelLogoDelTecho,
  geometriaDeLosSoportes,
  queSeDibujaDelLogo,
} from './logoEnLaEscena.js'
import { PARED_DEL_FONDO, TECHO } from './posiciones.js'
import { CENTRO_DEL_SUELO_CUBIERTO, estadoDeLaOpacidad, medidasDelTecho, opacidadDelTecho } from './techo.js'

describe('qué se dibuja del logo según su estado', () => {
  it('cargando: nada, ni logo ni letrero (así el letrero negro no parpadea)', () => {
    expect(queSeDibujaDelLogo('cargando')).toEqual({ pared: 'nada', techo: false })
  })

  it('listo: el logo en la pared y en el techo', () => {
    expect(queSeDibujaDelLogo('listo')).toEqual({ pared: 'logo', techo: true })
  })

  it('fallo: el letrero de texto en la pared y nada en el techo', () => {
    expect(queSeDibujaDelLogo('fallo')).toEqual({ pared: 'letrero', techo: false })
  })

  it('con el logo listo ya no queda el letrero negro', () => {
    expect(queSeDibujaDelLogo('listo').pared).not.toBe('letrero')
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

describe('el logo de la pared', () => {
  const [desde, hasta] = [-11, -1.8]
  const c = colocacionDelLogoDeLaPared(PARED_DEL_FONDO, desde, hasta)

  it('queda en el centro del tramo macizo, más cerca de la cámara que la pared', () => {
    expect(c.position[0]).toBeCloseTo((desde + hasta) / 2, 9)
    expect(c.position[2]).toBeGreaterThan(PARED_DEL_FONDO.z + PARED_DEL_FONDO.grosor / 2)
  })

  it('cabe en el tramo y en la altura de la pared, sin salirse por arriba ni por abajo', () => {
    expect(c.ancho).toBeLessThanOrEqual(hasta - desde - 1)
    expect(c.position[1] - c.alto / 2).toBeGreaterThan(0)
    expect(c.position[1] + c.alto / 2).toBeLessThan(PARED_DEL_FONDO.alto)
  })

  it('en un tramo angosto se achica para no pisar la abertura', () => {
    const angosto = colocacionDelLogoDeLaPared(PARED_DEL_FONDO, 0, 2.5)
    expect(angosto.ancho).toBeCloseTo(1.5, 9)
  })

  it('los dos anchos de partida son los que dice el diseño', () => {
    expect(ANCHO_DEL_LOGO.pared).toBeGreaterThan(0)
    expect(ANCHO_DEL_LOGO.techo).toBeGreaterThan(0)
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

describe('las mallas de una copia del logo', () => {
  const piezas = ['white', 'navy', 'blue', 'gold', 'red'].map((color) => ({
    color,
    geometria: new BoxGeometry(1, 1, 1),
  }))
  const logo = { piezas }
  const materiales = crearMaterialesDelLogo(piezas)
  const cuentaMallas = (html) => (html.match(/<mesh\b/g) ?? []).length

  it('la copia de la pared dibuja una malla por color: cinco', () => {
    const html = renderToStaticMarkup(<LogoDelLocal logo={logo} materiales={materiales} ancho={3} position={[0, 0, 0]} />)
    expect(cuentaMallas(html)).toBe(5)
  })

  it('la copia del techo suma una malla de soportes: seis, el máximo', () => {
    const soportes = { geometria: new BoxGeometry(1, 1, 1), material: new MeshStandardMaterial(), abajo: -1 }
    const html = renderToStaticMarkup(
      <LogoDelLocal logo={logo} materiales={materiales} ancho={3} position={[0, 0, 0]} soportes={soportes} />,
    )
    expect(cuentaMallas(html)).toBe(6)
  })

  it('las dos copias comparten las mismas geometrías (cada una trae sus materiales)', () => {
    const otros = crearMaterialesDelLogo(piezas)
    expect(otros[0]).not.toBe(materiales[0])
    expect(logo.piezas[0].geometria).toBe(piezas[0].geometria)
  })
})
