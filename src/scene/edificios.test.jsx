import { readFileSync } from 'node:fs'

import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { COLOR_DE_ESCENA } from '../estilos/colores.js'
import { distanciaDeColor } from '../estilos/distanciaDeColor.js'
import { seSolapan } from './cafeteria.js'
import {
  ANCHO_DE_ACERA,
  CALZADAS,
  cajasDeLaVegetacion,
  FORMAS_DE_DETALLE,
  sitiosDeLosDetalles,
  zonasDeExclusion,
} from './colocacion.js'
import {
  ALTO_DE_UN_PISO,
  ALTO_MAXIMO,
  altoDelCuerpo,
  altoDelEdificio,
  cajaDelEdificio,
  colorConNiebla,
  distanciaAlCentro,
  EDIFICIOS,
  huellaDelEdificio,
  letreroDelEdificio,
  mezclaConElHorizonte,
  mezclarColores,
  NIEBLA_DE_LOS_EDIFICIOS,
  NOMBRES_PROHIBIDOS,
  piezasDelEdificio,
} from './edificios.js'
import { Edificios } from './Edificios.jsx'
import { geometriaDelEdificio } from './geometriasDeLosEdificios.js'

const por = (clave) => EDIFICIOS.find((e) => e.clave === clave)

describe('los edificios de la esquina', () => {
  it('son el concesionario, la perfumería y la clínica veterinaria, y un cuarto genérico (tres o cuatro en total)', () => {
    expect(EDIFICIOS.length).toBeGreaterThanOrEqual(3)
    expect(EDIFICIOS.length).toBeLessThanOrEqual(4)
    for (const clave of ['concesionario', 'perfumeria', 'clinica']) expect(por(clave), clave).toBeDefined()
  })

  it('son bajos: de 1 a 3 pisos y de no más de unos 10 m (con su techo y su letrero)', () => {
    for (const e of EDIFICIOS) {
      expect(e.pisos).toBeGreaterThanOrEqual(1)
      expect(e.pisos).toBeLessThanOrEqual(3)
      expect(altoDelCuerpo(e)).toBeCloseTo(e.pisos * ALTO_DE_UN_PISO, 9)
      expect(cajaDelEdificio(e).max[1], e.clave).toBeLessThanOrEqual(ALTO_MAXIMO)
      expect(altoDelEdificio(e)).toBeLessThanOrEqual(10.2)
    }
  })

  it('están del otro lado de las dos avenidas: más allá de sus aceras, con 2 m de retiro', () => {
    const acera = CALZADAS.guaimaral.x0 - ANCHO_DE_ACERA
    const aceraDelFondo = CALZADAS.granColombia.z0 - ANCHO_DE_ACERA
    for (const e of EDIFICIOS) {
      const h = huellaDelEdificio(e)
      const ladoDeLaGuaimaral = h.x1 <= acera - 2
      const ladoDeLaGranColombia = h.z1 <= aceraDelFondo - 2
      expect(ladoDeLaGuaimaral || ladoDeLaGranColombia, `${e.clave} al otro lado de una avenida`).toBe(true)
    }
  })

  it('no pisan ninguna zona: calzadas, el local, la franja de espera, la cafetería, las bocas ni las losas (con 14 placas y 7 puestos)', () => {
    for (const e of EDIFICIOS) {
      const h = huellaDelEdificio(e)
      for (const zona of zonasDeExclusion(14, 7)) expect(seSolapan(h, zona), `${e.clave} con «${zona.nombre}»`).toBe(false)
    }
  })

  it('no pisan ningún árbol ni detalle de calle (se compara con la copa de cada árbol)', () => {
    for (const e of EDIFICIOS) {
      const h = huellaDelEdificio(e)
      for (const caja of cajasDeLaVegetacion()) {
        const r = { x0: caja.min[0], x1: caja.max[0], z0: caja.min[2], z1: caja.max[2] }
        expect(seSolapan(h, r), `${e.clave} con ${caja.nombre}`).toBe(false)
      }
      for (const { rol, x, z } of sitiosDeLosDetalles()) {
        const radio = FORMAS_DE_DETALLE[rol].radio
        expect(seSolapan(h, { x0: x - radio, x1: x + radio, z0: z - radio, z1: z + radio }), `${e.clave} con ${rol}`).toBe(false)
      }
    }
  })

  it('no se pisan entre sí', () => {
    for (const a of EDIFICIOS) {
      for (const b of EDIFICIOS) {
        if (a !== b) expect(seSolapan(huellaDelEdificio(a), huellaDelEdificio(b)), `${a.clave} con ${b.clave}`).toBe(false)
      }
    }
  })

  it('el detector de zonas sí encuentra uno que estorbe: un edificio sobre el local', () => {
    const sobreElLocal = { x0: -5, x1: 5, z0: -5, z1: 5 }
    expect(zonasDeExclusion(14, 7).some((zona) => seSolapan(sobreElLocal, zona))).toBe(true)
  })
})

describe('los letreros son genéricos', () => {
  it('dicen solo el tipo de negocio', () => {
    expect(por('concesionario').letrero).toBe('Venta de autos')
    expect(por('perfumeria').letrero).toBe('Perfumería')
    expect(por('clinica').letrero).toBe('Clínica veterinaria')
  })

  it('ninguno repite el nombre de un negocio real del mapa', () => {
    for (const e of EDIFICIOS) {
      for (const nombre of NOMBRES_PROHIBIDOS) expect(e.letrero.toLowerCase(), `${e.clave}: ${nombre}`).not.toContain(nombre)
    }
  })

  it('cada letrero va pegado a la cara de adelante de su tablero, con la proporción del tablero', () => {
    for (const e of EDIFICIOS) {
      const l = letreroDelEdificio(e)
      const tablero = piezasDelEdificio(e).find((p) => p.nombre === 'tablero')
      expect(l.alto).toBeCloseTo(tablero.y1 - tablero.y0, 9)
      expect(l.ancho).toBeGreaterThan(l.alto)
      expect(l.y).toBeCloseTo((tablero.y0 + tablero.y1) / 2, 9)
    }
  })
})

describe('se desvanecen con la distancia', () => {
  it('la mezcla con el horizonte va de un cuarto (cerca) a la mitad (lejos) y crece con la distancia', () => {
    const { cerca, lejos, desde, hasta } = NIEBLA_DE_LOS_EDIFICIOS
    expect(mezclaConElHorizonte(0)).toBeCloseTo(cerca, 9)
    expect(mezclaConElHorizonte(hasta + 50)).toBeCloseTo(lejos, 9)
    let antes = mezclaConElHorizonte(desde)
    for (let d = desde + 1; d <= hasta; d += 1) {
      const ahora = mezclaConElHorizonte(d)
      expect(ahora).toBeGreaterThanOrEqual(antes)
      antes = ahora
    }
  })

  it('un edificio lejano queda más cerca del color del horizonte que el mismo cerca', () => {
    const horizonte = COLOR_DE_ESCENA.cieloHorizonte
    const cerca = colorConNiebla('edificioCrema', 15)
    const lejos = colorConNiebla('edificioCrema', 50)
    expect(distanciaDeColor(lejos, horizonte)).toBeLessThan(distanciaDeColor(cerca, horizonte))
    expect(distanciaDeColor(cerca, horizonte)).toBeLessThan(distanciaDeColor(COLOR_DE_ESCENA.edificioCrema, horizonte))
  })

  it('mezclar del todo da el color del horizonte, y nada, el mismo color', () => {
    const h = COLOR_DE_ESCENA.cieloHorizonte
    expect(mezclarColores(COLOR_DE_ESCENA.edificioCrema, h, 1)).toBe(h)
    expect(mezclarColores(COLOR_DE_ESCENA.edificioCrema, h, 0)).toBe(COLOR_DE_ESCENA.edificioCrema)
  })

  it('la geometría de cada edificio es una sola, con un color por vértice, y cae dentro de su caja', () => {
    for (const e of EDIFICIOS) {
      const g = geometriaDelEdificio(e)
      const colores = g.getAttribute('color')
      const posicion = g.getAttribute('position')
      expect(colores.count).toBe(posicion.count)
      g.computeBoundingBox()
      const caja = cajaDelEdificio(e)
      expect(g.boundingBox.min.x).toBeGreaterThanOrEqual(caja.min[0] - 1e-6)
      expect(g.boundingBox.max.x).toBeLessThanOrEqual(caja.max[0] + 1e-6)
      expect(g.boundingBox.max.y).toBeLessThanOrEqual(caja.max[1] + 1e-6)
      expect(g.boundingBox.min.z).toBeGreaterThanOrEqual(caja.min[2] - 1e-6)
      expect(g.boundingBox.max.z).toBeLessThanOrEqual(caja.max[2] + 1e-6)
      g.dispose()
    }
  })

  it('un edificio más lejos del centro tiene su distancia mayor', () => {
    const d = (e) => distanciaAlCentro((e.x0 + e.x1) / 2, (e.z0 + e.z1) / 2)
    expect(d(por('apartamentos'))).toBeGreaterThan(d(por('perfumeria')))
  })
})

describe('se dibujan con pocas llamadas, sin clics ni sombra, y sin tocar la simulación', () => {
  const componente = readFileSync('src/scene/Edificios.jsx', 'utf8')

  it('una malla por edificio más su letrero, sin sombra propia y sin recibir clics', () => {
    expect(componente).not.toMatch(/castShadow|receiveShadow/)
    expect(componente.match(/raycast=\{SIN_CLICS\}/g).length).toBeGreaterThanOrEqual(2)
    expect(componente).toContain('visible={visible}')
    expect(componente).not.toMatch(/Math\.random|https?:\/\//)
  })

  it('el componente se monta sin error', () => {
    expect(typeof renderToStaticMarkup(<Edificios />)).toBe('string')
    expect(typeof renderToStaticMarkup(<Edificios visible={false} />)).toBe('string')
  })

  it('no lee ni escribe el motor, el almacén ni el generador aleatorio', () => {
    const logica = readFileSync('src/scene/edificios.js', 'utf8')
    for (const fuente of [componente, logica]) {
      expect(fuente).not.toMatch(/from '\.\.\/engine|from '\.\.\/store/)
      expect(fuente).not.toContain('crearGenerador')
    }
  })

  it('la escena los enciende y apaga con el interruptor «edificios» de la calidad', () => {
    expect(readFileSync('src/scene/EscenaDelLavadero.jsx', 'utf8')).toContain('<Edificios visible={edificios} />')
  })
})
