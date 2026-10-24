import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import { COLORES_COMPARTIDOS, COLOR_DE_PLAN, NOMBRE_DE_PLAN } from './colores.js'

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
      /^(plan-\d+|estado-(libre|ocupada)|serie-[\w-]+)$/.test(nombre),
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
      expect(color).not.toBe(COLORES_COMPARTIDOS['estado-ocupada'])
    }
  })
})
