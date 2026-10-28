import { Matrix4, Vector3 } from 'three'
import { describe, expect, it } from 'vitest'

import { COLOR_DE_PLAN } from '../estilos/colores.js'
import { MOTO } from './posiciones.js'
import {
  ARO,
  crearRecursosDeMoto,
  GROSOR_DE_LOS_ANILLOS,
  liberarRecursosDeMoto,
  SEGMENTOS_DEL_ARO,
  TRAZOS_DE_ARO,
} from './recursosDeMoto.js'

const hexDe = (material) => `#${material.color.getHexString()}`

describe('recursos compartidos de las motos', () => {
  it('ya no hay figuras flotantes de plan: ni marcadores ni sus materiales', () => {
    const recursos = crearRecursosDeMoto()
    expect(recursos.marcas).toBeUndefined()
    expect(recursos.materialesDeMarca).toBeUndefined()
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

  /** Las zonas de radio (distancia al centro) que cubren los triángulos de una geometría. */
  const radiosDe = (geometria) => {
    const posiciones = geometria.attributes.position
    const radios = []
    for (let i = 0; i < posiciones.count; i += 1) radios.push(Math.hypot(posiciones.getX(i), posiciones.getZ(i)))
    return radios
  }

  /** ¿Cubre la geometría el punto del piso (x, z)? Recorre sus triángulos. */
  const cubre = (geometria, x, z) => {
    const p = geometria.attributes.position
    const indice = geometria.index
    for (let t = 0; t < indice.count; t += 3) {
      const [a, b, c] = [indice.getX(t), indice.getX(t + 1), indice.getX(t + 2)]
      const lados = [
        [p.getX(a), p.getZ(a), p.getX(b), p.getZ(b)],
        [p.getX(b), p.getZ(b), p.getX(c), p.getZ(c)],
        [p.getX(c), p.getZ(c), p.getX(a), p.getZ(a)],
      ].map(([x1, z1, x2, z2]) => (x - x2) * (z1 - z2) - (x1 - x2) * (z - z2))
      const todosPositivos = lados.every((v) => v >= -1e-9)
      const todosNegativos = lados.every((v) => v <= 1e-9)
      if (todosPositivos || todosNegativos) return true
    }
    return false
  }

  /** Qué parte de la circunferencia de radio `r` cubre el aro (de 0 a 1), muestreando 360 puntos. */
  const cobertura = (geometria, r) => {
    let dentro = 0
    for (let i = 0; i < 360; i += 1) {
      const ang = (i / 360) * Math.PI * 2
      if (cubre(geometria, Math.cos(ang) * r, Math.sin(ang) * r)) dentro += 1
    }
    return dentro / 360
  }

  it('cada aro es plano (acostado sobre el piso) y cabe bajo la moto y su vecina de la fila', () => {
    const recursos = crearRecursosDeMoto()
    for (const plan of [1, 2, 3]) {
      const aro = recursos.aros[plan]
      const normales = aro.attributes.normal
      for (let i = 0; i < normales.count; i += 1) {
        expect(normales.getY(i), `plan ${plan}`).toBeCloseTo(1, 5)
      }
      aro.computeBoundingBox()
      const { min, max } = aro.boundingBox
      expect(max.y - min.y).toBeCloseTo(0, 5)
      expect(Math.max(...radiosDe(aro)), `plan ${plan}`).toBeCloseTo(ARO.exterior, 2)
      expect(Math.min(...radiosDe(aro)), `plan ${plan}`).toBeGreaterThan(ARO.interior - GROSOR_DE_LOS_ANILLOS)
    }
    // el aro cubre el largo de la moto y no pasa del ancho de una losa
    expect(ARO.exterior * 2).toBeGreaterThanOrEqual(MOTO.largo)
    liberarRecursosDeMoto(recursos)
  })

  it('los tres planes tienen un trazo distinto: sólido, en segmentos y doble', () => {
    expect(TRAZOS_DE_ARO).toEqual({ 1: 'solido', 2: 'segmentos', 3: 'doble' })
    expect(new Set(Object.values(TRAZOS_DE_ARO)).size).toBe(3)
  })

  it('plan 1: un aro sólido, que cubre toda la circunferencia entre sus dos radios', () => {
    const recursos = crearRecursosDeMoto()
    const medio = (ARO.interior + ARO.exterior) / 2
    expect(cobertura(recursos.aros[1], medio)).toBeCloseTo(1, 2)
    liberarRecursosDeMoto(recursos)
  })

  it('plan 2: un aro en segmentos, con huecos: cubre solo una parte de la circunferencia', () => {
    const recursos = crearRecursosDeMoto()
    const medio = (ARO.interior + ARO.exterior) / 2
    const parte = cobertura(recursos.aros[2], medio)
    expect(parte).toBeCloseTo(SEGMENTOS_DEL_ARO.relleno, 1)
    expect(parte).toBeLessThan(0.75)
    expect(parte).toBeGreaterThan(0.4)
    // y tiene tantos segmentos como se dice: cuenta los cambios de «cubierto» a «hueco»
    let cambios = 0
    let antes = cubre(recursos.aros[2], medio, 0)
    for (let i = 1; i <= 720; i += 1) {
      const ang = (i / 720) * Math.PI * 2
      const ahora = cubre(recursos.aros[2], Math.cos(ang) * medio, Math.sin(ang) * medio)
      if (ahora && !antes) cambios += 1
      antes = ahora
    }
    expect(cambios).toBe(SEGMENTOS_DEL_ARO.cuantos)
    liberarRecursosDeMoto(recursos)
  })

  it('plan 3: un aro doble, dos anillos finos con un hueco en medio', () => {
    const recursos = crearRecursosDeMoto()
    const aro = recursos.aros[3]
    const medio = (ARO.interior + ARO.exterior) / 2
    expect(cobertura(aro, medio)).toBe(0) // el hueco
    expect(cobertura(aro, ARO.interior + GROSOR_DE_LOS_ANILLOS / 4)).toBeCloseTo(1, 2) // el anillo de adentro
    expect(cobertura(aro, ARO.exterior - GROSOR_DE_LOS_ANILLOS / 2)).toBeCloseTo(1, 2) // el de afuera
    liberarRecursosDeMoto(recursos)
  })

  it('los tres trazos son distintos entre sí, también sin color: cubren cosas distintas del círculo', () => {
    const recursos = crearRecursosDeMoto()
    const medio = (ARO.interior + ARO.exterior) / 2
    const huellas = [1, 2, 3].map((plan) => [
      cobertura(recursos.aros[plan], medio).toFixed(2),
      cobertura(recursos.aros[plan], ARO.exterior - GROSOR_DE_LOS_ANILLOS / 2).toFixed(2),
    ].join('/'))
    expect(new Set(huellas).size).toBe(3)
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
      ...Object.values(recursos.aros),
      ...Object.values(recursos.geometriasDeRespaldo),
    ])
    const materiales = new Set([
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
