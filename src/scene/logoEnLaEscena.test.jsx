import { renderToStaticMarkup } from 'react-dom/server'
import { BoxGeometry, MeshStandardMaterial } from 'three'
import { describe, expect, it } from 'vitest'

import { LogoDelLocal } from './LogoDelLocal.jsx'
import { crearMaterialesDelLogo } from './logoDelLocal.js'
import {
  ALTURA_DE_LOS_SOPORTES,
  ANCHO_DEL_LOGO,
  altoDelLogo,
  ALTO_MINIMO_DEL_LETRERO,
  LETRERO_DE_LA_PARED,
  colocacionDelLetreroDeLaPared,
  colocacionDelLogoDelTecho,
  geometriaDeLosSoportes,
  queSeDibujaDelLogo,
  queSeDibujaEnLaPared,
} from './logoEnLaEscena.js'
import { crestaDelArcoDelantero, LONA, posicionesDeLosArcos } from './lonaDelTecho.js'
import { elevacionDeLaVistaGeneral, proyectarPunto, vistaGeneral } from './camara.js'
import { COLUMNAS_DEL_TECHO, PARED_DEL_FONDO, TECHO } from './posiciones.js'
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

  it('el borde de abajo queda a 1,0 m del piso o más, y el alto no baja de 0,75 m', () => {
    expect(c.position[1] - c.alto / 2).toBeGreaterThanOrEqual(1 - 1e-9)
    expect(c.alto).toBeGreaterThanOrEqual(ALTO_MINIMO_DEL_LETRERO)
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

/**
 * Desde qué altura de la pared (en metros) el techo tapa lo que hay detrás, en la
 * vista general de una pantalla de `ancho` × `alto` píxeles. El lienzo mide eso
 * menos la barra lateral (56) y la barra superior (56). Tapan dos cosas, y manda la
 * que tapa más: el borde de abajo de la losa y el de la viga de adelante, que está
 * 0,4 m hacia adentro pero 0,12 m más abajo.
 */
function alturaDesdeDondeTapaElTecho(ancho, alto) {
  const aspecto = (ancho - 56) / (alto - 56)
  const vista = vistaGeneral(aspecto)
  const { centro, fondo } = medidasDelTecho()
  const zViga = Math.max(...COLUMNAS_DEL_TECHO.map(([, , z]) => z))
  const zPared = PARED_DEL_FONDO.z + PARED_DEL_FONDO.grosor / 2 + LETRERO_DE_LA_PARED.separacion
  const desde = (yDelTecho, zDelTecho) => {
    const yDelBorde = proyectarPunto([4.5, yDelTecho, zDelTecho], vista, aspecto)[1]
    let abajo = 0
    let arriba = TECHO.alto
    for (let i = 0; i < 50; i += 1) {
      const medio = (abajo + arriba) / 2
      if (proyectarPunto([4.5, medio, zPared], vista, aspecto)[1] < yDelBorde) abajo = medio
      else arriba = medio
    }
    return abajo
  }
  return Math.min(desde(TECHO.alto, centro[2] + fondo / 2), desde(TECHO.alto - 0.12, zViga))
}

describe('el letrero de la pared frente al borde del techo en la vista general', () => {
  const c = colocacionDelLetreroDeLaPared(PARED_DEL_FONDO, -2, 11)
  const abajo = c.position[1] - c.alto / 2
  const arriba = c.position[1] + c.alto / 2

  it.each([
    [1366, 768],
    [1920, 1080],
  ])('a %i × %i el borde de arriba queda justo debajo del borde del techo (a menos de 8 cm)', (ancho, alto) => {
    const tapa = alturaDesdeDondeTapaElTecho(ancho, alto)
    expect(arriba).toBeLessThan(tapa)
    expect(tapa - arriba).toBeLessThan(0.08)
  })

  it('a 1366 × 768 y a 1920 × 1080 el techo no tapa nada del letrero, y el borde de abajo está a 1,0 m o más', () => {
    for (const [ancho, alto] of [[1366, 768], [1920, 1080], [1280, 720]]) {
      expect(alturaDesdeDondeTapaElTecho(ancho, alto), `${ancho} × ${alto}`).toBeGreaterThan(arriba)
    }
    expect(abajo).toBeGreaterThanOrEqual(1 - 1e-9)
  })

  it('a 1024 × 768 el techo tapa la parte de arriba, pero deja a la vista más de la mitad', () => {
    const tapa = alturaDesdeDondeTapaElTecho(1024, 768)
    const aLaVista = (tapa - abajo) / c.alto
    expect(tapa).toBeLessThan(arriba)
    expect(aLaVista).toBeGreaterThan(0.5)
  })

  it('la vista general mira desde 12° en pantallas anchas, que es de donde salen estas medidas', () => {
    expect(elevacionDeLaVistaGeneral(1.84)).toBe(12)
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

  it('está de pie sobre la cresta del arco delantero, con sus soportes entre el tubo y el óvalo', () => {
    const base = c.position[1] - c.alto / 2
    const cresta = crestaDelArcoDelantero()
    expect(base).toBeCloseTo(cresta.y + ALTURA_DE_LOS_SOPORTES, 6)
    expect(cresta.y).toBeCloseTo(TECHO.alto + LONA.flecha + 2 * LONA.radioDelArco, 6)
    expect(c.position[2]).toBeCloseTo(posicionesDeLosArcos()[0], 6)
    expect(c.arribaDeLaLosa).toBeCloseTo(cresta.y, 6)
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
