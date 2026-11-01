import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js'

import { CREDITOS_DE_AMBIENTE, CREDITOS_DE_MODELOS } from '../data/creditosDeModelos.js'
import { medirPiezas } from './medidaDeMoto.js'

/**
 * Carga de los modelos 3D de las motos (`public/modelos/moto-<n>.glb`) y de los
 * de ambiente (`public/modelos/ambiente/<clave>.glb`: carros, árboles, farol…).
 *
 * Todo sale de la propia aplicación, sin pedir nada a internet:
 * - el cargador es el `GLTFLoader` de `three`, **sin Draco** (cuyo decodificador
 *   se descarga por defecto de un servidor externo);
 * - los modelos vienen comprimidos con Meshopt, y su decodificador es el que
 *   trae `three`, con el WASM dentro del propio archivo;
 * - las rutas parten de la base de Vite, así que funcionan también en GitHub Pages.
 *
 * Un modelo que no carga no es un error: se devuelve `null` y la escena usa la
 * figura de respaldo de `recursosDeMoto.js`.
 */

/** Dónde está cada modelo, en el mismo orden que sus créditos. */
export const RUTAS_DE_MODELOS = CREDITOS_DE_MODELOS.map(
  ({ archivo }) => `${import.meta.env.BASE_URL}modelos/${archivo}`,
)

/** Un cargador de GLB que entiende la compresión Meshopt. */
export function crearCargador() {
  return new GLTFLoader().setMeshoptDecoder(MeshoptDecoder)
}

/**
 * Las piezas de un modelo cargado: cada malla con su forma, su material y
 * dónde va dentro de la moto (los modelos comprimidos traen la escala de la
 * cuantización en el nodo, y sin ella saldrían deformados).
 *
 * @param {import('three').Object3D} escena
 * @returns {Array<{ geometry: object, material: object, local: object }>}
 */
export function extraerPiezas(escena) {
  escena.updateMatrixWorld(true)
  const piezas = []
  escena.traverse((nodo) => {
    if (nodo.isMesh) {
      piezas.push({ geometry: nodo.geometry, material: nodo.material, local: nodo.matrixWorld.clone() })
    }
  })
  return piezas
}

/**
 * Carga un modelo. Devuelve `{ piezas, medida }` (la medida es donde va el
 * aro: ver `medirPiezas`), o `null` si no cargó o no tiene nada
 * que dibujar.
 */
export async function cargarModelo(ruta, cargador) {
  try {
    const { scene } = await cargador.loadAsync(ruta)
    const piezas = extraerPiezas(scene)
    return piezas.length > 0 ? { piezas, medida: medirPiezas(piezas) } : null
  } catch (error) {
    if (import.meta.env.DEV) console.warn(`No se pudo cargar el modelo ${ruta}:`, error)
    return null
  }
}

/** Carga todos los modelos a la vez; el que falle queda en `null`. */
export function cargarModelosDeMoto(rutas = RUTAS_DE_MODELOS, cargador = crearCargador()) {
  return Promise.all(rutas.map((ruta) => cargarModelo(ruta, cargador)))
}

/** Suelta la memoria de un modelo: formas, materiales y texturas. */
export function liberarModelo(modelo) {
  if (!modelo) return
  const materiales = new Set()
  for (const { geometry, material } of modelo.piezas) {
    geometry.dispose()
    materiales.add(material)
  }
  for (const material of materiales) {
    for (const valor of Object.values(material)) {
      if (valor?.isTexture) valor.dispose()
    }
    material.dispose()
  }
}

/** Las claves de los modelos de ambiente, en el orden de sus créditos. */
export const CLAVES_DE_AMBIENTE = CREDITOS_DE_AMBIENTE.map(({ clave }) => clave)

/** Dónde está cada modelo de ambiente, por clave (parte de la base de Vite). */
export const RUTAS_DE_AMBIENTE = Object.fromEntries(
  CREDITOS_DE_AMBIENTE.map(({ clave, archivo }) => [
    clave,
    `${import.meta.env.BASE_URL}modelos/ambiente/${archivo}`,
  ]),
)

/** Los tres estados de un modelo de ambiente. */
export const ESTADO_DEL_MODELO = { cargando: 'cargando', listo: 'listo', fallo: 'fallo' }

/**
 * La carga de los modelos de ambiente: cada archivo se pide **una sola vez**
 * (la promesa queda guardada), aunque varias piezas de la escena lo pidan, y
 * el que falla queda en `null` sin afectar a los demás.
 *
 * El cargador se crea al pedir el primer modelo, no al importar el archivo.
 */
export function crearCargaDeAmbiente(rutas = RUTAS_DE_AMBIENTE, crearElCargador = crearCargador) {
  const promesas = new Map()
  const estados = new Map()
  const modelos = new Map()
  let cargador = null

  /** Pide un modelo; devuelve la promesa de `{ piezas, medida }` o de `null`. */
  function pedir(clave) {
    if (!promesas.has(clave)) {
      estados.set(clave, ESTADO_DEL_MODELO.cargando)
      const ruta = rutas[clave]
      let pedido = Promise.resolve(null)
      if (ruta) {
        cargador ??= crearElCargador()
        pedido = cargarModelo(ruta, cargador)
      }
      promesas.set(
        clave,
        pedido.then((modelo) => {
          modelos.set(clave, modelo)
          estados.set(clave, modelo ? ESTADO_DEL_MODELO.listo : ESTADO_DEL_MODELO.fallo)
          return modelo
        }),
      )
    }
    return promesas.get(clave)
  }

  return {
    pedir,
    pedirTodos: (claves = CLAVES_DE_AMBIENTE) => Promise.all(claves.map(pedir)),
    /** `cargando`, `listo` o `fallo`. Lo que no se ha pedido está `cargando`. */
    estado: (clave) => estados.get(clave) ?? ESTADO_DEL_MODELO.cargando,
    /** El modelo cargado, o `null` si falló o aún no llega. */
    modelo: (clave) => modelos.get(clave) ?? null,
    /** El estado y el modelo de cada clave, en objetos nuevos. */
    instantanea(claves = CLAVES_DE_AMBIENTE) {
      return {
        estados: Object.fromEntries(claves.map((clave) => [clave, this.estado(clave)])),
        modelos: Object.fromEntries(claves.map((clave) => [clave, this.modelo(clave)])),
      }
    },
    /** Suelta la memoria de todo lo cargado (formas, materiales y texturas). */
    liberar() {
      modelos.forEach(liberarModelo)
      modelos.clear()
      promesas.clear()
      estados.clear()
    },
  }
}

let cargaCompartida = null

/** La carga que usa la escena: una sola para toda la página, creada la primera vez que se pide. */
export function cargaDeAmbiente() {
  cargaCompartida ??= crearCargaDeAmbiente()
  return cargaCompartida
}
