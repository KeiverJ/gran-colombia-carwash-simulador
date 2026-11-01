import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it } from 'vitest'

import { useSimulacion } from '../store/simulacion.js'
import BarraSuperior from './BarraSuperior.jsx'
import { ContenidoDeAjustes } from './CapaDeAjustes.jsx'

const estado = () => useSimulacion.getState()
const inicial = useSimulacion.getState()
const copiaDelInicial = { ...useSimulacion.getInitialState() }

/**
 * Pinta con el estado de ahora. `renderToStaticMarkup` lee el estado *inicial*
 * del store (el de servidor), así que se le presta el actual solo mientras se pinta.
 */
function pintar(elemento) {
  const prestado = useSimulacion.getInitialState()
  Object.assign(prestado, estado())
  try {
    return renderToStaticMarkup(elemento)
  } finally {
    Object.assign(prestado, copiaDelInicial)
  }
}

beforeEach(() => {
  useSimulacion.setState({ ...inicial })
  estado().cambiarSemilla(1)
})

/** La etiqueta `<button>` con ese nombre accesible. */
function boton(html, nombre) {
  const etiqueta = (html.match(/<button\b[^>]*>/g) ?? []).find((b) => b.includes(`aria-label="${nombre}"`))
  expect(etiqueta, `no hay un botón «${nombre}»`).toBeDefined()
  return etiqueta
}

const estaDesactivado = (etiqueta) => /\bdisabled(=|\s|>)/.test(etiqueta)
const ajustes = () => pintar(<ContenidoDeAjustes />)

describe('placas y puestos son un campo con − y +, no botones fijos', () => {
  it('ya no hay un grupo de opciones fijas para placas ni puestos', () => {
    const html = ajustes()
    expect(html).not.toContain('aria-label="Placas de lavado"')
    expect(html).not.toContain('aria-label="Puestos de acabado"')
    expect(html).toContain('>Placas</label>')
    expect(html).toContain('>Puestos</label>')
  })

  it('con 6 placas y 3 puestos los cuatro botones están activos', () => {
    const html = ajustes()
    for (const nombre of ['Una placa menos', 'Una placa más', 'Un puesto menos', 'Un puesto más']) {
      expect(estaDesactivado(boton(html, nombre)), nombre).toBe(false)
    }
  })

  it('con 1 placa, − está desactivado; con 14, + lo está', () => {
    estado().cambiarParametro('placas', 1)
    let html = ajustes()
    expect(estaDesactivado(boton(html, 'Una placa menos'))).toBe(true)
    expect(estaDesactivado(boton(html, 'Una placa más'))).toBe(false)

    estado().cambiarParametro('placas', 14)
    html = ajustes()
    expect(estaDesactivado(boton(html, 'Una placa más'))).toBe(true)
    expect(estaDesactivado(boton(html, 'Una placa menos'))).toBe(false)
  })

  it('con 1 puesto, − está desactivado; con 7, + lo está', () => {
    estado().cambiarParametro('puestos', 1)
    let html = ajustes()
    expect(estaDesactivado(boton(html, 'Un puesto menos'))).toBe(true)
    expect(estaDesactivado(boton(html, 'Un puesto más'))).toBe(false)

    estado().cambiarParametro('puestos', 7)
    html = ajustes()
    expect(estaDesactivado(boton(html, 'Un puesto más'))).toBe(true)
    expect(estaDesactivado(boton(html, 'Un puesto menos'))).toBe(false)
  })

  it('el campo muestra el número de placas y el de puestos', () => {
    estado().cambiarParametro('placas', 9)
    estado().cambiarParametro('puestos', 4)
    const html = ajustes()
    expect(html).toMatch(/inputMode="numeric"[^>]*value="9"/)
    expect(html).toMatch(/inputMode="numeric"[^>]*value="4"/)
  })

  it('los botones no llevan deslizador (placas y puestos se ajustan de a uno)', () => {
    const html = ajustes()
    expect(html).not.toContain('Placas de lavado, deslizador')
    expect(html).not.toContain('Puestos de acabado, deslizador')
  })
})

describe('el deslizador de la velocidad', () => {
  it('va de 0,25 a 120 minutos por segundo', () => {
    const html = pintar(<BarraSuperior />)
    const deslizador = html.match(/<input[^>]*type="range"[^>]*>/)[0]
    expect(deslizador).toContain('min="0.25"')
    expect(deslizador).toContain('max="120"')
  })
})
