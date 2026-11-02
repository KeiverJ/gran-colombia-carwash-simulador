import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import { distanciaDeColor } from './distanciaDeColor.js'

import {
  COLORES_COMPARTIDOS,
  COLOR_DE_ESCENA,
  COLOR_DE_MARCA,
  COLOR_DE_ESTADO,
  COLOR_DE_OCUPADO,
  COLOR_DE_RESERVADO,
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
      /^(marca-[\w-]+|plan-\d+|estado-libre|estado-reservada-[\w-]+|serie-[\w-]+|escena-[\w-]+)$/.test(nombre),
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

  it('el tema ya no tiene colores de estado «ocupada»: solo libre y los dos tonos de reservada', () => {
    expect(Object.keys(tema).filter((nombre) => nombre.startsWith('estado-'))).toEqual([
      'estado-libre',
      'estado-reservada-lavado',
      'estado-reservada-acabado',
    ])
  })

  it('reservada es un tono suave del color de su etapa: el 45 % de él sobre el gris de «libre»', () => {
    const mezcla = (a, b, t) =>
      '#' +
      [1, 3, 5]
        .map((i) => {
          const x = parseInt(a.slice(i, i + 2), 16)
          const y = parseInt(b.slice(i, i + 2), 16)
          return Math.round(x + (y - x) * t).toString(16).padStart(2, '0')
        })
        .join('')
    expect(COLOR_DE_RESERVADO.lavado).toBe(mezcla(COLOR_DE_ESTADO.libre, COLOR_DE_OCUPADO.lavado, 0.45))
    expect(COLOR_DE_RESERVADO.acabado).toBe(mezcla(COLOR_DE_ESTADO.libre, COLOR_DE_OCUPADO.acabado, 0.45))
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

  it('los tres tonos del lavadero se separan: la placa es lo más oscuro, el piso está en medio y las aceras y el terreno son claros y más cálidos', () => {
    const { placaDeMetal, piso, acera, terreno, pisoMojado, zonaDeAcabado } = COLOR_DE_ESCENA
    expect(contraste(placaDeMetal, piso)).toBeGreaterThan(3)
    expect(contraste(piso, acera)).toBeGreaterThan(2)
    expect(contraste(piso, terreno)).toBeGreaterThan(2)
    // la placa es más oscura que todo lo que la rodea
    for (const otro of [piso, pisoMojado, zonaDeAcabado, acera, terreno, COLOR_DE_ESTADO.libre, COLOR_DE_ESCENA.losaCerrada]) {
      expect(luminancia(placaDeMetal)).toBeLessThan(luminancia(otro))
    }
    // las aceras y el terreno son más claros que el piso, y más cálidos (más rojo que azul que él)
    for (const claro of [acera, terreno]) {
      expect(luminancia(claro)).toBeGreaterThan(luminancia(piso))
      const calidez = (hex) => Number.parseInt(hex.slice(1, 3), 16) - Number.parseInt(hex.slice(5, 7), 16)
      expect(calidez(claro)).toBeGreaterThan(calidez(piso))
    }
    // el piso mojado es un poco más oscuro que el piso seco
    expect(luminancia(pisoMojado)).toBeLessThan(luminancia(piso))
  })

  it('el borde del estado se lee sobre la placa oscura y los números y las líneas sobre el piso', () => {
    const { placaDeMetal, piso } = COLOR_DE_ESCENA
    expect(contraste(COLOR_DE_ESTADO.libre, placaDeMetal)).toBeGreaterThan(3)
    expect(contraste(COLOR_DE_RESERVADO.lavado, placaDeMetal)).toBeGreaterThan(3)
    expect(contraste(COLOR_DE_OCUPADO.lavado, placaDeMetal)).toBeGreaterThan(2)
    expect(contraste(COLOR_DE_ESCENA.losaCerrada, placaDeMetal)).toBeGreaterThan(3)
    // la tarjeta blanca de los números y las líneas de pintura de las filas (blancas) sobre el piso
    expect(contraste(COLOR_DE_ESCENA.rotuloFondo, piso)).toBeGreaterThan(3)
    expect(contraste(COLOR_DE_ESCENA.pinturaDeEspera, piso)).toBeGreaterThan(2.5)
  })

  it('los puestos de acabado también son de metal oscuro: su borde, los aros de los planes y los rótulos se leen sobre él', () => {
    const { placaDeMetal, rotuloFondo, rotuloTexto, zonaDeAcabado } = COLOR_DE_ESCENA
    // borde de estado del acabado sobre la cubierta oscura: libre, reservado y cerrado se ven claro; ocupado se distingue además por la altura
    expect(contraste(COLOR_DE_ESTADO.libre, placaDeMetal)).toBeGreaterThan(3)
    expect(contraste(COLOR_DE_RESERVADO.acabado, placaDeMetal)).toBeGreaterThan(3)
    expect(contraste(COLOR_DE_OCUPADO.acabado, placaDeMetal)).toBeGreaterThan(1.5)
    // los aros de los planes sobre la cubierta oscura: más de 2 : 1 de claridad y muy distintos en color
    for (const plan of [1, 2, 3]) {
      expect(contraste(COLOR_DE_PLAN[plan], placaDeMetal), `plan ${plan}`).toBeGreaterThan(2)
      expect(distanciaDeColor(COLOR_DE_PLAN[plan], placaDeMetal), `plan ${plan} en Lab`).toBeGreaterThan(50)
    }
    // la tarjeta blanca de los números se lee sobre la franja del acabado y su texto sobre la tarjeta
    expect(contraste(rotuloFondo, zonaDeAcabado)).toBeGreaterThan(2.5)
    expect(contraste(rotuloTexto, rotuloFondo)).toBeGreaterThan(4.5)
    // y la cubierta oscura se separa de la franja del acabado
    expect(contraste(placaDeMetal, zonaDeAcabado)).toBeGreaterThan(3)
  })

  it('la pintura vial se lee sobre el asfalto oscuro (más de 3 : 1)', () => {
    expect(contraste(COLOR_DE_ESCENA.pinturaVial, COLOR_DE_ESCENA.asfalto)).toBeGreaterThan(3)
  })

  it('el texto blanco sobre el azul de la marca y sobre el letrero del local llega a 4,5 : 1', () => {
    expect(COLOR_DE_MARCA.azul).toBe('#1f3fa6')
    expect(contraste('#ffffff', COLOR_DE_MARCA.azul)).toBeGreaterThanOrEqual(4.5)
    expect(contraste(COLOR_DE_ESCENA.textoDeLetrero, COLOR_DE_ESCENA.letreroDelLocal)).toBeGreaterThanOrEqual(4.5)
  })

  it('la pared y las columnas llevan el azul de la marca, y la franja de la pared el amarillo del logo', () => {
    expect(COLOR_DE_ESCENA.paredAzul).toBe(COLOR_DE_MARCA.azul)
    expect(COLOR_DE_ESCENA.columnaAzul).toBe(COLOR_DE_MARCA.azul)
    expect(COLOR_DE_ESCENA.franjaDePared).toBe('#ffd21f')
    expect(COLOR_DE_ESCENA.arco).toBe(COLOR_DE_MARCA.azulMarino)
    expect(COLOR_DE_ESCENA).not.toHaveProperty('pared')
  })

  it('el borde del terreno y el cielo del horizonte se encuentran: el velo termina en el color del horizonte', () => {
    expect(tema['escena-cielo-horizonte']).toBe(COLOR_DE_ESCENA.cieloHorizonte)
    expect(tema['escena-cielo-cenit']).toBe(COLOR_DE_ESCENA.cieloCenit)
  })

  it('una losa reservada se distingue de una libre y de una ocupada por color', () => {
    for (const etapa of ['lavado', 'acabado']) {
      expect(COLOR_DE_RESERVADO[etapa]).not.toBe(COLOR_DE_ESTADO.libre)
      expect(COLOR_DE_RESERVADO[etapa]).not.toBe(COLOR_DE_OCUPADO[etapa])
      expect(contraste(COLOR_DE_RESERVADO[etapa], COLOR_DE_ESTADO.libre)).toBeGreaterThan(1.2)
      expect(contraste(COLOR_DE_RESERVADO[etapa], COLOR_DE_OCUPADO[etapa])).toBeGreaterThan(1.2)
    }
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
      'boton-principal': '#ffd21f',
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

    it('el texto del botón principal se lee sobre su fondo, en reposo, con el mouse encima y pulsado', () => {
      expect(contraste(tema['boton-principal-texto'], tema['boton-principal'])).toBeGreaterThanOrEqual(4.5)
    })

    it('el botón principal toma el amarillo del logo, con el borde de siempre', () => {
      expect(tema).toMatchObject({
        'boton-principal': '#ffd21f',
        'boton-principal-hover': '#f2be00',
        'boton-principal-activo': '#dba800',
        'boton-principal-borde': '#b88a04',
      })
    })

    it.each([
      ['boton-principal', 12.01],
      ['boton-principal-hover', 10.06],
      ['boton-principal-activo', 7.97],
    ])('el texto #1A1A1A sobre --%s da %s : 1, por encima de 7', (nombre, esperado) => {
      const real = contraste(tema['boton-principal-texto'], tema[nombre])
      expect(real).toBeGreaterThanOrEqual(7)
      expect(real).toBeCloseTo(esperado, 1)
    })

    it('el botón se oscurece al pasar el mouse y más al pulsar', () => {
      expect(luminancia(tema['boton-principal-hover'])).toBeLessThan(luminancia(tema['boton-principal']))
      expect(luminancia(tema['boton-principal-activo'])).toBeLessThan(luminancia(tema['boton-principal-hover']))
    })

    it('el botón se separa de la tarjeta blanca por su borde (3 : 1 o más), no por su relleno', () => {
      expect(contraste(tema['boton-principal'], tema['fondo-tarjeta'])).toBeCloseTo(1.45, 1)
      expect(contraste(tema['boton-principal-borde'], tema['fondo-tarjeta'])).toBeGreaterThanOrEqual(3)
    })
  })
})

describe('la marca del logo en la interfaz', () => {
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

  it('el azul marino es el del contorno del logo, en el CSS y en JavaScript', () => {
    expect(tema['marca-azul-marino']).toBe('#0b1f4d')
    expect(COLOR_DE_MARCA.azulMarino).toBe('#0b1f4d')
  })

  it('el nombre en azul marino se lee sobre la barra, la página y la escena (15,94 · 14,16 · 13,74)', () => {
    const esperado = { 'fondo-tarjeta': 15.94, 'fondo-pagina': 14.16, 'fondo-escena': 13.74 }
    for (const [fondo, valor] of Object.entries(esperado)) {
      const real = contraste(tema['marca-azul-marino'], tema[fondo])
      expect(real, fondo).toBeGreaterThanOrEqual(4.5)
      expect(real, fondo).toBeCloseTo(valor, 1)
    }
  })

  it('el texto blanco sobre el azul de la marca (pestañas activas y opciones elegidas) da 9,05 : 1, en el CSS y en JavaScript', () => {
    expect(tema['marca-azul']).toBe('#1f3fa6')
    expect(tema['marca-azul-texto']).toBe('#ffffff')
    expect(COLOR_DE_MARCA.azulTexto).toBe(tema['marca-azul-texto'])
    const real = contraste(tema['marca-azul-texto'], tema['marca-azul'])
    expect(real).toBeGreaterThanOrEqual(4.5)
    expect(real).toBeCloseTo(9.05, 1)
  })

  it('el rojo del logo (#E11D2A) no está en la interfaz: ni en el tema ni en los colores', () => {
    const css = readFileSync(RUTA_TEMA, 'utf8')
    const js = readFileSync(fileURLToPath(new URL('./colores.js', import.meta.url)), 'utf8')
    expect(css.toLowerCase()).not.toContain('e11d2a')
    expect(js.toLowerCase()).not.toContain('e11d2a')
    expect(Object.values(COLORES_COMPARTIDOS).map((c) => c.toLowerCase())).not.toContain('#e11d2a')
    // El rojo de la interfaz sigue siendo el de siempre.
    expect(tema.peligro).toBe('#c8322f')
  })

  it('los colores de las etapas no cambiaron con el logo', () => {
    expect(tema['etapa-1']).toBe('#0b84ae')
    expect(tema['etapa-2']).toBe('#6d4fc2')
  })
})

