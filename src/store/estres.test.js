import { afterEach, describe, expect, it } from 'vitest'

import { correrLaPruebaDeEstres, faltasDelEstado } from './pruebaDeEstres.js'
import { useSimulacion } from './simulacion.js'

/**
 * La prueba de estrés del store: miles de acciones al azar (con semilla) sobre la capa
 * de la aplicación, sin navegador, comprobando después de cada una que nada se rompió.
 * Qué acciones hay y qué se comprueba está en `pruebaDeEstres.js`.
 */
const SEMILLA = 20261101
const ACCIONES = 6000

// Las pruebas de sabotaje dejan el store roto a propósito: se vuelve a lo de fábrica después de cada una.
afterEach(() => {
  useSimulacion.setState(useSimulacion.getInitialState(), true)
  useSimulacion.getState().reiniciar()
})

describe('la prueba de estrés del store', () => {
  it(`${ACCIONES} acciones al azar no rompen ningún invariante`, () => {
    const { faltas, acciones } = correrLaPruebaDeEstres({ semilla: SEMILLA, cuantas: ACCIONES })
    expect(acciones).toHaveLength(ACCIONES)
    expect(faltas).toEqual([])
  }, 300000)

  it('recorre de verdad todos los tipos de acción, y también la visita y la corrida larga', () => {
    const { acciones } = correrLaPruebaDeEstres({ semilla: SEMILLA, cuantas: ACCIONES })
    const veces = (nombre) => acciones.filter((accion) => accion === nombre).length
    for (const nombre of [
      'iniciar',
      'pausar',
      'velocidad válida',
      'velocidad no válida',
      'reiniciar',
      'escenario',
      'parámetro válido',
      'parámetro no válido',
      'cerrar',
      'abrir',
      'alternar',
      'empezar la corrida larga',
      'cancelar la corrida larga',
      'cuadros',
      'cuadros de la corrida larga',
      'entrar en la visita',
      'volver al modo normal',
    ]) {
      expect(veces(nombre), nombre).toBeGreaterThan(20)
    }
  }, 300000)

  it('la misma semilla repite exactamente la misma secuencia y los mismos estados', () => {
    // Sin las acciones que dependen del tiempo real (una corrida larga cancelada a medias queda
    // donde la dejó el reloj): lo demás se repite estado a estado.
    const una = correrLaPruebaDeEstres({ semilla: 42, cuantas: 3000, sinCorridaLarga: true })
    const otra = correrLaPruebaDeEstres({ semilla: 42, cuantas: 3000, sinCorridaLarga: true })
    expect(otra.acciones).toEqual(una.acciones)
    expect(otra.huellas).toEqual(una.huellas)
    expect(otra.faltas).toEqual(una.faltas)
  }, 300000)

  it('con la corrida larga incluida, las acciones elegidas son las mismas', () => {
    const una = correrLaPruebaDeEstres({ semilla: 42, cuantas: 1500 })
    const otra = correrLaPruebaDeEstres({ semilla: 42, cuantas: 1500 })
    expect(otra.acciones).toEqual(una.acciones)
    expect(otra.faltas).toEqual([])
  }, 300000)

  it('otra semilla da otra secuencia', () => {
    const una = correrLaPruebaDeEstres({ semilla: 1, cuantas: 300 })
    const otra = correrLaPruebaDeEstres({ semilla: 2, cuantas: 300 })
    expect(otra.acciones).not.toEqual(una.acciones)
  }, 300000)
})

describe('la prueba de estrés sí detecta lo que debe detectar', () => {
  it('falla si se quita la guarda de la velocidad', () => {
    const { faltas } = correrLaPruebaDeEstres({
      semilla: SEMILLA,
      cuantas: 600,
      antesDeEmpezar: (tienda) =>
        tienda.setState({
          // Sin validar: guarda lo que le llegue, como hacía antes de este cambio.
          cambiarVelocidad: (velocidad) => {
            tienda.setState({ velocidadMinPorSegundo: velocidad })
            return true
          },
        }),
    })
    expect(faltas.length).toBeGreaterThan(0)
    expect(faltas.join('\n')).toMatch(/velocidad/)
  }, 300000)

  it('falla si se quita la guarda de los parámetros', () => {
    const { faltas } = correrLaPruebaDeEstres({
      semilla: SEMILLA,
      cuantas: 600,
      antesDeEmpezar: (tienda) =>
        tienda.setState({
          cambiarParametro: (nombre, valor) => {
            tienda.setState({ parametros: { ...tienda.getState().parametros, [nombre]: valor } })
            return true
          },
        }),
    })
    expect(faltas.length).toBeGreaterThan(0)
  }, 300000)

  it('falla si el motor deja una etapa sin servidores activos', () => {
    // Un estado roto a mano: el invariante lo nombra.
    const s = useSimulacion.getState()
    useSimulacion.setState({
      foto: { ...s.foto, placas: s.foto.placas.map((placa) => ({ ...placa, estado: 'cerrado', libre: true, moto: null })) },
    })
    expect(faltasDelEstado()).toContain('ninguna placa activa')
    useSimulacion.getState().reiniciar()
    expect(faltasDelEstado()).toEqual([])
  })
})
