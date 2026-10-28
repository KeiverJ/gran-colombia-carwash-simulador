import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js'

import { CREDITOS_DE_MODELOS } from '../data/creditosDeModelos.js'
import { medirPiezas } from './medidaDeMoto.js'

/**
 * Carga de los modelos 3D de las motos (`public/modelos/moto-<n>.glb`).
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
 * Carga un modelo. Devuelve `{ piezas, medida }` (la medida es donde van el
 * marcador y el aro: ver `medirPiezas`), o `null` si no cargó o no tiene nada
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
