import { describe, expect, it } from 'vitest'

import { crearSimulador } from './simulador.js'

/** Fuentes de tiempo fijas, para probar sin azar. */
const fuentesFijas = ({ llegadas = 5, lavado = 10, acabado = 12, plan = 2 } = {}) => ({
  tiempoEntreLlegadas: () => llegadas,
  tiempoLavado: () => lavado,
  tiempoAcabado: () => acabado,
  planDeLaMoto: () => plan,
})

describe('reproducibilidad', () => {
  it('la misma semilla y los mismos parámetros dan lo mismo', () => {
    const uno = crearSimulador({ semilla: 77 })
    const otro = crearSimulador({ semilla: 77 })
    uno.correrHoras(50)
    otro.correrHoras(50)
    expect(uno.metricas()).toEqual(otro.metricas())
    expect(uno.estado()).toEqual(otro.estado())
  })

  it('semillas distintas dan resultados distintos', () => {
    const uno = crearSimulador({ semilla: 1 })
    const otro = crearSimulador({ semilla: 2 })
    uno.correrHoras(50)
    otro.correrHoras(50)
    expect(uno.metricas()).not.toEqual(otro.metricas())
  })

  it('cambiar las placas no mueve las llegadas ni los planes', () => {
    // Las tres corrientes son independientes: cambiar s1 no desplaza el azar
    // de las llegadas, así que los dos escenarios ocurren la misma tarde.
    const llegadasDe = (placas) => {
      const motor = crearSimulador({ semilla: 31, placas })
      const vistas = []
      for (let i = 0; i < 300; i += 1) {
        motor.avanzar(1)
        const e = motor.estado()
        vistas.push(e.motosLlegadas)
      }
      return vistas
    }
    expect(llegadasDe(6)).toEqual(llegadasDe(7))
  })
})

describe('disciplina del lavadero', () => {
  it('ocupa el primer servidor libre en orden', () => {
    const motor = crearSimulador({ semilla: 1, fuentes: fuentesFijas({ llegadas: 1, lavado: 1000 }) })
    motor.correrHoras(0.1) // 6 min: llegan 6 motos y ninguna termina
    const placas = motor.estado().placas
    expect(placas.map((p) => p.moto?.n)).toEqual([1, 2, 3, 4, 5, 6])
  })

  it('se salta las placas ocupadas y toma la libre de número menor', () => {
    // Llegadas cada minuto y lavados larguísimos, salvo el tercero (2 min).
    // Minuto 1 → moto 1 a la placa 1; minuto 2 → moto 2 a la placa 2;
    // minuto 3 → moto 3 a la placa 3, que terminará en el minuto 5;
    // minuto 4 → moto 4 a la placa 4; minuto 5 → la placa 3 se libera y la
    // moto 5, que llega en ese mismo instante, la ocupa en vez de ir a la 5.
    let lavadosPedidos = 0
    const motor = crearSimulador({
      semilla: 1,
      fuentes: {
        tiempoEntreLlegadas: () => 1,
        tiempoLavado: () => {
          lavadosPedidos += 1
          return lavadosPedidos === 3 ? 2 : 10000
        },
        tiempoAcabado: () => 10000,
        planDeLaMoto: () => 2,
      },
    })
    motor.avanzar(7)
    const placas = motor.estado().placas
    expect(placas.map((p) => p.moto?.n)).toEqual([1, 2, 5, 4, 6, 7])
    expect(motor.estado().colaLavado).toHaveLength(0)
  })

  it('atiende la fila en orden de llegada y nadie se adelanta', () => {
    const motor = crearSimulador({ semilla: 13, placas: 2, puestos: 2 })
    motor.correrHoras(3)
    const cola = motor.estado().colaLavado.map((moto) => moto.n)
    const enOrden = [...cola].sort((a, b) => a - b)
    expect(cola).toEqual(enOrden)
  })

  it('ninguna moto se pierde', () => {
    const motor = crearSimulador({ semilla: 8, placas: 2, puestos: 2 })
    motor.correrHoras(5)
    const e = motor.estado()
    const dentro =
      e.placas.filter((p) => !p.libre).length +
      e.puestos.filter((p) => !p.libre).length +
      e.colaLavado.length +
      e.colaAcabado.length
    expect(e.motosSalidas + dentro).toBe(e.motosLlegadas)
  })

  it('la etapa 2 saturada no frena al lavado', () => {
    const motor = crearSimulador({ semilla: 5, placas: 6, puestos: 3, calentamientoHoras: 50 })
    motor.correrHoras(1000)
    const met = motor.metricas()
    // La etapa 1 mantiene su propio ritmo aunque la 2 esté desbordada.
    expect(met.lavado.rho).toBeGreaterThan(0.39)
    expect(met.lavado.rho).toBeLessThan(0.46)
    // Y la etapa 2 sí está saturada: su cola es enorme.
    expect(met.acabado.lq).toBeGreaterThan(100)
  })

  it('una moto que llega cuando se libera una placa la ocupa, sin pasar por la fila', () => {
    // Llegadas y lavados de 10 min exactos y una sola placa: el fin de lavado
    // de una moto y la llegada de la siguiente caen en el mismo instante.
    const motor = crearSimulador({
      semilla: 1,
      placas: 1,
      fuentes: fuentesFijas({ llegadas: 10, lavado: 10, acabado: 1 }),
    })
    motor.avanzar(10)
    expect(motor.estado().placas[0].moto?.n).toBe(1)
    motor.avanzar(10) // empate en el minuto 20
    const e = motor.estado()
    expect(e.placas[0].moto?.n).toBe(2)
    expect(e.colaLavado).toHaveLength(0)
    expect(motor.metricas().lavado.wqMin).toBe(0)
  })
})

describe('avanzar por intervalos o de golpe', () => {
  it('600 pasos de un minuto dan lo mismo que 10 horas de golpe', () => {
    const pasos = crearSimulador({ semilla: 5 })
    for (let i = 0; i < 600; i += 1) {
      pasos.avanzar(1)
    }
    const golpe = crearSimulador({ semilla: 5 })
    golpe.correrHoras(10)

    expect(pasos.estado().relojMin).toBe(golpe.estado().relojMin)
    expect(pasos.estado()).toEqual(golpe.estado())
    // Igualdad exacta, no aproximada: las áreas se acumulan solo en los bordes
    // de evento, así que cortar el intervalo no cambia el orden de las sumas.
    expect(pasos.metricas()).toEqual(golpe.metricas())
  })

  it('da lo mismo partir la corrida en dos tramos', () => {
    const partido = crearSimulador({ semilla: 5 })
    partido.correrHoras(3)
    partido.correrHoras(7)
    const golpe = crearSimulador({ semilla: 5 })
    golpe.correrHoras(10)
    expect(partido.metricas()).toEqual(golpe.metricas())
  })
})

describe('estado inicial y calentamiento', () => {
  const estadoDeLaVisita = {
    placasOcupadas: 0,
    motosEnCola1: 2,
    puestosAcabadoOcupados: 1,
  }

  it('la foto del instante 0 muestra el estado observado en la visita', () => {
    const motor = crearSimulador({ semilla: 1, estadoInicial: estadoDeLaVisita })
    const e = motor.estado()
    expect(e.relojMin).toBe(0)
    expect(e.placas.filter((p) => !p.libre)).toHaveLength(0)
    expect(e.colaLavado).toHaveLength(2)
    expect(e.puestos.filter((p) => !p.libre)).toHaveLength(1)
  })

  it('las motos que esperaban son las primeras en entrar a una placa', () => {
    const motor = crearSimulador({ semilla: 1, estadoInicial: estadoDeLaVisita })
    const esperando = motor.estado().colaLavado.map((moto) => moto.n)
    motor.avanzar(1)
    const placas = motor.estado().placas
    expect([placas[0].moto?.n, placas[1].moto?.n]).toEqual(esperando)
    expect(motor.estado().colaLavado).toHaveLength(0)
  })

  it('arranca vacío cuando no se indica estado inicial', () => {
    const motor = crearSimulador({ semilla: 1 })
    const e = motor.estado()
    expect(e.placas.every((p) => p.libre)).toBe(true)
    expect(e.puestos.every((p) => p.libre)).toBe(true)
    expect(e.colaLavado).toHaveLength(0)
    expect(e.colaAcabado).toHaveLength(0)
  })

  it('las motos precargadas cuentan en L y Lq pero no en W ni Wq', () => {
    const motor = crearSimulador({
      semilla: 1,
      placas: 1,
      puestos: 1,
      estadoInicial: { motosEnCola1: 3 },
      fuentes: fuentesFijas({ llegadas: 100000, lavado: 10, acabado: 10 }),
    })
    motor.correrHoras(1) // 60 min: las 3 precargadas pasan por la única placa
    const met = motor.metricas()
    expect(met.lavado.lq).toBeGreaterThan(0) // estuvieron en la fila
    expect(met.lavado.motosContadas).toBe(0) // pero no cuentan para las esperas
    expect(met.lavado.wMin).toBe(0)
    expect(met.lavado.wqMin).toBe(0)
  })

  it('el calentamiento por defecto es 0 horas', () => {
    expect(crearSimulador({ semilla: 1 }).configuracion().calentamientoHoras).toBe(0)
  })

  it('una moto que llega durante el calentamiento no cuenta para W ni Wq', () => {
    const motor = crearSimulador({
      semilla: 1,
      calentamientoHoras: 1,
      fuentes: fuentesFijas({ llegadas: 40, lavado: 5, acabado: 5 }),
    })
    // Llegan motos en los minutos 40, 80, 120…: la primera llega dentro del
    // calentamiento (60 min) y termina después.
    motor.correrHoras(3)
    const met = motor.metricas()
    expect(met.lavado.motosContadas).toBe(motor.estado().motosSalidas - 1)
  })
})

describe('las fuentes de tiempo se pueden reemplazar', () => {
  it('con tiempos fijos el motor usa esos tiempos y no sortea nada', () => {
    const fijas = fuentesFijas({ llegadas: 5, lavado: 10, acabado: 12 })
    const conUnaSemilla = crearSimulador({ semilla: 1, fuentes: fijas })
    const conOtraSemilla = crearSimulador({ semilla: 999999, fuentes: fijas })
    conUnaSemilla.correrHoras(5)
    conOtraSemilla.correrHoras(5)

    // Mismo resultado con cualquier semilla: no queda azar en el motor.
    expect(conUnaSemilla.metricas()).toEqual(conOtraSemilla.metricas())

    const met = conUnaSemilla.metricas()
    expect(met.lavado.wMin).toBeCloseTo(10, 10) // el lavado fijo, sin espera
    expect(met.acabado.wMin).toBeCloseTo(12, 10) // el acabado fijo, sin espera
    expect(met.total.wMin).toBeCloseTo(22, 10) // 10 + 12, sin esperas
  })

  it('con 6 placas y esos tiempos fijos la etapa 1 no forma fila', () => {
    const motor = crearSimulador({
      semilla: 1,
      fuentes: fuentesFijas({ llegadas: 5, lavado: 10, acabado: 12 }),
    })
    motor.correrHoras(5)
    expect(motor.estado().colaLavado).toHaveLength(0)
    expect(motor.metricas().lavado.lq).toBe(0)
    expect(motor.metricas().lavado.wqMin).toBe(0)
  })

  it('por defecto los tiempos salen de la semilla', () => {
    expect(crearSimulador({ semilla: 1 }).configuracion().usaFuentesPropias).toBe(false)
    const conFuentes = crearSimulador({ semilla: 1, fuentes: fuentesFijas() })
    expect(conFuentes.configuracion().usaFuentesPropias).toBe(true)
  })
})

describe('parámetros imposibles', () => {
  it('rechaza una tasa de llegadas que no es positiva', () => {
    expect(() => crearSimulador({ llegadasPorHora: 0 })).toThrow(/llegadas/)
  })

  it('rechaza un número de placas o puestos que no es un entero válido', () => {
    expect(() => crearSimulador({ placas: 0 })).toThrow(/placas/)
    expect(() => crearSimulador({ puestos: 2.5 })).toThrow(/puestos/)
  })

  it('rechaza un modo de acabado desconocido', () => {
    expect(() => crearSimulador({ modoAcabado: 'rapido' })).toThrow(/modo de acabado/)
  })

  it('rechaza un calentamiento negativo', () => {
    expect(() => crearSimulador({ calentamientoHoras: -1 })).toThrow(/calentamiento/)
  })
})
