import { readdirSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

import { CREDITOS_DE_AMBIENTE } from '../data/creditosDeModelos.js'

/** Lo que dice la especificación: topes de triángulos según el tipo de modelo. */
const TOPES = { vehiculo: 4000, vegetal: 2000, objeto: 1500 }
const TIPO_DE = {
  mazda: 'vehiculo',
  patrulla: 'vehiculo',
  deportivo: 'vehiculo',
  banano: 'vehiculo',
  arbol1: 'vegetal',
  arbol2: 'vegetal',
  planta: 'vegetal',
}
const tipoDe = (clave) => TIPO_DE[clave] ?? 'objeto'
const CARPETA = 'public/modelos/ambiente'

/** Lee el JSON de un GLB (sin cargar nada de three: basta la cabecera del archivo). */
const leerGlb = (clave) => {
  const archivo = readFileSync(`${CARPETA}/${clave}.glb`)
  expect(archivo.toString('utf8', 0, 4), `${clave}: cabecera`).toBe('glTF')
  const largoJson = archivo.readUInt32LE(12)
  return JSON.parse(archivo.toString('utf8', 20, 20 + largoJson))
}

const triangulosDe = (json) => {
  let total = 0
  for (const malla of json.meshes) {
    for (const p of malla.primitives) {
      total += (p.indices !== undefined ? json.accessors[p.indices].count : json.accessors[p.attributes.POSITION].count) / 3
    }
  }
  return total
}

describe('archivos de los modelos de ambiente (public/modelos/ambiente)', () => {
  it('hay un GLB por crédito y ninguno de más', () => {
    const archivos = readdirSync(CARPETA).filter((f) => f.endsWith('.glb')).sort()
    expect(archivos).toEqual(CREDITOS_DE_AMBIENTE.map((c) => c.archivo).sort())
  })

  it('no está «SD Macross Factory Worker»', () => {
    expect(readdirSync(CARPETA).join(' ').toLowerCase()).not.toContain('macross')
    for (const { titulo } of CREDITOS_DE_AMBIENTE) expect(titulo.toLowerCase()).not.toContain('macross')
  })

  describe.each(CREDITOS_DE_AMBIENTE.map((c) => [c.clave]))('%s', (clave) => {
    const json = leerGlb(clave)

    it('es una sola malla y comprimida con Meshopt', () => {
      expect(json.meshes).toHaveLength(1)
      expect(json.extensionsUsed).toContain('EXT_meshopt_compression')
      expect(json.extensionsUsed ?? []).not.toContain('KHR_draco_mesh_compression')
    })

    it('cabe en el tope de triángulos de su tipo', () => {
      const tipo = tipoDe(clave)
      expect(triangulosDe(json), `${clave} (${tipo})`).toBeLessThanOrEqual(TOPES[tipo])
    })

    it('no pide nada a internet (texturas incluidas en el archivo)', () => {
      for (const buffer of json.buffers ?? []) expect(buffer.uri).toBeUndefined()
      for (const imagen of json.images ?? []) expect(imagen.uri).toBeUndefined()
    })
  })

  it('pesan mucho menos que los originales (que sumaban unos 5,4 MB)', () => {
    const total = CREDITOS_DE_AMBIENTE.reduce((s, c) => s + readFileSync(`${CARPETA}/${c.archivo}`).length, 0)
    expect(total).toBeLessThan(1_000_000)
  })
})
