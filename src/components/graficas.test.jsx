import { readFileSync } from 'node:fs'
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
  it('sin datos y sin ilustración muestra el título y una sola línea, sin dibujo ni tabla', () => {
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

  it.each(['lineas', 'barras', 'moto'])(
    'sin datos y con la ilustración «%s» muestra el título, el dibujo oculto para las ayudas técnicas y el mensaje',
    (ilustracion) => {
      const html = renderToStaticMarkup(
        <MarcoDeGrafica
          titulo="Mi gráfica"
          vacia
          mensajeVacio="Los datos aparecerán cuando la simulación avance."
          ilustracion={ilustracion}
          descripcion="describe"
          tabla={() => TABLA}
        >
          <svg />
        </MarcoDeGrafica>,
      )
      expect(html).toContain('Mi gráfica')
      expect(html.match(/<svg/g)).toHaveLength(1)
      expect(html).toMatch(/<svg[^>]*class="ilustracion"[^>]*aria-hidden="true"|<svg[^>]*aria-hidden="true"[^>]*class="ilustracion"/)
      expect(html).toContain('Los datos aparecerán cuando la simulación avance.')
      expect(html.match(/<p /g)).toHaveLength(1)
      expect(html).not.toContain('role="img"')
      expect(html).not.toContain('<details')
    },
  )

  it('las ilustraciones no llevan degradados ni colores escritos: toman los del tema por clases', () => {
    const fuente = readFileSync('src/components/IlustracionesDeGraficas.jsx', 'utf8')
    expect(fuente).not.toMatch(/Gradient|#[0-9a-fA-F]{3,8}|rgba?\(/)
    expect(fuente).not.toMatch(/(?:fill|stroke)="(?!none")/)
  })

  it('con datos no hay ilustración, aunque se pida', () => {
    const html = renderToStaticMarkup(
      <MarcoDeGrafica titulo="Mi gráfica" vacia={false} mensajeVacio="" ilustracion="barras" descripcion="d">
        <svg />
      </MarcoDeGrafica>,
    )
    expect(html).not.toContain('class="ilustracion"')
    expect(html).not.toContain('grafica-vacia')
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
    // cada gráfica vacía lleva su ilustración oculta: líneas, barras y barras
    expect(html.match(/<svg[^>]*class="ilustracion"[^>]*aria-hidden="true"|<svg[^>]*aria-hidden="true"[^>]*class="ilustracion"/g)).toHaveLength(3)
  })

  it('con datos las ilustraciones desaparecen, y al reiniciar vuelven', () => {
    estado().empezarCorridaLarga(100, { camaraRapida: false })
    while (estado().avanzarCorridaLarga()) {
      /* avanzando */
    }
    const conDatos = renderToStaticMarkup(<PestanaDeGraficas />)
    expect(conDatos).not.toContain('class="ilustracion"')
    expect(conDatos).not.toContain('grafica-vacia')
    estado().reiniciar()
    const reiniciada = renderToStaticMarkup(<PestanaDeGraficas />)
    expect(reiniciada.match(/class="ilustracion"/g)).toHaveLength(3)
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
