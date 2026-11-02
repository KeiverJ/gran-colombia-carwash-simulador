import { readFileSync } from 'node:fs'

import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { seSolapan } from './cafeteria.js'
import { CLAVES_DE_AMBIENTE } from './cargaDeModelos.js'
import { puntosDeLosCaminos } from './charcos.js'
import {
  CALZADAS,
  cajasDeLaVegetacion,
  distanciaAUnaCaja,
  FORMAS_DE_DETALLE,
  sitiosDeLosDetalles,
  zonasDeExclusion,
} from './colocacion.js'
import { EDIFICIOS, huellaDelEdificio } from './edificios.js'
import { geometriaDelLavaderoDeCarros } from './geometriasDelLavaderoDeCarros.js'
import {
  bahiasDeLosCarros,
  BAHIAS_EN_TOTAL,
  blobsDeEspuma,
  cajaDelLavaderoDeCarros,
  CARRO,
  carrosDelLavadero,
  COLUMNAS_DE_LOS_CARROS,
  delMapaALaPlanta,
  ESQUINA_DEL_MAPA,
  ESPUMA_DEL_CARRO,
  huellaDelLavaderoDeCarros,
  LAVADERO_DE_CARROS,
  manguerasDelLavadero,
  rejillaDeLaBahia,
  TECHOS_DEL_MAPA,
  techoDelMapaEnLaPlanta,
  techosDelLavadero,
} from './lavaderoDeCarros.js'
import { LavaderoDeCarros } from './LavaderoDeCarros.jsx'
import { FRANJA_DE_ESPERA, LOCAL } from './posiciones.js'
import { SUELOS } from './suelos.js'

const huella = huellaDelLavaderoDeCarros()

describe('dónde queda el lavado de carros', () => {
  it('el mapa y la planta se superponen como en las entradas: la esquina del mapa cae en (−11, −12)', () => {
    const [x, z] = delMapaALaPlanta(ESQUINA_DEL_MAPA.mx, ESQUINA_DEL_MAPA.my)
    expect(x).toBeCloseTo(-11, 9)
    expect(z).toBeCloseTo(-12, 9)
    // el mapa está girado 180°: lo que está a la izquierda del mapa queda a la derecha de la planta
    expect(delMapaALaPlanta(0, 540)[0]).toBeGreaterThan(delMapaALaPlanta(348, 540)[0])
    // y lo que está abajo del mapa queda al fondo (z menor)
    expect(delMapaALaPlanta(348, 600)[1]).toBeLessThan(delMapaALaPlanta(348, 540)[1])
  })

  it('con esa superposición los techos del mapa caen encima del lavadero de motos: por eso se dibuja a su derecha', () => {
    const local = { x0: -LOCAL.ancho / 2, x1: LOCAL.ancho / 2, z0: -LOCAL.fondo / 2, z1: LOCAL.fondo / 2 }
    for (const techo of Object.values(TECHOS_DEL_MAPA)) {
      expect(seSolapan(techoDelMapaEnLaPlanta(techo), local)).toBe(true)
    }
  })

  it('queda a la derecha de la franja de espera, en las mismas filas del mapa y con el tamaño de sus techos', () => {
    const naranja = techoDelMapaEnLaPlanta(TECHOS_DEL_MAPA.naranja)
    const gris = techoDelMapaEnLaPlanta(TECHOS_DEL_MAPA.gris)
    expect(LAVADERO_DE_CARROS.x0).toBeGreaterThanOrEqual(FRANJA_DE_ESPERA.x0 + FRANJA_DE_ESPERA.ancho + 3)
    // las filas (Z) del mapa quedan dentro de las del lavado de carros
    for (const techo of [naranja, gris]) {
      const centro = (techo.z0 + techo.z1) / 2
      expect(centro).toBeGreaterThan(huella.z0)
      expect(centro).toBeLessThan(huella.z1)
    }
    // cada techo es al menos tan grande como el del mapa (se amplió para cubrir las cinco bahías) y no pasa del doble
    const [techoNaranja, techoGris] = techosDelLavadero()
    const medida = (t) => [t.x1 - t.x0 - 1.2, t.z1 - t.z0 - 0.6]
    for (const [dibujado, delMapa] of [[techoNaranja, naranja], [techoGris, gris]]) {
      const [ancho, fondo] = medida(dibujado)
      expect(ancho).toBeGreaterThanOrEqual((delMapa.x1 - delMapa.x0) * 0.95)
      expect(fondo).toBeGreaterThanOrEqual((delMapa.z1 - delMapa.z0) * 0.9)
      expect(ancho).toBeLessThanOrEqual((delMapa.x1 - delMapa.x0) * 2)
      expect(fondo).toBeLessThanOrEqual((delMapa.z1 - delMapa.z0) * 2)
    }
  })

  it('no pisa la franja de espera de la fila 1, sus caminos, el local ni ninguna zona de exclusión (con 14 placas y 7 puestos)', () => {
    for (const zona of zonasDeExclusion(14, 7)) expect(seSolapan(huella, zona), `con «${zona.nombre}»`).toBe(false)
    for (const calzada of Object.values(CALZADAS)) expect(seSolapan(huella, calzada)).toBe(false)
    const caja = { x0: huella.x0, x1: huella.x1, z0: huella.z0, z1: huella.z1 }
    for (const [x, z] of puntosDeLosCaminos(14, 7)) expect(distanciaAUnaCaja(x, z, caja), `camino en (${x.toFixed(1)}, ${z.toFixed(1)})`).toBeGreaterThanOrEqual(3)
  })

  it('no pisa ningún edificio, suelo, árbol ni detalle de calle', () => {
    for (const e of EDIFICIOS) expect(seSolapan(huella, huellaDelEdificio(e)), e.clave).toBe(false)
    for (const s of SUELOS) expect(seSolapan(huella, s), s.nombre).toBe(false)
    for (const c of cajasDeLaVegetacion()) expect(seSolapan(huella, { x0: c.min[0], x1: c.max[0], z0: c.min[2], z1: c.max[2] }), c.nombre).toBe(false)
    for (const { rol, x, z } of sitiosDeLosDetalles()) {
      const r = FORMAS_DE_DETALLE[rol].radio
      expect(seSolapan(huella, { x0: x - r, x1: x + r, z0: z - r, z1: z + r }), rol).toBe(false)
    }
  })

  it('no tapa el lavadero de motos: queda detrás de todo lo que se mira desde la derecha (se comprueba con rayos en `visibilidad.test.js`)', () => {
    expect(huella.x0).toBeGreaterThan(FRANJA_DE_ESPERA.x0 + FRANJA_DE_ESPERA.ancho)
    expect(cajaDelLavaderoDeCarros().max[1]).toBeLessThan(5)
  })
})

describe('qué lleva el lavado de carros', () => {
  it('un techo naranja (terracota) y uno gris, sobre columnas', () => {
    const techos = techosDelLavadero()
    expect(techos.map((t) => t.nombre)).toEqual(['techo naranja', 'techo gris'])
    expect(techos[0].color).toBe('casaTerracota')
    expect(techos[1].color).toBe('metal')
    const g = geometriaDelLavaderoDeCarros()
    expect(g.getAttribute('color').count).toBe(g.getAttribute('position').count)
    g.dispose()
  })

  it('cinco bahías con el piso marcado, cada una con su rejilla de desagüe y su manguera, dentro del piso', () => {
    const bahias = bahiasDeLosCarros()
    expect(bahias).toHaveLength(BAHIAS_EN_TOTAL)
    expect(BAHIAS_EN_TOTAL).toBe(5)
    const mangueras = manguerasDelLavadero()
    expect(mangueras).toHaveLength(5)
    bahias.forEach((bahia, i) => {
      expect(bahia.x0).toBeGreaterThan(LAVADERO_DE_CARROS.x0)
      expect(bahia.x1).toBeLessThan(LAVADERO_DE_CARROS.x1)
      expect(bahia.z0).toBeGreaterThan(LAVADERO_DE_CARROS.z0)
      expect(bahia.z1).toBeLessThan(LAVADERO_DE_CARROS.z1)
      const rejilla = rejillaDeLaBahia(bahia)
      for (const [x, z] of [[rejilla.x0, rejilla.z0], [rejilla.x1, rejilla.z1]]) {
        expect(x).toBeGreaterThan(bahia.x0)
        expect(x).toBeLessThan(bahia.x1)
        expect(z).toBeGreaterThan(bahia.z0)
        expect(z).toBeLessThan(bahia.z1)
      }
      expect(mangueras[i].x).toBeGreaterThan(bahia.x0)
      expect(mangueras[i].z).toBeGreaterThan(bahia.z0)
      expect(mangueras[i].z).toBeLessThan(bahia.z1)
    })
    // las cinco bahías no se pisan entre sí
    for (const a of bahias) for (const b of bahias) if (a !== b) expect(seSolapan(a, b)).toBe(false)
    // y están bajo los techos: tres bajo el naranja (atrás) y dos bajo el gris (adelante)
    const [naranja, gris] = techosDelLavadero()
    bahias.forEach((bahia, i) => {
      const techo = i < 3 ? naranja : gris
      expect(bahia.x0, `bahía ${i + 1}`).toBeGreaterThan(techo.x0)
      expect(bahia.x1).toBeLessThan(techo.x1)
      expect(bahia.z0).toBeGreaterThan(techo.z0)
      expect(bahia.z1).toBeLessThan(techo.z1)
    })
    // las bahías de una fila guardan la misma separación y las columnas caen en los espacios, no dentro de ellas
    for (const [cx, cz] of COLUMNAS_DE_LOS_CARROS) {
      for (const bahia of bahias) {
        const dentro = cx > bahia.x0 - 0.15 && cx < bahia.x1 + 0.15 && cz > bahia.z0 && cz < bahia.z1
        expect(dentro, `columna (${cx.toFixed(1)}, ${cz.toFixed(1)})`).toBe(false)
      }
    }
  })

  it('uno o dos carros quietos en bahías distintas, de los modelos de carros que ya hay (ninguno es una moto)', () => {
    const carros = carrosDelLavadero()
    const bahias = bahiasDeLosCarros()
    expect(carros.length).toBeGreaterThanOrEqual(1)
    expect(carros.length).toBeLessThanOrEqual(2)
    expect(new Set(carros.map((c) => c.bahia)).size).toBe(carros.length)
    carros.forEach((carro) => {
      const bahia = bahias[carro.bahia]
      expect(CLAVES_DE_AMBIENTE).toContain(carro.modelo)
      expect(['mazda', 'deportivo']).toContain(carro.modelo)
      expect(carro.modelo).not.toMatch(/moto/i)
      // el carro (de frente a +Z) cabe en su bahía y no pisa la rejilla
      expect(carro.x - CARRO.ancho / 2).toBeGreaterThan(bahia.x0)
      expect(carro.x + CARRO.ancho / 2).toBeLessThan(bahia.x1)
      expect(carro.z - CARRO.largo / 2).toBeGreaterThan(bahia.z0)
      expect(carro.z + CARRO.largo / 2).toBeLessThan(rejillaDeLaBahia(bahia).z0 + 0.05)
    })
  })

  it('la espuma de cada carro es siempre la misma (hash propio), cae sobre el carro y no se pasa de él', () => {
    expect(blobsDeEspuma(0)).toEqual(blobsDeEspuma(0))
    expect(blobsDeEspuma(0)).not.toEqual(blobsDeEspuma(1))
    expect(blobsDeEspuma(0)).toHaveLength(ESPUMA_DEL_CARRO.blobs)
    for (const { x, y, z, radio } of blobsDeEspuma(0)) {
      expect(Math.abs(x)).toBeLessThan(CARRO.ancho / 2)
      expect(Math.abs(z)).toBeLessThan(CARRO.largo / 2)
      expect(y).toBeGreaterThan(CARRO.alto * 0.6)
      expect(radio).toBeGreaterThanOrEqual(ESPUMA_DEL_CARRO.radio[0])
      expect(radio).toBeLessThanOrEqual(ESPUMA_DEL_CARRO.radio[1])
    }
  })
})

describe('es solo una referencia del lugar', () => {
  const codigo = readFileSync('src/scene/LavaderoDeCarros.jsx', 'utf8')

  it('no recibe clics, no proyecta sombra, no usa azar ni red, y se oculta con la calidad', () => {
    expect(codigo.match(/raycast/g).length).toBeGreaterThanOrEqual(2)
    expect(codigo).not.toMatch(/castShadow/)
    expect(codigo).not.toMatch(/Math\.random|https?:\/\//)
    expect(codigo).toContain('visible={visible}')
    expect(readFileSync('src/scene/EscenaDelLavadero.jsx', 'utf8')).toContain('<LavaderoDeCarros visible={edificios} />')
  })

  it('no lee ni escribe el motor ni el almacén', () => {
    for (const archivo of ['LavaderoDeCarros.jsx', 'lavaderoDeCarros.js', 'geometriasDelLavaderoDeCarros.js']) {
      const fuente = readFileSync(`src/scene/${archivo}`, 'utf8')
      expect(fuente, archivo).not.toMatch(/from '\.\.\/engine|from '\.\.\/store/)
    }
  })

  it('se monta sin error aunque los modelos no hayan cargado', () => {
    expect(typeof renderToStaticMarkup(<LavaderoDeCarros />)).toBe('string')
    expect(typeof renderToStaticMarkup(<LavaderoDeCarros visible={false} />)).toBe('string')
  })
})
