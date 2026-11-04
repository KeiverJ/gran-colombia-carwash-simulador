import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { reiniciarElStoreDeExperimentos, useExperimentos } from '../store/experimentos.js'
import { useInterfaz } from '../store/interfaz.js'
import { MOTIVO_SIN_EXPERIMENTOS } from '../store/presentacionDeExperimentos.js'
import { MODO_VISITA, useSimulacion } from '../store/simulacion.js'
import { modoDeDibujo } from '../scene/dibujo.js'
import BarraLateral from './BarraLateral.jsx'
import BarraSuperior from './BarraSuperior.jsx'
import VistaDeExperimentos from './VistaDeExperimentos.jsx'

const copias = new Map([useInterfaz, useExperimentos, useSimulacion].map((s) => [s, { ...s.getInitialState() }]))

/** Pinta con el estado de ahora: `renderToStaticMarkup` lee el inicial, así que se le presta el actual. */
function pintar(elemento) {
  for (const almacen of copias.keys()) Object.assign(almacen.getInitialState(), almacen.getState())
  try {
    return renderToStaticMarkup(elemento)
  } finally {
    for (const [almacen, copia] of copias) Object.assign(almacen.getInitialState(), copia)
  }
}

const etiqueta = (html, patron) => (html.match(/<button\b[^>]*>/g) ?? []).find((b) => patron.test(b))

beforeEach(() => {
  reiniciarElStoreDeExperimentos()
  useInterfaz.setState({ experimentosAbierto: false, enLaVisita: false, ancho: 1440 })
  useSimulacion.getState().restablecerValores()
})

afterEach(() => {
  reiniciarElStoreDeExperimentos()
  useInterfaz.setState({ experimentosAbierto: false, enLaVisita: false })
})

describe('el ícono de la barra lateral', () => {
  it('está debajo de Resultados, con nombre, tooltip y aria-pressed', () => {
    const html = pintar(<BarraLateral />)
    const orden = ['Ajustes', 'Resultados', 'Experimentos', 'Ayuda'].map((n) => html.indexOf(`aria-label="${n}"`))
    expect(orden.every((i) => i >= 0)).toBe(true)
    expect([...orden].sort((a, b) => a - b)).toEqual(orden)
    const boton = etiqueta(html, /aria-label="Experimentos"/)
    expect(boton).toContain('data-nombre="Experimentos"')
    expect(boton).toContain('aria-pressed="false"')
    expect(boton).toContain('aria-controls="vista-de-experimentos"')
    expect(boton).not.toContain('aria-disabled')
  })

  it('se ve activo con la vista abierta', () => {
    useInterfaz.setState({ experimentosAbierto: true })
    const boton = etiqueta(pintar(<BarraLateral />), /aria-label="Experimentos"/)
    expect(boton).toContain('aria-pressed="true"')
    expect(boton).toContain('boton-lateral--activo')
  })

  it('en la visita está desactivado y dice el motivo en el tooltip y para los lectores', () => {
    useSimulacion.setState({ modo: MODO_VISITA })
    const html = pintar(<BarraLateral />)
    const boton = etiqueta(html, /aria-label="Experimentos"/)
    expect(boton).toContain('aria-disabled="true"')
    expect(boton).toContain('boton-lateral--desactivado')
    expect(boton).toContain(`data-nombre="Experimentos: ${MOTIVO_SIN_EXPERIMENTOS}"`)
    expect(boton).toContain('aria-describedby="descripcion-experimentos"')
    expect(html).toContain(`id="descripcion-experimentos" class="solo-lectores">Experimentos ${MOTIVO_SIN_EXPERIMENTOS}.`)
    useSimulacion.setState({ modo: 'aleatorio' })
  })

  it('con un lote corriendo y la vista cerrada, el tooltip lo dice', () => {
    useExperimentos.setState({ estado: 'corriendo', avance: { hechas: 4, pedidas: 10, horasHechas: 40, horasPedidas: 100, tiempoRestanteMs: null } })
    const html = pintar(<BarraLateral />)
    expect(etiqueta(html, /aria-label="Experimentos"/)).toContain('data-nombre="Experimentos · corriendo, 40 %."')
    expect(html).toContain('Hay un experimento corriendo en segundo plano: 40 %.')
  })

  it('con la vista abierta no repite el aviso del lote (ya se ve)', () => {
    useExperimentos.setState({ estado: 'corriendo' })
    useInterfaz.setState({ experimentosAbierto: true })
    expect(pintar(<BarraLateral />)).not.toContain('experimento corriendo')
  })
})

describe('el botón de la barra de arriba (celular)', () => {
  it('es de solo celular, con nombre y aria-pressed', () => {
    const boton = etiqueta(pintar(<BarraSuperior />), /aria-label="Experimentos"/)
    expect(boton).toContain('solo-celular')
    expect(boton).toContain('aria-pressed="false"')
  })

  it('en la visita está desactivado y dice por qué', () => {
    useSimulacion.setState({ modo: MODO_VISITA })
    const html = pintar(<BarraSuperior />)
    expect(etiqueta(html, /aria-label="Experimentos"/)).toContain('aria-disabled="true"')
    expect(html).toContain(`Experimentos ${MOTIVO_SIN_EXPERIMENTOS}.`)
    useSimulacion.setState({ modo: 'aleatorio' })
  })
})

describe('la vista', () => {
  it('cerrada no se dibuja', () => {
    expect(pintar(<VistaDeExperimentos />)).toBe('')
  })

  it('abierta tiene título, botón Cerrar y el contenido, y la configuración va antes que los resultados', () => {
    useInterfaz.setState({ experimentosAbierto: true })
    const html = pintar(<VistaDeExperimentos />)
    expect(html).toContain('id="vista-de-experimentos"')
    expect(html).toContain('aria-labelledby="titulo-de-experimentos"')
    expect(html).toContain('<h2 id="titulo-de-experimentos"')
    expect(html).toContain('tabindex="-1"')
    expect(html).toMatch(/<button[^>]*>.*Cerrar<\/span><\/button>/)
    expect(html.indexOf('aria-label="Qué experimento correr"')).toBeLessThan(html.indexOf('aria-label="Resultados del experimento"'))
    expect(html).toContain('experimentos-vista--visible')
  })
})

describe('la escena no se dibuja con la vista abierta', () => {
  it('el lienzo pasa a «never» con la vista abierta y vuelve a «always» al cerrarla', () => {
    expect(modoDeDibujo(true)).toBe('never')
    expect(modoDeDibujo(false)).toBe('always')
  })
})
