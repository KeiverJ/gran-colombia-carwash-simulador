import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import { BOTONES_DE_VISTA } from './camara.js'

/**
 * Los botones de cámara se llaman «Vista general», «Lavado», «Acabado» y
 * «Planta». Los nombres de antes («Como en la foto», «Desde arriba (plano)» y
 * «Recentrar») no pueden quedar escritos en ninguna parte de la interfaz.
 */

const NOMBRES_VIEJOS = ['Como en la foto', 'Desde arriba (plano)', 'Recentrar']

/** Todos los archivos de código de `src/`, sin las pruebas. */
function archivosDeLaAplicacion(carpeta) {
  return readdirSync(carpeta).flatMap((nombre) => {
    const ruta = join(carpeta, nombre)
    if (statSync(ruta).isDirectory()) return archivosDeLaAplicacion(ruta)
    return /\.(js|jsx|css)$/.test(nombre) && !/\.test\./.test(nombre) ? [ruta] : []
  })
}

describe('los nombres de los botones de cámara', () => {
  it('son exactamente cuatro, en este orden', () => {
    expect(BOTONES_DE_VISTA.map(({ nombre }) => nombre)).toEqual(['Vista general', 'Lavado', 'Acabado', 'Planta'])
  })

  it.each(NOMBRES_VIEJOS)('«%s» ya no está escrito en ningún archivo de la aplicación', (viejo) => {
    const donde = archivosDeLaAplicacion('src').filter((ruta) => readFileSync(ruta, 'utf-8').includes(viejo))
    expect(donde).toEqual([])
  })

  it('el menú «Vista» del celular y la fila de escritorio usan los mismos botones', () => {
    const fuente = readFileSync('src/scene/FilaSuperiorDeLaEscena.jsx', 'utf-8')
    expect(fuente.match(/<BotonesDeCamara/g)).toHaveLength(2)
    // los dos salen de BOTONES_DE_VISTA, que es lo único que escribe los nombres
    const controles = readFileSync('src/scene/ControlesDeCamara.jsx', 'utf-8')
    expect(controles).toContain('BOTONES_DE_VISTA.map')
  })
})
