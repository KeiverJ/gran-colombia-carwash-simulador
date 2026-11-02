import { readFileSync } from 'node:fs'

import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { ASIENTOS_OCUPADOS, MESAS, MOSTRADOR, HUELLA_DE_LA_CAFETERIA, OBJETOS_DEL_MOSTRADOR } from './cafeteria.js'
import { CLAVES_DE_AMBIENTE } from './cargaDeModelos.js'
import { cajasDeLosa, postesDeLasLosas, puntosDeLosCaminos } from './charcos.js'
import {
  CALZADAS,
  cajasDeLosDetalles,
  DISTANCIA_A_LO_QUE_AVISA,
  DISTANCIA_DE_UN_CONO_A_UNA_LOSA,
  distanciaAUnaCaja,
  FORMAS_DE_DETALLE,
  queEstorbaALaVegetacion,
  ROLES_DE_LA_CAFETERIA,
  ROLES_DE_LA_CALLE,
  ROLES_ROJOS,
  sitiosDeLosDetalles,
  zonasDeExclusion,
} from './colocacion.js'
import { Detalles } from './Detalles.jsx'
import { geometriaDeLosDetalles, ROLES_EN_CODIGO } from './geometriasDeLosDetalles.js'
import { AVENIDAS } from './posiciones.js'

const sitios = sitiosDeLosDetalles()
const de = (rol) => sitios.filter((s) => s.rol === rol)
const calle = sitios.filter((s) => ROLES_DE_LA_CALLE.includes(s.rol))
const enLasAceras = calle.filter((s) => s.rol !== 'balde')
const cafeteria = sitios.filter((s) => ROLES_DE_LA_CAFETERIA.includes(s.rol))
const LOSAS = cajasDeLosa(14, 7)

describe('los sitios de los detalles', () => {
  it('son siempre los mismos: salen de datos fijos y del hash propio, no del azar', () => {
    expect(sitiosDeLosDetalles()).toEqual(sitios)
  })

  it('hay de cada cosa donde tiene sentido', () => {
    expect(de('farol').length).toBeGreaterThanOrEqual(4)
    expect(de('caneca').length).toBeGreaterThanOrEqual(3)
    expect(de('semaforo')).toHaveLength(1)
    expect(de('stop')).toHaveLength(1)
    expect(de('cono').length).toBeGreaterThanOrEqual(4)
    expect(de('balde').length).toBeGreaterThanOrEqual(2)
    expect(de('banca').length).toBeGreaterThanOrEqual(2)
    expect(de('matera').length).toBeGreaterThanOrEqual(2)
    expect(de('sombrilla')).toHaveLength(1)
    expect(de('caja')).toHaveLength(1)
    expect(de('nevera')).toHaveLength(1)
  })

  it('cada rol tiene su forma: un modelo que existe o algo hecho en código, y nada sin dibujar', () => {
    for (const { rol } of sitios) {
      const forma = FORMAS_DE_DETALLE[rol]
      expect(forma, rol).toBeDefined()
      if (forma.modelo) expect(CLAVES_DE_AMBIENTE).toContain(forma.modelo)
      else expect(ROLES_EN_CODIGO).toContain(forma.forma)
    }
  })

  it('los de las aceras van fuera de las calzadas, del local, de las bocas, de las losas y de la cafetería (los baldes van junto a las columnas, adentro)', () => {
    for (const { rol, x, z } of enLasAceras) {
      expect(queEstorbaALaVegetacion(x, z), `${rol} en (${x.toFixed(1)}, ${z.toFixed(1)})`).toBeNull()
    }
  })

  it('los de la cafetería no pisan una calzada, el local, la franja de espera, una boca ni una losa', () => {
    const zonas = zonasDeExclusion(14, 7).filter(({ nombre }) => nombre !== 'la cafetería')
    for (const { rol, x, z } of cafeteria) {
      for (const zona of zonas) {
        const dentro = x >= zona.x0 && x <= zona.x1 && z >= zona.z0 && z <= zona.z1
        expect(dentro, `${rol} en (${x.toFixed(1)}, ${z.toFixed(1)}) con «${zona.nombre}»`).toBe(false)
      }
    }
    for (const calzada of Object.values(CALZADAS)) {
      for (const { x, z, rol } of cafeteria) {
        const monta = x > calzada.x0 && x < calzada.x1 && z > calzada.z0 && z < calzada.z1
        expect(monta, rol).toBe(false)
      }
    }
  })
})

describe('los objetos rojos del paisaje no se leen como avisos', () => {
  const rojos = sitios.filter((s) => ROLES_ROJOS.includes(s.rol))
  const postes = postesDeLasLosas(14, 7)
  const rotulosDeLasAvenidas = Object.values(AVENIDAS).map(({ rotulo }) => [rotulo[0], rotulo[2]])

  it('la señal «Stop» y el semáforo son los únicos objetos rojos o ámbar de los detalles', () => {
    expect(rojos.map((s) => s.rol).sort()).toEqual(['semaforo', 'stop'])
  })

  it('están a 6 m o más de cualquier losa, rampa, rótulo de servidor o rótulo de avenida', () => {
    for (const { rol, x, z } of rojos) {
      for (const caja of LOSAS) expect(distanciaAUnaCaja(x, z, caja), `${rol} con una losa`).toBeGreaterThanOrEqual(DISTANCIA_A_LO_QUE_AVISA)
      for (const [px, pz] of postes) expect(Math.hypot(x - px, z - pz), `${rol} con un rótulo`).toBeGreaterThanOrEqual(DISTANCIA_A_LO_QUE_AVISA)
      for (const [px, pz] of rotulosDeLasAvenidas) expect(Math.hypot(x - px, z - pz), `${rol} con un rótulo de avenida`).toBeGreaterThanOrEqual(DISTANCIA_A_LO_QUE_AVISA)
    }
  })

  it('el detector sí encuentra uno que estorbe', () => {
    const [x, , z] = [0, 0, 0]
    expect(LOSAS.some((caja) => distanciaAUnaCaja(x, z, caja) < DISTANCIA_A_LO_QUE_AVISA)).toBe(true)
  })
})

describe('los conos decorativos no se confunden con el de un servidor cerrado', () => {
  it('ninguno queda a menos de 1,5 m de una placa o un puesto, con 14 placas y 7 puestos', () => {
    for (const { x, z } of de('cono')) {
      for (const caja of LOSAS) expect(distanciaAUnaCaja(x, z, caja)).toBeGreaterThanOrEqual(DISTANCIA_DE_UN_CONO_A_UNA_LOSA)
    }
  })

  it('van en las aceras frente a las bocas, no sobre una losa ni el local', () => {
    for (const { x, z } of de('cono')) {
      expect(queEstorbaALaVegetacion(x, z)).toBeNull()
    }
  })
})

describe('los baldes', () => {
  it('quedan junto a una columna, fuera de los caminos de las motos, de las losas y de los postes', () => {
    const caminos = puntosDeLosCaminos(14, 7)
    const postes = postesDeLasLosas(14, 7)
    for (const { x, z } of de('balde')) {
      for (const [px, pz] of caminos) expect(Math.hypot(x - px, z - pz)).toBeGreaterThanOrEqual(1.2)
      for (const caja of LOSAS) expect(distanciaAUnaCaja(x, z, caja)).toBeGreaterThanOrEqual(0.5)
      for (const [px, pz] of postes) expect(Math.hypot(x - px, z - pz)).toBeGreaterThanOrEqual(0.8)
    }
  })
})

describe('la cafetería', () => {
  it('la caja registradora está sobre el mostrador, a la altura de su tapa y dentro de su largo', () => {
    const [caja] = de('caja')
    expect(caja.y).toBeCloseTo(MOSTRADOR.alto + MOSTRADOR.grosorDeLaTapa, 6)
    expect(caja.x).toBeGreaterThan(MOSTRADOR.x0)
    expect(caja.x).toBeLessThan(MOSTRADOR.x1)
    expect(caja.z).toBeGreaterThan(MOSTRADOR.z0)
    expect(caja.z).toBeLessThan(MOSTRADOR.z1)
    expect(OBJETOS_DEL_MOSTRADOR.cafetera.y).toBeCloseTo(caja.y, 6)
    expect(OBJETOS_DEL_MOSTRADOR.cafetera.x).toBeGreaterThan(MOSTRADOR.x0)
    expect(OBJETOS_DEL_MOSTRADOR.cafetera.x).toBeLessThan(MOSTRADOR.x1)
  })

  it('la nevera está en el piso, cerca del mostrador, y la caja mira al cliente (hacia −Z)', () => {
    const [nevera] = de('nevera')
    const [caja] = de('caja')
    expect(nevera.y).toBe(0)
    expect(nevera.x - MOSTRADOR.x1).toBeLessThan(1.5)
    expect(Math.abs(nevera.z - (MOSTRADOR.z0 + MOSTRADOR.z1) / 2)).toBeLessThan(1)
    expect(Math.cos(caja.giro)).toBeLessThan(-0.99)
  })

  it('la sombrilla está junto a las mesas (a menos de 3 m de una) y no sobre ellas', () => {
    const [sombrilla] = de('sombrilla')
    const distancias = MESAS.centros.map(([x, z]) => Math.hypot(sombrilla.x - x, sombrilla.z - z))
    expect(Math.min(...distancias)).toBeLessThan(3)
    expect(Math.min(...distancias)).toBeGreaterThan(1.2)
  })

  it('las materas, junto a la sala de espera, y las bancas, a su costado, caen junto a la huella del edificio', () => {
    for (const { rol, x, z } of [...de('matera'), ...de('banca')]) {
      expect(x, rol).toBeGreaterThan(HUELLA_DE_LA_CAFETERIA.x0 - 1)
      expect(x, rol).toBeLessThan(HUELLA_DE_LA_CAFETERIA.x1 + 2.5)
      expect(z, rol).toBeGreaterThan(HUELLA_DE_LA_CAFETERIA.z0 - 1)
      expect(z, rol).toBeLessThan(HUELLA_DE_LA_CAFETERIA.z1 + 0.5)
    }
  })

  it('ninguno queda sobre un asiento ocupado de la sala de espera', () => {
    for (const asiento of ASIENTOS_OCUPADOS) {
      for (const { rol, x, z } of cafeteria.filter((s) => !['caja', 'nevera'].includes(s.rol))) {
        const cerca = Math.hypot(asiento.x - x, asiento.z - z) < FORMAS_DE_DETALLE[rol].radio
        expect(cerca, `${rol} sobre el asiento (${asiento.x}, ${asiento.z})`).toBe(false)
      }
    }
  })
})

describe('las cajas que se comprueban con rayos', () => {
  it('hay una por detalle y dos por la sombrilla (el palo y el toldo)', () => {
    expect(cajasDeLosDetalles(sitios)).toHaveLength(sitios.length + 1)
  })
})

describe('se dibuja con respaldo', () => {
  it('las canecas, las bancas y la sombrilla salen en una sola geometría de color de vértice', () => {
    const geometria = geometriaDeLosDetalles(sitios)
    expect(geometria.getAttribute('color')).toBeDefined()
    expect(geometria.getAttribute('position').count).toBeGreaterThan(100)
    expect(geometria.index === null || geometria.index.count > 0).toBe(true)
    geometria.dispose()
  })

  it('sin sitios en código no hay geometría', () => {
    expect(geometriaDeLosDetalles(sitios.filter((s) => !ROLES_EN_CODIGO.includes(s.rol)))).toBeNull()
  })

  it('si los modelos no cargan (todavía o nunca), el componente no falla y no usa azar ni red', () => {
    const html = renderToStaticMarkup(<Detalles />)
    expect(typeof html).toBe('string')
    const codigo = readFileSync('src/scene/Detalles.jsx', 'utf8')
    expect(codigo).toMatch(/modelos\[clave\] \?/)
    expect(codigo).not.toMatch(/Math\.random|https?:\/\//)
    expect(codigo).toContain('raycast={() => null}')
  })
})
