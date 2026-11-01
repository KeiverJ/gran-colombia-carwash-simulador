import { describe, expect, it } from 'vitest'

import { estadoDeLasLosas, publicarLasLosas } from './losasPublicadas.js'
import {
  AIRE_AL_SALIR,
  estaLevantada,
  estadoSegunElMotor,
  estadoVisualDeLasLosas,
  motoEncimaDeLaLosa,
  motoTocaLaLosa,
} from './losasVisuales.js'
import { posicionDePlaca, posicionDePuesto, SERVIDOR } from './posiciones.js'

const CENTRO = [0, 0, 0]
const MEDIO_FONDO = SERVIDOR.fondo / 2
const MEDIO_ANCHO = SERVIDOR.ancho / 2

describe('la moto encima de la losa', () => {
  it('el centro de la moto dentro de la losa la cuenta como encima', () => {
    expect(motoEncimaDeLaLosa([0, 0.5, -0.5], CENTRO)).toBe(true)
    expect(motoEncimaDeLaLosa([MEDIO_ANCHO - 0.01, 0, 0], CENTRO)).toBe(true)
  })

  it('fuera de ella, no', () => {
    expect(motoEncimaDeLaLosa([0, 0, MEDIO_FONDO + 0.01], CENTRO)).toBe(false)
    expect(motoEncimaDeLaLosa([MEDIO_ANCHO + 0.01, 0, 0], CENTRO)).toBe(false)
  })
})

describe('la moto que toca la losa', () => {
  it('a medio salir (el centro fuera pero el morro todavía encima) sigue tocándola', () => {
    // mirando hacia +Z, con el centro a 1,9 m: el morro llega a 1,05 m, dentro de la losa (1,5)
    expect(motoTocaLaLosa([0, 0, MEDIO_FONDO + 0.4], 0, CENTRO)).toBe(true)
    expect(motoTocaLaLosa([0, 0, -(MEDIO_FONDO + 0.4)], Math.PI, CENTRO)).toBe(true)
  })

  it('ya del todo fuera, no la toca', () => {
    const largoMedio = 0.85
    expect(motoTocaLaLosa([0, 0, MEDIO_FONDO + AIRE_AL_SALIR + largoMedio + 0.05], 0, CENTRO)).toBe(false)
    expect(motoTocaLaLosa([0, 0, MEDIO_FONDO + AIRE_AL_SALIR + largoMedio - 0.05], 0, CENTRO)).toBe(true)
  })

  it('una moto que pasa de lado, por el hueco entre filas (a 2 m), no la toca', () => {
    // mirando hacia +X (rumbo de un cuarto de vuelta), centrada a 2 m del centro de la losa en Z
    expect(motoTocaLaLosa([0, 0, 2], Math.PI / 2, CENTRO)).toBe(false)
  })

  it('la que cruza al lado, solapada, sí', () => {
    expect(motoTocaLaLosa([0, 0, 1.6], Math.PI / 2, CENTRO)).toBe(true)
  })

  it('el rumbo importa: a lo ancho de la losa la moto cabe más cerca que a lo largo', () => {
    const x = MEDIO_ANCHO + 0.1 + 0.4
    expect(motoTocaLaLosa([x, 0, 0], 0, CENTRO)).toBe(false) // mirando a +Z, su ancho (0,375) no llega
    expect(motoTocaLaLosa([x, 0, 0], Math.PI / 2, CENTRO)).toBe(true) // mirando a +X, su largo sí
  })
})

/** Una foto con una placa y un puesto, con las motos que se pidan. */
function foto({ placa = null, puesto = null }) {
  const servidor = (moto) => ({ moto, libre: moto === null })
  return { placas: [servidor(placa)], puestos: [servidor(puesto)] }
}
const moto = (n) => ({ n, plan: 2, precargada: false })

describe('el estado visual de una losa', () => {
  const placa = posicionDePlaca(0, 1)
  const sobre = [placa[0], 0.5, placa[2] - 0.5]
  const lejos = [placa[0], 0, placa[2] + 6]
  const justoAlSalir = [placa[0], 0, placa[2] - MEDIO_FONDO - 0.4]
  const yaSalio = [placa[0], 0, placa[2] - MEDIO_FONDO - 1.2]

  const resolver = ({ f, motos, viajes, levantadas }) =>
    estadoVisualDeLasLosas({
      foto: f,
      motos,
      viajes: new Map(Object.entries(viajes ?? {}).map(([n, v]) => [Number(n), v])),
      levantadas: levantadas ?? { placas: [], puestos: [] },
    })

  it('sin moto asignada ni encima, libre', () => {
    expect(resolver({ f: foto({}), motos: [] }).placas).toEqual(['libre'])
  })

  it('asignada por el motor con la moto todavía en camino: reservada', () => {
    const r = resolver({
      f: foto({ placa: moto(1) }),
      motos: [{ n: 1, punto: lejos, rumbo: Math.PI }],
      viajes: { 1: { recorrido: 3, largo: 8 } },
    })
    expect(r.placas).toEqual(['reservada'])
  })

  it('con la moto encima: ocupada', () => {
    const r = resolver({
      f: foto({ placa: moto(1) }),
      motos: [{ n: 1, punto: sobre, rumbo: Math.PI }],
      viajes: { 1: { recorrido: 8, largo: 8 } },
    })
    expect(r.placas).toEqual(['ocupada'])
  })

  it('el motor ya terminó el servicio pero la moto aún no salió: sigue ocupada', () => {
    const r = resolver({
      f: foto({}),
      motos: [{ n: 1, punto: sobre, rumbo: Math.PI }],
      levantadas: { placas: [true], puestos: [] },
    })
    expect(r.placas).toEqual(['ocupada'])
  })

  it('a medio salir (centro fuera, cuerpo encima) sigue ocupada, y baja cuando ya salió del todo', () => {
    const levantadas = { placas: [true], puestos: [] }
    expect(resolver({ f: foto({}), motos: [{ n: 1, punto: justoAlSalir, rumbo: Math.PI }], levantadas }).placas).toEqual(['ocupada'])
    expect(resolver({ f: foto({}), motos: [{ n: 1, punto: yaSalio, rumbo: Math.PI }], levantadas }).placas).toEqual(['libre'])
    expect(levantadas.placas).toEqual([false])
  })

  it('la siguiente ya asignada mientras la anterior sale: sigue levantada, y luego pasa a reservada', () => {
    const levantadas = { placas: [true], puestos: [] }
    const f = foto({ placa: moto(2) })
    const viajes = { 2: { recorrido: 1, largo: 8 } }
    const viene = { n: 2, punto: lejos, rumbo: Math.PI }
    const saliendo = { n: 1, punto: justoAlSalir, rumbo: Math.PI }
    expect(resolver({ f, motos: [saliendo, viene], viajes, levantadas }).placas).toEqual(['ocupada'])
    expect(resolver({ f, motos: [{ ...saliendo, punto: yaSalio }, viene], viajes, levantadas }).placas).toEqual(['reservada'])
  })

  it('la siguiente ya encima mientras la anterior termina de salir: queda levantada', () => {
    const levantadas = { placas: [true], puestos: [] }
    const r = resolver({
      f: foto({ placa: moto(2) }),
      motos: [
        { n: 1, punto: [placa[0], 0, placa[2] - MEDIO_FONDO - 0.2], rumbo: Math.PI },
        { n: 2, punto: sobre, rumbo: Math.PI },
      ],
      viajes: { 2: { recorrido: 8, largo: 8 } },
      levantadas,
    })
    expect(r.placas).toEqual(['ocupada'])
  })

  it('una moto que solo pasa cerca (por un carril) no levanta una losa que estaba plana', () => {
    const r = resolver({ f: foto({}), motos: [{ n: 1, punto: [placa[0], 0, placa[2] + 2.4], rumbo: Math.PI / 2 }] })
    expect(r.placas).toEqual(['libre'])
  })

  it('los puestos se resuelven igual que las placas, cada uno con su centro', () => {
    const puesto = posicionDePuesto(0, 1)
    const r = resolver({
      f: foto({ puesto: moto(7) }),
      motos: [{ n: 7, punto: [puesto[0], 0.5, puesto[2] - 0.5], rumbo: 0 }],
      viajes: { 7: { recorrido: 5, largo: 5 } },
    })
    expect(r.puestos).toEqual(['ocupada'])
    expect(r.placas).toEqual(['libre'])
  })
})

describe('el estado visual de un servidor cerrado o cerrándose', () => {
  const placa = posicionDePlaca(0, 1)
  const sobre = [placa[0], 0.5, placa[2] - 0.5]
  const lejos = [placa[0], 0, placa[2] + 6]
  const yaSalio = [placa[0], 0, placa[2] - MEDIO_FONDO - 1.2]
  const justoAlSalir = [placa[0], 0, placa[2] - MEDIO_FONDO - 0.4]

  const conEstado = (estado, moto = null) => ({
    placas: [{ moto, libre: moto === null, estado }],
    puestos: [{ moto: null, libre: true, estado: 'activo' }],
  })
  const resolver = ({ f, motos = [], viajes = {}, levantadas }) =>
    estadoVisualDeLasLosas({
      foto: f,
      motos,
      viajes: new Map(Object.entries(viajes).map(([n, v]) => [Number(n), v])),
      levantadas: levantadas ?? { placas: [], puestos: [] },
    })

  it('cerrada y sin ninguna moto cerca: cerrada, y el puesto activo de al lado sigue libre', () => {
    const r = resolver({ f: conEstado('cerrado') })
    expect(r.placas).toEqual(['cerrada'])
    expect(r.puestos).toEqual(['libre'])
  })

  it('cerrada con una moto que todavía no terminó de salir: se ve ocupada hasta que la deja', () => {
    const levantadas = { placas: [true], puestos: [] }
    const saliendo = { n: 1, punto: justoAlSalir, rumbo: Math.PI }
    expect(resolver({ f: conEstado('cerrado'), motos: [saliendo], levantadas }).placas).toEqual(['ocupada'])
    const fuera = { ...saliendo, punto: yaSalio }
    expect(resolver({ f: conEstado('cerrado'), motos: [fuera], levantadas }).placas).toEqual(['cerrada'])
    expect(levantadas.placas).toEqual([false])
  })

  it('cerrándose con la moto encima: cerrándose (levantada, con su señal)', () => {
    const r = resolver({
      f: conEstado('cerrandose', moto(1)),
      motos: [{ n: 1, punto: sobre, rumbo: Math.PI }],
      viajes: { 1: { recorrido: 8, largo: 8 } },
    })
    expect(r.placas).toEqual(['cerrandose'])
    expect(estaLevantada(r.placas[0])).toBe(true)
  })

  it('cerrándose con la moto todavía en camino: sigue reservada, plana', () => {
    const r = resolver({
      f: conEstado('cerrandose', moto(1)),
      motos: [{ n: 1, punto: lejos, rumbo: Math.PI }],
      viajes: { 1: { recorrido: 3, largo: 8 } },
    })
    expect(r.placas).toEqual(['reservada'])
  })

  it('al reabrir una cerrada vuelve a verse libre', () => {
    expect(resolver({ f: conEstado('cerrado') }).placas).toEqual(['cerrada'])
    expect(resolver({ f: conEstado('activo') }).placas).toEqual(['libre'])
  })

  it('las fotos sin `estado` (la visita) se resuelven como siempre', () => {
    const f = { placas: [{ moto: null, libre: true }], puestos: [{ moto: null, libre: true }] }
    expect(resolver({ f }).placas).toEqual(['libre'])
  })

  it('cerrada no se levanta: la altura distingue cerrada de ocupada sin depender del color', () => {
    expect(estaLevantada('cerrada')).toBe(false)
    expect(estaLevantada('libre')).toBe(false)
    expect(estaLevantada('reservada')).toBe(false)
    expect(estaLevantada('ocupada')).toBe(true)
    expect(estaLevantada('cerrandose')).toBe(true)
  })
})

describe('de dónde sale el estado que dibuja la escena', () => {
  const f = {
    relojMin: 5,
    placas: [{ moto: null, libre: true }, { moto: moto(1), libre: false }],
    puestos: [{ moto: moto(2), libre: false }],
  }
  const delMotor = ['libre', 'ocupada', 'ocupada']

  it('según el motor si no hay nada publicado, o lo publicado es de otro cuadro o de otra generación', () => {
    publicarLasLosas(null)
    expect(estadoDeLasLosas({ foto: f, generacion: 0 })).toEqual(delMotor)
    const publicado = { generacion: 0, relojMin: 4, placas: ['reservada', 'libre'], puestos: ['libre'] }
    publicarLasLosas(publicado)
    expect(estadoDeLasLosas({ foto: f, generacion: 0 })).toEqual(delMotor)
    publicarLasLosas({ ...publicado, relojMin: 5, generacion: 1 })
    expect(estadoDeLasLosas({ foto: f, generacion: 0 })).toEqual(delMotor)
    publicarLasLosas(null)
  })

  it('lo publicado, cuando es de este cuadro y esta generación', () => {
    publicarLasLosas({ generacion: 3, relojMin: 5, placas: ['reservada', 'ocupada'], puestos: ['libre'] })
    expect(estadoDeLasLosas({ foto: f, generacion: 3 })).toEqual(['reservada', 'ocupada', 'libre'])
    publicarLasLosas(null)
  })

  it('si cambió el número de placas o de puestos, el del motor', () => {
    publicarLasLosas({ generacion: 3, relojMin: 5, placas: ['reservada'], puestos: ['libre'] })
    expect(estadoDeLasLosas({ foto: f, generacion: 3 })).toEqual(delMotor)
    publicarLasLosas(null)
  })

  it('el motor da libre u ocupada, nunca reservada', () => {
    expect(estadoSegunElMotor({ libre: true })).toBe('libre')
    expect(estadoSegunElMotor({ libre: false })).toBe('ocupada')
  })

  it('el motor también da cerrada y cerrándose cuando el servidor está fuera de servicio', () => {
    expect(estadoSegunElMotor({ libre: true, estado: 'cerrado' })).toBe('cerrada')
    expect(estadoSegunElMotor({ libre: false, estado: 'cerrandose' })).toBe('cerrandose')
    expect(estadoSegunElMotor({ libre: true, estado: 'activo' })).toBe('libre')
    expect(estadoSegunElMotor({ libre: false, estado: 'activo' })).toBe('ocupada')
  })
})

describe('la altura de la cubierta de la placa (patas y rampa debajo)', () => {
  it('es la de antes en libre, reservada, ocupada, cerrándose y cerrada', async () => {
    const { altoDeLaCubierta, ALTO_DE_LA_LOSA_CERRADA, colocacionDeLaCubierta } = await import('./losasVisuales.js')
    const { SERVIDOR } = await import('./posiciones.js')
    expect(altoDeLaCubierta('libre')).toBe(SERVIDOR.altoLibre)
    expect(altoDeLaCubierta('reservada')).toBe(SERVIDOR.altoLibre)
    expect(altoDeLaCubierta('ocupada')).toBe(SERVIDOR.altoOcupado)
    expect(altoDeLaCubierta('cerrandose')).toBe(SERVIDOR.altoOcupado)
    expect(altoDeLaCubierta('cerrada')).toBe(ALTO_DE_LA_LOSA_CERRADA)
    expect(SERVIDOR.altoLibre).toBe(0.12)
    expect(SERVIDOR.altoOcupado).toBe(0.5)
    expect(ALTO_DE_LA_LOSA_CERRADA).toBe(0.04)
    // la moto se posa a la misma altura de siempre: la de la cara de arriba de la losa ocupada
    expect(altoDeLaCubierta('ocupada')).toBe(0.5)
    // la cubierta es una cara delgada pegada a la altura pedida, en cualquier estado
    for (const estado of ['libre', 'reservada', 'ocupada', 'cerrandose', 'cerrada']) {
      const alto = altoDeLaCubierta(estado)
      const { escalaY, centroY } = colocacionDeLaCubierta(alto, 0.12)
      expect(centroY + (escalaY * SERVIDOR.altoOcupado) / 2).toBeCloseTo(alto, 9)
      expect(centroY - (escalaY * SERVIDOR.altoOcupado) / 2).toBeGreaterThanOrEqual(-1e-9)
    }
  })

  it('con las patas: una placa libre no deja ver patas y una ocupada sí', async () => {
    const { altoDeLaCubierta, colocacionDeLaCubierta } = await import('./losasVisuales.js')
    const patasQueSeVen = (estado) => {
      const alto = altoDeLaCubierta(estado)
      const { escalaY, centroY } = colocacionDeLaCubierta(alto, 0.12)
      return centroY - (escalaY * 0.5) / 2
    }
    expect(patasQueSeVen('libre')).toBeCloseTo(0, 9)
    expect(patasQueSeVen('ocupada')).toBeGreaterThan(0.3)
  })
})
