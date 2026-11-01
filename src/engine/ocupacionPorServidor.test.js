import { describe, expect, it } from 'vitest'

import { ESCENARIOS } from '../data/escenarios.js'
import referencia from './referencia.json'
import { crearSimulador } from './simulador.js'

/** Lo que pasa de un registro a otro al repetir una corrida: avanzar por pasos y de golpe. */
const PASOS = [
  ['avanzar', 0.5],
  ['avanzar', 13.7],
  ['correrHoras', 3],
  ['avanzar', 7.3],
  ['correrHoras', 40],
  ['avanzar', 1.1],
]

const TOLERANCIA = 1e-9
const promedio = (valores) => valores.reduce((suma, valor) => suma + valor, 0) / valores.length

/** Quita lo único que se añadió, para comparar con lo que el motor ya entregaba. */
function sinOcupacionPorServidor(metricas) {
  const { ocupacionPorServidor: _lavado, ...lavado } = metricas.lavado
  const { ocupacionPorServidor: _acabado, ...acabado } = metricas.acabado
  return { ...metricas, lavado, acabado }
}

/** Fuentes de tiempo fijas, para probar sin azar. */
const fuentesFijas = ({ llegadas, lavado, acabado }) => ({
  tiempoEntreLlegadas: () => llegadas,
  tiempoLavado: () => lavado,
  tiempoAcabado: () => acabado,
  planDeLaMoto: () => 2,
})

describe('todo lo que el motor ya entregaba sigue igual', () => {
  // `referencia.json` se generó con el motor tal como estaba antes de añadir la
  // ocupación por servidor: la foto del estado y las métricas de 13 corridas
  // (escenarios, semillas, modos de acabado, calentamiento, estado inicial),
  // tras cada paso de avanzar o correr de golpe. Como esa foto es anterior a los
  // cierres, se le añade lo que traen hoy todas las fotos sin cierres: cada
  // servidor `activo` y el largo de cada fila. Nada de lo demás se toca.
  const conLosCamposNuevos = (foto) => ({
    ...foto,
    placas: foto.placas.map((placa) => ({ ...placa, estado: 'activo' })),
    puestos: foto.puestos.map((puesto) => ({ ...puesto, estado: 'activo' })),
    largoColaLavado: foto.colaLavado.length,
    largoColaAcabado: foto.colaAcabado.length,
  })

  it('la referencia trae las corridas esperadas', () => {
    expect(referencia).toHaveLength(13)
  })

  it.each(referencia.map((caso) => [caso.nombre, caso]))('%s', (_nombre, caso) => {
    const motor = crearSimulador(caso.opciones)
    for (const { accion, cantidad, estado, metricas } of caso.registros) {
      motor[accion](cantidad)
      expect(motor.estado()).toEqual(conLosCamposNuevos(estado))
      expect(sinOcupacionPorServidor(motor.metricas())).toEqual(metricas)
    }
  })
})

describe('la ocupación de cada servidor es coherente con ρ', () => {
  const escenarios = ESCENARIOS.flatMap((escenario) =>
    [1, 2, 3].map((semilla) => ({ escenario, semilla })),
  )

  it.each(escenarios.map(({ escenario, semilla }) => [`${escenario.id}, semilla ${semilla}`, escenario, semilla]))(
    'el promedio de los servidores de cada etapa es su ρ: %s',
    (_nombre, escenario, semilla) => {
      const motor = crearSimulador({ semilla, placas: escenario.placas, puestos: escenario.puestos })
      for (const [accion, cantidad] of PASOS) {
        motor[accion](cantidad)
        const { lavado, acabado } = motor.metricas()
        expect(Math.abs(promedio(lavado.ocupacionPorServidor) - lavado.rho)).toBeLessThan(TOLERANCIA)
        expect(Math.abs(promedio(acabado.ocupacionPorServidor) - acabado.rho)).toBeLessThan(TOLERANCIA)
      }
    },
  )

  it.each([
    ['por plan', 'por-plan'],
    ['un solo promedio', 'M/M/s'],
  ])('también con calentamiento, a mitad de corrida y con %s', (_nombre, modoAcabado) => {
    const motor = crearSimulador({ semilla: 4, puestos: 4, modoAcabado, calentamientoHoras: 2 })
    for (const [accion, cantidad] of PASOS) {
      motor[accion](cantidad)
      const { lavado, acabado } = motor.metricas()
      expect(Math.abs(promedio(lavado.ocupacionPorServidor) - lavado.rho)).toBeLessThan(TOLERANCIA)
      expect(Math.abs(promedio(acabado.ocupacionPorServidor) - acabado.rho)).toBeLessThan(TOLERANCIA)
    }
  })

  it('con una cola larga y un estado inicial ocupado', () => {
    const motor = crearSimulador({
      semilla: 8,
      llegadasPorHora: 60,
      estadoInicial: { placasOcupadas: 3, motosEnCola1: 4, puestosAcabadoOcupados: 2, motosEnCola2: 3 },
    })
    motor.correrHoras(20)
    motor.avanzar(33.3)
    const { lavado, acabado } = motor.metricas()
    expect(Math.abs(promedio(lavado.ocupacionPorServidor) - lavado.rho)).toBeLessThan(TOLERANCIA)
    expect(Math.abs(promedio(acabado.ocupacionPorServidor) - acabado.rho)).toBeLessThan(TOLERANCIA)
  })
})

describe('la forma de lo que entrega', () => {
  it('hay un valor por placa y por puesto, entre 0 y 1', () => {
    const motor = crearSimulador({ semilla: 5, placas: 7, puestos: 5 })
    motor.correrHoras(30)
    const { lavado, acabado } = motor.metricas()
    expect(lavado.ocupacionPorServidor).toHaveLength(7)
    expect(acabado.ocupacionPorServidor).toHaveLength(5)
    for (const valor of [...lavado.ocupacionPorServidor, ...acabado.ocupacionPorServidor]) {
      expect(valor).toBeGreaterThanOrEqual(0)
      expect(valor).toBeLessThanOrEqual(1 + TOLERANCIA)
    }
  })

  it('con el primer servidor libre, las placas de número bajo trabajan más tras una corrida larga', () => {
    const motor = crearSimulador({ semilla: 1 })
    motor.correrHoras(1000)
    const { ocupacionPorServidor: placas } = motor.metricas().lavado
    expect(placas[0]).toBeGreaterThan(placas[placas.length - 1])
  })

  it('sin tiempo observado todo vale 0', () => {
    const nuevo = crearSimulador({ semilla: 1, placas: 4, puestos: 2 })
    expect(nuevo.metricas().lavado.ocupacionPorServidor).toEqual([0, 0, 0, 0])
    expect(nuevo.metricas().acabado.ocupacionPorServidor).toEqual([0, 0])
  })

  it('dentro del calentamiento todo vale 0', () => {
    const motor = crearSimulador({ semilla: 1, calentamientoHoras: 2 })
    motor.avanzar(60)
    const { lavado, acabado } = motor.metricas()
    expect(lavado.ocupacionPorServidor.every((valor) => valor === 0)).toBe(true)
    expect(acabado.ocupacionPorServidor.every((valor) => valor === 0)).toBe(true)
  })
})

describe('con tiempos fijos, las cuentas salen a mano', () => {
  // Una moto llega a los 100 min, se lava 30 min en la placa 1 (de 100 a 130) y
  // se acaba 1 min en el puesto 1 (de 130 a 131). La segunda llegaría a los 200.
  const fuentes = fuentesFijas({ llegadas: 100, lavado: 30, acabado: 1 })

  it('una sola moto ocupa solo la placa 1 y el puesto 1', () => {
    const motor = crearSimulador({ placas: 3, puestos: 2, fuentes })
    motor.avanzar(190)
    const { lavado, acabado } = motor.metricas()
    expect(lavado.ocupacionPorServidor[0]).toBeCloseTo(30 / 190, 12)
    expect(lavado.ocupacionPorServidor[1]).toBe(0)
    expect(lavado.ocupacionPorServidor[2]).toBe(0)
    expect(acabado.ocupacionPorServidor[0]).toBeCloseTo(1 / 190, 12)
    expect(acabado.ocupacionPorServidor[1]).toBe(0)
  })

  it('el calentamiento no cuenta: solo entra lo que ocurre después', () => {
    // Calentamiento de 2 h = 120 min: se observan 70 min (de 120 a 190). La
    // placa 1 está ocupada de 120 a 130 y el puesto 1 de 130 a 131.
    const motor = crearSimulador({ placas: 3, puestos: 2, calentamientoHoras: 2, fuentes })
    motor.avanzar(190)
    const { lavado, acabado } = motor.metricas()
    expect(lavado.ocupacionPorServidor[0]).toBeCloseTo(10 / 70, 12)
    expect(acabado.ocupacionPorServidor[0]).toBeCloseTo(1 / 70, 12)
    expect(lavado.ocupacionPorServidor[1]).toBe(0)
  })

  it('incluye el tramo que va del último suceso al reloj', () => {
    // A los 115 min la placa 1 lleva 15 min ocupada y el último suceso fue la
    // llegada de los 100: ese tramo solo lo suma el cálculo al vuelo.
    const motor = crearSimulador({ placas: 3, puestos: 2, fuentes })
    motor.avanzar(115)
    expect(motor.metricas().lavado.ocupacionPorServidor[0]).toBeCloseTo(15 / 115, 12)
  })

  it('cortar el intervalo no cambia nada', () => {
    const golpe = crearSimulador({ placas: 3, puestos: 2, fuentes })
    golpe.avanzar(190)
    const pasos = crearSimulador({ placas: 3, puestos: 2, fuentes })
    for (let i = 0; i < 19; i += 1) {
      pasos.avanzar(10)
    }
    expect(pasos.metricas().lavado.ocupacionPorServidor).toEqual(golpe.metricas().lavado.ocupacionPorServidor)
    expect(pasos.metricas().acabado.ocupacionPorServidor).toEqual(golpe.metricas().acabado.ocupacionPorServidor)
  })
})
