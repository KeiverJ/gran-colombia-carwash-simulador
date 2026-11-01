import { beforeEach, describe, expect, it } from 'vitest'

import { PRESUPUESTO_POR_CUADRO_MS } from './corridaLarga.js'
import { MOTOS_EN_LA_FOTO } from './filas.js'
import { useSimulacion } from './simulacion.js'

/**
 * El caso más exigente que permiten los ajustes: 5000 horas con λ = 200 y 3 puestos.
 * El acabado se satura y su fila llega a cientos de miles de motos. Esta prueba mide
 * lo que cuesta cada cuadro de la corrida larga, que es lo que la pantalla siente.
 */
const estado = () => useSimulacion.getState()
const inicial = useSimulacion.getState()

beforeEach(() => {
  useSimulacion.setState({ ...inicial })
  estado().cambiarParametro('llegadasPorHora', 200)
  estado().cambiarParametro('puestos', 3)
  estado().cambiarHorasDeLaCorridaLarga(5000)
})

describe('la corrida larga más exigente: 5000 horas, λ = 200 y 3 puestos', () => {
  it('ningún cuadro se pasa mucho del presupuesto y la fila queda recortada en la foto', () => {
    estado().empezarCorridaLarga(undefined, { camaraRapida: false })
    expect(estado().corridaLarga.horasTotales).toBe(5000)

    const cuadros = []
    let cuantos = 0
    while (estado().corridaLarga && cuantos < 100000) {
      const antes = performance.now()
      estado().avanzarCorridaLarga()
      cuadros.push(performance.now() - antes)
      cuantos += 1
    }
    expect(estado().corridaLarga).toBeNull()
    expect(estado().foto.relojMin).toBe(5000 * 60)

    // Se mide con holgura: el primer cuadro (trozo de 25 h) y el cierre cuentan igual que los demás.
    // El trozo se adapta al coste, y puede crecer como mucho al doble por cuadro, así que un cuadro
    // lento es posible, pero uno de varios cientos de milisegundos no.
    const peor = Math.max(...cuadros)
    const cuarto = [...cuadros].sort((a, b) => a - b)[Math.floor(cuadros.length * 0.9)]
    expect(cuarto, `el 90 % de los cuadros dura menos de ${4 * PRESUPUESTO_POR_CUADRO_MS} ms`).toBeLessThan(4 * PRESUPUESTO_POR_CUADRO_MS)
    expect(peor, `el peor cuadro dura ${peor.toFixed(0)} ms`).toBeLessThan(500)

    // La foto trae la cabeza de la fila, no cientos de miles de motos, y el largo verdadero va aparte.
    const foto = estado().foto
    expect(foto.largoColaAcabado).toBeGreaterThan(MOTOS_EN_LA_FOTO * 10)
    expect(foto.colaAcabado.length).toBeLessThanOrEqual(MOTOS_EN_LA_FOTO)
    expect(estado().resumen.enFilaAcabado).toBe(foto.largoColaAcabado)
  }, 180000)

  it('Cancelar responde en el acto, también con la fila enorme', () => {
    estado().empezarCorridaLarga(undefined, { camaraRapida: false })
    // Se deja correr hasta que la corrida lleva un buen trecho.
    while (estado().corridaLarga && estado().corridaLarga.horasHechas < 2000) {
      estado().avanzarCorridaLarga()
    }
    expect(estado().corridaLarga).not.toBeNull()
    const antes = performance.now()
    estado().cancelarCorridaLarga()
    const tardo = performance.now() - antes
    expect(tardo).toBeLessThan(100)
    expect(estado().corridaLarga).toBeNull()
    expect(estado().corriendo).toBe(false)
    expect(estado().aviso).toMatch(/Cancelaste la corrida larga: quedó en \d+ de 5000 horas/)
    expect(estado().foto.largoColaAcabado).toBeGreaterThan(0)
  }, 180000)
})
