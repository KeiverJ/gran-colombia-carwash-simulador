import { readdirSync, readFileSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join, relative } from 'node:path'

import { describe, expect, it } from 'vitest'

/**
 * Los colores salen del tema (`tema.css` y `colores.js`): las hojas de estilo
 * de los componentes y de la escena no llevan ninguno escrito directamente.
 * Esta prueba las abre como texto y falla nombrando el archivo, la línea y el
 * color que sobra. Quedan fuera `tema.css`, donde viven, y los colores que se
 * dibujan dentro del lienzo 3D (en archivos JavaScript, que cambian en otro
 * cambio).
 */
const RAIZ = fileURLToPath(new URL('..', import.meta.url))
const TEMA = join(RAIZ, 'estilos', 'tema.css')

function hojasDeEstilo(carpeta) {
  return readdirSync(carpeta).flatMap((nombre) => {
    const ruta = join(carpeta, nombre)
    if (statSync(ruta).isDirectory()) {
      return hojasDeEstilo(ruta)
    }
    return ruta.endsWith('.css') && ruta !== TEMA ? [ruta] : []
  })
}

/** Quita los comentarios (conservando los saltos de línea) para no contar los colores que explican. */
const sinComentarios = (css) => css.replace(/\/\*[\s\S]*?\*\//g, (comentario) => comentario.replace(/[^\n]/g, ' '))

const COLOR_SUELTO = /#[0-9a-fA-F]{3,8}\b|\brgba?\(|\bhsla?\(/

describe('las hojas de estilo no llevan colores sueltos', () => {
  const hojas = hojasDeEstilo(RAIZ)

  it('hay hojas que revisar', () => {
    expect(hojas.length).toBeGreaterThanOrEqual(6)
  })

  it.each(hojas.map((ruta) => [relative(RAIZ, ruta), ruta]))('%s', (_nombre, ruta) => {
    const sueltos = sinComentarios(readFileSync(ruta, 'utf8'))
      .split('\n')
      .flatMap((linea, i) => (COLOR_SUELTO.test(linea) ? [`línea ${i + 1}: ${linea.trim()}`] : []))
    expect(sueltos, 'colores escritos directamente; usa una variable del tema').toEqual([])
  })

  it('el detector sí encuentra un color suelto', () => {
    expect(COLOR_SUELTO.test('color: #12abef;')).toBe(true)
    expect(COLOR_SUELTO.test('background: rgba(0, 0, 0, 0.5);')).toBe(true)
    expect(COLOR_SUELTO.test('color: var(--texto);')).toBe(false)
    expect(COLOR_SUELTO.test('content: "#1";')).toBe(false)
  })

  it('las variables viejas de la paleta anterior ya no se usan', () => {
    const viejas = /var\(--(text-h|text|bg|bg-tarjeta|border|accent|accent-bg|accent-border|agua-[\w-]+|amarillo[\w-]*)\)/
    const usos = hojas.flatMap((ruta) =>
      sinComentarios(readFileSync(ruta, 'utf8'))
        .split('\n')
        .flatMap((linea, i) => (viejas.test(linea) ? [`${relative(RAIZ, ruta)}:${i + 1}`] : [])),
    )
    expect(usos).toEqual([])
  })
})
