import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

import { COLOR_DE_ESCENA, COLOR_DE_PLAN, COLOR_DE_SERIE, PALETA_DE_ROPA } from './colores.js'
import { coloresQueUsurpan, distanciaDeColor, hexALab } from './distanciaDeColor.js'

/**
 * El paisaje de la escena (cielo, ropa, vegetación, cafetería y los objetos
 * hechos en código) no usa los colores con significado: las etapas, los
 * planes, el ámbar de las advertencias y el rojo de los errores.
 *
 * Se mide con la distancia en Lab (CIE 1976). **Mínimo: 15.** Medido con la
 * paleta de este cambio, la pareja más cercana es el azul de la marca de la
 * pared y las columnas (#1F3FA6) contra la etapa 2 (#6D4FC2): 16,9. Entre el
 * paisaje propiamente dicho, la más cercana es el cielo del cenit contra la
 * etapa 1: 23,0. Una distancia de 2,3 ya se nota; entre colores claramente
 * distintos pasa de 20.
 */
const MINIMO = 15

const tema = readFileSync(fileURLToPath(new URL('./tema.css', import.meta.url)), 'utf8')
const variable = (nombre) => new RegExp(`--${nombre}:\\s*(#[0-9a-fA-F]{6})`).exec(tema)?.[1]

/** Los colores con significado. */
const RESERVADOS = {
  'etapa 1 (lavado)': COLOR_DE_SERIE.colaLavado,
  'etapa 2 (acabado)': COLOR_DE_SERIE.colaAcabado,
  'plan 1': COLOR_DE_PLAN[1],
  'plan 2': COLOR_DE_PLAN[2],
  'plan 3': COLOR_DE_PLAN[3],
  'ámbar de las advertencias': variable('advertencia'),
  'rojo de los errores': variable('peligro'),
}

/** Los colores del paisaje: lo que no avisa nada (la marca y las placas se miden aparte). */
const NOMBRES_DEL_PAISAJE = [
  'cieloCenit', 'cieloHorizonte', 'sol', 'lona', 'arco', 'paredAzul', 'franjaDePared', 'columnaAzul',
  'asfalto', 'acera', 'bordillo', 'terreno', 'piso', 'pisoMojado', 'juntaDelPiso', 'zonaDeAcabado', 'pinturaDeEspera', 'placaDeMetal', 'cafeteria', 'mostrador', 'mesaDeCafeteria', 'sillaDeCafeteria',
  'tanqueDeAgua', 'sombrilla', 'ropaDeTrabajo', 'botasDeCaucho', 'ropaDeCliente1', 'ropaDeCliente2',
  'ropaDeCliente3', 'ropaDeCliente4', 'ropaDeCliente5', 'ropaDeCliente6', 'pielClara', 'pielMedia',
  'pielOscura', 'peloOscuro', 'peloCastano', 'espuma', 'follaje', 'tronco', 'matera',
]
const PAISAJE = Object.fromEntries(NOMBRES_DEL_PAISAJE.map((nombre) => [nombre, COLOR_DE_ESCENA[nombre]]))

describe('la distancia de color en Lab', () => {
  it('el negro es L = 0 y el blanco L = 100', () => {
    expect(hexALab('#000000')[0]).toBeCloseTo(0, 1)
    expect(hexALab('#ffffff')[0]).toBeCloseTo(100, 1)
  })

  it('es cero entre un color y él mismo, simétrica, y crece con la diferencia', () => {
    expect(distanciaDeColor('#2f6fdb', '#2f6fdb')).toBe(0)
    expect(distanciaDeColor('#2f6fdb', '#e8792b')).toBeCloseTo(distanciaDeColor('#e8792b', '#2f6fdb'), 10)
    expect(distanciaDeColor('#2f6fdb', '#2f70dc')).toBeLessThan(2.3)
    expect(distanciaDeColor('#2f6fdb', '#e8792b')).toBeGreaterThan(50)
  })
})

describe('el paisaje no usurpa los colores con significado', () => {
  it('todos los colores del paisaje existen en la escena', () => {
    for (const nombre of NOMBRES_DEL_PAISAJE) expect(COLOR_DE_ESCENA[nombre], nombre).toMatch(/^#[0-9a-f]{6}$/i)
  })

  it(`ninguno queda a menos de ${MINIMO} de una etapa, un plan, el ámbar o el rojo`, () => {
    const fallos = coloresQueUsurpan(PAISAJE, RESERVADOS, MINIMO)
    expect(
      fallos.map(({ nombre, reservado, distancia }) => `${nombre} se parece a ${reservado} (${distancia.toFixed(1)})`),
    ).toEqual([])
  })

  it('la ropa de los clientes no es roja ni se parece a nada reservado', () => {
    expect(PALETA_DE_ROPA).toHaveLength(6)
    expect(new Set(PALETA_DE_ROPA).size).toBe(6)
    const ropa = Object.fromEntries(PALETA_DE_ROPA.map((color, i) => [`ropa ${i + 1}`, color]))
    expect(coloresQueUsurpan(ropa, RESERVADOS, MINIMO * 1.5)).toEqual([])
    for (const color of PALETA_DE_ROPA) {
      const [r, g, b] = [1, 3, 5].map((i) => Number.parseInt(color.slice(i, i + 2), 16))
      // un rojo: el canal rojo domina con claridad sobre los otros dos
      expect(r > g * 1.4 && r > b * 1.4, color).toBe(false)
    }
  })

  it('la prueba falla si se mete a propósito un color de plan, de etapa, el ámbar o el rojo', () => {
    for (const [nombre, color] of Object.entries(RESERVADOS)) {
      const fallos = coloresQueUsurpan({ ...PAISAJE, intruso: color }, RESERVADOS, MINIMO)
      expect(fallos.map((f) => f.nombre), nombre).toContain('intruso')
    }
    // y uno casi igual también
    expect(coloresQueUsurpan({ casi: '#2f70dc' }, RESERVADOS, MINIMO)).toHaveLength(1)
  })

  it('el color de ropa o de cielo parecido a un plan se nombra en el fallo', () => {
    const [fallo] = coloresQueUsurpan({ camisaAzul: '#3a74d9' }, RESERVADOS, MINIMO)
    expect(fallo).toMatchObject({ nombre: 'camisaAzul', reservado: 'plan 1' })
    expect(fallo.distancia).toBeLessThan(MINIMO)
  })
})
