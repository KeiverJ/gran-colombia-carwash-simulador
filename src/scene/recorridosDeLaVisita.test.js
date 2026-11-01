import { beforeAll, describe, expect, it } from 'vitest'

import { useSimulacion } from '../store/simulacion.js'
import { losasDe, losasQuePisa, estorbosDelCamino, muestrasDe } from './comprobacionesDeCaminos.js'
import { medirRecorridos, resumenDeLasLlegadasEnRuta } from './medirRecorridos.js'
import { entradaDeLaMoto, LOCAL, MOTO, posicionEnFila, TOPE_DE_MOTOS_DIBUJADAS } from './posiciones.js'
import {
  caminoDeLlegada,
  caminoDeSalida,
  caminoHacia,
  largoDelCamino,
  puntoDe,
  puntoMasCercano,
  sinRetrocesos,
  TOLERANCIA_DEL_EMPALME,
} from './trayectorias.js'
import { enLaLineaDeLaFila } from './viajes.js'

/**
 * Los recorridos de la visita del 17 de octubre, corrida entera a 1 minuto simulado por
 * segundo con el ciclo real de la aplicación. La referencia es la simulación aleatoria:
 * los dos modos usan el mismo sistema de caminos y solo cambian la placa (la anotada) y
 * las horas.
 */

const estado = () => useSimulacion.getState()
const inicial = useSimulacion.getState()
const PLACAS = 6
const PUESTOS = 3

/** Corre la aplicación con lo que prepare `preparar` a 1 min/s y devuelve las medidas. */
function correr(preparar, opciones) {
  useSimulacion.setState({ ...inicial })
  preparar()
  estado().cambiarVelocidad(1)
  estado().iniciar()
  return medirRecorridos(opciones)
}

const aleatoria = (semilla, llegadasPorHora) => () => {
  estado().cambiarSemilla(semilla)
  estado().cambiarParametro('llegadasPorHora', llegadasPorHora)
  estado().cambiarParametro('placas', PLACAS)
}

let visita
let aleatorias

beforeAll(() => {
  visita = correr(() => estado().entrarEnLaVisita(), { guardarCuadros: true })
  aleatorias = [correr(aleatoria(7, 20), { hastaMin: 300 }), correr(aleatoria(11, 45), { hastaMin: 300 })]
}, 240000)

/** Los puntos redondeados a la millonésima: las sumas de coma flotante no dan exactamente lo mismo. */
const redondeado = (camino) => camino.map((punto) => punto.map((valor) => Math.round(valor * 1e6) / 1e6 + 0))

const claseDe = (sitio) => (sitio && (sitio.zona === 'placa' || sitio.zona === 'puesto') ? `${sitio.zona} ${sitio.indice + 1}` : null)
/** Hasta dónde llega la línea de la fila del acabado por la izquierda: el último lugar donde se dibuja una moto. */
const xDelUltimoLugar = posicionEnFila(TOPE_DE_MOTOS_DIBUJADAS.acabado - 1, 'acabado')[0] - MOTO.largo / 2
const configuracion = { placas: PLACAS, puestos: PUESTOS }

describe('la visita completa a 1 min/s', () => {
  it('se reproduce entera: las 23 motos, hasta las 5:30 p. m.', () => {
    expect(visita.porMoto.size).toBe(23)
    expect(estado().visita?.terminada).toBeUndefined() // el store se reinició para la siguiente corrida
    expect(visita.cuadrosConMotos.at(-1).reloj).toBeCloseTo(140, 6)
    expect(visita.aPlaca).toHaveLength(22)
  })

  it('dos veces da exactamente los mismos caminos', () => {
    const otra = correr(() => estado().entrarEnLaVisita())
    expect(otra.viajes.map((v) => [v.n, v.hacia, v.camino])).toEqual(visita.viajes.map((v) => [v.n, v.hacia, v.camino]))
  })
})

describe('los mismos tramos que en la simulación aleatoria', () => {
  /** El camino que traza el sistema entre dos sitios de reposo, con las mismas funciones que usa el modo aleatorio. */
  function esperado(registro) {
    const avenida = entradaDeLaMoto(registro.n).clave
    if (!registro.sitioViejo) return caminoDeLlegada(avenida, registro.sitioNuevo)
    if (registro.sitioNuevo.zona === 'salida') return sinRetrocesos(caminoDeSalida(registro.sitioViejo, avenida))
    return sinRetrocesos(caminoHacia(registro.sitioViejo, registro.sitioNuevo))
  }

  // Salir de la fila 2 sin puesto solo se da en la visita: tiene su propia regla (ver más abajo).
  const soloDeLaVisita = (r) => r.desde.startsWith('fila acabado') && r.hacia === 'salida'

  it('cada camino que sale de un sitio de reposo es el que traza la simulación aleatoria entre esos dos sitios', () => {
    const enReposo = visita.viajes.filter((r) => r.enReposo && !soloDeLaVisita(r))
    expect(enReposo.length).toBeGreaterThan(60)
    for (const registro of enReposo) {
      expect(redondeado(registro.camino), `moto ${registro.n}: ${registro.desde} → ${registro.hacia}`).toEqual(
        redondeado(esperado(registro)),
      )
    }
  })

  it('el primer camino de cada moto sale de su avenida y llega a su lugar', () => {
    for (const registro of visita.viajes.filter((r) => r.desde === 'avenida')) {
      const fin = registro.camino.at(-1)
      expect(fin).toEqual(puntoDe(registro.sitioNuevo))
    }
  })
})

describe('nadie se replanifica de más', () => {
  it('a cada moto se le traza un camino nuevo solo si cambió su destino en la foto', () => {
    for (const datos of visita.porMoto.values()) {
      expect(datos.trazados, `moto ${datos.n}`).toBeLessThanOrEqual(1 + datos.cambios)
    }
  })
})

describe('una moto a la que le cambian el destino en ruta no da la vuelta por la fila', () => {
  const dePlacaEnRuta = () =>
    visita.viajes.filter((r) => r.enRuta && r.sitioViejo?.zona === 'fila' && r.sitioNuevo.zona === 'placa')

  it('hay motos en ese caso (la tabla las manda a la placa antes de que lleguen a la fila)', () => {
    expect(dePlacaEnRuta().length).toBeGreaterThanOrEqual(15)
  })

  it('si todavía van por el tramo que comparten con el camino directo, siguen por él y no por la fila', () => {
    let casos = 0
    for (const registro of dePlacaEnRuta()) {
      const directo = caminoDeLlegada(entradaDeLaMoto(registro.n).clave, registro.sitioNuevo)
      const cerca = puntoMasCercano(directo, registro.camino[0])
      if (cerca.distancia > TOLERANCIA_DEL_EMPALME) continue
      casos += 1
      const queSeguirPorElDirecto = largoDelCamino(directo) - cerca.metros
      expect(
        largoDelCamino(registro.camino),
        `moto ${registro.n} a las ${registro.reloj.toFixed(1)}`,
      ).toBeLessThanOrEqual(queSeguirPorElDirecto + 1)
    }
    expect(casos).toBeGreaterThan(5)
  })

  it('lo que recorre desde que llega hasta su placa no supera lo que recorren en el mismo caso las de la simulación aleatoria', () => {
    const deLaVisita = resumenDeLasLlegadasEnRuta(visita.aPlaca)
    const deLaAleatoria = resumenDeLasLlegadasEnRuta(aleatorias.flatMap((corrida) => corrida.aPlaca))
    expect(deLaVisita.enRuta).toBeGreaterThan(0)
    expect(deLaAleatoria.enRuta).toBeGreaterThan(10)
    expect(deLaVisita.razonPromedio).toBeLessThanOrEqual(deLaAleatoria.razonPromedio)
    expect(deLaVisita.razonMaxima).toBeLessThanOrEqual(deLaAleatoria.razonMaxima)
  })
})

describe('la salida directa desde la fila 2', () => {
  const salidas = () => visita.viajes.filter((r) => r.desde.startsWith('fila acabado') && r.hacia === 'salida')

  it('en la visita salen así las motos 5 y 16', () => {
    expect(salidas().map((r) => r.n)).toEqual([5, 16])
  })

  it('no corre por la línea de la fila donde esperan las demás', () => {
    for (const registro of salidas()) {
      const lugar = puntoDe(registro.sitioViejo)
      let sobreLaLinea = 0
      for (const { punto } of muestrasDe(registro.camino, 0.1)) {
        if (punto[0] < xDelUltimoLugar) continue // pasado el último lugar de la fila ya no espera nadie: es el pasillo
        const lejosDeSuLugar = Math.hypot(punto[0] - lugar[0], punto[2] - lugar[2]) > 1
        if (lejosDeSuLugar && Math.abs(punto[2] - LOCAL.zFilaAcabado) < 0.4) sobreLaLinea += 1
      }
      expect(sobreLaLinea, `moto ${registro.n}`).toBe(0)
    }
  })

  it('la moto 16 sale a las 4:30 p. m. sin acercarse a las que esperan a menos de dos anchos de moto', () => {
    const salida = salidas().find((r) => r.n === 16)
    expect(salida.reloj).toBeCloseTo(80, 0) // minuto 80 desde las 3:10 p. m.: las 4:30 p. m.
    let masCerca = Infinity
    for (const { reloj, motos } of visita.cuadrosConMotos) {
      const yo = motos.find((m) => m.n === 16)
      if (reloj < salida.reloj || !yo) continue
      for (const otra of motos) {
        if (otra.n === 16 || !enLaLineaDeLaFila(otra.punto, 'acabado')) continue
        masCerca = Math.min(masCerca, Math.hypot(otra.punto[0] - yo.punto[0], otra.punto[2] - yo.punto[2]))
      }
    }
    expect(masCerca).toBeGreaterThanOrEqual(2 * MOTO.ancho - 1e-6)
  })

  it('termina en la curva de salida de la avenida por la que entró', () => {
    for (const registro of salidas()) {
      const esperada = caminoDeSalida(registro.sitioViejo, entradaDeLaMoto(registro.n).clave).at(-1)
      expect(registro.camino.at(-1)).toEqual(esperada)
    }
  })
})

describe('ninguna moto pisa nada', () => {
  it('ningún camino pisa una losa ajena, una columna ni un poste', () => {
    const losas = losasDe(PLACAS, PUESTOS)
    for (const registro of visita.viajes) {
      const suyas = [claseDe(registro.sitioViejo), claseDe(registro.sitioNuevo)].filter(Boolean)
      const etiqueta = `moto ${registro.n} a las ${registro.reloj.toFixed(1)}: ${registro.desde} → ${registro.hacia}`
      expect(losasQuePisa(registro.camino, { losas, suyas }), etiqueta).toEqual([])
      expect(estorbosDelCamino(registro.camino, configuracion), etiqueta).toEqual([])
    }
  })

  it('ninguna pasa por encima de otra que espera en su fila', () => {
    let roces = 0
    const ejemplos = []
    for (const { reloj, motos } of visita.cuadrosConMotos) {
      for (const etapa of ['lavado', 'acabado']) {
        const enLaFila = motos.filter(({ punto }) => enLaLineaDeLaFila(punto, etapa))
        for (let i = 0; i < enLaFila.length; i += 1) {
          for (let j = i + 1; j < enLaFila.length; j += 1) {
            const [a, b] = [enLaFila[i].punto, enLaFila[j].punto]
            const along = etapa === 'lavado' ? Math.abs(a[2] - b[2]) : Math.abs(a[0] - b[0])
            if (along < MOTO.largo * 0.6) {
              roces += 1
              if (ejemplos.length < 3) ejemplos.push(`motos ${enLaFila[i].n} y ${enLaFila[j].n} a las ${reloj.toFixed(1)}`)
            }
          }
        }
      }
    }
    expect(roces, ejemplos.join('; ')).toBe(0)
  })
})

describe('sin vueltas atrás', () => {
  it('ningún camino de la visita gira más que el que más gira en la simulación aleatoria', () => {
    const mayor = (corrida) => Math.max(...corrida.viajes.map((v) => v.giroMaximo))
    expect(mayor(visita)).toBeLessThanOrEqual(Math.max(...aleatorias.map(mayor)))
  })

  it('ningún camino replanificado da media vuelta: no vuelve por donde iba (ni en la visita ni en la aleatoria)', () => {
    const replanificados = (corrida) => corrida.viajes.filter((v) => v.sitioViejo && !v.enReposo)
    for (const corrida of [visita, ...aleatorias]) {
      expect(replanificados(corrida).length).toBeGreaterThan(5)
      for (const registro of replanificados(corrida)) {
        expect(registro.giroMaximo, `moto ${registro.n} a las ${registro.reloj.toFixed(1)}: ${registro.desde} → ${registro.hacia}`).toBeLessThan(170)
      }
    }
  })
})
