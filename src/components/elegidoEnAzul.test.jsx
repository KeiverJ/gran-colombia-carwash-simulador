import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { hojasDeLaAplicacion } from '../estilos/hojasDeEstilo.js'
import GrupoDeBotones from './GrupoDeBotones.jsx'
import { ListaDePestanas } from './Pestanas.jsx'

/**
 * Lo elegido y lo activo (la pestaña abierta, la opción de un grupo de botones, el modo de
 * simulación) se rellena con el azul de la marca, con texto blanco y en negrita: sin subrayado
 * ni franja, y sin depender solo del color (el atributo de accesibilidad y la marca «✓» siguen).
 */

const css = hojasDeLaAplicacion().find((hoja) => hoja.nombre.endsWith('interfaz.css')).css

/** El cuerpo de la regla cuyo selector es exactamente el dado (con o sin otros selectores de la lista). */
function reglaDe(selector) {
  const reglas = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
  const buscada = reglas.find(([, selectores]) =>
    selectores
      .split(',')
      .map((s) => s.trim())
      .includes(selector),
  )
  return buscada ? buscada[2] : ''
}

describe('las pestañas activas', () => {
  const html = renderToStaticMarkup(
    <ListaDePestanas
      etiqueta="Resultados"
      pestanas={[
        { id: 'metricas', texto: 'Métricas' },
        { id: 'graficas', texto: 'Gráficas' },
      ]}
      elegida="graficas"
      alElegir={() => {}}
      prefijo="resultados"
    />,
  )

  it('la activa lleva aria-selected y su clase; la otra, no', () => {
    expect(html).toMatch(/aria-selected="true"[^>]*class="pestana pestana--activa"[^>]*>Gráficas/)
    expect(html).toMatch(/aria-selected="false"[^>]*class="pestana"[^>]*>Métricas/)
  })

  it('se rellenan con el azul de la marca, con texto blanco y en negrita, sin subrayado', () => {
    for (const selector of ['.pestana--activa', '.pestana--activa:hover']) {
      const regla = reglaDe(selector)
      expect(regla, selector).toContain('background: var(--marca-azul)')
      expect(regla, selector).toContain('color: var(--marca-azul-texto)')
      expect(regla, selector).toMatch(/font-weight:\s*700/)
      expect(regla, selector).not.toMatch(/border-bottom-color/)
    }
  })
})

describe('las opciones elegidas de un grupo de botones', () => {
  const html = renderToStaticMarkup(
    <GrupoDeBotones
      etiqueta="Placas"
      opciones={[
        { valor: 5, texto: '5' },
        { valor: 6, texto: '6' },
      ]}
      valor={6}
      alElegir={() => {}}
    />,
  )

  it('la elegida lleva aria-checked y su clase; la otra, no', () => {
    expect(html).toMatch(/aria-checked="true"[^>]*class="opcion opcion--elegida"[^>]*>6/)
    expect(html).toMatch(/aria-checked="false"[^>]*class="opcion"[^>]*>5/)
  })

  it('se rellenan con el azul de la marca, con texto blanco y en negrita (y conservan la marca «✓»)', () => {
    for (const selector of ['.opcion--elegida', '.opcion--elegida:hover']) {
      const regla = reglaDe(selector)
      expect(regla, selector).toContain('background: var(--marca-azul)')
      expect(regla, selector).toContain('border-color: var(--marca-azul)')
      expect(regla, selector).toContain('color: var(--marca-azul-texto)')
      expect(regla, selector).toMatch(/font-weight:\s*700/)
    }
    expect(reglaDe('.opcion--elegida::before')).toContain("content: '✓ '")
  })
})

describe('el modo elegido de la barra superior', () => {
  it('se rellena con el azul de la marca también al pasar el mouse (que el gris de «pasar el mouse» no lo pise)', () => {
    for (const selector of ['.modo--elegido', '.modo--elegido:hover', '.modo--elegido:hover:not(:disabled)']) {
      const regla = reglaDe(selector)
      expect(regla, selector).toContain('background: var(--marca-azul)')
      expect(regla, selector).toContain('color: var(--marca-azul-texto)')
    }
  })
})

describe('el azul de la marca', () => {
  it('solo se usa en lo seleccionado y activo de interfaz.css', () => {
    const usos = css
      .split('\n')
      .flatMap((linea, i) => (linea.includes('--marca-azul') && !linea.includes('--marca-azul-marino') ? [i + 1] : []))
    expect(usos.length).toBeGreaterThanOrEqual(6)
    // Ninguna otra hoja lo toca: no es color de etapas, planes ni avisos.
    const otras = hojasDeLaAplicacion().filter((hoja) => !hoja.nombre.endsWith('interfaz.css'))
    for (const hoja of otras) {
      expect(hoja.css, hoja.nombre).not.toMatch(/var\(--marca-azul(?:-texto)?\)/)
    }
  })
})
