import { readFileSync } from 'node:fs'

import { Color } from 'three'
import { describe, expect, it } from 'vitest'

import { crearCargador } from './cargaDeModelos.js'

/**
 * El semáforo del paisaje se prepara con las luces apagadas o en verde: ninguna luz
 * roja ni ámbar encendida, para que no se lea como un aviso de la escena (rojo = errores
 * y saturación, ámbar = advertencias). Se lee el modelo final, ya preparado.
 */

const cargar = async (clave) => {
  const bytes = readFileSync(`public/modelos/ambiente/${clave}.glb`)
  const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
  const gltf = await new Promise((resolver, rechazar) => crearCargador().parse(buffer, '', resolver, rechazar))
  return gltf.scene
}

/** ¿Es un rojo o un ámbar vivo (con luz)? Matiz de rojo a amarillo, saturado y claro. */
function esRojoOAmbar({ r, g, b }) {
  const hsl = new Color(r, g, b).getHSL({})
  const matiz = hsl.h * 360
  const rojoOAmbar = matiz <= 55 || matiz >= 340
  return rojoOAmbar && hsl.s >= 0.45 && hsl.l >= 0.3
}

describe('el semáforo del paisaje', () => {
  it('no tiene ninguna luz roja ni ámbar: ni en el color de sus vértices ni en un material que emita luz', async () => {
    const escena = await cargar('semaforo')
    let vertices = 0
    let encendidas = 0
    let conVerde = 0
    escena.traverse((nodo) => {
      if (!nodo.isMesh) return
      const colores = nodo.geometry.getAttribute('color')
      if (colores) {
        for (let i = 0; i < colores.count; i += 1) {
          const color = { r: colores.getX(i), g: colores.getY(i), b: colores.getZ(i) }
          vertices += 1
          if (esRojoOAmbar(color)) encendidas += 1
          if (color.g > color.r * 1.3 && color.g > color.b * 1.3 && color.g > 0.4) conVerde += 1
        }
      }
      const materiales = Array.isArray(nodo.material) ? nodo.material : [nodo.material]
      for (const material of materiales) {
        const intensidad = material.emissiveIntensity ?? 1
        const emisor = material.emissive ? { r: material.emissive.r * intensidad, g: material.emissive.g * intensidad, b: material.emissive.b * intensidad } : null
        if (emisor && emisor.r + emisor.g + emisor.b > 0.05) expect(esRojoOAmbar(emisor), 'un material que emite luz roja o ámbar').toBe(false)
        const base = material.color ? { r: material.color.r, g: material.color.g, b: material.color.b } : null
        if (!colores && base) expect(esRojoOAmbar(base), 'un material de color rojo o ámbar').toBe(false)
      }
    })
    expect(vertices).toBeGreaterThan(100)
    expect(encendidas).toBe(0)
    // solo el verde queda a la vista
    expect(conVerde).toBeGreaterThan(0)
  })

  it('el detector sí reconoce un rojo y un ámbar encendidos, y no un gris oscuro ni un verde', () => {
    expect(esRojoOAmbar({ r: 0.9, g: 0.1, b: 0.1 })).toBe(true)
    expect(esRojoOAmbar({ r: 1, g: 0.7, b: 0.1 })).toBe(true)
    expect(esRojoOAmbar({ r: 0.18, g: 0.17, b: 0.17 })).toBe(false)
    expect(esRojoOAmbar({ r: 0.1, g: 0.8, b: 0.2 })).toBe(false)
  })
})
