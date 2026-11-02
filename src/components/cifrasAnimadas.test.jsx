import { readFileSync } from 'node:fs'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { hojasDeLaAplicacion } from '../estilos/hojasDeEstilo.js'

/**
 * Las cifras de los indicadores se animan un instante cuando cambian, y solo la que cambió.
 *
 * No hay un navegador en las pruebas, así que se sustituye `useState` de React por uno mínimo
 * que guarda el estado de cada «instancia» de un componente y vuelve a llamar a la función
 * mientras se ajuste el estado al dibujar, como hace React. Con eso se llama a `Medida` y al
 * gancho tal cual, sin tocar su lógica.
 */
const memoria = vi.hoisted(() => ({ instancia: null }))

vi.mock('react', async (importarOriginal) => {
  const original = await importarOriginal()
  return {
    ...original,
    useState: (inicial) => {
      const celdas = memoria.instancia.celdas
      const lugar = memoria.instancia.cursor
      memoria.instancia.cursor += 1
      if (!(lugar in celdas)) celdas[lugar] = typeof inicial === 'function' ? inicial() : inicial
      const poner = (nuevo) => {
        celdas[lugar] = nuevo
        memoria.instancia.ajustado = true
      }
      return [celdas[lugar], poner]
    },
  }
})

const { Medida } = await import('./IndicadoresDeLaEscena.jsx')
const { useCambios } = await import('./useCambios.js')

const nuevaInstancia = () => ({ celdas: [], cursor: 0, ajustado: false })

/** Dibuja una vez la función en esa instancia, repitiendo mientras el estado se ajuste al dibujar. */
function dibujar(instancia, funcion) {
  memoria.instancia = instancia
  for (let vueltas = 0; vueltas < 10; vueltas += 1) {
    instancia.cursor = 0
    instancia.ajustado = false
    const resultado = funcion()
    if (!instancia.ajustado) return resultado
  }
  throw new Error('el estado no se asienta')
}

/** El elemento <strong> de una Medida ya dibujada: su clave y sus clases. */
const cifraDe = (elemento) => {
  const hijos = [elemento.props.children].flat()
  const strong = hijos.find((hijo) => hijo?.type === 'strong')
  return { clave: strong.key, clases: strong.props.className.split(' '), texto: strong.props.children }
}

describe('useCambios', () => {
  let instancia
  beforeEach(() => {
    instancia = nuevaInstancia()
  })

  it('la primera vez que se dibuja no cuenta como cambio', () => {
    expect(dibujar(instancia, () => useCambios(3))).toBe(0)
  })

  it('con el mismo valor no sube, por muchas veces que se dibuje', () => {
    dibujar(instancia, () => useCambios('2 / 6'))
    for (let i = 0; i < 5; i += 1) expect(dibujar(instancia, () => useCambios('2 / 6'))).toBe(0)
  })

  it('sube una vez por cada cambio de valor', () => {
    dibujar(instancia, () => useCambios(1))
    expect(dibujar(instancia, () => useCambios(2))).toBe(1)
    expect(dibujar(instancia, () => useCambios(2))).toBe(1)
    expect(dibujar(instancia, () => useCambios(3))).toBe(2)
    expect(dibujar(instancia, () => useCambios(2))).toBe(3)
  })
})

describe('la cifra de un indicador', () => {
  it('al aparecer no lleva animación', () => {
    const cifra = cifraDe(dibujar(nuevaInstancia(), () => Medida({ etiqueta: 'Motos en fila 1', valor: '0' })))
    expect(cifra.clases).toEqual(['medida-valor'])
  })

  it('al cambiar lleva la clase de la animación y una clave nueva, para que corra otra vez', () => {
    const instancia = nuevaInstancia()
    const antes = cifraDe(dibujar(instancia, () => Medida({ etiqueta: 'Motos en fila 1', valor: '0' })))
    const despues = cifraDe(dibujar(instancia, () => Medida({ etiqueta: 'Motos en fila 1', valor: '1' })))
    expect(despues.clases).toContain('medida-valor--nueva')
    expect(despues.clave).not.toBe(antes.clave)
    expect(despues.texto).toContain('1')
  })

  it('si el valor es el mismo no se anima ni se vuelve a montar', () => {
    const instancia = nuevaInstancia()
    const primera = cifraDe(dibujar(instancia, () => Medida({ etiqueta: 'Motos en fila 1', valor: '4' })))
    const segunda = cifraDe(dibujar(instancia, () => Medida({ etiqueta: 'Motos en fila 1', valor: '4' })))
    expect(segunda.clases).not.toContain('medida-valor--nueva')
    expect(segunda.clave).toBe(primera.clave)
  })

  it('solo se anima la cifra que cambió: las otras no', () => {
    const fila = nuevaInstancia()
    const placas = nuevaInstancia()
    dibujar(fila, () => Medida({ etiqueta: 'Motos en fila 1', valor: '0' }))
    dibujar(placas, () => Medida({ etiqueta: 'Placas ocupadas', valor: '2 / 6' }))
    const filaDespues = cifraDe(dibujar(fila, () => Medida({ etiqueta: 'Motos en fila 1', valor: '1' })))
    const placasDespues = cifraDe(dibujar(placas, () => Medida({ etiqueta: 'Placas ocupadas', valor: '2 / 6' })))
    expect(filaDespues.clases).toContain('medida-valor--nueva')
    expect(placasDespues.clases).not.toContain('medida-valor--nueva')
  })

  it('conserva la clase de advertencia junto a la de la animación', () => {
    const instancia = nuevaInstancia()
    dibujar(instancia, () => Medida({ etiqueta: 'Motos en fila 2', valor: '0', advertencia: true }))
    const cifra = cifraDe(dibujar(instancia, () => Medida({ etiqueta: 'Motos en fila 2', valor: '1', advertencia: true })))
    expect(cifra.clases).toEqual(['medida-valor', 'medida-valor--advertencia', 'medida-valor--nueva'])
  })

  it('no es una región aria-live: no se anuncia en cada cambio', () => {
    expect(readFileSync('src/components/IndicadoresDeLaEscena.jsx', 'utf8')).not.toMatch(/aria-live|role="status"|role="alert"/)
  })
})

describe('el estilo de la animación', () => {
  const css = hojasDeLaAplicacion().find((hoja) => hoja.nombre.endsWith('escena.css')).css
  const tema = readFileSync('src/estilos/tema.css', 'utf8')

  it('solo mueve opacidad y desplazamiento, con la duración y la curva del tema', () => {
    expect(css).toMatch(/\.medida-valor--nueva\s*\{\s*animation:\s*cifra-nueva var\(--duracion-corta\) var\(--curva-entrada\);\s*\}/)
    const keyframes = css.match(/@keyframes cifra-nueva\s*\{([\s\S]*?\})\s*\}/)[1]
    const propiedades = [...keyframes.matchAll(/([a-z-]+)\s*:/g)].map((m) => m[1])
    expect([...new Set(propiedades)].sort()).toEqual(['opacity', 'transform'])
  })

  it('con «reducir movimiento» la duración del tema es 0 y la animación no se ve', () => {
    const reducido = tema.match(/@media \(prefers-reduced-motion: reduce\)\s*\{([\s\S]*?)\n\}/)[1]
    expect(reducido).toMatch(/--duracion-corta\s*:\s*0ms/)
  })
})
