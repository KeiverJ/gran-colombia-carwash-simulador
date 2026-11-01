import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it } from 'vitest'

import { ContenidoDeMetricas } from '../components/TablaDeMetricas.jsx'
import { useSimulacion } from './simulacion.js'

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

describe('las horas de la corrida larga, en el store', () => {
  it('por defecto son 1000', () => {
    expect(estado().horasDeLaCorridaLarga).toBe(1000)
  })

  it('se pueden elegir 100, 1000 y 5000', () => {
    for (const horas of [100, 5000, 1000]) {
      expect(estado().cambiarHorasDeLaCorridaLarga(horas)).toBe(true)
      expect(estado().horasDeLaCorridaLarga).toBe(horas)
    }
  })

  it('cualquier otro valor se rechaza y deja lo que había', () => {
    estado().cambiarHorasDeLaCorridaLarga(5000)
    for (const malo of [0, -100, 99, 500, 1001, 10000, 1e9, NaN, Infinity, '1000', null, undefined, {}, [100]]) {
      expect(estado().cambiarHorasDeLaCorridaLarga(malo), String(malo)).toBe(false)
    }
    expect(estado().horasDeLaCorridaLarga).toBe(5000)
  })

  it('cambiarlas no reinicia la simulación', () => {
    estado().cambiarVelocidad(10)
    estado().iniciar()
    estado().avanzarCuadro(1000)
    const reloj = estado().foto.relojMin
    const generacion = estado().generacion
    estado().cambiarHorasDeLaCorridaLarga(100)
    expect(estado().foto.relojMin).toBe(reloj)
    expect(estado().generacion).toBe(generacion)
  })

  it('empezar la corrida larga usa las horas elegidas', () => {
    estado().cambiarHorasDeLaCorridaLarga(100)
    estado().empezarCorridaLarga()
    expect(estado().corridaLarga.horasTotales).toBe(100)
    expect(estado().aviso).toContain('100 horas')
  })

  it('con 5000 elegidas simula 5000', () => {
    estado().cambiarHorasDeLaCorridaLarga(5000)
    estado().empezarCorridaLarga()
    expect(estado().corridaLarga.horasTotales).toBe(5000)
    expect(estado().aviso).toContain('5000 horas')
  })

  it('pedir a mano un valor que no es de los tres no arranca nada', () => {
    for (const malo of [5, 99, 1001, 100000, NaN, Infinity, -1, '100']) {
      estado().empezarCorridaLarga(malo)
      expect(estado().corridaLarga, String(malo)).toBeNull()
    }
  })

  it('no se cambian mientras hay una corrida larga en marcha', () => {
    estado().empezarCorridaLarga(100)
    expect(estado().cambiarHorasDeLaCorridaLarga(5000)).toBe(false)
    expect(estado().horasDeLaCorridaLarga).toBe(1000)
  })

  it('reiniciar o restablecer no cambia la elección', () => {
    estado().cambiarHorasDeLaCorridaLarga(100)
    estado().reiniciar()
    expect(estado().horasDeLaCorridaLarga).toBe(100)
  })
})

describe('el selector de horas en la pestaña Métricas', () => {
  const metricas = () => pintar(<ContenidoDeMetricas enPanel />)

  it('ofrece las tres opciones y marca la elegida', () => {
    const html = metricas()
    expect(html).toContain('aria-label="Horas que simula la corrida larga"')
    expect(html).toMatch(/aria-checked="false"[^>]*>100 h</)
    expect(html).toMatch(/aria-checked="true"[^>]*>1\.000 h</)
    expect(html).toMatch(/aria-checked="false"[^>]*>5\.000 h</)
  })

  it('la línea bajo el botón dice las horas elegidas', () => {
    expect(metricas()).toContain('Simula 1.000 horas seguidas')
    estado().cambiarHorasDeLaCorridaLarga(5000)
    expect(metricas()).toContain('Simula 5.000 horas seguidas')
    estado().cambiarHorasDeLaCorridaLarga(100)
    expect(metricas()).toContain('Simula 100 horas seguidas')
  })

  it('durante la corrida larga el selector va desactivado', () => {
    expect(metricas()).not.toMatch(/<fieldset[^>]*disabled/)
    estado().empezarCorridaLarga(100)
    expect(metricas()).toMatch(/<fieldset[^>]*disabled/)
  })
})
