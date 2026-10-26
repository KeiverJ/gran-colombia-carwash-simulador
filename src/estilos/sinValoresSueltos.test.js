import { describe, expect, it } from 'vitest'

import { hojasDeLaAplicacion, textoDelTema } from './hojasDeEstilo.js'

/**
 * Las duraciones, las curvas y los tamaños de letra salen del tema
 * (`tema.css`): las hojas de los componentes no los escriben sueltos. Y solo se
 * animan `transform` y `opacity` (más el color de fondo, de borde y de texto al
 * pasar el mouse, que no mueve nada).
 */
const PROPIEDADES_ANIMABLES = new Set(['transform', 'opacity', 'background-color', 'border-color', 'color'])
const DURACION_SUELTA = /(?<![-\w.])\d*\.?\d+(?:ms|s)\b/
const CURVA_SUELTA = /cubic-bezier\(|\bsteps\(|\b(?:ease|ease-in|ease-out|ease-in-out)\b/

/** Los valores de cada declaración `transition` y `animation` (sin sus variantes con guion). */
const declaraciones = (css, propiedad) =>
  [...css.matchAll(new RegExp(`(?<![-\\w])${propiedad}\\s*:\\s*([^;]+);`, 'g'))].map((m) => m[1].trim())

/** Divide `a 1s, b 2s` por las comas que no están dentro de paréntesis. */
function separarPorComas(valor) {
  const partes = []
  let profundidad = 0
  let actual = ''
  for (const letra of valor) {
    if (letra === '(') profundidad += 1
    if (letra === ')') profundidad -= 1
    if (letra === ',' && profundidad === 0) {
      partes.push(actual.trim())
      actual = ''
    } else {
      actual += letra
    }
  }
  partes.push(actual.trim())
  return partes.filter(Boolean)
}

/** Las propiedades que declara cada bloque `@keyframes`. */
function propiedadesDeLosKeyframes(css) {
  const propiedades = []
  for (const bloque of css.matchAll(/@keyframes\s+[\w-]+\s*\{((?:[^{}]*\{[^{}]*\})*)\s*\}/g)) {
    for (const declaracion of bloque[1].matchAll(/([a-z-]+)\s*:/g)) {
      propiedades.push(declaracion[1])
    }
  }
  return propiedades
}

describe('las hojas de estilo no llevan valores sueltos de movimiento ni de letra', () => {
  const hojas = hojasDeLaAplicacion()

  describe.each(hojas.map((hoja) => [hoja.nombre, hoja.css]))('%s', (_nombre, css) => {
    it('las duraciones y las curvas son variables del tema', () => {
      const valores = [...declaraciones(css, 'transition'), ...declaraciones(css, 'animation')]
      const sueltos = valores.filter((valor) => DURACION_SUELTA.test(valor) || CURVA_SUELTA.test(valor))
      expect(sueltos, 'usa --duracion-* y --curva-* del tema').toEqual([])
      const sueltasEnPropiedades = [
        ...declaraciones(css, 'transition-duration'),
        ...declaraciones(css, 'transition-timing-function'),
        ...declaraciones(css, 'animation-duration'),
        ...declaraciones(css, 'animation-timing-function'),
      ].filter((valor) => !valor.startsWith('var('))
      expect(sueltasEnPropiedades).toEqual([])
    })

    it('solo anima transform, opacity y colores', () => {
      const animadas = declaraciones(css, 'transition').flatMap((valor) =>
        separarPorComas(valor).map((parte) => parte.split(/\s+/)[0]),
      )
      const noPermitidas = animadas.filter((propiedad) => !PROPIEDADES_ANIMABLES.has(propiedad))
      expect(noPermitidas, 'se anima algo que mueve el diseño o no está permitido').toEqual([])
      const enKeyframes = propiedadesDeLosKeyframes(css).filter(
        (propiedad) => propiedad !== 'transform' && propiedad !== 'opacity',
      )
      expect(enKeyframes).toEqual([])
    })

    it('el tamaño de la letra sale de las variables del tema', () => {
      const sueltos = declaraciones(css, 'font-size').filter(
        (valor) => !valor.startsWith('var(--letra-') && valor !== '100%',
      )
      expect(sueltos, 'usa var(--letra-*) del tema').toEqual([])
    })
  })

  it('los detectores sí encuentran lo que buscan', () => {
    expect(DURACION_SUELTA.test('opacity 200ms')).toBe(true)
    expect(DURACION_SUELTA.test('opacity .15s')).toBe(true)
    expect(DURACION_SUELTA.test('opacity var(--duracion-media)')).toBe(false)
    expect(DURACION_SUELTA.test('transform var(--duracion-media) var(--curva-entrada)')).toBe(false)
    expect(CURVA_SUELTA.test('transform 1s ease-out')).toBe(true)
    expect(CURVA_SUELTA.test('transform var(--duracion-media) var(--curva-entrada)')).toBe(false)
    expect(separarPorComas('transform var(--a) cubic-bezier(0, 0, 1, 1), opacity 1s')).toEqual([
      'transform var(--a) cubic-bezier(0, 0, 1, 1)',
      'opacity 1s',
    ])
    expect(declaraciones('a { transition: width 1s; }', 'transition')).toEqual(['width 1s'])
    expect(declaraciones('a { transition-duration: 1s; }', 'transition')).toEqual([])
    expect(propiedadesDeLosKeyframes('@keyframes x { from { height: 0; } to { opacity: 1; } }')).toEqual([
      'height',
      'opacity',
    ])
  })
})

describe('el tema define el movimiento y lo apaga con "reducir movimiento"', () => {
  const tema = textoDelTema()
  const bloqueRaiz = tema.match(/:root\s*\{([\s\S]*?)\n\}/)?.[1] ?? ''
  const reducido = tema.match(/@media \(prefers-reduced-motion: reduce\)\s*\{([\s\S]*?)\n\}/)?.[1] ?? ''

  it('declara las duraciones y las curvas', () => {
    for (const variable of ['--duracion-corta', '--duracion-media', '--curva-entrada', '--curva-salida']) {
      expect(bloqueRaiz, variable).toContain(`${variable}:`)
    }
  })

  it('cada duración vale 0 con la preferencia de reducir el movimiento', () => {
    const duraciones = [...bloqueRaiz.matchAll(/(--duracion-[\w-]+)\s*:/g)].map((m) => m[1])
    expect(duraciones.length).toBeGreaterThanOrEqual(4)
    for (const variable of duraciones) {
      expect(reducido, variable).toMatch(new RegExp(`${variable}\\s*:\\s*0ms`))
    }
  })
})
