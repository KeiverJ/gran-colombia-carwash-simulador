import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it } from 'vitest'

import { useSimulacion } from '../store/simulacion.js'
import { ContenidoDeMetricas } from './TablaDeMetricas.jsx'

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

const NOTA = 'lo simulado incluye'
const metricas = () => pintar(<ContenidoDeMetricas enPanel />)

beforeEach(() => {
  useSimulacion.setState({ ...inicial })
  estado().cambiarSemilla(1)
})

describe('la nota de que lo simulado incluye periodos con otro número de servidores', () => {
  it('sin cierres no aparece', () => {
    expect(metricas()).not.toContain(NOTA)
  })

  it('después de cerrar un servidor aparece', () => {
    expect(estado().cerrarServidor('lavado', 0).aplicado).toBe(true)
    expect(metricas()).toContain(NOTA)
  })

  it('sigue después de reabrir el servidor: lo simulado ya cubrió ese periodo', () => {
    estado().cerrarServidor('acabado', 1)
    estado().abrirServidor('acabado', 1)
    expect(metricas()).toContain(NOTA)
  })

  it('desaparece al reiniciar', () => {
    estado().cerrarServidor('lavado', 0)
    expect(metricas()).toContain(NOTA)
    estado().reiniciar()
    expect(metricas()).not.toContain(NOTA)
  })

  it('un cierre rechazado (el último activo) no la muestra', () => {
    estado().cambiarParametro('placas', 1)
    expect(estado().cerrarServidor('lavado', 0).aplicado).toBe(false)
    expect(metricas()).not.toContain(NOTA)
  })

  it('la columna calculada usa los activos: cerrar una placa sube el ρ₁ que se ve', () => {
    const antes = metricas()
    estado().cerrarServidor('lavado', 0)
    expect(metricas()).not.toBe(antes)
    // 6 placas → ρ₁ = 0,4234; con 5 activas → 0,5081
    expect(antes).toContain('>0,4234<')
    expect(metricas()).toContain('>0,5081<')
  })
})
