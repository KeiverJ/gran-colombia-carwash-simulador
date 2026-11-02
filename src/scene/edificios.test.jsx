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
  ALTO_DE_LA_PLANTA_BAJA,
  ALTO_DE_UN_PISO,
  ALTO_MAXIMO,
  altoDelCuerpo,
  altoDelEdificio,
  cajaDelEdificio,
  centroDelEdificio,
  colorConNiebla,
  distanciaAlCentro,
  EDIFICIOS,
  huellaDelEdificio,
  largoDeLaFachada,
  LARGO_MINIMO_DE_LA_FACHADA,
  letreroDelEdificio,
  mezclaConElHorizonte,
  mezclarColores,
  NIEBLA_DE_LOS_EDIFICIOS,
  NOMBRES_PROHIBIDOS,
  piezasDelEdificio,
} from './edificios.js'
import { Edificios } from './Edificios.jsx'
import { geometriaDeLosEdificios, geometriaDeLosLetreros } from './geometriasDeLosEdificios.js'

const por = (clave) => EDIFICIOS.find((e) => e.clave === clave)
const dondeQueda = (e) => {
  const [x, z] = centroDelEdificio(e)
  return { x, z }
}

describe('las manzanas vecinas', () => {
  it('son de 8 a 12 edificios, con el concesionario, la perfumería y la clínica veterinaria', () => {
    expect(EDIFICIOS.length).toBeGreaterThanOrEqual(8)
    expect(EDIFICIOS.length).toBeLessThanOrEqual(12)
    for (const clave of ['concesionario', 'perfumeria', 'clinica']) expect(por(clave), clave).toBeDefined()
    expect(new Set(EDIFICIOS.map((e) => e.clave)).size).toBe(EDIFICIOS.length)
  })

  it('están a los dos lados del lavadero, detrás y al otro lado de la Guaimaral, en los lotes vecinos', () => {
    const izquierda = EDIFICIOS.filter((e) => e.x1 <= -22)
    const detras = EDIFICIOS.filter((e) => e.z1 <= -22)
    const derecha = EDIFICIOS.filter((e) => e.x0 >= 17)
    expect(izquierda.length, 'al otro lado de la Guaimaral').toBeGreaterThanOrEqual(3)
    expect(detras.length, 'al otro lado de la Gran Colombia').toBeGreaterThanOrEqual(4)
    expect(derecha.length, 'a la derecha del lavadero').toBeGreaterThanOrEqual(2)
    // y no a lo lejos: el más lejano queda a menos de 55 m del centro de la escena
    for (const e of EDIFICIOS) {
      const { x, z } = dondeQueda(e)
      expect(distanciaAlCentro(x, z), e.clave).toBeLessThan(55)
    }
  })

  it('son bajos: de 1 a 3 pisos y de unos 10 m como mucho, con su techo', () => {
    for (const e of EDIFICIOS) {
      expect(e.pisos).toBeGreaterThanOrEqual(1)
      expect(e.pisos).toBeLessThanOrEqual(3)
      expect(altoDelCuerpo(e)).toBeCloseTo(ALTO_DE_LA_PLANTA_BAJA + (e.pisos - 1) * ALTO_DE_UN_PISO + 0.5, 9)
      expect(altoDelEdificio(e), e.clave).toBeLessThanOrEqual(ALTO_MAXIMO)
    }
    expect(Math.max(...EDIFICIOS.map((e) => e.pisos))).toBe(3)
    expect(Math.min(...EDIFICIOS.map((e) => e.pisos))).toBe(1)
  })

  it('quedan del otro lado de las avenidas, más allá de sus aceras con retiro, o a los lados del lavadero', () => {
    const aceraDeLaGuaimaral = CALZADAS.guaimaral.x0 - ANCHO_DE_ACERA
    const aceraDelFondo = CALZADAS.granColombia.z0 - ANCHO_DE_ACERA
    for (const e of EDIFICIOS) {
      const alOtroLadoDeLaGuaimaral = e.x1 <= aceraDeLaGuaimaral - 2
      const alOtroLadoDeLaGranColombia = e.z1 <= aceraDelFondo - 2
      const alLadoDelLavadero = e.x0 >= 17 && e.z0 >= -12 + 1
      expect(alOtroLadoDeLaGuaimaral || alOtroLadoDeLaGranColombia || alLadoDelLavadero, e.clave).toBe(true)
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

  it('la calzada de la Gran Colombia sigue entre los edificios: ninguno la cruza', () => {
    for (const e of EDIFICIOS) {
      const h = huellaDelEdificio(e)
      expect(h.z1 <= CALZADAS.granColombia.z0 - ANCHO_DE_ACERA || h.z0 >= CALZADAS.granColombia.z1, e.clave).toBe(true)
    }
  })
})

describe('las fachadas son de colores fuertes y llevan sus detalles', () => {
  const FACHADAS = ['casaOcre', 'casaTerracota', 'casaTurquesa', 'casaSalmon', 'casaVerdeClaro', 'casaBlanca', 'casaAzulCielo']

  it('cada fachada es de uno de los colores de las casas de Cúcuta, y hay variedad', () => {
    for (const e of EDIFICIOS) expect(FACHADAS, e.clave).toContain(e.fachada)
    expect(new Set(EDIFICIOS.map((e) => e.fachada)).size).toBeGreaterThanOrEqual(6)
    // los marcos y toldos son otros colores de la paleta, no grises
    expect(new Set(EDIFICIOS.map((e) => e.acento)).size).toBeGreaterThanOrEqual(4)
  })

  it('las fachadas son de colores vivos (no deslavados) salvo el blanco', () => {
    for (const e of EDIFICIOS.filter((x) => x.fachada !== 'casaBlanca')) {
      const [r, g, b] = [1, 3, 5].map((i) => Number.parseInt(COLOR_DE_ESCENA[e.fachada].slice(i, i + 2), 16))
      expect(Math.max(r, g, b) - Math.min(r, g, b), e.clave).toBeGreaterThan(45)
    }
  })

  it('cada edificio tiene vitrina, puerta, toldo, letrero, ventanas con marco y, los de varios pisos, balcones', () => {
    for (const e of EDIFICIOS) {
      const nombres = piezasDelEdificio(e).map((p) => p.nombre)
      for (const parte of ['cuerpo', 'techo', 'vitrina', 'puerta', 'toldo 0', 'fondo del letrero']) expect(nombres, `${e.clave}: ${parte}`).toContain(parte)
      if (e.pisos > 1) {
        expect(nombres.some((n) => n.startsWith('ventana 1.')), `${e.clave}: ventanas de arriba`).toBe(true)
        expect(nombres.some((n) => n.startsWith('balcón 1.')), `${e.clave}: balcones`).toBe(true)
        expect(nombres.some((n) => n.startsWith('baranda')), `${e.clave}: barandas`).toBe(true)
      }
    }
    // las rejas de las ventanas de abajo
    expect(EDIFICIOS.filter((e) => piezasDelEdificio(e).some((p) => p.nombre.startsWith('reja'))).length).toBeGreaterThanOrEqual(6)
  })

  it('el toldo es de rayas de dos colores', () => {
    for (const e of EDIFICIOS) {
      const colores = new Set(piezasDelEdificio(e).filter((p) => p.nombre.startsWith('toldo')).map((p) => p.color))
      expect(colores.size, e.clave).toBe(2)
    }
  })

  it('las piezas de la fachada quedan sobre la cara del edificio y dentro de su caja', () => {
    for (const e of EDIFICIOS) {
      const caja = cajaDelEdificio(e)
      for (const p of piezasDelEdificio(e)) {
        expect(p.x0, `${e.clave} ${p.nombre}`).toBeGreaterThanOrEqual(caja.min[0] - 1e-6)
        expect(p.x1, `${e.clave} ${p.nombre}`).toBeLessThanOrEqual(caja.max[0] + 1e-6)
        expect(p.z0, `${e.clave} ${p.nombre}`).toBeGreaterThanOrEqual(caja.min[2] - 1e-6)
        expect(p.z1, `${e.clave} ${p.nombre}`).toBeLessThanOrEqual(caja.max[2] + 1e-6)
        expect(p.y1, `${e.clave} ${p.nombre}`).toBeLessThanOrEqual(caja.max[1] + 1e-6)
        expect(p.x1).toBeGreaterThan(p.x0)
        expect(p.y1).toBeGreaterThan(p.y0)
        expect(p.z1).toBeGreaterThan(p.z0)
      }
    }
  })
})

describe('los letreros pintados son genéricos y miran a la vista general', () => {
  it('dicen el tipo de negocio, en español', () => {
    const textos = EDIFICIOS.map((e) => e.letrero)
    for (const texto of ['Panadería', 'Droguería', 'Ferretería', 'Tienda', 'Restaurante', 'Venta de autos', 'Perfumería', 'Clínica veterinaria']) {
      expect(textos, texto).toContain(texto)
    }
    expect(new Set(textos).size).toBe(textos.length)
  })

  it('ninguno repite el nombre de un negocio real del mapa', () => {
    for (const e of EDIFICIOS) {
      for (const nombre of NOMBRES_PROHIBIDOS) expect(e.letrero.toLowerCase(), `${e.clave}: ${nombre}`).not.toContain(nombre)
    }
  })

  it('cada letrero va pegado a la fachada, centrado y cabe en ella', () => {
    for (const e of EDIFICIOS) {
      const l = letreroDelEdificio(e)
      expect(largoDeLaFachada(e), e.clave).toBeGreaterThanOrEqual(LARGO_MINIMO_DE_LA_FACHADA)
      expect(l.ancho / l.alto).toBeCloseTo(8, 9)
      expect(l.ancho).toBeLessThan(largoDeLaFachada(e))
      const [cx, cz] = centroDelEdificio(e)
      if (e.frente === 'x') {
        expect(l.z).toBeCloseTo(cz, 9)
        expect(l.x).toBeGreaterThan(e.x1)
        expect(l.giro).toBeCloseTo(Math.PI / 2, 9)
      } else {
        expect(l.x).toBeCloseTo(cx, 9)
        expect(l.z).toBeGreaterThan(e.z1)
        expect(l.giro).toBe(0)
      }
    }
  })

  it('la mayoría mira a +Z, hacia la cámara de la vista general, para leerse bien desde ahí', () => {
    expect(EDIFICIOS.filter((e) => e.frente === 'z').length).toBeGreaterThanOrEqual(6)
  })

  it('el atlas lleva una fila por edificio y la geometría de los letreros es una sola, con una coordenada de textura por fila', () => {
    const g = geometriaDeLosLetreros()
    const uv = g.getAttribute('uv')
    expect(g.getAttribute('position').count).toBe(EDIFICIOS.length * 4)
    for (let i = 0; i < uv.count; i += 1) {
      expect(uv.getY(i)).toBeGreaterThanOrEqual(-1e-9)
      expect(uv.getY(i)).toBeLessThanOrEqual(1 + 1e-9)
    }
    // cada cartel usa una franja distinta del atlas
    const franjas = new Set()
    for (let i = 0; i < EDIFICIOS.length; i += 1) franjas.add(Math.floor(uv.getY(i * 4) * EDIFICIOS.length + 1e-6))
    expect(franjas.size).toBe(EDIFICIOS.length)
    g.dispose()
  })
})

describe('solo se desvanece lo más lejano', () => {
  it('hasta 38 m del centro no se mezcla nada con el horizonte; lejos, hasta la mitad', () => {
    const { lejos, desde, hasta } = NIEBLA_DE_LOS_EDIFICIOS
    expect(mezclaConElHorizonte(0)).toBe(0)
    expect(mezclaConElHorizonte(desde)).toBe(0)
    expect(mezclaConElHorizonte(hasta + 50)).toBeCloseTo(lejos, 9)
    let antes = mezclaConElHorizonte(desde)
    for (let d = desde + 1; d <= hasta; d += 1) {
      const ahora = mezclaConElHorizonte(d)
      expect(ahora).toBeGreaterThanOrEqual(antes)
      antes = ahora
    }
  })

  it('los edificios cercanos conservan sus colores tal cual y ninguno se deslava más de un 15 %', () => {
    expect(colorConNiebla('casaOcre', 20)).toBe(COLOR_DE_ESCENA.casaOcre)
    for (const e of EDIFICIOS) {
      const { x, z } = dondeQueda(e)
      expect(mezclaConElHorizonte(distanciaAlCentro(x, z)), e.clave).toBeLessThanOrEqual(0.15)
    }
    const sinNiebla = EDIFICIOS.filter((e) => mezclaConElHorizonte(distanciaAlCentro(dondeQueda(e).x, dondeQueda(e).z)) === 0)
    expect(sinNiebla.length).toBeGreaterThanOrEqual(5)
  })

  it('un color lejano queda más cerca del horizonte que el mismo cerca', () => {
    const horizonte = COLOR_DE_ESCENA.cieloHorizonte
    expect(distanciaDeColor(colorConNiebla('casaOcre', 120), horizonte)).toBeLessThan(distanciaDeColor(colorConNiebla('casaOcre', 45), horizonte))
    expect(distanciaDeColor(colorConNiebla('casaOcre', 45), horizonte)).toBeLessThanOrEqual(distanciaDeColor(COLOR_DE_ESCENA.casaOcre, horizonte))
  })

  it('mezclar del todo da el color del horizonte, y nada, el mismo color', () => {
    const h = COLOR_DE_ESCENA.cieloHorizonte
    expect(mezclarColores(COLOR_DE_ESCENA.casaOcre, h, 1)).toBe(h)
    expect(mezclarColores(COLOR_DE_ESCENA.casaOcre, h, 0)).toBe(COLOR_DE_ESCENA.casaOcre)
  })

  it('el horizonte es azul y no blanco, y la niebla toma ese color', () => {
    const [r, g, b] = [1, 3, 5].map((i) => Number.parseInt(COLOR_DE_ESCENA.cieloHorizonte.slice(i, i + 2), 16))
    expect(b).toBeGreaterThan(r + 40)
    expect(b).toBeGreaterThan(g)
    expect(Math.min(r, g, b)).toBeLessThan(170)
  })
})

describe('se dibujan con pocas llamadas, sin clics ni sombra, y sin tocar la simulación', () => {
  const componente = readFileSync('src/scene/Edificios.jsx', 'utf8')

  it('todas las fachadas en una sola geometría de color de vértice, y cada edificio cabe en su caja', () => {
    const g = geometriaDeLosEdificios()
    expect(g.getAttribute('color').count).toBe(g.getAttribute('position').count)
    g.computeBoundingBox()
    const cajas = EDIFICIOS.map(cajaDelEdificio)
    expect(g.boundingBox.min.x).toBeGreaterThanOrEqual(Math.min(...cajas.map((c) => c.min[0])) - 1e-6)
    expect(g.boundingBox.max.x).toBeLessThanOrEqual(Math.max(...cajas.map((c) => c.max[0])) + 1e-6)
    expect(g.boundingBox.max.y).toBeLessThanOrEqual(ALTO_MAXIMO + 1e-6)
    // pocos triángulos: unos miles, no cientos de miles
    const triangulos = g.index ? g.index.count / 3 : g.getAttribute('position').count / 3
    expect(triangulos).toBeLessThan(20000)
    g.dispose()
  })

  it('dos mallas en total (fachadas y letreros), sin sombra propia y sin recibir clics', () => {
    expect(componente.match(/<mesh /g)).toHaveLength(2)
    expect(componente).not.toMatch(/castShadow|receiveShadow/)
    expect(componente.match(/raycast=\{SIN_CLICS\}/g)).toHaveLength(2)
    expect(componente).toContain('visible={visible}')
    expect(componente).not.toMatch(/Math\.random|https?:\/\//)
  })

  it('el componente se monta sin error, visible o no', () => {
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
