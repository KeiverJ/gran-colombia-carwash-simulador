import { renderToStaticMarkup } from 'react-dom/server'
import { BoxGeometry, MeshStandardMaterial } from 'three'
import { describe, expect, it } from 'vitest'

import { LogoDelLocal } from './LogoDelLocal.jsx'
import { crearMaterialesDelLogo } from './logoDelLocal.js'
import {
  ALTURA_DE_LOS_SOPORTES,
  ANCHO_DEL_LOGO,
  altoDelLogo,
  LETRERO_DE_LA_PARED,
  colocacionDelLetreroDeLaPared,
  colocacionDelLogoDelTecho,
  geometriaDeLosSoportes,
  queSeDibujaDelLogo,
  queSeDibujaEnLaPared,
} from './logoEnLaEscena.js'
import { PARED_DEL_FONDO, TECHO } from './posiciones.js'
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

describe('qué lleva la pared del fondo', () => {
  it('con el letrero horizontal listo, el letrero en 3D', () => {
    expect(queSeDibujaEnLaPared('listo')).toBe('letrero-3d')
  })

  it('si no carga, el letrero de texto de siempre', () => {
    expect(queSeDibujaEnLaPared('fallo')).toBe('letrero-de-texto')
  })

  it('mientras carga, nada: así el letrero de texto no parpadea antes del logo', () => {
    expect(queSeDibujaEnLaPared('cargando')).toBe('nada')
  })
})

describe('el letrero horizontal de la pared', () => {
  const [desde, hasta] = [-2, 11]
  const c = colocacionDelLetreroDeLaPared(PARED_DEL_FONDO, desde, hasta)

  it('queda en el centro del tramo macizo, un poco por delante de la pared', () => {
    expect(c.position[0]).toBeCloseTo((desde + hasta) / 2, 9)
    expect(c.position[2]).toBeGreaterThan(PARED_DEL_FONDO.z + PARED_DEL_FONDO.grosor / 2)
    expect(c.position[2]).toBeLessThan(PARED_DEL_FONDO.z + PARED_DEL_FONDO.grosor / 2 + 0.1)
  })

  it('conserva la proporción 880 × 210 del dibujo', () => {
    expect(c.ancho / c.alto).toBeCloseTo(880 / 210, 6)
  })

  it('cabe en el tramo macizo y no pisa la abertura', () => {
    expect(c.position[0] - c.ancho / 2).toBeGreaterThanOrEqual(desde)
    expect(c.position[0] + c.ancho / 2).toBeLessThanOrEqual(hasta)
  })

  it('cabe en la franja que queda a la vista entre los puestos y el borde del techo (de 0,5 a 1,7 m)', () => {
    expect(c.position[1] - c.alto / 2).toBeGreaterThanOrEqual(0.5)
    expect(c.position[1] + c.alto / 2).toBeLessThanOrEqual(1.7)
    expect(c.alto).toBe(LETRERO_DE_LA_PARED.alto)
  })

  it('queda debajo del borde de abajo del techo y de la parte alta de la pared', () => {
    expect(c.position[1] + c.alto / 2).toBeLessThan(PARED_DEL_FONDO.alto)
    expect(c.position[1] + c.alto / 2).toBeLessThan(TECHO.alto)
  })

  it('en un tramo angosto se achica sin deformarse', () => {
    const angosto = colocacionDelLetreroDeLaPared(PARED_DEL_FONDO, 0, 3.5)
    expect(angosto.ancho).toBeCloseTo(2.5, 9)
    expect(angosto.ancho / angosto.alto).toBeCloseTo(880 / 210, 6)
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
