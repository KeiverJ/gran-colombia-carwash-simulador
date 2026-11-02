import { readdirSync, readFileSync } from 'node:fs'
import { Mesh, MeshBasicMaterial, Raycaster, Vector3 } from 'three'
import { describe, expect, it } from 'vitest'

import {
  ALTO_DE_LA_CAFETERIA,
  ALTO_DEL_TANQUE,
  ASIENTOS_DE_LA_CAFETERIA,
  CAFETERIA,
  HUELLA_DE_LA_CAFETERIA,
  MESAS,
  MOSTRADOR,
} from './cafeteria.js'
import { geometriaDeLaCafeteria } from './geometriasDeLaCafeteria.js'
import { COLOR_DE_ESCENA } from '../estilos/colores.js'

describe('la geometría de la cafetería', () => {
  const geometria = geometriaDeLaCafeteria()
  geometria.computeBoundingBox()
  const caja = geometria.boundingBox

  it('es una sola geometría de color de vértice (una llamada de dibujo)', () => {
    expect(geometria.attributes.color).toBeDefined()
    expect(geometria.attributes.position.count).toBeGreaterThan(200)
  })

  it('cabe en la huella (con el toldo y el techo) y no pasa del alto del tanque', () => {
    expect(caja.min.x).toBeGreaterThanOrEqual(HUELLA_DE_LA_CAFETERIA.x0 - 0.2)
    expect(caja.max.x).toBeLessThanOrEqual(HUELLA_DE_LA_CAFETERIA.x1 + 0.2)
    expect(caja.min.z).toBeGreaterThanOrEqual(HUELLA_DE_LA_CAFETERIA.z0 - 0.2)
    expect(caja.max.z).toBeLessThanOrEqual(HUELLA_DE_LA_CAFETERIA.z1 + 0.2)
    expect(caja.min.y).toBeGreaterThanOrEqual(-1e-6)
    expect(caja.max.y).toBeLessThanOrEqual(ALTO_DE_LA_CAFETERIA + 0.01)
  })

  it('el cuerpo mide unos 3,2 m y con el tanque y el letrero lo más alto es de unos 4,3 m', () => {
    expect(CAFETERIA.altoDelCuerpo).toBeCloseTo(3.2, 9)
    expect(ALTO_DEL_TANQUE).toBeGreaterThan(4.1)
    expect(ALTO_DEL_TANQUE).toBeLessThan(4.4)
    expect(ALTO_DE_LA_CAFETERIA).toBeGreaterThanOrEqual(ALTO_DEL_TANQUE)
    expect(ALTO_DE_LA_CAFETERIA).toBeLessThan(4.5)
  })

  it('el tanque es negro: un color del paisaje que no es ninguno con significado', () => {
    expect(COLOR_DE_ESCENA.tanqueDeAgua).toBe('#1c2429')
  })

  it('tiene mesas y sillas: dos filas de tres mesas con una silla a cada lado, y el mostrador contra la pared', () => {
    expect(MESAS.centros).toHaveLength(6)
    expect(ASIENTOS_DE_LA_CAFETERIA).toHaveLength(12)
    expect(MOSTRADOR.z1).toBeLessThanOrEqual(CAFETERIA.zCuerpo)
    expect(MOSTRADOR.z1).toBeGreaterThan(CAFETERIA.zCuerpo - 0.5)
  })
})

describe('la cafetería es decorativa: ignora los clics', () => {
  it('un rayo que pasa por la geometría con el raycast nulo de la escena no devuelve nada', () => {
    const geometria = geometriaDeLaCafeteria()
    const malla = new Mesh(geometria, new MeshBasicMaterial())
    malla.raycast = () => null
    const centro = new Vector3((CAFETERIA.x0 + CAFETERIA.x1) / 2, 1.5, (CAFETERIA.zCuerpo + CAFETERIA.zFondo) / 2)
    const rayo = new Raycaster(centro.clone().add(new Vector3(0, 0, -10)), new Vector3(0, 0, 1))
    expect(rayo.intersectObject(malla)).toEqual([])
    // sin el raycast nulo, la misma malla sí recibiría el rayo: la prueba mide algo
    const comun = new Mesh(geometria, new MeshBasicMaterial())
    expect(rayo.intersectObject(comun).length).toBeGreaterThan(0)
  })

  it('el componente de la cafetería ignora los clics en su malla', () => {
    const codigo = readFileSync('src/scene/Cafeteria.jsx', 'utf8')
    expect(codigo).toMatch(/raycast=\{SIN_CLICS\}/)
    expect(codigo).not.toMatch(/onClick|onPointer/)
  })

  it('ni la cafetería ni lo decorativo tocan el motor, el store ni el generador aleatorio', () => {
    const archivos = readdirSync('src/scene').filter((nombre) => /^(cafeteria|geometriasDeLaCafeteria|Cafeteria|visibilidad)\.(js|jsx)$/.test(nombre))
    expect(archivos.length).toBeGreaterThanOrEqual(4)
    for (const nombre of archivos) {
      const codigo = readFileSync(`src/scene/${nombre}`, 'utf8')
      expect(codigo, nombre).not.toMatch(/from '\.\.\/engine\//)
      expect(codigo, nombre).not.toMatch(/Math\.random|useSimulacion|alternarServidor/)
    }
  })
})
