import { readFileSync } from 'node:fs'
import {
  BoxGeometry,
  Box3,
  Group,
  Mesh,
  MeshStandardMaterial,
  Texture,
  Matrix4,
} from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js'
import { describe, expect, it } from 'vitest'

import { CANTIDAD_DE_MODELOS } from '../data/creditosDeModelos.js'
import {
  cargarModelo,
  cargarModelosDeMoto,
  extraerPiezas,
  liberarModelo,
  RUTAS_DE_MODELOS,
} from './cargaDeModelos.js'
import { medirPiezas } from './medidaDeMoto.js'
import { MOTO } from './posiciones.js'

/** Un cargador de mentira: carga lo que se le diga o falla con lo que se le diga. */
const cargadorQue = (respuestas) => ({
  loadAsync: (ruta) => {
    const respuesta = respuestas[ruta]
    return respuesta instanceof Error ? Promise.reject(respuesta) : Promise.resolve(respuesta)
  },
})

const escenaConUnaMalla = () => {
  const escena = new Group()
  escena.add(new Mesh(new BoxGeometry(1, 1, 1), new MeshStandardMaterial()))
  return { scene: escena }
}

describe('rutas de los modelos', () => {
  it('hay una por modelo, todas locales y terminadas en .glb', () => {
    expect(RUTAS_DE_MODELOS).toHaveLength(CANTIDAD_DE_MODELOS)
    RUTAS_DE_MODELOS.forEach((ruta, i) => {
      expect(ruta.endsWith(`modelos/moto-${i + 1}.glb`)).toBe(true)
      expect(ruta).not.toMatch(/^https?:/)
    })
  })

  it('parten de la base de Vite, para que sirvan también en GitHub Pages', () => {
    for (const ruta of RUTAS_DE_MODELOS) {
      expect(ruta.startsWith(import.meta.env.BASE_URL)).toBe(true)
    }
  })
})

describe('extraerPiezas', () => {
  it('devuelve cada malla con su forma, su material y su sitio en la moto', () => {
    const escena = new Group()
    const malla = new Mesh(new BoxGeometry(1, 1, 1), new MeshStandardMaterial())
    malla.position.set(1, 2, 3)
    malla.scale.set(2, 2, 2)
    escena.add(malla)

    const [pieza, ...resto] = extraerPiezas(escena)
    expect(resto).toHaveLength(0)
    expect(pieza.geometry).toBe(malla.geometry)
    expect(pieza.material).toBe(malla.material)
    // la escala y el traslado del nodo se conservan: sin ellos un modelo
    // comprimido saldría deformado
    expect(pieza.local.equals(new Matrix4().compose(malla.position, malla.quaternion, malla.scale))).toBe(true)
  })

  it('encuentra las mallas anidadas', () => {
    const escena = new Group()
    const hijo = new Group()
    hijo.add(new Mesh(new BoxGeometry(), new MeshStandardMaterial()))
    hijo.add(new Mesh(new BoxGeometry(), new MeshStandardMaterial()))
    escena.add(hijo)
    expect(extraerPiezas(escena)).toHaveLength(2)
  })
})

describe('cargarModelo: si no carga, no hay error sino respaldo', () => {
  it('devuelve las piezas cuando carga', async () => {
    const modelo = await cargarModelo('a.glb', cargadorQue({ 'a.glb': escenaConUnaMalla() }))
    expect(modelo.piezas).toHaveLength(1)
  })

  it('devuelve también su medida: el centro visto desde arriba y la altura', async () => {
    const escena = new Group()
    const malla = new Mesh(new BoxGeometry(1, 1, 1), new MeshStandardMaterial())
    malla.position.set(0.4, 1.5, -0.3) // fuera del origen a propósito
    escena.add(malla)
    const modelo = await cargarModelo('a.glb', cargadorQue({ 'a.glb': { scene: escena } }))
    expect(modelo.medida.centroX).toBeCloseTo(0.4, 6)
    expect(modelo.medida.centroZ).toBeCloseTo(-0.3, 6)
    expect(modelo.medida.alto).toBeCloseTo(2, 6)
  })

  it('devuelve null si el archivo falta o está dañado', async () => {
    const modelo = await cargarModelo('a.glb', cargadorQue({ 'a.glb': new Error('404') }))
    expect(modelo).toBeNull()
  })

  it('devuelve null si el modelo no trae nada que dibujar', async () => {
    const modelo = await cargarModelo('a.glb', cargadorQue({ 'a.glb': { scene: new Group() } }))
    expect(modelo).toBeNull()
  })

  it('un modelo que falla no impide cargar los demás', async () => {
    const cargador = cargadorQue({
      'a.glb': escenaConUnaMalla(),
      'b.glb': new Error('dañado'),
      'c.glb': escenaConUnaMalla(),
    })
    const modelos = await cargarModelosDeMoto(['a.glb', 'b.glb', 'c.glb'], cargador)
    expect(modelos.map((m) => m !== null)).toEqual([true, false, true])
  })

  it('si fallan todos, devuelve todos null y no lanza', async () => {
    const cargador = cargadorQue({ 'a.glb': new Error('x'), 'b.glb': new Error('y') })
    await expect(cargarModelosDeMoto(['a.glb', 'b.glb'], cargador)).resolves.toEqual([null, null])
  })
})

describe('liberarModelo', () => {
  it('suelta las formas, los materiales y las texturas', () => {
    const geometria = new BoxGeometry()
    const textura = new Texture()
    const material = new MeshStandardMaterial({ map: textura })
    const soltados = []
    geometria.addEventListener('dispose', () => soltados.push('geometria'))
    material.addEventListener('dispose', () => soltados.push('material'))
    textura.addEventListener('dispose', () => soltados.push('textura'))

    liberarModelo({ piezas: [{ geometry: geometria, material, local: new Matrix4() }] })
    expect(soltados.sort()).toEqual(['geometria', 'material', 'textura'])
  })

  it('un modelo que no cargó (null) no da error', () => {
    expect(() => liberarModelo(null)).not.toThrow()
  })
})

/**
 * Los modelos finales de `public/modelos/`. En Node solo se pueden leer los que
 * no llevan textura (los otros dos necesitan el navegador para decodificarla),
 * y eso ya prueba que el decodificador de Meshopt de `three` los abre.
 */
describe('los modelos finales de public/modelos', () => {
  const cargador = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder)
  const sinTextura = [1, 4, 5, 6]

  it.each(sinTextura)('moto-%i: una sola malla, 1,7 m de largo, apoyada en el piso, de menos de 3500 triángulos', async (n) => {
    const archivo = readFileSync(`public/modelos/moto-${n}.glb`)
    const buffer = archivo.buffer.slice(archivo.byteOffset, archivo.byteOffset + archivo.byteLength)
    const { scene } = await cargador.parseAsync(buffer, '')

    const piezas = extraerPiezas(scene)
    expect(piezas).toHaveLength(1)

    const { geometry } = piezas[0]
    const triangulos = (geometry.index?.count ?? geometry.attributes.position.count) / 3
    expect(triangulos).toBeLessThanOrEqual(3500)

    const caja = new Box3().setFromObject(scene)
    expect(caja.max.z - caja.min.z).toBeCloseTo(MOTO.largo, 2)
    expect(caja.min.y).toBeCloseTo(0, 2)
    expect(caja.max.y - caja.min.y).toBeLessThan(MOTO.alto - 0.5) // el marcador va por encima
    // la medida que usa la escena coincide con la caja real
    const medida = medirPiezas(piezas)
    expect(medida.alto).toBeCloseTo(caja.max.y, 3)
    expect(medida.centroX).toBeCloseTo((caja.max.x + caja.min.x) / 2, 3)
    expect(medida.centroZ).toBeCloseTo((caja.max.z + caja.min.z) / 2, 3)
    expect(caja.max.x - caja.min.x).toBeLessThanOrEqual(MOTO.ancho + 0.1)
    // centrada
    expect((caja.max.z + caja.min.z) / 2).toBeCloseTo(0, 2)
    expect((caja.max.x + caja.min.x) / 2).toBeCloseTo(0, 1)
  })

  it.each([2, 3])('moto-%i existe y es un GLB comprimido con Meshopt', (n) => {
    const archivo = readFileSync(`public/modelos/moto-${n}.glb`)
    expect(archivo.subarray(0, 4).toString('latin1')).toBe('glTF')
    const largoJson = archivo.readUInt32LE(12)
    const json = JSON.parse(archivo.subarray(20, 20 + largoJson).toString('utf8'))
    expect(json.extensionsRequired).toContain('EXT_meshopt_compression')
  })
})
