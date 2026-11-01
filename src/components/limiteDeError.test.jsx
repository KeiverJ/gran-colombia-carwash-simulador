import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import EscenaDelLavadero from '../scene/EscenaDelLavadero.jsx'
import { MENSAJE_DE_FALLO, useSimulacion } from '../store/simulacion.js'
import AvisoDeFallo from './AvisoDeFallo.jsx'
import AvisoDeLaEscenaCaida from './AvisoDeLaEscenaCaida.jsx'
import LimiteDeError from './LimiteDeError.jsx'
import LimiteDeLaAplicacion from './LimiteDeLaAplicacion.jsx'
import ZonaDeEscena from './ZonaDeEscena.jsx'

/**
 * Sin un DOM no se puede montar un componente y hacer que un hijo lance: aquí se
 * prueba la clase por dentro (lo que React llama al atrapar un error) y cómo se
 * arma el árbol. Que atrape de verdad lo que lanza un hijo dibujando se comprobó en el
 * navegador (ver el informe del cambio).
 */
const estado = () => useSimulacion.getState()
const inicial = useSimulacion.getState()
const copiaDelInicial = { ...useSimulacion.getInitialState() }

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
  estado().reiniciar()
})

/** Una instancia sin montar, con un `setState` que solo cambia el estado a mano. */
function instanciaDe(props) {
  const instancia = new LimiteDeError(props)
  instancia.setState = (cambio) => {
    instancia.state = { ...instancia.state, ...cambio }
  }
  return instancia
}

describe('el límite de error', () => {
  it('guarda el error que atrapa', () => {
    const error = new Error('se rompió')
    expect(LimiteDeError.getDerivedStateFromError(error)).toEqual({ error })
  })

  it('sin error muestra lo que envuelve', () => {
    const instancia = instanciaDe({ children: 'hijo', fallback: () => 'aviso' })
    expect(instancia.render()).toBe('hijo')
  })

  it('con un error muestra el aviso en su lugar y le da cómo reintentar', () => {
    const fallback = vi.fn(() => 'aviso')
    const instancia = instanciaDe({ children: 'hijo', fallback })
    instancia.state = LimiteDeError.getDerivedStateFromError(new Error('x'))
    expect(instancia.render()).toBe('aviso')
    const { error, reintentar } = fallback.mock.calls[0][0]
    expect(error.message).toBe('x')

    reintentar()
    expect(instancia.render()).toBe('hijo')
  })

  it('avisa una vez de cada fallo, para anotarlo', () => {
    const alFallar = vi.fn()
    const instancia = instanciaDe({ children: null, fallback: () => null, alFallar })
    const error = new Error('x')
    instancia.componentDidCatch(error)
    expect(alFallar).toHaveBeenCalledTimes(1)
    expect(alFallar).toHaveBeenCalledWith(error)
  })

  it('sin `alFallar` no pasa nada', () => {
    const instancia = instanciaDe({ children: null, fallback: () => null })
    expect(() => instancia.componentDidCatch(new Error('x'))).not.toThrow()
  })
})

describe('dónde están puestos los límites', () => {
  /** Recorre un árbol de elementos buscando uno por su tipo. */
  const buscar = (elemento, tipo) => {
    if (!elemento || typeof elemento !== 'object') return null
    if (Array.isArray(elemento)) return elemento.map((hijo) => buscar(hijo, tipo)).find(Boolean) ?? null
    if (elemento.type === tipo) return elemento
    return buscar(elemento.props?.children, tipo)
  }

  it('la escena va dentro de un límite, y el resto de la zona queda fuera', () => {
    const zona = ZonaDeEscena()
    const limite = buscar(zona, LimiteDeError)
    expect(limite).not.toBeNull()
    expect(buscar(limite.props.children, EscenaDelLavadero)).not.toBeNull()
    expect(buscar(limite.props.children, AvisoDeFallo)).toBeNull()
    expect(buscar(zona, AvisoDeFallo)).not.toBeNull()
  })

  it('el aviso que ocupa el lugar de la escena es una alerta en español con su botón', () => {
    const zona = ZonaDeEscena()
    const limite = buscar(zona, LimiteDeError)
    const html = renderToStaticMarkup(limite.props.fallback({ reintentar: () => {} }))
    expect(html).toContain('role="alert"')
    expect(html).toContain('La vista en 3D se detuvo')
    expect(html).toContain('siguen funcionando')
    expect(html).toContain('Volver a dibujar')
  })

  it('la aplicación entera va dentro de otro límite, con un aviso para recargar', () => {
    const arbol = LimiteDeLaAplicacion({ children: 'la aplicación' })
    expect(arbol.type).toBe(LimiteDeError)
    expect(arbol.props.children).toBe('la aplicación')
    const html = renderToStaticMarkup(arbol.props.fallback({ error: new Error('x'), reintentar: () => {} }))
    expect(html).toContain('role="alert"')
    expect(html).toContain('Algo salió mal')
    expect(html).toContain('Recargar')
    expect(html).not.toContain('Error')
  })

  it('el aviso de la escena caída se puede pintar solo', () => {
    expect(renderToStaticMarkup(<AvisoDeLaEscenaCaida alReintentar={() => {}} />)).toContain('Volver a dibujar')
  })
})

describe('el aviso de que el motor falló', () => {
  it('sin fallo no pinta nada', () => {
    expect(pintar(<AvisoDeFallo />)).toBe('')
  })

  it('con fallo es una alerta en español, sin traza, con la salida a Reiniciar', () => {
    useSimulacion.setState({ fallo: { mensaje: MENSAJE_DE_FALLO, detalle: 'Error: algo en simulador.js:12' } })
    const html = pintar(<AvisoDeFallo />)
    expect(html).toContain('role="alert"')
    expect(html).toContain(MENSAJE_DE_FALLO)
    expect(html).toContain('>Reiniciar<')
    expect(html).not.toContain('simulador.js')
    expect(html).not.toContain('algo en')
  })

  it('desaparece al reiniciar', () => {
    useSimulacion.setState({ fallo: { mensaje: MENSAJE_DE_FALLO, detalle: 'x' } })
    estado().reiniciar()
    expect(pintar(<AvisoDeFallo />)).toBe('')
  })
})
