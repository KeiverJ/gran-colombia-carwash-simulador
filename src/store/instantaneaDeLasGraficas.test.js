import { beforeEach, describe, expect, it } from 'vitest'

import {
  MENSAJE_SIN_DATOS,
  MENSAJE_SIN_MOTOS_QUE_SALIERON,
  modelosDeLasGraficas,
  tomarLaInstantanea,
} from './instantaneaDeLasGraficas.js'
import { useSimulacion } from './simulacion.js'

const estado = () => useSimulacion.getState()
const inicial = useSimulacion.getState()
const modelos = () => modelosDeLasGraficas(tomarLaInstantanea(estado()))
const porId = (lista, id) => lista.find((modelo) => modelo.id === id)

beforeEach(() => {
  useSimulacion.setState({ ...inicial })
  estado().cambiarSemilla(1)
  estado().pausar()
  estado().cambiarVelocidad(1)
})

const correrMil = () => {
  estado().empezarCorridaLarga(1000, { camaraRapida: false })
  while (estado().avanzarCorridaLarga()) {
    /* avanzando */
  }
}

describe('los modelos de las gráficas en el modo Simulación', () => {
  it('son tres, en este orden, y la de las motos de la visita no existe', () => {
    expect(modelos().map((modelo) => modelo.id)).toEqual(['filas', 'ocupacion', 'desglose'])
  })

  it('antes de simular todas están vacías y dicen qué falta', () => {
    for (const modelo of modelos()) {
      expect(modelo.vacia, modelo.id).toBe(true)
      expect(modelo.mensajeVacio).toBe(MENSAJE_SIN_DATOS)
    }
  })

  it('tras una corrida larga con 3 puestos hay datos en las tres, con título y descripción', () => {
    correrMil()
    for (const modelo of modelos()) {
      expect(modelo.vacia, modelo.id).toBe(false)
      expect(modelo.titulo.length).toBeGreaterThan(0)
      expect(modelo.descripcion.length).toBeGreaterThan(20)
      expect(modelo.tabla().filas.length).toBeGreaterThan(0)
    }
    const ocupacion = porId(modelos(), 'ocupacion')
    expect(ocupacion.etapas[0].servidores).toHaveLength(6)
    expect(ocupacion.etapas[1].servidores).toHaveLength(3)
    // Sin ninguna nota de «estimado» en la simulación.
    expect(ocupacion.nota).toBeNull()
  })

  it('el promedio de cada bloque de ocupación es el ρ de la tabla de Métricas', () => {
    correrMil()
    const { metricas } = estado()
    const ocupacion = porId(modelos(), 'ocupacion')
    expect(ocupacion.etapas[0].promedio).toBeCloseTo(metricas.lavado.rho, 9)
    expect(ocupacion.etapas[1].promedio).toBeCloseTo(metricas.acabado.rho, 9)
  })

  it('con 5 puestos el bloque del acabado tiene cinco barras y hay barra de fórmulas', () => {
    estado().elegirEscenario('cinco-puestos')
    correrMil()
    expect(porId(modelos(), 'ocupacion').etapas[1].servidores).toHaveLength(5)
    expect(porId(modelos(), 'desglose').barras.map((barra) => barra.id)).toEqual(['simulado', 'formulas'])
  })

  it('con 3 puestos solo hay barra «Simulado», con la nota del acabado', () => {
    correrMil()
    const desglose = porId(modelos(), 'desglose')
    expect(desglose.barras.map((barra) => barra.id)).toEqual(['simulado'])
    expect(desglose.notas.join(' ')).toContain('el acabado')
  })

  it('la tabla de las dos filas tras 1000 horas no pasa de unas decenas de filas', () => {
    correrMil()
    const { filas } = porId(modelos(), 'filas').tabla()
    expect(filas.length).toBeLessThanOrEqual(30)
    // La primera marca de la corrida larga es la de las 5 h; la última, la de las 1000 h.
    expect(filas[0][0]).toBe('5,0')
    expect(filas.at(-1)[0]).toBe('1.000,0')
  })

  it('al reiniciar todas vuelven a estar vacías', () => {
    correrMil()
    estado().reiniciar()
    for (const modelo of modelos()) {
      expect(modelo.vacia, modelo.id).toBe(true)
    }
  })

  it('con el mismo estado da la misma descripción', () => {
    correrMil()
    expect(modelos().map((modelo) => modelo.descripcion)).toEqual(
      modelos().map((modelo) => modelo.descripcion),
    )
  })
})

describe('los modelos de las gráficas en el modo visita', () => {
  const correrLaVisita = () => {
    estado().entrarEnLaVisita()
    estado().cambiarVelocidad(60)
    estado().iniciar()
    for (let i = 0; i < 2000 && estado().corriendo; i += 1) {
      estado().avanzarCuadro(100)
    }
  }

  it('son cuatro, con la de las motos al final', () => {
    estado().entrarEnLaVisita()
    expect(modelos().map((modelo) => modelo.id)).toEqual(['filas', 'ocupacion', 'desglose', 'motos'])
  })

  it('a las 3:10 p. m. la de las motos dice que aparecerá cuando salga la primera', () => {
    estado().entrarEnLaVisita()
    const motos = porId(modelos(), 'motos')
    expect(motos.vacia).toBe(true)
    expect(motos.mensajeVacio).toBe(MENSAJE_SIN_MOTOS_QUE_SALIERON)
  })

  it('al terminar hay 23 motos que suman 716 min, promedio 31,13, y solo la 5 y la 16 sin puesto', () => {
    correrLaVisita()
    expect(estado().visita.terminada).toBe(true)
    const motos = porId(modelos(), 'motos')
    expect(motos.motos).toHaveLength(23)
    expect(motos.sumaMin).toBe(716)
    expect(motos.promedio).toBeCloseTo(31.13, 2)
    expect(motos.motos.filter((moto) => moto.sinPuesto).map((moto) => moto.n)).toEqual([5, 16])
  })

  it('al terminar la ocupación lleva la nota de los puestos aproximados y el desglose suma 31,13', () => {
    correrLaVisita()
    const ocupacion = porId(modelos(), 'ocupacion')
    expect(ocupacion.nota).toContain('aproximados')
    const desglose = porId(modelos(), 'desglose')
    expect(desglose.barras).toHaveLength(1)
    expect(desglose.barras[0].total).toBeCloseTo(31.13, 2)
  })

  it('al volver al modo Simulación empiezan vacías y sin la de las motos', () => {
    correrLaVisita()
    estado().volverAlModoNormal()
    const lista = modelos()
    expect(lista.map((modelo) => modelo.id)).toEqual(['filas', 'ocupacion', 'desglose'])
    expect(lista.every((modelo) => modelo.vacia)).toBe(true)
  })
})
