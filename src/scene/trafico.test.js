import { readFileSync } from 'node:fs'

import { beforeEach, describe, expect, it } from 'vitest'

import { INICIO_OBSERVACION_MIN, MOTOS_VISITA } from '../data/visita.js'
import { crearGenerador } from '../engine/aleatorio.js'
import { useSimulacion } from '../store/simulacion.js'
import { darUnCuadro } from '../store/useCicloDeSimulacion.js'
import { CLAVES_DE_AMBIENTE } from './cargaDeModelos.js'
import { crearInstanciasDeAmbiente } from './instanciasDeAmbiente.js'
import { CURVAS_DE_ENTRADA } from './posiciones.js'
import { avanceDelReloj, crearMemoriaDelReloj, pasoDeLaAnimacion } from './relojDeLaEscena.js'
import {
  avanzarElTrafico,
  CARRILES,
  CARROS_POR_CARRIL,
  crearTrafico,
  escalaDelCarro,
  estaEnElCruce,
  HUECO_ENTRE_CARROS,
  LARGO_DEL_CARRIL,
  momentoDeLaAparicion,
  MODELOS_DE_CARROS,
  MODELOS_DEL_TRAFICO,
  MODELOS_ESPECIALES,
  motosEnLasZonas,
  posicionDelCarro,
  SEMILLA_DEL_TRAFICO_EN_LA_VISITA,
  uDelCarril,
  VELOCIDAD_DEL_TRAFICO,
  VENTANA_DE_LAS_APARICIONES,
  ZONAS_DE_MOTOS,
} from './trafico.js'
import { animarLaEscena, crearViajes } from './viajes.js'

const CUADRO = 1 / 60
const moto = (x, z) => ({ punto: [x, 0, z] })
const posiciones = (t) => t.carros.map((c) => [c.id, c.u])

/** Avanza `segundos` de animación en cuadros de 1/60 s. */
function correrElTrafico(trafico, segundos, datos = {}) {
  for (let i = 0; i < Math.round(segundos / CUADRO); i += 1) avanzarElTrafico(trafico, { segundos: CUADRO, ...datos })
}

describe('los cuatro carriles', () => {
  it('son los mismos por los que entran y salen las motos, en sentidos contrarios por avenida', () => {
    const [entradaGuaimaral] = CURVAS_DE_ENTRADA.guaimaral
    const [entradaGranColombia] = CURVAS_DE_ENTRADA.granColombia
    const claves = Object.fromEntries(CARRILES.map((c) => [c.clave, c]))
    expect(CARRILES).toHaveLength(4)
    expect(claves.guaimaralA).toMatchObject({ eje: 'z', fijo: entradaGuaimaral[0], sentido: -1 })
    expect(claves.guaimaralB).toMatchObject({ eje: 'z', fijo: entradaGuaimaral[0] - 2.5, sentido: 1 })
    expect(claves.granColombiaA).toMatchObject({ eje: 'x', fijo: entradaGranColombia[2], sentido: 1 })
    expect(claves.granColombiaB).toMatchObject({ eje: 'x', fijo: entradaGranColombia[2] - 2.5, sentido: -1 })
  })

  it('al recolocar hay carros en los cuatro y ninguno se solapa con otro', () => {
    const trafico = crearTrafico({ semilla: 7 })
    for (const carril of CARRILES) {
      const delCarril = trafico.carros.filter((c) => c.carril === carril.clave).sort((a, b) => a.u - b.u)
      expect(delCarril).toHaveLength(CARROS_POR_CARRIL)
      for (let i = 1; i < delCarril.length; i += 1) {
        const hueco = delCarril[i].u - delCarril[i].largo / 2 - (delCarril[i - 1].u + delCarril[i - 1].largo / 2)
        expect(hueco).toBeGreaterThanOrEqual(HUECO_ENTRE_CARROS)
      }
    }
  })

  it('los carros miran hacia donde avanzan', () => {
    const trafico = crearTrafico({ semilla: 7 })
    const rumbos = Object.fromEntries(
      CARRILES.map((carril) => [carril.clave, posicionDelCarro(trafico.carros.find((c) => c.carril === carril.clave)).rumbo]),
    )
    expect(rumbos.guaimaralA).toBeCloseTo(Math.PI, 6)
    expect(rumbos.guaimaralB).toBeCloseTo(0, 6)
    expect(rumbos.granColombiaA).toBeCloseTo(Math.PI / 2, 6)
    expect(rumbos.granColombiaB).toBeCloseTo(-Math.PI / 2, 6)
  })
})

describe('recolocar es determinista', () => {
  it('dos recolocaciones con los mismos datos dan lo mismo, y con otra semilla, otra cosa', () => {
    expect(crearTrafico({ semilla: 7 })).toEqual(crearTrafico({ semilla: 7 }))
    expect(posiciones(crearTrafico({ semilla: 7 }))).not.toEqual(posiciones(crearTrafico({ semilla: 8 })))
  })

  it('después de recorrer un rato, recolocar vuelve a empezar desde cero', () => {
    const trafico = crearTrafico({ semilla: 3 })
    correrElTrafico(trafico, 20)
    expect(posiciones(trafico)).not.toEqual(posiciones(crearTrafico({ semilla: 3 })))
    expect(crearTrafico({ semilla: 3 })).toEqual(crearTrafico({ semilla: 3 }))
  })
})

describe('el tráfico se mueve con el reloj de la escena', () => {
  it('en pausa (0 segundos de animación) no se mueve nada, ni con minutos en cero', () => {
    const trafico = crearTrafico({ semilla: 5 })
    const antes = posiciones(trafico)
    for (let i = 0; i < 120; i += 1) {
      avanzarElTrafico(trafico, { segundos: pasoDeLaAnimacion(CUADRO, 0), minutos: 0 })
    }
    expect(posiciones(trafico)).toEqual(antes)
  })

  it('corriendo, cada carro avanza a la velocidad del tráfico', () => {
    const trafico = crearTrafico({ semilla: 5 })
    const antes = new Map(trafico.carros.map((c) => [c.id, c.u]))
    correrElTrafico(trafico, 1)
    const adelantado = trafico.carros.filter((c) => c.u > antes.get(c.id) + VELOCIDAD_DEL_TRAFICO * 0.9)
    expect(adelantado.length).toBeGreaterThan(trafico.carros.length / 2)
  })

  it('al reanudar sigue desde donde estaba, sin saltos', () => {
    const trafico = crearTrafico({ semilla: 5 })
    correrElTrafico(trafico, 3)
    const pausado = posiciones(trafico)
    correrElTrafico(trafico, 2, { segundos: 0 })
    expect(posiciones(trafico)).toEqual(pausado)
    avanzarElTrafico(trafico, { segundos: CUADRO })
    const despues = posiciones(trafico)
    despues.forEach(([id, u], i) => {
      expect(u - pausado[i][1]).toBeLessThanOrEqual(VELOCIDAD_DEL_TRAFICO * CUADRO + 1e-9)
      expect(id).toBe(pausado[i][0])
    })
  })

  it('los carros nacen y se van achicándose dentro de la niebla de los extremos del carril', () => {
    expect(escalaDelCarro({ u: 0 })).toBe(0)
    expect(escalaDelCarro({ u: LARGO_DEL_CARRIL })).toBe(0)
    expect(escalaDelCarro({ u: LARGO_DEL_CARRIL / 2 })).toBe(1)
  })
})

describe('los carros guardan la distancia y no se solapan en ninguna situación', () => {
  it('en una corrida larga con motos que van y vienen, nunca hay dos carros a menos del hueco', () => {
    const trafico = crearTrafico({ semilla: 11 })
    const azar = crearGenerador(5) // solo para el banco de pruebas: el tráfico no lo usa
    let motos = []
    let masCercano = Infinity
    for (let cuadro = 0; cuadro < 60 * 400; cuadro += 1) {
      if (cuadro % 90 === 0) {
        // De vez en cuando hay una moto en la zona de alguna boca, y luego deja de haberla.
        motos = azar() < 0.6 ? [moto(-12.25, 4 + azar() * 10)] : azar() < 0.5 ? [moto(-10 - azar() * 8, -13.5)] : []
      }
      avanzarElTrafico(trafico, { segundos: CUADRO, motos })
      for (const carril of CARRILES) {
        const delCarril = trafico.carros.filter((c) => c.carril === carril.clave).sort((a, b) => a.u - b.u)
        for (let i = 1; i < delCarril.length; i += 1) {
          const hueco = delCarril[i].u - delCarril[i].largo / 2 - (delCarril[i - 1].u + delCarril[i - 1].largo / 2)
          masCercano = Math.min(masCercano, hueco)
        }
      }
    }
    expect(masCercano).toBeGreaterThanOrEqual(HUECO_ENTRE_CARROS - 1e-6)
  })
})

describe('esperan antes de la boca ocupada y reanudan', () => {
  /** Un tráfico de un solo carro en el carril, a 20 m de la zona de motos. */
  function conUnCarroAntesDeLaZona(clave, motos) {
    const trafico = crearTrafico({ semilla: 1 })
    const carril = CARRILES.find((c) => c.clave === clave)
    trafico.carros = [
      { id: 1, carril: clave, modelo: 'mazda', largo: 4.2, u: 0, oculto: false, esperando: false, especial: false },
    ]
    trafico.especiales.forEach((e) => {
      e.salio = true
    })
    const zona = ZONAS_DE_MOTOS[carril.avenida]
    const entrada = Math.min(uDelCarril(carril, zona.desde), uDelCarril(carril, zona.hasta))
    trafico.carros[0].u = entrada - 20
    return { trafico, carro: trafico.carros[0], entrada }
  }

  it.each([
    ['guaimaralA', moto(-12.25, 10)],
    ['guaimaralB', moto(-14.75, 6)],
    ['granColombiaA', moto(-12, -13)],
    ['granColombiaB', moto(-9, -15.5)],
  ])('en %s el carro se detiene antes de la zona mientras la moto esté, y sigue cuando se va', (clave, unaMoto) => {
    const { trafico, carro, entrada } = conUnCarroAntesDeLaZona(clave, [unaMoto])
    correrElTrafico(trafico, 8, { motos: [unaMoto] })
    expect(carro.esperando).toBe(true)
    expect(carro.u + carro.largo / 2).toBeLessThanOrEqual(entrada)
    const quieto = carro.u
    correrElTrafico(trafico, 2, { motos: [unaMoto] })
    expect(carro.u).toBeCloseTo(quieto, 6)
    // la moto se va: el carro reanuda
    correrElTrafico(trafico, 2, { motos: [] })
    expect(carro.u).toBeGreaterThan(quieto + 5)
    expect(carro.esperando).toBe(false)
  })

  it('una moto en una avenida no detiene a los carros de la otra', () => {
    const { trafico, carro } = conUnCarroAntesDeLaZona('granColombiaA', [moto(-12.25, 10)])
    const antes = carro.u
    correrElTrafico(trafico, 2, { motos: [moto(-12.25, 10)] })
    expect(carro.u).toBeGreaterThan(antes + 10)
  })

  it('un carro que ya está dentro de la zona sigue su camino aunque llegue una moto', () => {
    const { trafico, carro, entrada } = conUnCarroAntesDeLaZona('guaimaralA', [])
    carro.u = entrada + 5
    const antes = carro.u
    correrElTrafico(trafico, 1, { motos: [moto(-12.25, 12)] })
    expect(carro.u).toBeGreaterThan(antes + 3)
  })

  it('las zonas de motos se reconocen por su avenida', () => {
    expect(motosEnLasZonas([moto(-12.25, 10)])).toEqual({ guaimaral: true, granColombia: false })
    expect(motosEnLasZonas([moto(-8, -15)])).toEqual({ guaimaral: false, granColombia: true })
    expect(motosEnLasZonas([moto(5, 5)])).toEqual({ guaimaral: false, granColombia: false })
    expect(motosEnLasZonas([])).toEqual({ guaimaral: false, granColombia: false })
  })
})

describe('el cruce de las dos avenidas', () => {
  it('nunca hay a la vez un carro de la Guaimaral y uno de la Gran Colombia en el cruce', () => {
    const trafico = crearTrafico({ semilla: 21 })
    let juntos = 0
    let esperasEnElCruce = 0
    for (let cuadro = 0; cuadro < 60 * 600; cuadro += 1) {
      avanzarElTrafico(trafico, { segundos: CUADRO })
      const dentro = trafico.carros.filter(estaEnElCruce)
      const avenidas = new Set(dentro.map((c) => CARRILES.find((k) => k.clave === c.carril).avenida))
      if (avenidas.size > 1) juntos += 1
      if (trafico.carros.some((c) => c.esperando)) esperasEnElCruce += 1
    }
    expect(juntos).toBe(0)
    expect(esperasEnElCruce).toBeGreaterThan(0)
  })
})

describe('las apariciones especiales', () => {
  const pasadas = (trafico, minutosTotales, modelo) => {
    let vistas = 0
    let visibleAntes = false
    for (let m = 0; m < minutosTotales; m += 0.25) {
      avanzarElTrafico(trafico, { segundos: 0.25 * 1.5, minutos: 0.25 })
      const hay = trafico.carros.some((c) => c.modelo === modelo)
      if (hay && !visibleAntes) vistas += 1
      visibleAntes = hay
    }
    return vistas
  }

  it('cada una pasa una sola vez en una corrida larga', () => {
    const trafico = crearTrafico({ semilla: 42 })
    expect(pasadas(trafico, 600, 'patrulla')).toBe(1)
    const otro = crearTrafico({ semilla: 42 })
    expect(pasadas(otro, 600, 'banano')).toBe(1)
    expect(trafico.especiales.every((e) => e.salio)).toBe(true)
    // y se fueron: ya no queda ninguna
    expect(trafico.carros.some((c) => c.especial)).toBe(false)
  })

  it('el momento sale de la semilla y de un identificador: la misma semilla, el mismo momento', () => {
    for (const modelo of MODELOS_ESPECIALES) {
      expect(momentoDeLaAparicion(7, modelo)).toBe(momentoDeLaAparicion(7, modelo))
    }
    expect(crearTrafico({ semilla: 7 }).especiales.map((e) => e.momento)).toEqual(
      crearTrafico({ semilla: 7 }).especiales.map((e) => e.momento),
    )
    expect(momentoDeLaAparicion(7, 'patrulla')).not.toBe(momentoDeLaAparicion(7, 'banano'))
    expect(momentoDeLaAparicion(7, 'patrulla')).not.toBe(momentoDeLaAparicion(8, 'patrulla'))
  })

  it('el momento cae entre el minuto 10 y el 80 con cualquier semilla', () => {
    const { desde, hasta } = VENTANA_DE_LAS_APARICIONES
    for (let semilla = 0; semilla < 300; semilla += 1) {
      for (const modelo of MODELOS_ESPECIALES) {
        const momento = momentoDeLaAparicion(semilla, modelo)
        expect(momento).toBeGreaterThanOrEqual(desde)
        expect(momento).toBeLessThanOrEqual(hasta)
      }
    }
  })

  it('en la visita pasan una sola vez, en un momento fijo que cabe dentro de la visita', () => {
    const visita = crearTrafico({ enLaVisita: true })
    const otraVisita = crearTrafico({ enLaVisita: true, semilla: 999 })
    expect(visita.especiales.map((e) => e.momento)).toEqual(otraVisita.especiales.map((e) => e.momento))
    expect(visita.base).toBe(SEMILLA_DEL_TRAFICO_EN_LA_VISITA)
    const duracionDeLaVisita = Math.max(...MOTOS_VISITA.map((m) => m.finAcabadoMin)) - INICIO_OBSERVACION_MIN
    for (const { momento } of visita.especiales) expect(momento).toBeLessThan(duracionDeLaVisita)
    expect(pasadas(visita, duracionDeLaVisita, 'patrulla')).toBe(1)
  })
})

describe('qué modelos usa el tráfico', () => {
  it('son carros de ambiente y ninguno es una moto', () => {
    expect([...MODELOS_DEL_TRAFICO].sort()).toEqual(['banano', 'deportivo', 'mazda', 'patrulla'])
    for (const clave of MODELOS_DEL_TRAFICO) {
      expect(CLAVES_DE_AMBIENTE).toContain(clave)
      expect(clave).not.toMatch(/moto/i)
    }
    // los normales son solo el Mazda y el deportivo; la patrulla y el banano son apariciones especiales
    const trafico = crearTrafico({ semilla: 9 })
    expect(new Set(trafico.carros.map((c) => c.modelo))).toEqual(new Set(MODELOS_DE_CARROS))
  })
})

describe('el tráfico no toca el motor', () => {
  const fuente = readFileSync('src/scene/trafico.js', 'utf8')

  it('no importa nada del motor, no usa Math.random y no usa el generador aleatorio', () => {
    expect(fuente).not.toMatch(/from '\.\.\/engine/)
    expect(fuente).not.toContain('Math.random')
    expect(fuente).not.toContain('crearGenerador')
  })

  it('la secuencia aleatoria del motor es idéntica con y sin tráfico', () => {
    const sinTrafico = crearGenerador(7)
    const esperada = Array.from({ length: 50 }, () => sinTrafico())
    const conTrafico = crearGenerador(7)
    const trafico = crearTrafico({ semilla: 7 })
    const obtenida = []
    for (let i = 0; i < 50; i += 1) {
      avanzarElTrafico(trafico, { segundos: CUADRO, minutos: 0.1 })
      obtenida.push(conTrafico())
    }
    expect(obtenida).toEqual(esperada)
  })
})

describe('el tráfico y las motos de una simulación larga', () => {
  const estado = () => useSimulacion.getState()
  const inicial = useSimulacion.getState()

  beforeEach(() => {
    useSimulacion.setState({ ...inicial })
  })

  /** Una tarde con mucha gente y entradas por las dos avenidas, a la velocidad dada. */
  function correrLaSimulacion({ conTrafico, velocidad = 10, minutos = 300 }) {
    useSimulacion.setState({ ...inicial })
    estado().cambiarSemilla(7)
    estado().cambiarParametro('llegadasPorHora', 60)
    estado().cambiarParametro('placas', 5)
    estado().cambiarVelocidad(velocidad)
    estado().iniciar()
    const viajes = crearViajes()
    const reloj = crearMemoriaDelReloj()
    const trafico = crearTrafico({ semilla: estado().semilla })
    let instante = 0
    let anterior = null
    let cuadros = 0
    let enLaCalzada = 0
    let coincidencias = 0
    let escondidos = 0
    const recorridos = []
    while (estado().foto.relojMin < minutos && cuadros < 60 * 60 * 20) {
      instante += CUADRO * 1000
      anterior = darUnCuadro(estado(), instante, anterior)
      const motos = animarLaEscena(viajes, estado(), CUADRO)
      cuadros += 1
      recorridos.push(motos?.map((m) => [m.n, ...m.punto]))
      if (!conTrafico || !motos) continue
      const { minutos: pasaron } = avanceDelReloj(reloj, {
        relojMin: estado().foto.relojMin,
        generacion: estado().generacion,
        segundosReales: CUADRO,
      })
      avanzarElTrafico(trafico, { segundos: pasoDeLaAnimacion(CUADRO, pasaron), minutos: pasaron, motos })
      const zonas = motosEnLasZonas(motos)
      if (zonas.guaimaral || zonas.granColombia) enLaCalzada += 1
      for (const carro of trafico.carros) {
        if (carro.oculto) {
          escondidos += 1
          continue
        }
        const { x, z } = posicionDelCarro(carro)
        const carril = CARRILES.find((c) => c.clave === carro.carril)
        for (const { punto } of motos) {
          const a = carril.eje === 'z' ? Math.abs(punto[2] - z) : Math.abs(punto[0] - x)
          const l = carril.eje === 'z' ? Math.abs(punto[0] - x) : Math.abs(punto[2] - z)
          if (a < carro.largo / 2 + 0.5 && l < 1.3) coincidencias += 1
        }
      }
    }
    return {
      metricas: estado().motor.metricas(),
      foto: estado().motor.estado(),
      recorridos,
      enLaCalzada,
      coincidencias,
      escondidos,
      cuadros,
    }
  }

  it('en ningún cuadro un carro visible y una moto ocupan el mismo sitio, con las dos entradas muy activas', () => {
    const corrida = correrLaSimulacion({ conTrafico: true })
    expect(corrida.foto.motosSalidas).toBeGreaterThan(5)
    // la prueba midió algo: hubo motos sobre las dos avenidas durante buena parte de la corrida
    expect(corrida.enLaCalzada).toBeGreaterThan(100)
    expect(corrida.coincidencias).toBe(0)
    // los carros que se esconden cuando una moto nace encima son una fracción mínima de lo que se dibuja
    expect(corrida.escondidos / (corrida.cuadros * 20)).toBeLessThan(0.05)
  })

  it('las métricas y los recorridos de las motos son idénticos con y sin tráfico', () => {
    const con = correrLaSimulacion({ conTrafico: true, minutos: 200 })
    const sin = correrLaSimulacion({ conTrafico: false, minutos: 200 })
    expect(con.metricas).toEqual(sin.metricas)
    expect(con.foto).toEqual(sin.foto)
    expect(con.recorridos).toEqual(sin.recorridos)
  })
})

describe('el tráfico se dibuja por instancias', () => {
  it('diez carros de dos modelos son las llamadas de dibujo de los dos modelos', async () => {
    const { BoxGeometry, Matrix4, MeshBasicMaterial } = await import('three')
    const modelo = () => ({ piezas: [{ geometry: new BoxGeometry(1, 1, 1), material: new MeshBasicMaterial(), local: new Matrix4() }] })
    const mazda = crearInstanciasDeAmbiente(modelo(), 24)
    const deportivo = crearInstanciasDeAmbiente(modelo(), 24)
    for (let i = 0; i < 6; i += 1) mazda.poner(i, new Matrix4())
    for (let i = 0; i < 4; i += 1) deportivo.poner(i, new Matrix4())
    mazda.fijar(6)
    deportivo.fijar(4)
    expect(mazda.llamadasDeDibujo() + deportivo.llamadasDeDibujo()).toBe(2)
    // a nivel 1 de la calidad (sin tráfico) no se dibuja nada
    mazda.mostrar(false)
    deportivo.mostrar(false)
    expect(mazda.llamadasDeDibujo() + deportivo.llamadasDeDibujo()).toBe(0)
  })

  it('el componente lee el interruptor de tráfico de la calidad y se oculta sin dejar rastro', () => {
    const escena = readFileSync('src/scene/EscenaDelLavadero.jsx', 'utf8')
    expect(escena).toContain('<Trafico visible={trafico} />')
    const componente = readFileSync('src/scene/Trafico.jsx', 'utf8')
    expect(componente).toContain('grupo.fijar(0)')
    expect(componente).toContain('if (!visible || corridaLarga)')
  })
})
