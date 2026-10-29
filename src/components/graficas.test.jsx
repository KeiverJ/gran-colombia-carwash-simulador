import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useSimulacion } from '../store/simulacion.js'
import MarcoDeGrafica, { TablaDeLosDatos } from './MarcoDeGrafica.jsx'
import PestanaDeGraficas from './PestanaDeGraficas.jsx'

const estado = () => useSimulacion.getState()
const inicial = useSimulacion.getState()

beforeEach(() => {
  useSimulacion.setState({ ...inicial })
  estado().cambiarSemilla(1)
  estado().pausar()
  estado().cambiarVelocidad(1)
})

const TABLA = { columnas: ['Tramo', 'Minutos'], filas: [['Lavado', '10,00']], nota: null }

describe('el marco común de las gráficas', () => {
  it('sin datos muestra el título y una sola línea, sin dibujo ni tabla', () => {
    const html = renderToStaticMarkup(
      <MarcoDeGrafica
        titulo="Mi gráfica"
        vacia
        mensajeVacio="Los datos aparecerán cuando la simulación avance."
        descripcion="describe"
        tabla={() => TABLA}
      >
        <svg />
      </MarcoDeGrafica>,
    )
    expect(html).toContain('Mi gráfica')
    expect(html).toContain('Los datos aparecerán cuando la simulación avance.')
    expect(html.match(/<p /g)).toHaveLength(1)
    expect(html).not.toContain('role="img"')
    expect(html).not.toContain('<svg')
    expect(html).not.toContain('<details')
  })

  it('con datos la descripción llega al aria-label del dibujo', () => {
    const html = renderToStaticMarkup(
      <MarcoDeGrafica titulo="Mi gráfica" vacia={false} mensajeVacio="" descripcion="Ocupación de la placa 1: 80 %">
        <svg />
      </MarcoDeGrafica>,
    )
    expect(html).toContain('role="img"')
    expect(html).toContain('aria-label="Ocupación de la placa 1: 80 %"')
  })

  it('las notas se escriben bajo el dibujo', () => {
    const html = renderToStaticMarkup(
      <MarcoDeGrafica titulo="T" vacia={false} mensajeVacio="" descripcion="d" notas={['Una nota.']}>
        <svg />
      </MarcoDeGrafica>,
    )
    expect(html).toContain('Una nota.')
  })

  it('la tabla no se arma mientras está cerrada', () => {
    const tabla = vi.fn(() => TABLA)
    const html = renderToStaticMarkup(
      <MarcoDeGrafica titulo="T" vacia={false} mensajeVacio="" descripcion="d" tabla={tabla}>
        <svg />
      </MarcoDeGrafica>,
    )
    expect(html).toContain('Ver los datos como tabla')
    expect(html).not.toContain('<table')
    expect(tabla).not.toHaveBeenCalled()
  })

  it('abierta, arma la tabla con los mismos números', () => {
    const tabla = vi.fn(() => TABLA)
    const html = renderToStaticMarkup(<TablaDeLosDatos tabla={tabla} abiertaDeEntrada />)
    expect(tabla).toHaveBeenCalledTimes(1)
    expect(html).toContain('<table')
    expect(html).toContain('Lavado')
    expect(html).toContain('10,00')
  })
})

describe('la pestaña Gráficas', () => {
  it('antes de simular muestra los títulos de las tres gráficas con su línea de «sin datos»', () => {
    const html = renderToStaticMarkup(<PestanaDeGraficas />)
    for (const titulo of ['Las dos filas en el tiempo', 'Ocupación de cada servidor', 'En qué se va el tiempo promedio']) {
      expect(html).toContain(titulo)
    }
    expect(html).not.toContain('Tiempo de cada moto en el lavadero')
    expect(html.match(/Los datos aparecerán cuando la simulación avance\./g)).toHaveLength(3)
    expect(html).not.toContain('role="img"')
  })

  it('con datos cada gráfica trae su descripción de texto', () => {
    estado().empezarCorridaLarga(100, { camaraRapida: false })
    while (estado().avanzarCorridaLarga()) {
      /* avanzando */
    }
    const html = renderToStaticMarkup(<PestanaDeGraficas />)
    expect(html.match(/role="img"/g)).toHaveLength(3)
    expect(html).toContain('Barras horizontales con el porcentaje del tiempo que estuvo ocupada cada placa')
    expect(html).toContain('Barra apilada con en qué se va el tiempo promedio')
    expect(html).toContain('Gráfica de líneas con las motos esperando')
    expect(html).not.toContain('<table')
  })

  it('en la visita aparece también la gráfica de las motos', () => {
    estado().entrarEnLaVisita()
    const html = renderToStaticMarkup(<PestanaDeGraficas />)
    expect(html).toContain('Tiempo de cada moto en el lavadero')
    expect(html).toContain('Aparecerá cuando salga la primera moto.')
  })
})
