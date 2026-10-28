import { readdirSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

/**
 * Los componentes de la escena no escriben colores propios: los toman del
 * tema (`COLOR_DE_ESCENA`, `COLOR_DE_PLAN`, `COLOR_DE_SERIE`, `COLOR_DE_ESTADO`
 * en `src/estilos/colores.js`). Así un color del entorno se cambia en un solo
 * sitio y la prueba de sincronía lo compara con `tema.css`.
 */
const CARPETA = 'src/scene'
const COLOR_SUELTO = /#[0-9a-fA-F]{3,8}\b|\brgba?\(|\bhsla?\(/

const sinComentarios = (texto) =>
  texto.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|\s)\/\/.*$/gm, '$1')

const componentes = readdirSync(CARPETA).filter((nombre) => nombre.endsWith('.jsx'))

describe('los componentes de src/scene no llevan colores sueltos', () => {
  it('hay componentes que revisar', () => {
    expect(componentes.length).toBeGreaterThan(8)
  })

  it.each(componentes)('%s', (nombre) => {
    const sueltos = sinComentarios(readFileSync(`${CARPETA}/${nombre}`, 'utf8'))
      .split('\n')
      .flatMap((linea, i) => (COLOR_SUELTO.test(linea) ? [`línea ${i + 1}: ${linea.trim()}`] : []))
    expect(sueltos, 'usa un color de colores.js').toEqual([])
  })

  it('el detector sí encuentra un color suelto', () => {
    expect(COLOR_SUELTO.test('<meshStandardMaterial color="#c8d4da" />')).toBe(true)
    expect(COLOR_SUELTO.test("fondo = 'rgba(255,255,255,0.9)'")).toBe(true)
    expect(COLOR_SUELTO.test('color={COLOR_DE_ESCENA.asfalto}')).toBe(false)
  })
})
