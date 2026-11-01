import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import {
  boquillaDeLaPlaca,
  BURBUJAS_POR_PLACA,
  CAJA_DE_LAS_BURBUJAS,
  OBJETIVO_DEL_CHORRO,
  posicionDeLaBurbuja,
  posicionDelChorro,
  PUNTOS_DEL_CHORRO,
} from './chorro.js'
import { GOTAS_POR_PLACA, PLACAS_COMO_MAXIMO, posicionDeLaGota } from './gotas.js'
import { estaLevantada } from './losasVisuales.js'
import { MOTO, NUMERO_EN_LA_LOSA, posteDeLaPlaca, SERVIDOR } from './posiciones.js'
import { pasoDeLaAnimacion } from './relojDeLaEscena.js'

const instantes = Array.from({ length: 60 }, (_, i) => i * 0.083)

describe('la boquilla de cada placa', () => {
  it('sale del poste de su placa, con 6 y con 14 placas', () => {
    for (const total of [6, 14]) {
      for (let i = 0; i < total; i += 1) {
        const poste = posteDeLaPlaca(i, total)
        const boquilla = boquillaDeLaPlaca(i, total)
        expect(boquilla.z).toBe(poste.z)
        // La manguera sale hacia la derecha del poste, hasta 95 cm si no se ha encogido.
        expect(boquilla.x).toBeGreaterThan(poste.x)
        expect(boquilla.x - poste.x).toBeCloseTo(0.95 * poste.escala, 9)
      }
    }
  })

  it('con las losas muy juntas el poste se acerca a su losa y la manguera se acorta con él', () => {
    const alcance = (total) => boquillaDeLaPlaca(1, total).x - posteDeLaPlaca(1, total).x
    expect(posteDeLaPlaca(1, 14).x).toBeGreaterThan(posteDeLaPlaca(1, 6).x)
    expect(alcance(14)).toBeLessThan(alcance(6))
  })
})

describe('el chorro de la manguera', () => {
  const boquilla = boquillaDeLaPlaca(1, 6)

  it('tiene la misma cantidad de puntos por placa y nunca sale sin que se le pida', () => {
    expect(PUNTOS_DEL_CHORRO).toBeGreaterThan(4)
  })

  it('va de la boquilla a la moto: al empezar está en la boquilla y al llegar, sobre la moto', () => {
    const [x0, y0, z0] = posicionDelChorro(0, 0, boquilla)
    expect(x0).toBeCloseTo(boquilla.x, 6)
    expect(y0).toBeCloseTo(boquilla.y, 6)
    expect(z0).toBeCloseTo(boquilla.z, 6)
    // Un punto en el último instante antes de reiniciarse ya está en la moto (el chorro se abre unos 5 cm a los lados).
    const [x1, y1, z1] = posicionDelChorro(0, 0.55 - 1e-6, boquilla)
    expect(Math.abs(x1 - OBJETIVO_DEL_CHORRO.x)).toBeLessThanOrEqual(0.05 + 1e-6)
    expect(y1).toBeCloseTo(OBJETIVO_DEL_CHORRO.y, 2)
    expect(Math.abs(z1 - OBJETIVO_DEL_CHORRO.z)).toBeLessThanOrEqual(0.05 + 1e-6)
  })

  it('el objetivo cae dentro de la moto: a lo ancho, a lo largo y por encima de la placa', () => {
    expect(Math.abs(OBJETIVO_DEL_CHORRO.x)).toBeLessThan(MOTO.ancho / 2)
    expect(OBJETIVO_DEL_CHORRO.y).toBeGreaterThan(SERVIDOR.altoOcupado)
    expect(OBJETIVO_DEL_CHORRO.y).toBeLessThan(SERVIDOR.altoOcupado + MOTO.alto)
  })

  it('es un arco: a mitad de camino va más alto que la línea recta', () => {
    let masAlto = 0
    for (let k = 0; k < PUNTOS_DEL_CHORRO; k += 1) {
      const [, y] = posicionDelChorro(k, 0.2, boquilla)
      const fase = (0.2 / 0.55 + k / PUNTOS_DEL_CHORRO) % 1
      const recta = boquilla.y + (OBJETIVO_DEL_CHORRO.y - boquilla.y) * fase
      masAlto = Math.max(masAlto, y - recta)
    }
    expect(masAlto).toBeGreaterThan(0.1)
  })

  it('nunca pasa sobre el número de la placa, que va pegado al borde de adelante', () => {
    for (const t of instantes) {
      for (let k = 0; k < PUNTOS_DEL_CHORRO; k += 1) {
        const [, , z] = posicionDelChorro(k, t, boquilla)
        expect(z).toBeLessThan(NUMERO_EN_LA_LOSA.z - 0.2)
      }
    }
  })

  it('no usa azar: el mismo punto en el mismo instante está en el mismo sitio', () => {
    expect(posicionDelChorro(4, 1.234, boquilla)).toEqual(posicionDelChorro(4, 1.234, boquilla))
  })

  it('los puntos van escalonados: no están todos en el mismo sitio', () => {
    const alturas = new Set(Array.from({ length: PUNTOS_DEL_CHORRO }, (_, k) => posicionDelChorro(k, 0.3, boquilla)[1].toFixed(3)))
    expect(alturas.size).toBeGreaterThan(PUNTOS_DEL_CHORRO / 2)
  })
})

describe('las burbujas', () => {
  it('son unas seis por placa', () => {
    expect(BURBUJAS_POR_PLACA).toBe(6)
  })

  it('suben sobre la moto, dentro de su caja y sin llegar al número', () => {
    for (const t of instantes) {
      for (let k = 0; k < BURBUJAS_POR_PLACA; k += 1) {
        const { x, y, z, radio } = posicionDeLaBurbuja(k, t)
        expect(Math.abs(x)).toBeLessThanOrEqual(CAJA_DE_LAS_BURBUJAS.x + 1e-9)
        expect(Math.abs(z - CAJA_DE_LAS_BURBUJAS.centroZ)).toBeLessThanOrEqual(CAJA_DE_LAS_BURBUJAS.z + 1e-9)
        expect(z).toBeLessThan(NUMERO_EN_LA_LOSA.z - 0.3)
        expect(y).toBeGreaterThan(SERVIDOR.altoOcupado)
        expect(y).toBeLessThan(SERVIDOR.altoOcupado + MOTO.alto)
        expect(radio).toBeGreaterThanOrEqual(0)
        expect(radio).toBeLessThanOrEqual(0.085 + 1e-9)
      }
    }
  })

  it('suben: con el tiempo cada una va más alto, hasta que se va y vuelve a nacer', () => {
    // Con un salto corto, la altura crece (salvo justo al reiniciarse).
    let subidas = 0
    for (let k = 0; k < BURBUJAS_POR_PLACA; k += 1) {
      const antes = posicionDeLaBurbuja(k, 1).y
      const despues = posicionDeLaBurbuja(k, 1.05).y
      if (despues > antes) subidas += 1
    }
    expect(subidas).toBeGreaterThanOrEqual(BURBUJAS_POR_PLACA - 1)
  })

  it('nacen y se van chicas, sin saltos de tamaño', () => {
    let hayChica = false
    let hayGrande = false
    for (const t of instantes) {
      for (let k = 0; k < BURBUJAS_POR_PLACA; k += 1) {
        const { radio } = posicionDeLaBurbuja(k, t)
        if (radio < 0.02) hayChica = true
        if (radio > 0.045) hayGrande = true
      }
    }
    expect(hayChica && hayGrande).toBe(true)
  })

  it('no van todas juntas ni a la misma altura', () => {
    const alturas = new Set(Array.from({ length: BURBUJAS_POR_PLACA }, (_, k) => posicionDeLaBurbuja(k, 0.7).y.toFixed(3)))
    expect(alturas.size).toBeGreaterThan(BURBUJAS_POR_PLACA / 2)
  })

  it('no usan azar: la misma burbuja en el mismo instante está en el mismo sitio', () => {
    expect(posicionDeLaBurbuja(2, 4.321)).toEqual(posicionDeLaBurbuja(2, 4.321))
  })
})

describe('con el reloj simulado en pausa, todo queda quieto', () => {
  it('con 0 minutos el tiempo de animación no avanza, así que ninguna posición cambia', () => {
    const boquilla = boquillaDeLaPlaca(0, 6)
    let tiempo = 1.5
    const antes = {
      chorro: posicionDelChorro(3, tiempo, boquilla),
      burbuja: posicionDeLaBurbuja(3, tiempo),
      gota: posicionDeLaGota(3, tiempo, SERVIDOR.altoOcupado, boquilla),
    }
    for (let cuadro = 0; cuadro < 30; cuadro += 1) tiempo += pasoDeLaAnimacion(1 / 60, 0)
    expect(posicionDelChorro(3, tiempo, boquilla)).toEqual(antes.chorro)
    expect(posicionDeLaBurbuja(3, tiempo)).toEqual(antes.burbuja)
    expect(posicionDeLaGota(3, tiempo, SERVIDOR.altoOcupado, boquilla)).toEqual(antes.gota)
  })

  it('con minutos que pasan, sí avanza', () => {
    const boquilla = boquillaDeLaPlaca(0, 6)
    let tiempo = 0
    for (let cuadro = 0; cuadro < 10; cuadro += 1) tiempo += pasoDeLaAnimacion(1 / 60, 0.02)
    expect(posicionDelChorro(0, tiempo, boquilla)).not.toEqual(posicionDelChorro(0, 0, boquilla))
  })
})

describe('las gotas siguen la boquilla de su placa', () => {
  it('caen desde la boquilla que se les da y desde la de siempre si no se les da ninguna', () => {
    const boquilla = boquillaDeLaPlaca(3, 14)
    const [x] = posicionDeLaGota(0, 0, SERVIDOR.altoOcupado, boquilla)
    expect(x).toBeCloseTo(boquilla.x, 6)
    expect(posicionDeLaGota(0, 0, 0.5)).toEqual(posicionDeLaGota(0, 0, 0.5, { x: 0.95 - 1.5, y: 0.85, z: 0.7 }))
  })

  it('hay sitio para las 14 placas', () => {
    expect(PLACAS_COMO_MAXIMO).toBe(14)
    expect(PLACAS_COMO_MAXIMO * GOTAS_POR_PLACA * 3).toBeGreaterThan(14 * 14 * 3 - 1)
  })
})

describe('solo hay agua sobre la placa con moto', () => {
  it('libre, reservada y cerrada no tienen moto encima; ocupada y cerrándose sí', () => {
    expect(['libre', 'reservada', 'cerrada'].some(estaLevantada)).toBe(false)
    expect(['ocupada', 'cerrandose'].every(estaLevantada)).toBe(true)
  })

  it('el componente solo dibuja las placas levantadas, respeta la corrida larga y no recibe clics', () => {
    const fuente = readFileSync('src/scene/Particulas.jsx', 'utf8')
    expect(fuente).toContain('if (!estaLevantada(estados[i])) continue')
    expect(fuente).toContain('if (corridaLarga)')
    expect(fuente.match(/raycast=\{SIN_CLICS\}/g)).toHaveLength(3)
  })

  it('las gotas, el chorro y las burbujas van con el interruptor de partículas de la calidad', () => {
    const escena = readFileSync('src/scene/EscenaDelLavadero.jsx', 'utf8')
    expect(escena).toContain('{particulas && <Particulas placas={placas} />}')
  })
})
