import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { CREDITOS_DE_MODELOS, LICENCIA_DE_LOS_MODELOS } from '../data/creditosDeModelos.js'
import { BOTONES_DE_VISTA } from '../scene/camara.js'
import { useInterfaz } from '../store/interfaz.js'
import { useSimulacion } from '../store/simulacion.js'
import { ContenidoDeLaAyuda } from './RecuadroDeAyuda.jsx'

const texto = () => renderToStaticMarkup(<ContenidoDeLaAyuda />)

describe('la sección «Créditos» de la Ayuda', () => {
  it('trae el título y la licencia con su enlace', () => {
    const html = texto()
    expect(html).toContain('Créditos')
    expect(html).toContain(LICENCIA_DE_LOS_MODELOS.nombre)
    expect(html).toContain(`href="${LICENCIA_DE_LOS_MODELOS.url}"`)
  })

  it('nombra a los seis modelos: título, autor y enlace de cada uno', () => {
    const html = texto()
    expect(CREDITOS_DE_MODELOS).toHaveLength(6)
    for (const { titulo, autor, url } of CREDITOS_DE_MODELOS) {
      expect(html, `${titulo} de ${autor}`).toContain(titulo)
      expect(html).toContain(autor.replace(/&/g, '&amp;'))
      expect(html).toContain(`href="${url}"`)
    }
  })

  it('los enlaces se abren en otra pestaña sin pasar el origen', () => {
    const html = texto()
    const enlaces = html.match(/<a [^>]*>/g) ?? []
    expect(enlaces.length).toBeGreaterThanOrEqual(7)
    for (const enlace of enlaces) {
      expect(enlace).toContain('target="_blank"')
      expect(enlace).toContain('rel="noopener noreferrer"')
    }
  })
})

describe('los planes en la Ayuda', () => {
  it('dice que cada moto lleva en el piso un aro con el color y el trazo de su plan', () => {
    expect(texto()).toContain('Cada moto lleva en el piso un aro con el color y el trazo de su plan.')
  })

  it('describe el trazo de cada plan y ya no habla de esfera, cubo ni cono', () => {
    const html = texto()
    expect(html).toContain('aro sólido')
    expect(html).toContain('aro en segmentos')
    expect(html).toContain('aro doble')
    for (const figura of ['esfera', 'cubo', 'cono', 'sobre la moto']) {
      expect(html, figura).not.toContain(figura)
    }
  })
})

describe('el resto de la Ayuda', () => {
  it('dice que la avenida de entrada es ilustrativa', () => {
    expect(texto()).toMatch(/ilustrativo/)
    expect(texto()).toContain('la visita no registró')
  })

  it('nombra los cuatro botones de cámara con sus nombres nuevos y ningún nombre viejo', () => {
    const html = texto()
    for (const { nombre } of BOTONES_DE_VISTA) {
      expect(html, nombre).toContain(`«${nombre}»`)
    }
    for (const viejo of ['Como en la foto', 'Desde arriba (plano)', 'Recentrar']) {
      expect(html).not.toContain(viejo)
    }
  })

  it('explica la fila de espera del lado derecho, no la del frente', () => {
    expect(texto()).toContain('lado derecho del local')
  })
})

describe('abrir y cerrar la Ayuda no toca la simulación', () => {
  it('la simulación sigue corriendo, con su reloj, su velocidad y su motor', () => {
    useSimulacion.getState().iniciar()
    const antes = useSimulacion.getState()
    useInterfaz.getState().abrirAyuda()
    expect(useInterfaz.getState().ayudaAbierta).toBe(true)
    useInterfaz.getState().cerrarAyuda()
    const despues = useSimulacion.getState()
    expect(useInterfaz.getState().ayudaAbierta).toBe(false)
    expect(despues.corriendo).toBe(true)
    expect(despues.motor).toBe(antes.motor)
    expect(despues.velocidadMinPorSegundo).toBe(antes.velocidadMinPorSegundo)
    expect(despues.foto).toBe(antes.foto)
    useSimulacion.getState().pausar()
  })
})
