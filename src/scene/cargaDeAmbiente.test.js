import { BoxGeometry, Group, Mesh, MeshStandardMaterial } from 'three'
import { describe, expect, it } from 'vitest'

import {
  CLAVES_DE_AMBIENTE,
  crearCargaDeAmbiente,
  ESTADO_DEL_MODELO,
  RUTAS_DE_AMBIENTE,
} from './cargaDeModelos.js'

const escenaConUnaMalla = () => {
  const escena = new Group()
  escena.add(new Mesh(new BoxGeometry(1, 1, 1), new MeshStandardMaterial()))
  return { scene: escena }
}

/** Un cargador de mentira que cuenta cuántas veces se pidió cada archivo. */
const cargadorContador = (respuestas) => {
  const pedidos = {}
  return {
    pedidos,
    loadAsync: (ruta) => {
      pedidos[ruta] = (pedidos[ruta] ?? 0) + 1
      const respuesta = respuestas[ruta]
      return respuesta instanceof Error ? Promise.reject(respuesta) : Promise.resolve(respuesta)
    },
  }
}

describe('rutas de los modelos de ambiente', () => {
  it('hay una por clave, locales y terminadas en .glb', () => {
    expect(CLAVES_DE_AMBIENTE).toHaveLength(15)
    for (const clave of CLAVES_DE_AMBIENTE) {
      expect(RUTAS_DE_AMBIENTE[clave].endsWith(`modelos/ambiente/${clave}.glb`)).toBe(true)
      expect(RUTAS_DE_AMBIENTE[clave]).not.toMatch(/^https?:/)
    }
  })

  it('parten de la base de Vite, para que sirvan también en GitHub Pages', () => {
    for (const ruta of Object.values(RUTAS_DE_AMBIENTE)) {
      expect(ruta.startsWith(import.meta.env.BASE_URL)).toBe(true)
    }
  })
})

describe('la carga de los modelos de ambiente', () => {
  const rutas = { a: 'a.glb', b: 'b.glb', c: 'c.glb' }

  it('un archivo caído da null sin lanzar y los demás cargan', async () => {
    const cargador = cargadorContador({
      'a.glb': escenaConUnaMalla(),
      'b.glb': new Error('404'),
      'c.glb': escenaConUnaMalla(),
    })
    const carga = crearCargaDeAmbiente(rutas, () => cargador)
    await expect(carga.pedirTodos(['a', 'b', 'c'])).resolves.toHaveLength(3)
    expect(carga.modelo('a')).not.toBeNull()
    expect(carga.modelo('b')).toBeNull()
    expect(carga.modelo('c')).not.toBeNull()
    expect(carga.estado('a')).toBe(ESTADO_DEL_MODELO.listo)
    expect(carga.estado('b')).toBe(ESTADO_DEL_MODELO.fallo)
    expect(carga.estado('c')).toBe(ESTADO_DEL_MODELO.listo)
  })

  it('un modelo sin nada que dibujar o sin ruta cuenta como fallo', async () => {
    const cargador = cargadorContador({ 'a.glb': { scene: new Group() } })
    const carga = crearCargaDeAmbiente(rutas, () => cargador)
    await carga.pedirTodos(['a', 'no-existe'])
    expect(carga.estado('a')).toBe(ESTADO_DEL_MODELO.fallo)
    expect(carga.estado('no-existe')).toBe(ESTADO_DEL_MODELO.fallo)
    expect(carga.modelo('no-existe')).toBeNull()
  })

  it('está «cargando» hasta que llega', async () => {
    const cargador = cargadorContador({ 'a.glb': escenaConUnaMalla() })
    const carga = crearCargaDeAmbiente(rutas, () => cargador)
    expect(carga.estado('a')).toBe(ESTADO_DEL_MODELO.cargando)
    const pedido = carga.pedir('a')
    expect(carga.estado('a')).toBe(ESTADO_DEL_MODELO.cargando)
    await pedido
    expect(carga.estado('a')).toBe(ESTADO_DEL_MODELO.listo)
  })

  it('cada archivo se pide una sola vez, aunque lo pidan varias piezas', async () => {
    const cargador = cargadorContador({ 'a.glb': escenaConUnaMalla(), 'b.glb': escenaConUnaMalla() })
    const carga = crearCargaDeAmbiente(rutas, () => cargador)
    await Promise.all([carga.pedir('a'), carga.pedir('a'), carga.pedirTodos(['a', 'b']), carga.pedir('b')])
    expect(cargador.pedidos).toEqual({ 'a.glb': 1, 'b.glb': 1 })
  })

  it('no crea el cargador hasta que se pide el primer modelo', async () => {
    let creados = 0
    const carga = crearCargaDeAmbiente(rutas, () => {
      creados += 1
      return cargadorContador({ 'a.glb': escenaConUnaMalla() })
    })
    expect(creados).toBe(0)
    await carga.pedir('a')
    await carga.pedir('a')
    expect(creados).toBe(1)
  })

  it('la instantánea trae el estado y el modelo de cada clave', async () => {
    const cargador = cargadorContador({ 'a.glb': escenaConUnaMalla(), 'b.glb': new Error('x') })
    const carga = crearCargaDeAmbiente(rutas, () => cargador)
    await carga.pedirTodos(['a', 'b'])
    const { estados, modelos } = carga.instantanea(['a', 'b', 'c'])
    expect(estados).toEqual({ a: 'listo', b: 'fallo', c: 'cargando' })
    expect(modelos.a).not.toBeNull()
    expect(modelos.b).toBeNull()
    expect(modelos.c).toBeNull()
  })

  it('liberar suelta las formas y los materiales de lo cargado', async () => {
    const escena = escenaConUnaMalla()
    const malla = escena.scene.children[0]
    let formaSuelta = 0
    let materialSuelto = 0
    malla.geometry.addEventListener('dispose', () => {
      formaSuelta += 1
    })
    malla.material.addEventListener('dispose', () => {
      materialSuelto += 1
    })
    const carga = crearCargaDeAmbiente(rutas, () => cargadorContador({ 'a.glb': escena }))
    await carga.pedir('a')
    carga.liberar()
    expect(formaSuelta).toBe(1)
    expect(materialSuelto).toBe(1)
    expect(carga.modelo('a')).toBeNull()
  })
})
