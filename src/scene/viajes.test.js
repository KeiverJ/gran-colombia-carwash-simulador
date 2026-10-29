import { beforeEach, describe, expect, it } from 'vitest'

import { ESCENARIOS } from '../data/escenarios.js'
import { useSimulacion } from '../store/simulacion.js'
import { darUnCuadro } from '../store/useCicloDeSimulacion.js'
import { entradaDeLaMoto, MOTO, TOPE_DE_MOTOS_DIBUJADAS } from './posiciones.js'
import { SALTO_MAXIMO_DE_TIEMPO_REAL_S } from './relojDeLaEscena.js'
import {
  ATRASO_MAXIMO_EN_MINUTOS,
  caminoDeSalida,
  curvaDeSalida,
  estaEnElCorredor,
  largoDelCamino,
  puntoDe,
  sitioEnPuesto,
} from './trayectorias.js'
import {
  animarLaEscena,
  avanzarLasMotos,
  crearViajes,
  enLaLineaDeLaFila,
  sitiosDeLasMotos,
} from './viajes.js'

const estado = () => useSimulacion.getState()
const inicial = useSimulacion.getState()
const CUADRO_EN_SEGUNDOS = 1 / 60

/** Una tarde con mucha gente: el lavado y el acabado se llenan y hay entradas y salidas todo el rato. */
function prepararCorrida({ velocidad, llegadasPorHora = 45, placas = 5, semilla = 7 }) {
  useSimulacion.setState({ ...inicial })
  estado().cambiarSemilla(semilla)
  estado().cambiarParametro('llegadasPorHora', llegadasPorHora)
  estado().cambiarParametro('placas', placas)
  estado().cambiarVelocidad(velocidad)
  estado().iniciar()
}

/**
 * Lo que pasa en la aplicación en cada cuadro, con el mismo código: el ciclo de
 * animación (`darUnCuadro`) y la escena (`animarLaEscena`), a 60 cuadros por
 * segundo. Devuelve lo que la escena dibujaría, o `null` si no dibuja nada (corrida larga).
 */
function crearBanco() {
  const banco = {
    viajes: crearViajes(),
    instante: 0,
    instanteAnterior: null,
    cuadro(segundosReales = CUADRO_EN_SEGUNDOS) {
      banco.instante += segundosReales * 1000
      banco.instanteAnterior = darUnCuadro(estado(), banco.instante, banco.instanteAnterior)
      return animarLaEscena(banco.viajes, estado(), segundosReales)
    },
    cuadros(cuantos) {
      let ultimo = null
      for (let i = 0; i < cuantos; i += 1) ultimo = banco.cuadro()
      return ultimo
    },
  }
  return banco
}

/**
 * Corre la aplicación cuadro a cuadro durante `minutos` minutos simulados. Con
 * `alCuadro`, se avisa de lo que dibujó la escena en cada cuadro.
 */
function correr({ minutos, alCuadro = null }) {
  const banco = crearBanco()
  let cuadros = 0
  while (estado().foto.relojMin < minutos && cuadros < 60 * 60 * 20) {
    const motos = banco.cuadro()
    if (alCuadro) alCuadro({ motos, viajes: banco.viajes, foto: estado().foto })
    cuadros += 1
  }
  return { viajes: banco.viajes, cuadros, banco }
}

beforeEach(() => {
  useSimulacion.setState({ ...inicial })
})

describe('la escena no cambia lo que calcula el motor', () => {
  it.each([1, 10, 60])('a %s min/s las métricas y la foto son idénticas con y sin animación', (velocidad) => {
    prepararCorrida({ velocidad })
    correr({ minutos: 240 })
    const sinEscena = { metricas: estado().motor.metricas(), foto: estado().motor.estado() }

    prepararCorrida({ velocidad })
    correr({ minutos: 240, alCuadro: () => {} })
    const conEscena = { metricas: estado().motor.metricas(), foto: estado().motor.estado() }

    expect(conEscena).toEqual(sinEscena)
    // y la corrida de verdad hizo algo: hubo motos que llegaron y salieron
    expect(sinEscena.foto.motosSalidas).toBeGreaterThan(5)
  })
})

describe('las motos se mueven sin saltos', () => {
  /** El paso más largo que da una moto entre un cuadro y el siguiente, en metros. */
  function pasoMasLargo(velocidad) {
    prepararCorrida({ velocidad })
    const anteriores = new Map()
    let masLargo = 0
    correr({
      minutos: 240,
      alCuadro: ({ motos }) => {
        for (const { n, punto } of motos) {
          const antes = anteriores.get(n)
          if (antes) masLargo = Math.max(masLargo, Math.hypot(punto[0] - antes[0], punto[2] - antes[2]))
          anteriores.set(n, punto)
        }
        for (const n of [...anteriores.keys()]) {
          if (!motos.some((moto) => moto.n === n)) anteriores.delete(n)
        }
      },
    })
    return masLargo
  }

  it('a 1 min/s ninguna da un paso de más de medio metro por cuadro (30 m/s)', () => {
    expect(pasoMasLargo(1)).toBeLessThan(0.5)
  })

  it('a 10 min/s, ninguna da un paso de más de 5 m por cuadro', () => {
    expect(pasoMasLargo(10)).toBeLessThan(5)
  })
})

describe('el atraso respecto al motor está acotado', () => {
  it.each([1, 10, 60])('a %s min/s, ningún viaje dura más que el atraso máximo, y casi todos llegan dentro de él', (velocidad) => {
    prepararCorrida({ velocidad })
    let viajesVistos = 0
    let llegaronATiempo = 0
    const contados = new Set()
    correr({
      minutos: 240,
      alCuadro: ({ viajes, foto }) => {
        for (const [n, viaje] of viajes.porMoto) {
          expect(viaje.duracion, `moto ${n}`).toBeLessThanOrEqual(ATRASO_MAXIMO_EN_MINUTOS + 1e-9)
          const clave = `${n}:${viaje.ordenadoEnMin}`
          if (viaje.recorrido >= viaje.largo && !contados.has(clave)) {
            contados.add(clave)
            viajesVistos += 1
            // esperar el turno en una fila o en el corredor puede alargarlo; lo normal es no pasarse
            if (foto.relojMin - viaje.ordenadoEnMin <= ATRASO_MAXIMO_EN_MINUTOS + 1) llegaronATiempo += 1
          }
        }
      },
    })
    expect(viajesVistos).toBeGreaterThan(50)
    expect(llegaronATiempo / viajesVistos).toBeGreaterThan(0.9)
  })
})

describe('con la simulación en pausa, nada se mueve', () => {
  it('pausar a mitad de un trayecto deja todas las posiciones idénticas en los cuadros siguientes', () => {
    prepararCorrida({ velocidad: 1 })
    const banco = crearBanco()
    // hasta que haya motos a medio camino
    let enCamino = 0
    for (let i = 0; i < 60 * 600 && enCamino < 3; i += 1) {
      banco.cuadro()
      enCamino = [...banco.viajes.porMoto.values()].filter((v) => v.recorrido > 0 && v.recorrido < v.largo - 1).length
    }
    expect(enCamino, 'había motos a medio camino').toBeGreaterThanOrEqual(3)

    estado().pausar()
    const reloj = estado().foto.relojMin
    const antes = banco.cuadro()
    for (let i = 0; i < 120; i += 1) {
      const ahora = banco.cuadro()
      expect(ahora).toEqual(antes)
    }
    expect(estado().foto.relojMin).toBe(reloj)
  })

  it('al volver a Iniciar siguen desde donde estaban, sin saltos', () => {
    prepararCorrida({ velocidad: 1 })
    const banco = crearBanco()
    banco.cuadros(60 * 60)
    estado().pausar()
    const quieta = banco.cuadro()
    banco.cuadros(30)
    estado().iniciar()
    const siguiente = banco.cuadro()
    for (const moto of siguiente) {
      const antes = quieta.find((m) => m.n === moto.n)
      if (!antes) continue
      expect(Math.hypot(moto.punto[0] - antes.punto[0], moto.punto[2] - antes.punto[2])).toBeLessThan(0.5)
    }
  })

  it('en pausa tampoco giran: el rumbo no cambia', () => {
    prepararCorrida({ velocidad: 1 })
    const banco = crearBanco()
    banco.cuadros(60 * 90)
    estado().pausar()
    const antes = banco.cuadro()
    const despues = banco.cuadros(60)
    expect(despues.map((m) => m.rumbo)).toEqual(antes.map((m) => m.rumbo))
  })
})

describe('el movimiento sigue a la velocidad de la simulación', () => {
  /** Una moto a mitad de su viaje, lejos de las rampas, para comparar lo que avanza en un cuadro. */
  function motosEnCrucero(viajes) {
    return [...viajes.porMoto].filter(([, v]) => {
      const u = (estado().foto.relojMin - v.salioEnMin) / v.duracion
      return v.duracion > 1 && u > 0.25 && u < 0.5 && v.recorrido < v.largo && !v.enElCorredor
    })
  }

  it('duplicar los minutos que pasan duplica lo que avanza cada moto en un cuadro', () => {
    prepararCorrida({ velocidad: 1 })
    const banco = crearBanco()
    let encontradas = []
    for (let i = 0; i < 60 * 600 && encontradas.length < 2; i += 1) {
      banco.cuadro()
      encontradas = motosEnCrucero(banco.viajes)
    }
    expect(encontradas.length).toBeGreaterThanOrEqual(1)
    const foto = estado().foto
    const d = 0.04 // minutos simulados
    const clonA = structuredClone(banco.viajes)
    const clonB = structuredClone(banco.viajes)
    avanzarLasMotos(clonA, { ...foto, relojMin: foto.relojMin + d }, { generacion: estado().generacion })
    avanzarLasMotos(clonB, { ...foto, relojMin: foto.relojMin + 2 * d }, { generacion: estado().generacion })
    for (const [n, antes] of encontradas) {
      const avanceA = clonA.porMoto.get(n).recorrido - antes.recorrido
      const avanceB = clonB.porMoto.get(n).recorrido - antes.recorrido
      expect(avanceA, `moto ${n} avanza`).toBeGreaterThan(0)
      expect(avanceB / avanceA, `moto ${n}`).toBeCloseTo(2, 5)
    }
  })

  it('al cambiar la velocidad, el ritmo cambia en el cuadro siguiente', () => {
    prepararCorrida({ velocidad: 1 })
    const banco = crearBanco()
    let encontradas = []
    for (let i = 0; i < 60 * 600 && encontradas.length < 1; i += 1) {
      banco.cuadro()
      encontradas = motosEnCrucero(banco.viajes)
    }
    expect(encontradas.length).toBeGreaterThanOrEqual(1)
    const [n] = encontradas[0]
    const recorrido = () => banco.viajes.porMoto.get(n).recorrido
    const reloj = () => estado().foto.relojMin

    const r0 = recorrido()
    const t0 = reloj()
    banco.cuadro()
    const avanceLento = recorrido() - r0
    const minutosLento = reloj() - t0

    estado().cambiarVelocidad(4)
    const r1 = recorrido()
    const t1 = reloj()
    banco.cuadro() // el cuadro siguiente al cambio
    const avanceRapido = recorrido() - r1
    const minutosRapido = reloj() - t1

    expect(minutosRapido / minutosLento).toBeCloseTo(4, 6)
    expect(avanceRapido / avanceLento).toBeCloseTo(4, 3)
  })

  it('a velocidad muy alta, un viaje que dura menos que un cuadro deja a la moto directamente en su destino', () => {
    prepararCorrida({ velocidad: 60 })
    const banco = crearBanco()
    let llegadasDeGolpe = 0
    for (let i = 0; i < 60 * 120; i += 1) {
      banco.cuadro()
      for (const viaje of banco.viajes.porMoto.values()) {
        // un viaje corto que lleva un minuto simulado (un cuadro a 60 min/s) en camino ya terminó,
        // salvo que esté esperando su turno (entonces su hora de salida se atrasa)
        if (viaje.duracion > 0 && viaje.duracion < 0.5 && estado().foto.relojMin - viaje.salioEnMin >= 1) {
          expect(viaje.recorrido).toBe(viaje.largo)
          llegadasDeGolpe += 1
        }
      }
    }
    expect(llegadasDeGolpe).toBeGreaterThan(0)
  })
})

describe('un solo dueño del motor a la vez', () => {
  /** Cuenta cuántas veces se avanza el motor actual, por cada vía. */
  function vigilarElMotor() {
    const motor = estado().motor
    const cuentas = { avanzar: 0, correrHoras: 0 }
    const avanzar = motor.avanzar.bind(motor)
    const correrHoras = motor.correrHoras.bind(motor)
    motor.avanzar = (...a) => {
      cuentas.avanzar += 1
      return avanzar(...a)
    }
    motor.correrHoras = (...a) => {
      cuentas.correrHoras += 1
      return correrHoras(...a)
    }
    return cuentas
  }

  it('mientras corre la corrida larga el ciclo de animación no avanza el motor', () => {
    prepararCorrida({ velocidad: 10 })
    estado().empezarCorridaLarga(30)
    const cuentas = vigilarElMotor()
    const banco = crearBanco()
    let cuadros = 0
    while (estado().corridaLarga && cuadros < 10000) {
      const motos = banco.cuadro()
      // mientras la corrida larga sigue en marcha, la escena no anima ni dibuja
      if (estado().corridaLarga) expect(motos, 'la escena no anima ni dibuja').toBeNull()
      cuadros += 1
    }
    expect(estado().corridaLarga).toBeNull()
    expect(cuentas.avanzar).toBe(0)
    expect(cuentas.correrHoras).toBeGreaterThan(0)
  })

  it('Iniciar no hace nada mientras corre la corrida larga, y al terminar queda en pausa', () => {
    prepararCorrida({ velocidad: 10 })
    estado().empezarCorridaLarga(20)
    estado().iniciar()
    expect(estado().corriendo).toBe(false)
    const banco = crearBanco()
    while (estado().corridaLarga) banco.cuadro()
    expect(estado().corriendo).toBe(false)
    // y lista para Iniciar
    estado().iniciar()
    expect(estado().corriendo).toBe(true)
  })

  it('avanzarCuadro, llamado a mano durante la corrida larga, tampoco avanza el motor', () => {
    prepararCorrida({ velocidad: 10 })
    estado().empezarCorridaLarga(30)
    const cuentas = vigilarElMotor()
    for (let i = 0; i < 50; i += 1) estado().avanzarCuadro(16)
    expect(cuentas.avanzar).toBe(0)
  })

  it('fuera de la corrida larga, el ciclo solo avanza el motor por avanzar, nunca por correrHoras', () => {
    prepararCorrida({ velocidad: 10 })
    const cuentas = vigilarElMotor()
    crearBanco().cuadros(120)
    expect(cuentas.avanzar).toBeGreaterThan(0)
    expect(cuentas.correrHoras).toBe(0)
  })

  it('un cuadro del ciclo avanza el motor una sola vez', () => {
    prepararCorrida({ velocidad: 10 })
    const cuentas = vigilarElMotor()
    const banco = crearBanco()
    banco.cuadro() // el primero solo fija el instante
    const antes = cuentas.avanzar
    banco.cuadro()
    expect(cuentas.avanzar - antes).toBe(1)
  })
})

/** Que lo que se dibuja sea exactamente lo que dice la foto: cada moto en su sitio, quieta, y ninguna de más. */
function esperarEscenaRecolocada(motos) {
  const destinos = sitiosDeLasMotos(estado().foto)
  expect(new Set(motos.map((m) => m.n))).toEqual(new Set(destinos.keys()))
  for (const moto of motos) {
    const { sitio } = destinos.get(moto.n)
    expect(moto.punto, `moto ${moto.n}`).toEqual(puntoDe(sitio))
    expect(moto.saliendo).toBe(false)
  }
}

describe('recolocar en lugar de animar', () => {
  /** Una escena con motos a medio camino, para que «descartar lo recordado» importe. */
  function bancoEnMarcha(velocidad = 5) {
    prepararCorrida({ velocidad })
    const banco = crearBanco()
    banco.cuadros(60 * 90)
    expect(banco.viajes.porMoto.size, 'hay motos').toBeGreaterThan(5)
    return banco
  }

  /** Lo que hace cada acción que reemplaza el motor o salta el estado. */
  const ACCIONES = {
    Reiniciar: () => estado().reiniciar(),
    'cambiar un parámetro que reinicia': () => estado().cambiarParametro('placas', 6),
    'cambiar la proporción de un plan': () => estado().cambiarProporcion(1, 0.3),
    'cambiar la semilla': () => estado().cambiarSemilla(99),
    'cambiar de escenario': () => estado().elegirEscenario(ESCENARIOS[1].id),
    'Restablecer valores': () => estado().restablecerValores(),
    'entrar a la visita': () => estado().entrarEnLaVisita(),
  }

  it.each(Object.entries(ACCIONES))('tras %s, la escena se recoloca sin animar lo que recordaba', (_nombre, accion) => {
    const banco = bancoEnMarcha()
    const generacion = estado().generacion
    accion()
    expect(estado().generacion).toBeGreaterThan(generacion)
    esperarEscenaRecolocada(banco.cuadro())
    expect(banco.viajes.porMoto.size).toBeLessThanOrEqual(sitiosDeLasMotos(estado().foto).size)
  })

  it.each(Object.entries(ACCIONES))('tras %s, Iniciar anima de nuevo y la escena queda limpia', (_nombre, accion) => {
    const banco = bancoEnMarcha()
    accion()
    banco.cuadro()
    estado().iniciar()
    let cambioAlgo = false
    let anterior = JSON.stringify(banco.cuadro())
    for (let i = 0; i < 60 * 120; i += 1) {
      const motos = banco.cuadro()
      const ahora = JSON.stringify(motos)
      if (ahora !== anterior) cambioAlgo = true
      anterior = ahora
      // nada de motos de la corrida anterior: ningún número fuera de lo que la foto o su salida explican
      expect(banco.viajes.porMoto.size).toBeLessThan(60)
    }
    expect(cambioAlgo, 'la escena se anima').toBe(true)
  })

  it('salir de la visita (volver al modo normal) recoloca', () => {
    estado().entrarEnLaVisita()
    estado().iniciar()
    estado().cambiarVelocidad(10)
    const banco = crearBanco()
    banco.cuadros(60 * 30)
    const generacion = estado().generacion
    estado().volverAlModoNormal()
    expect(estado().generacion).toBeGreaterThan(generacion)
    esperarEscenaRecolocada(banco.cuadro())
  })

  it('el fin de la visita deja la escena quieta y coherente con la foto final', () => {
    estado().entrarEnLaVisita()
    estado().cambiarVelocidad(60)
    estado().iniciar()
    const banco = crearBanco()
    let cuadros = 0
    while (!estado().visita?.terminada && cuadros < 60 * 120) {
      banco.cuadro()
      cuadros += 1
    }
    expect(estado().visita.terminada).toBe(true)
    expect(estado().corriendo).toBe(false)
    const final = banco.cuadro()
    esperarEscenaRecolocada(final)
    // y se queda quieta
    expect(banco.cuadros(120)).toEqual(final)
  })

  it('al terminar la corrida larga, la escena se recoloca con el estado final y queda en pausa', () => {
    const banco = bancoEnMarcha()
    estado().empezarCorridaLarga(60)
    while (estado().corridaLarga) banco.cuadro()
    expect(estado().corriendo).toBe(false)
    const motos = banco.cuadro()
    esperarEscenaRecolocada(motos)
    expect(banco.cuadros(60)).toEqual(motos)
  })

  it('cancelar la corrida larga (Reiniciar a mitad) deja la escena limpia y lista para Iniciar', () => {
    const banco = bancoEnMarcha()
    estado().empezarCorridaLarga(200)
    for (let i = 0; i < 3; i += 1) banco.cuadro()
    expect(estado().corridaLarga).not.toBeNull()
    estado().reiniciar()
    expect(estado().corridaLarga).toBeNull()
    expect(estado().corriendo).toBe(false)
    esperarEscenaRecolocada(banco.cuadro())
    estado().iniciar()
    banco.cuadros(60 * 60)
    expect(banco.viajes.porMoto.size).toBeLessThan(60)
  })

  it('despues de Iniciar, corrida larga con la animación corriendo, Reiniciar e Iniciar, la escena queda limpia y anima', () => {
    const banco = bancoEnMarcha(10)
    estado().empezarCorridaLarga(100)
    while (estado().corridaLarga) banco.cuadro()
    estado().reiniciar()
    esperarEscenaRecolocada(banco.cuadro())
    expect(estado().foto.relojMin).toBe(0)
    estado().iniciar()
    banco.cuadros(60 * 200)
    expect(estado().foto.relojMin).toBeGreaterThan(100)
    expect(banco.viajes.porMoto.size).toBeLessThan(60)
  })

  it('si pasó mucho tiempo real entre cuadros (la pestaña estuvo oculta), se recoloca', () => {
    const banco = bancoEnMarcha()
    // un cuadro que llega un minuto después: el store solo avanza lo que permite su tope
    const motos = banco.cuadro(60)
    esperarEscenaRecolocada(motos)
    expect(SALTO_MAXIMO_DE_TIEMPO_REAL_S).toBeLessThan(60)
  })

  it('si el reloj retrocede o salta de golpe, se recoloca', () => {
    const banco = bancoEnMarcha()
    const foto = estado().foto
    const salto = avanzarLasMotos(banco.viajes, { ...foto, relojMin: foto.relojMin + 500 }, { generacion: estado().generacion })
    esperarEscenaRecolocada(salto.map((m) => ({ ...m })))
  })

  it('nunca queda una moto de una corrida anterior en la escena', () => {
    const banco = bancoEnMarcha()
    const numerosAntes = [...banco.viajes.porMoto.keys()]
    expect(numerosAntes.length).toBeGreaterThan(5)
    estado().reiniciar()
    expect(estado().foto.relojMin).toBe(0)
    // solo lo que dice la foto nueva (en el minuto 0), aunque los números se repitan
    esperarEscenaRecolocada(banco.cuadro())
    expect(banco.viajes.porMoto.size).toBe(sitiosDeLasMotos(estado().foto).size)
  })
})

describe('las motos que no caben en el dibujo no se apilan: se cuentan', () => {
  it('con una corrida larga (miles en fila), tras recolocar y seguir, solo se dibujan las que caben', () => {
    prepararCorrida({ velocidad: 10 })
    estado().empezarCorridaLarga(300)
    const banco = crearBanco()
    while (estado().corridaLarga) banco.cuadro()
    const foto = estado().foto
    expect(foto.colaAcabado.length, 'hay una fila larga').toBeGreaterThan(TOPE_DE_MOTOS_DIBUJADAS.acabado * 4)
    estado().iniciar()
    let masDibujadas = 0
    for (let i = 0; i < 60 * 240; i += 1) {
      const motos = banco.cuadro()
      masDibujadas = Math.max(masDibujadas, motos.length)
      expect(banco.viajes.porMoto.size).toBeLessThan(60)
    }
    // las placas, los puestos, las dos filas con su tope y algunas más de camino
    expect(masDibujadas).toBeLessThan(45)
  }, 60000)

  it('las que salen de la fila oculta lo hacen del final de su fila, no de una avenida', () => {
    prepararCorrida({ velocidad: 10 })
    estado().empezarCorridaLarga(300)
    const banco = crearBanco()
    while (estado().corridaLarga) banco.cuadro()
    estado().iniciar()
    const enAvenida = ([x, , z]) => x < -11.2 || z < -12.2
    let enAvenidas = 0
    for (let i = 0; i < 60 * 240; i += 1) {
      const motos = banco.cuadro()
      // en las avenidas solo puede haber las que de verdad entran o salen: pocas, no decenas
      enAvenidas = Math.max(enAvenidas, motos.filter((m) => enAvenida(m.punto)).length)
    }
    expect(enAvenidas).toBeLessThan(8)
  }, 60000)
})

describe('el costo de cada cuadro depende de las motos que se dibujan, no del total en fila', () => {
  it('en un cuadro normal no se recorre la fila entera, aunque tenga cien mil motos', () => {
    prepararCorrida({ velocidad: 1 })
    const banco = crearBanco()
    banco.cuadros(60 * 30)
    let accesos = 0
    const original = estado().foto.colaAcabado
    const larga = new Proxy(
      [...original, ...Array.from({ length: 100000 }, (_, i) => ({ n: 100000 + i, plan: 2, precargada: false }))],
      {
        get(objetivo, clave, receptor) {
          if (typeof clave === 'string' && /^\d+$/.test(clave)) accesos += 1
          return Reflect.get(objetivo, clave, receptor)
        },
      },
    )
    const foto = { ...estado().foto, colaAcabado: larga }
    // un cuadro más del reloj, sin ningún cambio de destino que obligue a mirar más allá del tope
    avanzarLasMotos(banco.viajes, { ...foto, relojMin: foto.relojMin + 0.0001 }, { generacion: estado().generacion })
    expect(accesos).toBeLessThan(200)
  })
})

describe('el modo visita: el mismo principio, con el reloj de la tarde', () => {
  it('pausar congela y la velocidad responde en el cuadro siguiente', () => {
    estado().entrarEnLaVisita()
    estado().cambiarVelocidad(1)
    estado().iniciar()
    const banco = crearBanco()
    banco.cuadros(60 * 60)
    estado().pausar()
    const quieta = banco.cuadro()
    expect(banco.cuadros(120)).toEqual(quieta)

    estado().iniciar()
    banco.cuadro()
    const t0 = estado().foto.relojMin
    banco.cuadro()
    const lento = estado().foto.relojMin - t0
    estado().cambiarVelocidad(5)
    const t1 = estado().foto.relojMin
    banco.cuadro()
    const rapido = estado().foto.relojMin - t1
    expect(rapido / lento).toBeCloseTo(5, 6)
  })
})

describe('el corredor de detrás de los puestos', () => {
  it.each([1, 10, 60])('a %s min/s, nunca hay una moto que entra y otra que sale de frente dentro de él', (velocidad) => {
    prepararCorrida({ velocidad, llegadasPorHora: 60, placas: 6 })
    let cuadrosConAmbasDirecciones = 0
    let cuadrosConGente = 0
    correr({
      minutos: 480,
      alCuadro: ({ motos }) => {
        const dentro = motos.filter(({ punto }) => estaEnElCorredor(punto))
        if (dentro.length > 0) cuadrosConGente += 1
        if (dentro.some((m) => m.saliendo) && dentro.some((m) => !m.saliendo)) cuadrosConAmbasDirecciones += 1
      },
    })
    expect(cuadrosConGente, 'el corredor se usó').toBeGreaterThan(0)
    expect(cuadrosConAmbasDirecciones).toBe(0)
  })
})

describe('la salida', () => {
  it('cada moto sale por la avenida por la que entró, por el carril contrario', () => {
    prepararCorrida({ velocidad: 10 })
    const vistas = new Set()
    correr({
      minutos: 240,
      alCuadro: ({ viajes }) => {
        for (const [n, viaje] of viajes.porMoto) {
          if (!viaje.saliendo || vistas.has(n)) continue
          vistas.add(n)
          const clave = entradaDeLaMoto(n).clave
          expect(viaje.camino.at(-1), `moto ${n}`).toEqual(curvaDeSalida(clave).at(-1))
        }
      },
    })
    expect(vistas.size).toBeGreaterThan(3)
  })

  it('las motos que salieron se olvidan: no se acumulan viajes', () => {
    prepararCorrida({ velocidad: 10 })
    let masMotos = 0
    const { viajes } = correr({
      minutos: 480,
      alCuadro: ({ viajes: vivos }) => {
        masMotos = Math.max(masMotos, vivos.porMoto.size)
      },
    })
    expect(masMotos).toBeLessThan(60)
    expect(viajes.porMoto.size).toBeLessThan(60)
  })

  it('el camino de salida de un puesto acaba en la avenida, fuera del local', () => {
    for (const clave of ['guaimaral', 'granColombia']) {
      const camino = caminoDeSalida(sitioEnPuesto(0, 3), clave)
      expect(largoDelCamino(camino)).toBeGreaterThan(MOTO.largo)
    }
  })
})

describe('adónde va cada moto', () => {
  it('las motos de la foto van a su placa, su puesto o su lugar en una fila', () => {
    prepararCorrida({ velocidad: 10 })
    correr({ minutos: 120 })
    const foto = estado().foto
    const destinos = sitiosDeLasMotos(foto)
    const enLaFoto =
      foto.placas.filter((p) => p.moto).length +
      foto.puestos.filter((p) => p.moto).length +
      Math.min(foto.colaLavado.length, 11) +
      Math.min(foto.colaAcabado.length, 8)
    expect(destinos.size).toBe(enLaFoto)
  })
})

describe('las motos de una misma fila no se montan unas sobre otras', () => {
  /** La menor distancia, en metros, entre dos motos que están sobre la línea de una misma fila, y quiénes eran. */
  function distanciaMinimaEnFila(velocidad, { minutos = 480, llegadasPorHora = 45 } = {}) {
    prepararCorrida({ velocidad, llegadasPorHora })
    let minima = Infinity
    let quienes = null
    let cuadrosConFila = 0
    correr({
      minutos,
      alCuadro: ({ motos, viajes }) => {
        const porFila = { lavado: [], acabado: [] }
        for (const { n, punto } of motos) {
          const sitio = viajes.porMoto.get(n)?.sitio
          if (sitio?.zona === 'fila' && enLaLineaDeLaFila(punto, sitio.etapa)) {
            porFila[sitio.etapa].push({ n, punto, indice: sitio.indice })
          }
        }
        for (const lista of Object.values(porFila)) {
          if (lista.length > 1) cuadrosConFila += 1
          for (let i = 0; i < lista.length; i += 1) {
            for (let j = i + 1; j < lista.length; j += 1) {
              const d = Math.hypot(lista[i].punto[0] - lista[j].punto[0], lista[i].punto[2] - lista[j].punto[2])
              if (d < minima) {
                minima = d
                quienes = [lista[i], lista[j]].map(({ n, indice }) => ({ n, indice }))
              }
            }
          }
        }
      },
    })
    return { minima, quienes, cuadrosConFila }
  }

  it.each([1, 10, 60])('a %s min/s dos motos sobre la línea de una fila nunca están a menos de casi un largo', (velocidad) => {
    const { minima, quienes, cuadrosConFila } = distanciaMinimaEnFila(velocidad)
    expect(cuadrosConFila, 'había filas con varias motos').toBeGreaterThan(100)
    expect(minima, JSON.stringify(quienes)).toBeGreaterThanOrEqual(MOTO.largo * 0.95)
  })

  it('con pocas placas y mucha gente (las filas se llenan antes) tampoco', () => {
    const { minima, quienes } = distanciaMinimaEnFila(10, { minutos: 300, llegadasPorHora: 60 })
    expect(minima, JSON.stringify(quienes)).toBeGreaterThanOrEqual(MOTO.largo * 0.95)
  })
})
