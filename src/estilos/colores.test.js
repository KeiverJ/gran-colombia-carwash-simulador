import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import {
  COLORES_COMPARTIDOS,
  COLOR_DE_ESCENA,
  COLOR_DE_ESTADO,
  COLOR_DE_OCUPADO,
  COLOR_DE_PLAN,
  COLOR_DE_SERIE,
  NOMBRE_DE_PLAN,
} from './colores.js'

/**
 * `tema.css` y `colores.js` guardan los mismos colores porque Three.js y
 * Recharts no leen variables CSS. Esta prueba abre el CSS como texto —sin
 * navegador y sin jsdom— y comprueba que ninguno de los dos se quedó atrás.
 */
const RUTA_TEMA = fileURLToPath(new URL('./tema.css', import.meta.url))

/** Saca del CSS los pares `--nombre: valor;` que son colores sólidos. */
function variablesDelTema() {
  const css = readFileSync(RUTA_TEMA, 'utf8')
  const variables = {}
  for (const [, nombre, valor] of css.matchAll(/--([\w-]+):\s*([^;]+);/g)) {
    variables[nombre] = valor.trim()
  }
  return variables
}

describe('tema.css y colores.js dicen lo mismo', () => {
  const tema = variablesDelTema()

  it('el CSS se puede leer y trae variables', () => {
    expect(Object.keys(tema).length).toBeGreaterThan(10)
  })

  it('cada color compartido de colores.js está igual en tema.css', () => {
    for (const [nombre, valor] of Object.entries(COLORES_COMPARTIDOS)) {
      expect(
        tema[nombre],
        `la variable --${nombre} no está en tema.css o no coincide con colores.js`,
      ).toBe(valor)
    }
  })

  it('tema.css no tiene colores compartidos que falten en colores.js', () => {
    // El otro sentido: añadir un plan o una serie solo al CSS también falla.
    const compartidosEnElCss = Object.keys(tema).filter((nombre) =>
      /^(plan-\d+|estado-libre|serie-[\w-]+|escena-[\w-]+)$/.test(nombre),
    )
    for (const nombre of compartidosEnElCss) {
      expect(
        COLORES_COMPARTIDOS[nombre],
        `la variable --${nombre} está en tema.css pero no en colores.js`,
      ).toBeDefined()
    }
    expect(compartidosEnElCss.sort()).toEqual(Object.keys(COLORES_COMPARTIDOS).sort())
  })

  it('los tres planes tienen color y nombre', () => {
    for (const plan of [1, 2, 3]) {
      expect(COLOR_DE_PLAN[plan]).toMatch(/^#[0-9a-f]{6}$/i)
      expect(NOMBRE_DE_PLAN[plan]).toContain(`Plan ${plan}`)
    }
  })

  it('los colores de los planes son distintos entre sí y de los de estado', () => {
    const planes = [COLOR_DE_PLAN[1], COLOR_DE_PLAN[2], COLOR_DE_PLAN[3]]
    expect(new Set(planes).size).toBe(3)
    for (const color of planes) {
      expect(color).not.toBe(COLORES_COMPARTIDOS['estado-libre'])
    }
  })
})

describe('el estado de placas y puestos no usa verde ni rojo', () => {
  const tema = variablesDelTema()

  /** Matiz en grados (0 a 360) y saturación (0 a 1) de un color `#rrggbb`. */
  const matiz = (hex) => {
    const [r, g, b] = [1, 3, 5].map((i) => Number.parseInt(hex.slice(i, i + 2), 16) / 255)
    const max = Math.max(r, g, b)
    const min = Math.min(r, g, b)
    if (max === min) return { grados: 0, saturacion: 0 }
    const d = max - min
    let grados
    if (max === r) grados = ((g - b) / d) % 6
    else if (max === g) grados = (b - r) / d + 2
    else grados = (r - g) / d + 4
    return { grados: (grados * 60 + 360) % 360, saturacion: d / (1 - Math.abs(max + min - 1)) }
  }

  it('libre es un gris azulado poco saturado, no verde', () => {
    const { grados, saturacion } = matiz(COLOR_DE_ESTADO.libre)
    expect(saturacion).toBeLessThan(0.25)
    expect(grados).toBeGreaterThan(180) // azulado, no verde (80-160) ni rojo (<20)
    expect(grados).toBeLessThan(230)
  })

  it('ocupado es el color de su etapa: el lavado con el de la fila 1 y el acabado con el de la fila 2', () => {
    expect(COLOR_DE_OCUPADO).toEqual({ lavado: tema['etapa-1'], acabado: tema['etapa-2'] })
  })

  it('el tema ya no tiene colores de estado «ocupada»', () => {
    expect(Object.keys(tema).filter((nombre) => nombre.startsWith('estado-'))).toEqual(['estado-libre'])
  })
})

describe('los colores del entorno de la escena', () => {
  const tema = variablesDelTema()

  const luminancia = (hex) => {
    const [r, g, b] = [1, 3, 5].map((i) => {
      const v = Number.parseInt(hex.slice(i, i + 2), 16) / 255
      return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
    })
    return 0.2126 * r + 0.7152 * g + 0.0722 * b
  }
  const contraste = (a, b) => {
    const [claro, oscuro] = [luminancia(a), luminancia(b)].sort((x, y) => y - x)
    return (claro + 0.05) / (oscuro + 0.05)
  }

  it('todos son colores #rrggbb y están en el tema con su nombre en kebab-case', () => {
    for (const [nombre, color] of Object.entries(COLOR_DE_ESCENA)) {
      expect(color, nombre).toMatch(/^#[0-9a-f]{6}$/i)
      const variable = `escena-${nombre.replace(/[A-Z]/g, (l) => `-${l.toLowerCase()}`)}`
      expect(tema[variable], `--${variable}`).toBe(color)
    }
  })

  it('el texto blanco sobre el letrero verde de la calle llega a 4,5 : 1', () => {
    expect(contraste(COLOR_DE_ESCENA.textoDeLetrero, COLOR_DE_ESCENA.letreroDeCalle)).toBeGreaterThanOrEqual(4.5)
  })

  it('el texto de los rótulos se lee sobre su fondo', () => {
    expect(contraste(COLOR_DE_ESCENA.rotuloTexto, COLOR_DE_ESCENA.rotuloFondo)).toBeGreaterThanOrEqual(4.5)
  })

  it('el asfalto se distingue de la acera y del piso del local', () => {
    expect(contraste(COLOR_DE_ESCENA.asfalto, COLOR_DE_ESCENA.acera)).toBeGreaterThan(2)
    expect(contraste(COLOR_DE_ESCENA.asfalto, COLOR_DE_ESCENA.piso)).toBeGreaterThan(2)
  })

  it('una losa libre y una ocupada se distinguen también por color, no solo por altura', () => {
    expect(contraste(COLOR_DE_ESTADO.libre, COLOR_DE_OCUPADO.lavado)).toBeGreaterThan(2)
    expect(contraste(COLOR_DE_ESTADO.libre, COLOR_DE_OCUPADO.acabado)).toBeGreaterThan(2)
  })
})

describe('la paleta del rediseño', () => {
  const tema = variablesDelTema()

  it('los planes son los del diseño', () => {
    expect(COLOR_DE_PLAN).toEqual({ 1: '#2f6fdb', 2: '#e8792b', 3: '#d35bb3' })
  })

  it('cada fila de la gráfica lleva el color de su etapa', () => {
    expect(COLOR_DE_SERIE.colaLavado).toBe(tema['etapa-1'])
    expect(COLOR_DE_SERIE.colaAcabado).toBe(tema['etapa-2'])
  })

  it('el ámbar no se usa como color de una serie ni de un plan', () => {
    const usados = [...Object.values(COLOR_DE_SERIE), ...Object.values(COLOR_DE_PLAN)]
    expect(usados).not.toContain(tema.advertencia)
  })

  it('los neutros y los colores de marca son los pedidos', () => {
    expect(tema).toMatchObject({
      'fondo-pagina': '#eef2f5',
      'fondo-tarjeta': '#ffffff',
      borde: '#dce3e8',
      'borde-campo': '#c9d3da',
      'fondo-escena': '#e9eff3',
      seleccion: '#e3f0f5',
      texto: '#12212c',
      'texto-secundario': '#3b4b57',
      'texto-tenue': '#5a6b78',
      'etapa-1': '#0b84ae',
      'etapa-2': '#6d4fc2',
      advertencia: '#d98a00',
      peligro: '#c8322f',
      'boton-principal': '#f2b600',
      'boton-principal-texto': '#1a1a1a',
    })
  })

  describe('el texto de color llega al contraste mínimo de 4,5 a 1', () => {
    const luminancia = (hex) => {
      const [r, g, b] = [1, 3, 5].map((i) => {
        const v = Number.parseInt(hex.slice(i, i + 2), 16) / 255
        return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
      })
      return 0.2126 * r + 0.7152 * g + 0.0722 * b
    }
    const contraste = (a, b) => {
      const [claro, oscuro] = [luminancia(a), luminancia(b)].sort((x, y) => y - x)
      return (claro + 0.05) / (oscuro + 0.05)
    }

    it.each([
      ['etapa-1-texto', '#0a6c8c'],
      ['advertencia-texto', '#8a5600'],
    ])('--%s (%s) sobre blanco, fondo de página, selección y fondo de escena', (nombre, valor) => {
      expect(tema[nombre]).toBe(valor)
      for (const fondo of ['fondo-tarjeta', 'fondo-pagina', 'seleccion', 'fondo-escena']) {
        expect(contraste(tema[nombre], tema[fondo]), `${nombre} sobre ${fondo}`).toBeGreaterThanOrEqual(4.5)
      }
    })

    it('los colores base de la etapa 1 y del ámbar NO llegan: por eso hay variantes para texto', () => {
      expect(contraste(tema['etapa-1'], tema['fondo-tarjeta'])).toBeLessThan(4.5)
      expect(contraste(tema.advertencia, tema['fondo-tarjeta'])).toBeLessThan(4.5)
    })

    it('el texto principal, el secundario, el tenue, la etapa 2 y el rojo llegan sin variante', () => {
      for (const nombre of ['texto', 'texto-secundario', 'texto-tenue', 'etapa-2', 'peligro']) {
        for (const fondo of ['fondo-tarjeta', 'fondo-pagina', 'seleccion', 'fondo-escena']) {
          expect(contraste(tema[nombre], tema[fondo]), `${nombre} sobre ${fondo}`).toBeGreaterThanOrEqual(4.5)
        }
      }
    })

    it('el texto del botón principal se lee sobre su fondo', () => {
      expect(contraste(tema['boton-principal-texto'], tema['boton-principal'])).toBeGreaterThanOrEqual(4.5)
    })
  })
})
