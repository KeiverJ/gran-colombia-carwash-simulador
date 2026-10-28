import { Matrix4, Vector3 } from 'three'
import { describe, expect, it } from 'vitest'

import { COLOR_DE_PLAN } from '../estilos/colores.js'
import { MOTO } from './posiciones.js'
import {
  ARO,
  crearRecursosDeMoto,
  liberarRecursosDeMoto,
  SEPARACION_DE_LA_MARCA,
} from './recursosDeMoto.js'

const hexDe = (material) => `#${material.color.getHexString()}`

describe('recursos compartidos de las motos', () => {
  it('el marcador de cada plan tiene su forma y el color de su plan', () => {
    const recursos = crearRecursosDeMoto()
    expect(recursos.marcas[1].type).toBe('SphereGeometry')
    expect(recursos.marcas[2].type).toBe('BoxGeometry')
    expect(recursos.marcas[3].type).toBe('ConeGeometry')
    for (const plan of [1, 2, 3]) {
      expect(hexDe(recursos.materialesDeMarca[plan])).toBe(COLOR_DE_PLAN[plan])
    }
    liberarRecursosDeMoto(recursos)
  })

  it('el aro de cada plan es exactamente del color de su plan, sin luz ni tonos', () => {
    const recursos = crearRecursosDeMoto()
    for (const plan of [1, 2, 3]) {
      const material = recursos.materialesDeAro[plan]
      expect(hexDe(material)).toBe(COLOR_DE_PLAN[plan])
      expect(material.isMeshBasicMaterial).toBe(true)
      expect(material.toneMapped).toBe(false)
    }
    liberarRecursosDeMoto(recursos)
  })

  it('el aro es plano (acostado sobre el piso) y cabe bajo la moto y su vecina de la fila', () => {
    const recursos = crearRecursosDeMoto()
    const normales = recursos.aro.attributes.normal
    for (let i = 0; i < normales.count; i += 1) {
      expect(normales.getY(i)).toBeCloseTo(1, 5)
    }
    recursos.aro.computeBoundingBox()
    const { min, max } = recursos.aro.boundingBox
    expect(max.y - min.y).toBeCloseTo(0, 5)
    expect(max.x).toBeCloseTo(ARO.exterior, 2)
    // el aro cubre el largo de la moto y no pasa del ancho de una losa
    expect(ARO.exterior * 2).toBeGreaterThanOrEqual(MOTO.largo)
    liberarRecursosDeMoto(recursos)
  })

  it('cada marcador nace con la base en y = 0 y mide el 70 % de lo que medía', () => {
    const recursos = crearRecursosDeMoto()
    const alturas = { 1: 0.44, 2: 0.36, 3: 0.46 }
    for (const plan of [1, 2, 3]) {
      recursos.marcas[plan].computeBoundingBox()
      const { min, max } = recursos.marcas[plan].boundingBox
      expect(min.y).toBeCloseTo(0, 5)
      expect(max.y).toBeCloseTo(alturas[plan] * 0.7, 5)
      // centrado sobre su moto: ni a un lado ni adelante ni atrás
      expect((min.x + max.x) / 2).toBeCloseTo(0, 5)
      expect((min.z + max.z) / 2).toBeCloseTo(0, 5)
    }
    liberarRecursosDeMoto(recursos)
  })

  it('el marcador a 25 cm de la moto más alta (la Vespa, de 1,24 m) pasa de MOTO.alto por 7 cm como mucho', () => {
    const recursos = crearRecursosDeMoto()
    expect(SEPARACION_DE_LA_MARCA).toBe(0.25)
    for (const plan of [1, 2, 3]) {
      recursos.marcas[plan].computeBoundingBox()
      const techo = 1.241 + SEPARACION_DE_LA_MARCA + recursos.marcas[plan].boundingBox.max.y
      expect(techo).toBeLessThanOrEqual(MOTO.alto + 0.07)
    }
    liberarRecursosDeMoto(recursos)
  })

  it('la figura de respaldo está centrada y mide su altura', () => {
    const recursos = crearRecursosDeMoto()
    const { centroX, centroZ, alto } = recursos.medidaDelRespaldo
    expect(centroX).toBeCloseTo(0, 5)
    expect(centroZ).toBeCloseTo(0, 5)
    expect(alto).toBeCloseTo(0.92, 2) // el manubrio, a 0,88 m y de 8 cm
    liberarRecursosDeMoto(recursos)
  })

  it('la figura de respaldo son cinco piezas simples, ninguna del color de un plan', () => {
    const recursos = crearRecursosDeMoto()
    expect(recursos.respaldo).toHaveLength(5)
    for (const { geometry, material, local } of recursos.respaldo) {
      expect(geometry.isBufferGeometry).toBe(true)
      expect(local).toBeInstanceOf(Matrix4)
      expect(Object.values(COLOR_DE_PLAN)).not.toContain(hexDe(material))
    }
    // las ruedas marcan los extremos: la figura mide lo que dice MOTO.largo
    const [delantera, trasera] = recursos.respaldo
    const z = (pieza) => new Vector3().setFromMatrixPosition(pieza.local).z
    expect(z(delantera) - z(trasera)).toBeCloseTo(MOTO.largo - 2 * 0.28, 5)
    liberarRecursosDeMoto(recursos)
  })
})

describe('liberarRecursosDeMoto', () => {
  it('suelta todas las formas y todos los materiales que creó, y ninguno más de una vez por forma o material distintos', () => {
    const recursos = crearRecursosDeMoto()
    const geometrias = new Set([
      ...Object.values(recursos.marcas),
      recursos.aro,
      ...Object.values(recursos.geometriasDeRespaldo),
    ])
    const materiales = new Set([
      ...Object.values(recursos.materialesDeMarca),
      ...Object.values(recursos.materialesDeAro),
      ...Object.values(recursos.materialesDeRespaldo),
    ])
    const sueltos = { geometrias: new Set(), materiales: new Set() }
    for (const g of geometrias) g.addEventListener('dispose', () => sueltos.geometrias.add(g))
    for (const m of materiales) m.addEventListener('dispose', () => sueltos.materiales.add(m))

    liberarRecursosDeMoto(recursos)

    expect(sueltos.geometrias.size).toBe(geometrias.size)
    expect(sueltos.materiales.size).toBe(materiales.size)
  })

  it('todo lo que usa la figura de respaldo está entre lo que se libera', () => {
    const recursos = crearRecursosDeMoto()
    const geometrias = new Set(Object.values(recursos.geometriasDeRespaldo))
    const materiales = new Set(Object.values(recursos.materialesDeRespaldo))
    for (const { geometry, material } of recursos.respaldo) {
      expect(geometrias.has(geometry)).toBe(true)
      expect(materiales.has(material)).toBe(true)
    }
    liberarRecursosDeMoto(recursos)
  })
})
