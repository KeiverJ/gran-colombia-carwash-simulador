import { describe, expect, it } from 'vitest'

import { crearFuentesAleatorias, crearSimulador } from './simulador.js'

/** Fuentes de tiempo fijas, para que las cuentas salgan a mano. */
const fuentesFijas = ({ llegadas, lavado, acabado }) => ({
  tiempoEntreLlegadas: () => llegadas,
  tiempoLavado: () => lavado,
  tiempoAcabado: () => acabado,
  planDeLaMoto: () => 2,
})

const estados = (servidores) => servidores.map((servidor) => servidor.estado)

describe('cada servidor tiene tres estados', () => {
  it('al empezar todo está activo, también con muchos servidores', () => {
    const foto = crearSimulador({ semilla: 1, placas: 14, puestos: 7 }).estado()
    expect(estados(foto.placas)).toEqual(new Array(14).fill('activo'))
    expect(estados(foto.puestos)).toEqual(new Array(7).fill('activo'))
  })

  it('la foto dice el estado de cada uno', () => {
    // Moto 1 llega a los 10 min y se lava hasta los 110 en la placa 1.
    const motor = crearSimulador({
      placas: 3,
      puestos: 2,
      fuentes: fuentesFijas({ llegadas: 1000, lavado: 100, acabado: 1 }),
    })
    // La moto de la placa 1 y una placa libre cerrada.
    motor.avanzar(1500)
    expect(motor.estado().placas[0].libre).toBe(true)
    motor.cerrarServidor('lavado', 3)
    expect(estados(motor.estado().placas)).toEqual(['activo', 'activo', 'cerrado'])
  })

  it('los índices y las etapas que no existen lanzan RangeError', () => {
    const motor = crearSimulador({ semilla: 1, placas: 3, puestos: 2 })
    expect(() => motor.cerrarServidor('lavado', 0)).toThrow(RangeError)
    expect(() => motor.cerrarServidor('lavado', 4)).toThrow(RangeError)
    expect(() => motor.cerrarServidor('lavado', 1.5)).toThrow(RangeError)
    expect(() => motor.abrirServidor('acabado', 3)).toThrow(RangeError)
    expect(() => motor.cerrarServidor('secado', 1)).toThrow(RangeError)
  })
})

describe('cerrar un servidor', () => {
  // Llega una moto cada 10 min y se lava 25 min: la 1 a los 10 (placa 1, hasta
  // los 35), la 2 a los 20 (placa 2, hasta los 45), la 3 a los 30...
  const crear = () =>
    crearSimulador({
      placas: 2,
      puestos: 2,
      fuentes: fuentesFijas({ llegadas: 10, lavado: 25, acabado: 1000 }),
    })

  it('libre: queda cerrado al instante y no recibe motos', () => {
    const motor = crear()
    expect(motor.cerrarServidor('lavado', 1)).toEqual({ aplicado: true })
    expect(motor.estado().placas[0].estado).toBe('cerrado')
    motor.avanzar(15)
    const { placas } = motor.estado()
    expect(placas[0].moto).toBeNull()
    expect(placas[1].moto.n).toBe(1)
  })

  it('ocupado: queda cerrándose, la moto termina a su hora y entonces se cierra', () => {
    const motor = crear()
    motor.avanzar(21)
    expect(motor.estado().placas[0].moto.n).toBe(1)

    expect(motor.cerrarServidor('lavado', 1)).toEqual({ aplicado: true })
    expect(motor.estado().placas[0].estado).toBe('cerrandose')
    expect(motor.estado().placas[0].moto.n).toBe(1)

    // Todavía a los 34 min la moto sigue en la placa.
    motor.avanzar(13)
    expect(motor.estado().placas[0].estado).toBe('cerrandose')
    expect(motor.estado().placas[0].moto.n).toBe(1)

    // A los 35 min termina: la placa queda cerrada y la moto pasa al acabado.
    motor.avanzar(1.5)
    const foto = motor.estado()
    expect(foto.placas[0].estado).toBe('cerrado')
    expect(foto.placas[0].moto).toBeNull()
    expect(foto.puestos[0].moto.n).toBe(1)
  })

  it('al terminar la moto de un servidor que se cerraba, no entra la siguiente de la fila', () => {
    const motor = crear()
    motor.avanzar(21)
    motor.cerrarServidor('lavado', 1)
    // A los 30 llega la moto 3: las dos placas están ocupadas, espera.
    motor.avanzar(10)
    expect(motor.estado().colaLavado.map((moto) => moto.n)).toEqual([3])
    // A los 36 la placa 1 ya terminó y se cerró, y la moto 3 sigue esperando.
    motor.avanzar(5)
    const foto = motor.estado()
    expect(foto.placas[0].estado).toBe('cerrado')
    expect(foto.placas[0].moto).toBeNull()
    expect(foto.colaLavado.map((moto) => moto.n)).toEqual([3])
    // A los 45 termina la moto 2 y la 3 entra a la placa 2, no a la 1.
    motor.avanzar(10)
    const despues = motor.estado()
    expect(despues.placas[1].moto.n).toBe(3)
    expect(despues.placas[0].moto).toBeNull()
  })

  it('cerrar un servidor ya cerrado, o que se está cerrando, no hace nada', () => {
    const motor = crear()
    motor.avanzar(21)
    motor.cerrarServidor('lavado', 1)
    expect(motor.cerrarServidor('lavado', 1)).toEqual({ aplicado: false, motivo: 'ya-cerrandose' })
    motor.avanzar(20)
    expect(motor.cerrarServidor('lavado', 1)).toEqual({ aplicado: false, motivo: 'ya-cerrado' })
  })
})

describe('reabrir un servidor', () => {
  const crear = () =>
    crearSimulador({
      placas: 2,
      puestos: 2,
      fuentes: fuentesFijas({ llegadas: 10, lavado: 25, acabado: 1000 }),
    })

  it('cerrado y con fila: la primera moto entra en ese instante', () => {
    const motor = crear()
    motor.cerrarServidor('lavado', 1)
    // Solo trabaja la placa 2: la moto 1 (a los 10) hasta los 35; la 2 y la 3 esperan.
    motor.avanzar(31)
    expect(motor.estado().colaLavado.map((moto) => moto.n)).toEqual([2, 3])

    expect(motor.abrirServidor('lavado', 1)).toEqual({ aplicado: true })
    const foto = motor.estado()
    expect(foto.placas[0].estado).toBe('activo')
    expect(foto.placas[0].moto.n).toBe(2)
    expect(foto.colaLavado.map((moto) => moto.n)).toEqual([3])
  })

  it('cerrándose: se cancela el cierre y sigue con su moto', () => {
    const motor = crear()
    motor.avanzar(21)
    motor.cerrarServidor('lavado', 1)
    expect(motor.abrirServidor('lavado', 1)).toEqual({ aplicado: true })
    expect(motor.estado().placas[0].estado).toBe('activo')
    motor.avanzar(15)
    // Terminó a los 35 y la placa sigue activa y recibe a la siguiente.
    const foto = motor.estado()
    expect(foto.placas[0].estado).toBe('activo')
  })

  it('un servidor activo no se abre', () => {
    expect(crear().abrirServidor('lavado', 1)).toEqual({ aplicado: false, motivo: 'ya-activo' })
  })
})

describe('cada etapa conserva al menos un servidor activo', () => {
  it('el último no se cierra y todo queda como estaba', () => {
    const motor = crearSimulador({ semilla: 1, placas: 3, puestos: 2 })
    expect(motor.cerrarServidor('lavado', 1).aplicado).toBe(true)
    expect(motor.cerrarServidor('lavado', 2).aplicado).toBe(true)
    expect(motor.cerrarServidor('lavado', 3)).toEqual({ aplicado: false, motivo: 'ultimo-activo' })
    expect(estados(motor.estado().placas)).toEqual(['cerrado', 'cerrado', 'activo'])
  })

  it('con una sola placa, no se cierra', () => {
    const motor = crearSimulador({ semilla: 1, placas: 1, puestos: 1 })
    expect(motor.cerrarServidor('lavado', 1)).toEqual({ aplicado: false, motivo: 'ultimo-activo' })
    expect(motor.cerrarServidor('acabado', 1)).toEqual({ aplicado: false, motivo: 'ultimo-activo' })
  })

  it('un servidor que se está cerrando no cuenta como activo', () => {
    const motor = crearSimulador({
      placas: 1,
      puestos: 2,
      fuentes: fuentesFijas({ llegadas: 10, lavado: 1, acabado: 100 }),
    })
    // La moto 1 llega a los 10, sale del lavado a los 11 y ocupa el puesto 1 hasta los 111.
    motor.avanzar(12)
    expect(motor.estado().puestos[0].moto.n).toBe(1)
    expect(motor.cerrarServidor('acabado', 1)).toEqual({ aplicado: true })
    expect(motor.estado().puestos[0].estado).toBe('cerrandose')
    expect(motor.cerrarServidor('acabado', 2)).toEqual({ aplicado: false, motivo: 'ultimo-activo' })
  })

  it('las dos etapas son independientes', () => {
    const motor = crearSimulador({ semilla: 1, placas: 1, puestos: 2 })
    expect(motor.cerrarServidor('acabado', 1).aplicado).toBe(true)
  })
})

describe('cerrar y abrir no cambia las llegadas', () => {
  it('con la misma semilla las llegadas y los planes son los mismos', () => {
    const registrar = (cerrando) => {
      const base = crearFuentesAleatorias({
        semilla: 5,
        llegadasPorHora: 14.1935,
        lavadoMin: 10.7391,
        acabadoPlanMin: { 1: 10, 2: 15.3158, 3: 18.5 },
        acabadoPromedioMin: 15.8696,
        proporcionPlan: { 1: 0, 2: 0.8261, 3: 0.1739 },
        modoAcabado: 'por-plan',
      })
      const llegadas = []
      const planes = []
      const fuentes = {
        ...base,
        tiempoEntreLlegadas: () => {
          const tiempo = base.tiempoEntreLlegadas()
          llegadas.push(tiempo)
          return tiempo
        },
        planDeLaMoto: () => {
          const plan = base.planDeLaMoto()
          planes.push(plan)
          return plan
        },
      }
      const motor = crearSimulador({ placas: 6, puestos: 4, fuentes })
      for (let hora = 1; hora <= 100; hora += 1) {
        motor.correrHoras(1)
        if (cerrando) {
          if (hora % 7 === 0) {
            motor.cerrarServidor('lavado', 2 + (hora % 4))
            motor.cerrarServidor('acabado', 1 + (hora % 3))
          } else if (hora % 7 === 3) {
            motor.abrirServidor('lavado', 2 + ((hora + 1) % 4))
            motor.abrirServidor('acabado', 1 + ((hora + 2) % 3))
          }
        }
      }
      return { llegadas, planes, motosLlegadas: motor.estado().motosLlegadas }
    }

    const sin = registrar(false)
    const con = registrar(true)
    expect(con.llegadas.length).toBeGreaterThan(1000)
    // Los tiempos entre llegadas son una sola secuencia, la misma en las dos corridas.
    const comunes = Math.min(sin.llegadas.length, con.llegadas.length)
    expect(con.llegadas.slice(0, comunes)).toEqual(sin.llegadas.slice(0, comunes))
    expect(con.planes.slice(0, comunes - 5)).toEqual(sin.planes.slice(0, comunes - 5))
    expect(con.motosLlegadas).toBe(sin.motosLlegadas)
  })
})

describe('ρ y la ocupación descuentan el tiempo fuera de servicio', () => {
  it('una placa cerrada la mitad del tiempo y ocupada todo el que está en servicio vale 1', () => {
    // Llegan 10 motos por minuto a 2 placas que lavan en 1 minuto: las dos
    // están siempre ocupadas mientras estén en servicio.
    const motor = crearSimulador({
      placas: 2,
      puestos: 1,
      fuentes: fuentesFijas({ llegadas: 0.1, lavado: 1, acabado: 0.001 }),
    })
    motor.avanzar(100.5)
    // La placa 2 lava de 0,2 en 0,2+1 min; a los 100,5 está en el lavado que va de
    // 100,2 a 101,2: se cierra ahí.
    expect(motor.cerrarServidor('lavado', 2).aplicado).toBe(true)
    motor.avanzar(100.5)
    const { lavado } = motor.metricas()
    expect(motor.estado().placas[1].estado).toBe('cerrado')
    // La placa 2 estuvo en servicio 101,2 de 201 minutos y ocupada todos menos los
    // primeros 0,2 (la segunda moto llega a los 0,2); la placa 1 estuvo en servicio
    // los 201 y ocupada todos menos los primeros 0,1.
    expect(lavado.ocupacionPorServidor[1]).toBeCloseTo(101 / 101.2, 6)
    expect(lavado.ocupacionPorServidor[0]).toBeCloseTo(200.9 / 201, 6)
    // ρ casi 1: todo el tiempo disponible estuvo ocupado salvo los arranques.
    // Dividir entre las dos placas durante todo el periodo daría 0,75.
    expect(lavado.rho).toBeCloseTo((200.9 + 101) / (402 - (201 - 101.2)), 6)
    expect(lavado.rho).toBeGreaterThan(0.99)
  })

  it('cerrar una placa que estaba ociosa sube ρ, porque hay menos tiempo disponible', () => {
    // Llega una moto cada 10 min y se lava 5: solo trabaja la placa 1, 45 de 100 min.
    const crear = () =>
      crearSimulador({
        placas: 2,
        puestos: 1,
        fuentes: fuentesFijas({ llegadas: 10, lavado: 5, acabado: 1 }),
      })
    const abierta = crear()
    abierta.avanzar(100)
    const cerrada = crear()
    cerrada.cerrarServidor('lavado', 2)
    cerrada.avanzar(100)

    expect(abierta.metricas().lavado.rho).toBeCloseTo(45 / 100 / 2, 12)
    expect(cerrada.metricas().lavado.rho).toBeCloseTo(45 / 100, 12)
    expect(cerrada.metricas().lavado.rho).toBeGreaterThan(abierta.metricas().lavado.rho)
    // La placa cerrada no tiene tiempo en servicio: su proporción es 0, no un error.
    expect(cerrada.metricas().lavado.ocupacionPorServidor).toEqual([45 / 100, 0])
  })

  it('el calentamiento no cuenta, tampoco para el tiempo cerrado', () => {
    // Calentamiento de 1 h; la placa 2 se cierra a los 30 min y sigue cerrada.
    const motor = crearSimulador({
      placas: 2,
      puestos: 1,
      calentamientoHoras: 1,
      fuentes: fuentesFijas({ llegadas: 10, lavado: 5, acabado: 1 }),
    })
    motor.avanzar(30)
    motor.cerrarServidor('lavado', 2)
    motor.avanzar(130)
    // Se observan 100 min (de 60 a 160); la placa 1 trabaja 50 (motos de 60 a 150).
    const { lavado } = motor.metricas()
    expect(lavado.rho).toBeCloseTo(50 / 100, 12)
    expect(lavado.ocupacionPorServidor[0]).toBeCloseTo(50 / 100, 12)
    expect(lavado.ocupacionPorServidor[1]).toBe(0)
  })

  it('sin tiempo observado todo vale 0, también con servidores cerrados', () => {
    const motor = crearSimulador({ semilla: 1, placas: 3, puestos: 2 })
    motor.cerrarServidor('lavado', 1)
    const { lavado, acabado } = motor.metricas()
    expect(lavado.rho).toBe(0)
    expect(lavado.ocupacionPorServidor).toEqual([0, 0, 0])
    expect(acabado.ocupacionPorServidor).toEqual([0, 0])
  })

  it('un servidor reabierto cuenta como en servicio desde que se reabre', () => {
    // Llega una moto cada 10 min y se lava 5. La moto de los 10 usa la placa 1
    // (hasta los 15); a los 12 se cierra la placa 1 (se cierra a los 15) y a los 45
    // se reabre. Las motos de los 20, 30 y 40 van a la placa 2 y las de los 50 a 90
    // vuelven a la placa 1. Se observan 100 min.
    const motor = crearSimulador({
      placas: 2,
      puestos: 1,
      fuentes: fuentesFijas({ llegadas: 10, lavado: 5, acabado: 1 }),
    })
    motor.avanzar(12)
    motor.cerrarServidor('lavado', 1)
    motor.avanzar(33)
    motor.abrirServidor('lavado', 1)
    motor.avanzar(55)
    const { lavado } = motor.metricas()
    // Placa 1: ocupada 5 + 25 = 30 min; cerrada de 15 a 45 (30 min): en servicio 70.
    expect(lavado.ocupacionPorServidor[0]).toBeCloseTo(30 / 70, 12)
    // Placa 2: ocupada 15 min de los 100.
    expect(lavado.ocupacionPorServidor[1]).toBeCloseTo(15 / 100, 12)
    // ρ: 45 min ocupados de 200 - 30 = 170 min en servicio.
    expect(lavado.rho).toBeCloseTo(45 / 170, 12)
  })

  it('cortar el intervalo de otra manera da el mismo ρ', () => {
    const correr = (pasos) => {
      const motor = crearSimulador({ semilla: 3, placas: 5, puestos: 3 })
      motor.avanzar(120)
      motor.cerrarServidor('lavado', 2)
      motor.cerrarServidor('acabado', 3)
      pasos.forEach((paso) => motor.avanzar(paso))
      return motor.metricas()
    }
    const golpe = correr([600])
    const trozos = correr([50, 50, 123.4, 0.1, 276.5, 100])
    for (const etapa of ['lavado', 'acabado']) {
      expect(trozos[etapa].rho).toBeCloseTo(golpe[etapa].rho, 9)
      trozos[etapa].ocupacionPorServidor.forEach((valor, i) => {
        expect(valor).toBeCloseTo(golpe[etapa].ocupacionPorServidor[i], 9)
      })
    }
  })

  it('cada ocupación por servidor está entre 0 y 1 con cierres y aperturas al azar', () => {
    const motor = crearSimulador({ semilla: 9, llegadasPorHora: 60, placas: 5, puestos: 4 })
    for (let i = 1; i <= 200; i += 1) {
      motor.avanzar(7.3)
      if (i % 5 === 0) {
        motor.cerrarServidor(i % 2 ? 'lavado' : 'acabado', 1 + (i % 3))
      }
      if (i % 9 === 0) {
        motor.abrirServidor(i % 2 ? 'acabado' : 'lavado', 1 + (i % 3))
      }
    }
    const { lavado, acabado } = motor.metricas()
    for (const etapa of [lavado, acabado]) {
      expect(etapa.rho).toBeGreaterThanOrEqual(0)
      expect(etapa.rho).toBeLessThanOrEqual(1 + 1e-9)
      etapa.ocupacionPorServidor.forEach((valor) => {
        expect(valor).toBeGreaterThanOrEqual(0)
        expect(valor).toBeLessThanOrEqual(1 + 1e-9)
      })
    }
  })
})

describe('la foto con tope en las filas', () => {
  it('sin tope trae toda la fila y dice su largo', () => {
    const motor = crearSimulador({
      placas: 1,
      puestos: 1,
      estadoInicial: { motosEnCola1: 50 },
      fuentes: fuentesFijas({ llegadas: 1e9, lavado: 1e9, acabado: 1 }),
    })
    const foto = motor.estado()
    expect(foto.colaLavado).toHaveLength(50)
    expect(foto.largoColaLavado).toBe(50)
    expect(foto.largoColaAcabado).toBe(0)
  })

  it('con tope trae solo la cabeza y el largo sigue siendo el verdadero', () => {
    const motor = crearSimulador({
      placas: 1,
      puestos: 1,
      estadoInicial: { motosEnCola1: 50 },
      fuentes: fuentesFijas({ llegadas: 1e9, lavado: 1e9, acabado: 1 }),
    })
    const foto = motor.estado({ maxEnFila: 10 })
    expect(foto.colaLavado.map((moto) => moto.n)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
    expect(foto.largoColaLavado).toBe(50)
    expect(motor.estado({ maxEnFila: 0 }).colaLavado).toEqual([])
  })

  it('el resto de la foto no cambia con el tope', () => {
    const motor = crearSimulador({ semilla: 4, llegadasPorHora: 80, placas: 4, puestos: 2 })
    motor.correrHoras(10)
    const { colaLavado: _a, colaAcabado: _b, ...completa } = motor.estado()
    const { colaLavado: _c, colaAcabado: _d, ...conTope } = motor.estado({ maxEnFila: 3 })
    expect(conTope).toEqual(completa)
  })
})
