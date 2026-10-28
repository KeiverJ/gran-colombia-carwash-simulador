import { beforeEach, describe, expect, it } from 'vitest'

import { useSimulacion } from '../store/simulacion.js'
import { entradaDeLaMoto, MOTO } from './posiciones.js'
import {
  ATRASO_MAXIMO_EN_MINUTOS,
  caminoDeSalida,
  curvaDeSalida,
  estaEnElCorredor,
  largoDelCamino,
  sitioEnPuesto,
} from './trayectorias.js'
import { avanzarLasMotos, crearViajes, sitiosDeLasMotos } from './viajes.js'

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
 * Corre el motor cuadro a cuadro durante `minutos` minutos simulados. Con
 * `alCuadro`, se anima la escena en cada cuadro y se le avisa de lo que pasó.
 */
function correr({ minutos, alCuadro = null }) {
  const viajes = crearViajes()
  let cuadros = 0
  while (estado().foto.relojMin < minutos && cuadros < 60 * 60 * 20) {
    estado().avanzarCuadro(CUADRO_EN_SEGUNDOS * 1000)
    if (alCuadro) {
      const motos = avanzarLasMotos(viajes, estado().foto, {
        segundos: CUADRO_EN_SEGUNDOS,
        velocidadDeSimulacion: estado().velocidadMinPorSegundo,
      })
      alCuadro({ motos, viajes, foto: estado().foto })
    }
    cuadros += 1
  }
  return { viajes, cuadros }
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

  it('a 10 min/s, ninguna da un paso de más de 5 m por cuadro (el plazo entero dura 18 cuadros)', () => {
    expect(pasoMasLargo(10)).toBeLessThan(5)
  })
})

describe('el atraso respecto al motor está acotado', () => {
  it.each([1, 10, 60])('a %s min/s, una moto nunca sigue en camino con el plazo vencido más de 2 cuadros seguidos', (velocidad) => {
    prepararCorrida({ velocidad })
    const vencidoSeguidos = new Map()
    let peor = 0
    correr({
      minutos: 240,
      alCuadro: ({ viajes }) => {
        for (const [n, viaje] of viajes.porMoto) {
          // Esperando en la puerta del corredor no cuenta: es ceder el paso a la que viene de frente.
          const esperando =
            !viaje.enElCorredor && viaje.puertaDelCorredor !== null && viaje.recorrido < viaje.puertaDelCorredor
          const vencido = viaje.margenMin === 0 && viaje.recorrido < viaje.largo && !esperando
          const seguidos = vencido ? (vencidoSeguidos.get(n) ?? 0) + 1 : 0
          vencidoSeguidos.set(n, seguidos)
          peor = Math.max(peor, seguidos)
        }
      },
    })
    expect(peor).toBeLessThanOrEqual(2)
  })

  it('el plazo es el atraso máximo anotado', () => {
    expect(ATRASO_MAXIMO_EN_MINUTOS).toBeGreaterThan(0)
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
