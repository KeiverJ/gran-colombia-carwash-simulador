import {
  BoxGeometry,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  Raycaster,
  Vector3,
} from 'three'
import { describe, expect, it } from 'vitest'

import { crearInstanciasDeAmbiente } from './instanciasDeAmbiente.js'

const pieza = (local = new Matrix4()) => ({
  geometry: new BoxGeometry(1, 1, 1),
  material: new MeshStandardMaterial(),
  local,
})
const modeloDeUnaPieza = () => ({ piezas: [pieza()] })
const modeloDeDosPiezas = () => ({
  piezas: [pieza(), pieza(new Matrix4().makeTranslation(0, 2, 0))],
})

describe('crearInstanciasDeAmbiente', () => {
  it('20 copias de un modelo de una pieza dan una sola llamada de dibujo', () => {
    const instancias = crearInstanciasDeAmbiente(modeloDeUnaPieza(), 40)
    for (let i = 0; i < 20; i += 1) instancias.poner(i, new Matrix4().makeTranslation(i, 0, 0))
    instancias.fijar(20)
    expect(instancias.mallas).toHaveLength(1)
    expect(instancias.mallas[0]).toBeInstanceOf(InstancedMesh)
    expect(instancias.mallas[0].count).toBe(20)
    expect(instancias.llamadasDeDibujo()).toBe(1)
  })

  it('un modelo de dos piezas cuesta dos llamadas, sin importar cuántas copias haya', () => {
    const instancias = crearInstanciasDeAmbiente(modeloDeDosPiezas(), 40)
    instancias.fijar(3)
    expect(instancias.llamadasDeDibujo()).toBe(2)
    instancias.fijar(30)
    expect(instancias.llamadasDeDibujo()).toBe(2)
  })

  it('sin copias o oculto no cuesta ninguna llamada', () => {
    const instancias = crearInstanciasDeAmbiente(modeloDeUnaPieza(), 10)
    expect(instancias.llamadasDeDibujo()).toBe(0)
    instancias.fijar(5)
    instancias.mostrar(false)
    expect(instancias.llamadasDeDibujo()).toBe(0)
    instancias.mostrar(true)
    expect(instancias.llamadasDeDibujo()).toBe(1)
  })

  it('no pasa de su capacidad ni baja de cero', () => {
    const instancias = crearInstanciasDeAmbiente(modeloDeUnaPieza(), 10)
    instancias.fijar(99)
    expect(instancias.mallas[0].count).toBe(10)
    instancias.fijar(-4)
    expect(instancias.mallas[0].count).toBe(0)
  })

  it('compone el sitio de cada copia con el sitio de la pieza dentro del modelo', () => {
    const instancias = crearInstanciasDeAmbiente(modeloDeDosPiezas(), 4)
    instancias.poner(1, new Matrix4().makeTranslation(5, 0, 7))
    const posicion = new Vector3()
    const matriz = new Matrix4()
    instancias.mallas[0].getMatrixAt(1, matriz)
    expect(posicion.setFromMatrixPosition(matriz).toArray()).toEqual([5, 0, 7])
    instancias.mallas[1].getMatrixAt(1, matriz)
    expect(posicion.setFromMatrixPosition(matriz).toArray()).toEqual([5, 2, 7])
  })

  it('proyecta sombra si se pide y no recibe clics', () => {
    const [malla] = crearInstanciasDeAmbiente(modeloDeUnaPieza(), 4).mallas
    expect(malla.castShadow).toBe(true)
    const sinSombra = crearInstanciasDeAmbiente(modeloDeUnaPieza(), 4, { proyectaSombra: false })
    expect(sinSombra.mallas[0].castShadow).toBe(false)

    const instancias = crearInstanciasDeAmbiente(modeloDeUnaPieza(), 4)
    instancias.fijar(1)
    const rayo = new Raycaster(new Vector3(0, 0, 5), new Vector3(0, 0, -1))
    expect(rayo.intersectObject(instancias.mallas[0])).toEqual([])
    // una caja común sí recibe el rayo: la prueba mide algo
    const caja = new Mesh(new BoxGeometry(1, 1, 1), new MeshStandardMaterial())
    expect(rayo.intersectObject(caja).length).toBeGreaterThan(0)
  })

  it('liberar suelta las matrices de las instancias y deja intactas las formas compartidas', () => {
    const modelo = modeloDeUnaPieza()
    const instancias = crearInstanciasDeAmbiente(modelo, 4)
    let matricesSueltas = 0
    let formaSuelta = 0
    instancias.mallas[0].addEventListener('dispose', () => {
      matricesSueltas += 1
    })
    modelo.piezas[0].geometry.addEventListener('dispose', () => {
      formaSuelta += 1
    })
    instancias.liberar()
    expect(matricesSueltas).toBe(1)
    expect(formaSuelta).toBe(0)
  })
})
