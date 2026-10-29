import { describe, expect, it } from 'vitest'

import {
  ANCHO_DE_BOCA,
  AVENIDAS,
  COLUMNAS_DEL_TECHO,
  CURVAS_DE_ENTRADA,
  FILA_DEL_LAVADO,
  FRANJA_DE_ESPERA,
  LOCAL,
  MOTO,
  PASILLO,
  posicionDePlaca,
  posicionDePuesto,
  posicionEnFila,
  POSTE_DE_LOSA,
  PUNTO_DE_UNION_A_LA_FILA,
  SEPARACION_DE_CARRILES,
  SEPARACION_EN_FILA,
  SERVIDOR,
  TOPE_DE_MOTOS_DIBUJADAS,
} from './posiciones.js'
import {
  caminoDeEntrada,
  caminoDeLlegada,
  caminoDeSalida,
  caminoHacia,
  caminoReplanificado,
  curvaDeSalida,
  debeEsperarParaElCorredor,
  distanciaHastaElCorredor,
  estaEnElCorredor,
  ATRASO_MAXIMO_EN_MINUTOS,
  duracionDelViaje,
  minutosParaRecorrer,
  recorridoEnElTiempo,
  sinRetrocesos,
  V_BASE,
  esDeLaFilaDeAtras,
  girarHacia,
  largoDelCamino,
  MARGEN_EN_LA_CALZADA,
  MEDIO_ANCHO_DE_MOTO,
  puntoEnElCamino,
  puntoDe,
  X_DE_SALIDA_POR_EL_PASILLO,
  X_DEL_CARRIL_DE_LA_FRANJA,
  Z_DE_ACCESO_A_PLACAS,
  Z_DETRAS_DE_LOS_PUESTOS,
  Z_ENTRE_LAS_FILAS,
  sitioDeEntrada,
  sitioEnFila,
  sitioEnPlaca,
  sitioEnPuesto,
} from './trayectorias.js'

const PLACAS = 6
const PUESTOS = 3

/** Las losas que hay en el suelo con una configuración dada. */
const losasDe = (placas, puestos) => [
  ...Array.from({ length: placas }, (_, i) => ({
    clase: `placa ${i + 1}`,
    indice: i,
    es: 'placa',
    punto: posicionDePlaca(i, placas),
  })),
  ...Array.from({ length: puestos }, (_, i) => ({
    clase: `puesto ${i + 1}`,
    indice: i,
    es: 'puesto',
    punto: posicionDePuesto(i, puestos),
  })),
]

/**
 * ¿Este punto cae encima de esa losa?
 *
 * Se mira el centro de la moto con holgura de medio ancho: pasar rozando una
 * losa cuenta como pasar por encima.
 */
const pisa = ([x, , z], losa) =>
  Math.abs(x - losa.punto[0]) < (SERVIDOR.ancho + MOTO.ancho) / 2 - 1e-9 &&
  Math.abs(z - losa.punto[2]) < (SERVIDOR.fondo + MOTO.ancho) / 2 - 1e-9

/** Recorre un camino tomando muestras densas de todos sus tramos. */
function* muestrasDe(camino, paso = 0.1) {
  for (let i = 1; i < camino.length; i += 1) {
    const [x0, , z0] = camino[i - 1]
    const [x1, , z1] = camino[i]
    const largo = Math.hypot(x1 - x0, z1 - z0)
    const cuantas = Math.max(1, Math.ceil(largo / paso))
    for (let k = 0; k <= cuantas; k += 1) {
      const t = k / cuantas
      yield { punto: [x0 + (x1 - x0) * t, 0, z0 + (z1 - z0) * t], tramo: i }
    }
  }
}

/**
 * Comprueba que un camino no pisa ninguna losa, salvo la de donde sale y la
 * de donde llega: a esas la moto tiene que subirse.
 */
function noPisaLosas(camino, { losas, suyas = [] }) {
  const ajenas = losas.filter((losa) => !suyas.includes(losa.clase))
  const pisadas = []
  for (const { punto } of muestrasDe(camino)) {
    for (const losa of ajenas) {
      if (pisa(punto, losa) && !pisadas.includes(losa.clase)) pisadas.push(losa.clase)
    }
  }
  return pisadas
}

const losas = losasDe(PLACAS, PUESTOS)

describe('los sitios del lavadero', () => {
  it('cada uno está donde dice la planta', () => {
    expect(puntoDe(sitioDeEntrada('guaimaral'))).toEqual(AVENIDAS.guaimaral.posicion)
    // Sobre una losa, la moto va encima y echada atrás para no tapar el número.
    const [, alto, z] = puntoDe(sitioEnPlaca(0, PLACAS))
    expect(alto).toBe(SERVIDOR.altoOcupado)
    expect(z).toBeLessThan(posicionDePlaca(0, PLACAS)[2])
  })

  it('sabe qué placas son de la fila de atrás', () => {
    expect(esDeLaFilaDeAtras(0, 6)).toBe(false)
    expect(esDeLaFilaDeAtras(2, 6)).toBe(false)
    expect(esDeLaFilaDeAtras(3, 6)).toBe(true)
    expect(esDeLaFilaDeAtras(4, 7)).toBe(true)
    expect(esDeLaFilaDeAtras(3, 7)).toBe(false)
  })

  it('rechaza un sitio que no existe', () => {
    expect(() => puntoDe({ zona: 'cafeteria' })).toThrow(/cafeteria/)
  })
})

describe('todo camino empieza y acaba donde se pide', () => {
  const pares = [
    [sitioDeEntrada('granColombia'), sitioEnFila('lavado', 0)],
    [sitioDeEntrada('guaimaral'), sitioEnFila('lavado', 3)],
    [sitioDeEntrada('granColombia'), sitioEnPlaca(5, PLACAS)],
    [sitioEnFila('lavado', 0), sitioEnPlaca(1, PLACAS)],
    [sitioEnFila('lavado', 0), sitioEnPlaca(4, PLACAS)],
    [sitioEnPlaca(1, PLACAS), sitioEnFila('acabado', 0)],
    [sitioEnPlaca(4, PLACAS), sitioEnFila('acabado', 2)],
    [sitioEnFila('acabado', 0), sitioEnPuesto(2, PUESTOS)],
    [sitioEnFila('lavado', 3), sitioEnFila('lavado', 0)],
  ]

  it.each(pares)('de %o a %o', (desde, hasta) => {
    const camino = caminoHacia(desde, hasta)
    expect(camino.length).toBeGreaterThan(0)
    expect(camino[0]).toEqual(puntoDe(desde))
    expect(camino.at(-1)).toEqual(puntoDe(hasta))
  })

  it('ningún camino queda vacío ni repite el mismo punto seguido', () => {
    for (const [desde, hasta] of pares) {
      const camino = caminoHacia(desde, hasta)
      expect(camino.length).toBeGreaterThanOrEqual(1)
      for (let i = 1; i < camino.length; i += 1) {
        const salto = Math.hypot(
          camino[i][0] - camino[i - 1][0],
          camino[i][2] - camino[i - 1][2],
        )
        expect(salto).toBeGreaterThan(1e-9)
      }
    }
  })
})

describe('ningún camino pasa por encima de una losa', () => {
  it('de la fila a cualquier placa, con 5, 6 y 7 placas', () => {
    for (const total of [5, 6, 7]) {
      const delLocal = losasDe(total, PUESTOS)
      for (let i = 0; i < total; i += 1) {
        const camino = caminoHacia(sitioEnFila('lavado', 0), sitioEnPlaca(i, total))
        const pisadas = noPisaLosas(camino, { losas: delLocal, suyas: [`placa ${i + 1}`] })
        expect(pisadas, `con ${total} placas, al entrar a la ${i + 1}`).toEqual([])
      }
    }
  })

  it('de cualquier placa a la fila del acabado', () => {
    for (const total of [5, 6, 7]) {
      const delLocal = losasDe(total, PUESTOS)
      for (let i = 0; i < total; i += 1) {
        const camino = caminoHacia(sitioEnPlaca(i, total), sitioEnFila('acabado', 0))
        const pisadas = noPisaLosas(camino, { losas: delLocal, suyas: [`placa ${i + 1}`] })
        expect(pisadas, `con ${total} placas, al salir de la ${i + 1}`).toEqual([])
      }
    }
  })

  it('de la fila del acabado a cualquier puesto, con 3, 4 y 5 puestos', () => {
    for (const total of [3, 4, 5]) {
      const delLocal = losasDe(PLACAS, total)
      for (let i = 0; i < total; i += 1) {
        const camino = caminoHacia(sitioEnFila('acabado', 0), sitioEnPuesto(i, total))
        const pisadas = noPisaLosas(camino, { losas: delLocal, suyas: [`puesto ${i + 1}`] })
        expect(pisadas, `con ${total} puestos, al entrar al ${i + 1}`).toEqual([])
      }
    }
  })

  it('de cualquier puesto a la salida por cada avenida', () => {
    for (const avenida of AVENIDAS_DEL_MAPA) {
      for (let i = 0; i < PUESTOS; i += 1) {
        const camino = caminoDeSalida(sitioEnPuesto(i, PUESTOS), avenida)
        const pisadas = noPisaLosas(camino, { losas, suyas: [`puesto ${i + 1}`] })
        expect(pisadas, `${avenida}, al salir del puesto ${i + 1}`).toEqual([])
      }
    }
  })

  it('de las dos entradas a cualquier sitio de la fila del lavado', () => {
    for (const avenida of ['granColombia', 'guaimaral']) {
      for (let i = 0; i < TOPE_DE_MOTOS_DIBUJADAS.lavado; i += 1) {
        const camino = caminoHacia(sitioDeEntrada(avenida), sitioEnFila('lavado', i))
        expect(noPisaLosas(camino, { losas }), `${avenida}, sitio ${i + 1}`).toEqual([])
      }
    }
  })

  it('de las dos entradas a una placa libre, sin pasar por la fila', () => {
    // Pasa de verdad: si hay placa libre, el motor no hace esperar a la moto.
    for (const avenida of ['granColombia', 'guaimaral']) {
      for (let i = 0; i < PLACAS; i += 1) {
        const camino = caminoHacia(sitioDeEntrada(avenida), sitioEnPlaca(i, PLACAS))
        const pisadas = noPisaLosas(camino, { losas, suyas: [`placa ${i + 1}`] })
        expect(pisadas, `${avenida} a la placa ${i + 1}`).toEqual([])
      }
    }
  })
})

describe('rodear la fila de adelante', () => {
  it('desde la avenida, para entrar a una de atrás se pasa por el pasillo y por el hueco', () => {
    const camino = caminoHacia(sitioDeEntrada('guaimaral'), sitioEnPlaca(4, PLACAS))
    const porElPasillo = camino.some(([x]) => Math.abs(x - PASILLO.centroX) < 1e-9)
    expect(porElPasillo).toBe(true)
  })

  it('desde la cabeza de la fila, en cambio, se entra por el lado derecho y no se pasa por el pasillo', () => {
    const camino = caminoHacia(sitioEnFila('lavado', 0), sitioEnPlaca(4, PLACAS))
    expect(camino.some(([x]) => Math.abs(x - PASILLO.centroX) < 1e-9)).toBe(false)
  })

  it('para entrar a una de adelante no hace falta rodear: es más corto', () => {
    const corto = largoDelCamino(caminoHacia(sitioEnFila('lavado', 0), sitioEnPlaca(1, PLACAS)))
    const largo = largoDelCamino(caminoHacia(sitioEnFila('lavado', 0), sitioEnPlaca(4, PLACAS)))
    expect(corto).toBeLessThan(largo)
  })

  it('salir de una de adelante también rodea, y de una de atrás no', () => {
    const deAdelante = caminoHacia(sitioEnPlaca(1, PLACAS), sitioEnFila('acabado', 0))
    const deAtras = caminoHacia(sitioEnPlaca(4, PLACAS), sitioEnFila('acabado', 0))
    expect(largoDelCamino(deAdelante)).toBeGreaterThan(largoDelCamino(deAtras))
  })
})

describe('los caminos se quedan dentro del local y de su franja de espera', () => {
  it('ningún punto se sale por los bordes', () => {
    const pares = [
      [sitioEnFila('lavado', 0), sitioEnPlaca(5, PLACAS)],
      [sitioEnFila('lavado', 0), sitioEnPlaca(1, PLACAS)],
      [sitioEnPlaca(0, PLACAS), sitioEnFila('acabado', 0)],
      [sitioEnFila('acabado', 0), sitioEnPuesto(2, PUESTOS)],
    ]
    const derecha = FRANJA_DE_ESPERA.x0 + FRANJA_DE_ESPERA.ancho
    for (const [desde, hasta] of pares) {
      for (const { punto } of muestrasDe(caminoHacia(desde, hasta), 0.25)) {
        expect(punto[0]).toBeGreaterThanOrEqual(-LOCAL.ancho / 2)
        expect(punto[0]).toBeLessThanOrEqual(derecha)
        expect(Math.abs(punto[2])).toBeLessThanOrEqual(LOCAL.fondo / 2)
      }
    }
  })

  it('avanzar un sitio en la misma fila es ir de frente, sin rodeos', () => {
    const camino = caminoHacia(sitioEnFila('lavado', 3), sitioEnFila('lavado', 2))
    expect(camino).toHaveLength(2)
    expect(camino[0][0]).toBe(camino[1][0]) // la fila del lavado va a lo largo de Z
    const delAcabado = caminoHacia(sitioEnFila('acabado', 3), sitioEnFila('acabado', 2))
    expect(delAcabado).toHaveLength(2)
    expect(delAcabado[0][2]).toBe(delAcabado[1][2]) // y la del acabado, a lo largo de X
  })
})

describe('avanzar por el camino', () => {
  const camino = [
    [0, 0, 0],
    [0, 0, 4],
    [3, 0, 4],
  ]

  it('al principio está en el primer punto y al final en el último', () => {
    expect(puntoEnElCamino(camino, 0).punto).toEqual([0, 0, 0])
    expect(puntoEnElCamino(camino, largoDelCamino(camino)).punto).toEqual([3, 0, 4])
  })

  it('no se sale del camino ni pidiéndole de más o de menos', () => {
    expect(puntoEnElCamino(camino, -5).punto).toEqual([0, 0, 0])
    expect(puntoEnElCamino(camino, 999).punto).toEqual([3, 0, 4])
  })

  it('a mitad del primer tramo va por la mitad', () => {
    expect(puntoEnElCamino(camino, 2).punto).toEqual([0, 0, 2])
  })

  it('el rumbo es el del tramo que recorre', () => {
    // Primer tramo hacia +Z: rumbo 0. Segundo hacia +X: un cuarto de vuelta.
    expect(puntoEnElCamino(camino, 1).rumbo).toBeCloseTo(0, 10)
    expect(puntoEnElCamino(camino, 5).rumbo).toBeCloseTo(Math.PI / 2, 10)
  })

  it('un camino de un solo punto no da rumbo, para no girar sin motivo', () => {
    expect(puntoEnElCamino([[1, 0, 2]], 0)).toEqual({ punto: [1, 0, 2], rumbo: null })
  })
})

describe('la velocidad de las motos, en metros por minuto simulado', () => {
  const viaje = (largo) => ({ largo, duracion: duracionDelViaje(largo) })
  /** Cuántos metros lleva una moto de un viaje tras `minutos` minutos simulados. */
  const tras = (largo, minutos) => recorridoEnElTiempo({ ...viaje(largo), minutos })

  it('V_BASE y el atraso máximo están en minutos simulados, no en segundos reales', () => {
    expect(V_BASE).toBe(6)
    expect(ATRASO_MAXIMO_EN_MINUTOS).toBe(4)
  })

  it('un tramo corto va a V_BASE: dura largo / V_BASE minutos', () => {
    expect(duracionDelViaje(12)).toBeCloseTo(12 / V_BASE, 10)
    expect(duracionDelViaje(2)).toBeCloseTo(2 / V_BASE, 10)
  })

  it('un tramo largo no pasa del atraso máximo: se hace más deprisa', () => {
    expect(duracionDelViaje(50)).toBe(ATRASO_MAXIMO_EN_MINUTOS)
    expect(duracionDelViaje(1000)).toBe(ATRASO_MAXIMO_EN_MINUTOS)
  })

  it('el tramo largo tarda proporcionalmente más que el corto, mientras no llega al atraso máximo', () => {
    expect(duracionDelViaje(12) / duracionDelViaje(6)).toBeCloseTo(2, 10)
    expect(duracionDelViaje(18) / duracionDelViaje(6)).toBeCloseTo(3, 10)
  })

  it('sin camino no hay viaje', () => {
    expect(duracionDelViaje(0)).toBe(0)
    expect(tras(0, 5)).toBe(0)
  })

  it('empieza en 0, acaba en el largo y nunca retrocede', () => {
    for (const largo of [0.5, 2, 12, 50]) {
      const { duracion } = viaje(largo)
      expect(tras(largo, 0)).toBe(0)
      expect(tras(largo, duracion)).toBe(largo)
      expect(tras(largo, duracion * 3)).toBe(largo)
      expect(tras(largo, -1)).toBe(0)
      let antes = 0
      for (let i = 0; i <= 200; i += 1) {
        const ahora = tras(largo, (i / 200) * duracion)
        expect(ahora).toBeGreaterThanOrEqual(antes - 1e-12)
        antes = ahora
      }
    }
  })

  it('arranca y frena poco a poco: al principio y al final va más lento que por el medio', () => {
    const largo = 24
    const { duracion } = viaje(largo)
    const paso = duracion / 400
    const velocidadEn = (u) => (tras(largo, u * duracion + paso) - tras(largo, u * duracion)) / paso
    expect(velocidadEn(0)).toBeLessThan(velocidadEn(0.5))
    expect(velocidadEn(0.99)).toBeLessThan(velocidadEn(0.5))
  })

  it('en el medio la velocidad es constante, y vale lo que dice la duración', () => {
    const largo = 24
    const { duracion } = viaje(largo)
    const paso = duracion / 1000
    const v1 = (tras(largo, 0.4 * duracion + paso) - tras(largo, 0.4 * duracion)) / paso
    const v2 = (tras(largo, 0.6 * duracion + paso) - tras(largo, 0.6 * duracion)) / paso
    expect(v1).toBeCloseTo(v2, 6)
    // sin las rampas sería largo / duración = V_BASE; con ellas, un poco más
    expect(v1).toBeGreaterThanOrEqual(V_BASE - 1e-9)
    expect(v1).toBeLessThan(V_BASE * 1.1)
  })

  it('duplicar los minutos que pasan duplica lo que avanza (en el tramo del medio)', () => {
    const largo = 40
    const { duracion } = viaje(largo)
    const desde = 0.45 * duracion
    const d = 0.05
    const uno = tras(largo, desde + d) - tras(largo, desde)
    const dos = tras(largo, desde + 2 * d) - tras(largo, desde)
    expect(dos / uno).toBeCloseTo(2, 6)
  })

  it('el tiempo real no interviene: la misma cuenta da el mismo resultado', () => {
    expect(tras(30, 1.7)).toBe(tras(30, 1.7))
  })

  it('si el viaje dura menos que un cuadro (a 60 min/s, un minuto), la moto llega de golpe', () => {
    // un tramo de 3 m dura 0,5 min; un cuadro a 60 min/s pasa 1 minuto
    expect(tras(3, 1)).toBe(3)
  })

  it('minutosParaRecorrer es lo contrario de recorridoEnElTiempo', () => {
    for (const largo of [3, 12, 50]) {
      const { duracion } = viaje(largo)
      for (const u of [0.05, 0.2, 0.5, 0.8, 0.97]) {
        const minutos = u * duracion
        const recorrido = tras(largo, minutos)
        expect(minutosParaRecorrer({ largo, duracion, recorrido })).toBeCloseTo(minutos, 6)
      }
      expect(minutosParaRecorrer({ largo, duracion, recorrido: 0 })).toBe(0)
      expect(minutosParaRecorrer({ largo, duracion, recorrido: largo })).toBe(duracion)
    }
  })

  it('detener una moto en un punto y seguir desde ahí no la hace retroceder ni saltar', () => {
    const largo = 20
    const { duracion } = viaje(largo)
    const retenida = 7.3
    const minutosQueLleva = minutosParaRecorrer({ largo, duracion, recorrido: retenida })
    // si su hora de salida se atrasa hasta que lleva `retenida`, un instante después va un poco más allá
    expect(tras(largo, minutosQueLleva)).toBeCloseTo(retenida, 6)
    expect(tras(largo, minutosQueLleva + 0.01)).toBeGreaterThan(retenida)
    expect(tras(largo, minutosQueLleva + 0.01)).toBeLessThan(retenida + 0.2)
  })

  it('a 1 min/s (un minuto simulado por segundo) la velocidad en pantalla es natural: unos 6 m/s', () => {
    // en el tramo del medio de un viaje corto, metros por segundo real = metros por minuto simulado
    const largo = 24
    const { duracion } = viaje(largo)
    const porMinuto = (tras(largo, 0.5 * duracion + 0.01) - tras(largo, 0.5 * duracion)) / 0.01
    expect(porMinuto).toBeGreaterThan(5)
    expect(porMinuto).toBeLessThan(8)
  })
})

describe('replanificar desde donde está la moto', () => {
  const viejo = [[0, 0, 0], [0, 0, 10], [10, 0, 10]]

  it('empieza donde está, no donde empezó', () => {
    const camino = caminoReplanificado(viejo, 4, [[10, 0, 10], [10, 0, 20]])
    expect(camino[0]).toEqual([0, 0, 4])
  })

  it('termina lo que le quedaba y sigue por el camino nuevo', () => {
    const camino = caminoReplanificado(viejo, 4, [[10, 0, 10], [10, 0, 20]])
    expect(camino).toEqual([[0, 0, 4], [0, 0, 10], [10, 0, 10], [10, 0, 20]])
  })

  it('si ya había llegado, el camino nuevo sale de su sitio', () => {
    const camino = caminoReplanificado(viejo, largoDelCamino(viejo), [[10, 0, 10], [10, 0, 20]])
    expect(camino).toEqual([[10, 0, 10], [10, 0, 20]])
  })

  it('no se pasa para volver: avanzar un lugar en la fila cuando casi llegaba al suyo', () => {
    // Iba a z = 4 por la franja y el motor la manda a z = 6, un lugar más adelante.
    const camino = caminoReplanificado([[12.5, 0, -10], [12.5, 0, 4]], 10, [[12.5, 0, 4], [12.5, 0, 6]])
    expect(camino).toEqual([[12.5, 0, 0], [12.5, 0, 6]])
  })

  it('tampoco da un rodeo si el nuevo destino está en el camino que llevaba', () => {
    const camino = caminoReplanificado([[12.5, 0, -10], [12.5, 0, 4]], 10, [[12.5, 0, 4], [12.5, 0, 2]])
    expect(camino).toEqual([[12.5, 0, 0], [12.5, 0, 2]])
  })

  it('conserva los giros de verdad', () => {
    expect(sinRetrocesos([[0, 0, 0], [0, 0, 5], [5, 0, 5]])).toHaveLength(3)
  })
})

describe('el corredor de detrás de los puestos es de un solo carril', () => {
  it('lo que está entre la pared y los puestos es corredor; lo demás, no', () => {
    expect(estaEnElCorredor([0, 0, Z_DETRAS_DE_LOS_PUESTOS])).toBe(true)
    expect(estaEnElCorredor([0, 0, LOCAL.zPuestos])).toBe(false)
    expect(estaEnElCorredor([0, 0, LOCAL.zSalida - 1])).toBe(false)
  })

  it('las dos avenidas, al llegar a la fila, pasan por el corredor', () => {
    for (const avenida of AVENIDAS_DEL_MAPA) {
      const camino = caminoDeLlegada(avenida, sitioEnFila('lavado', 3))
      const hasta = distanciaHastaElCorredor(camino)
      expect(hasta, avenida).not.toBeNull()
      expect(estaEnElCorredor(puntoEnElCamino(camino, hasta + 0.1).punto)).toBe(true)
      expect(estaEnElCorredor(puntoEnElCamino(camino, Math.max(0, hasta - 0.1)).punto)).toBe(false)
    }
  })

  it('la salida de un puesto también pasa por el corredor', () => {
    for (const avenida of AVENIDAS_DEL_MAPA) {
      const camino = caminoDeSalida(sitioEnPuesto(1, PUESTOS), avenida)
      expect(distanciaHastaElCorredor(camino), avenida).not.toBeNull()
    }
  })

  it('un camino que nunca pasa por él no tiene puerta', () => {
    expect(distanciaHastaElCorredor(caminoHacia(sitioEnFila('lavado', 0), sitioEnPlaca(1, PLACAS)))).toBeNull()
  })

  it('el que entra espera si viene uno saliendo, y el que sale espera si ya viene uno entrando', () => {
    expect(debeEsperarParaElCorredor(false, { entrando: 0, saliendo: 1 })).toBe(true)
    expect(debeEsperarParaElCorredor(true, { entrando: 1, saliendo: 0 })).toBe(true)
  })

  it('en el mismo sentido no esperan, y vacío tampoco', () => {
    expect(debeEsperarParaElCorredor(false, { entrando: 2, saliendo: 0 })).toBe(false)
    expect(debeEsperarParaElCorredor(true, { entrando: 0, saliendo: 3 })).toBe(false)
    expect(debeEsperarParaElCorredor(false, { entrando: 0, saliendo: 0 })).toBe(false)
  })
})

describe('llegar por la avenida', () => {
  it.each(AVENIDAS_DEL_MAPA)('%s: empieza en el borde de la calzada, pasa por la boca y llega a su sitio', (clave) => {
    const camino = caminoDeLlegada(clave, sitioEnFila('lavado', 2))
    expect(camino[0]).toEqual(CURVAS_DE_ENTRADA[clave][0])
    expect(camino.some(([x, , z]) => x === AVENIDAS[clave].posicion[0] && z === AVENIDAS[clave].posicion[2])).toBe(true)
    expect(camino.at(-1)).toEqual(posicionEnFila(2, 'lavado'))
  })

  it.each(AVENIDAS_DEL_MAPA)('%s: a una placa libre llega directo, sin pasar por la franja de la fila', (clave) => {
    const camino = caminoDeLlegada(clave, sitioEnPlaca(2, PLACAS))
    expect(camino.at(-1)).toEqual(puntoDe(sitioEnPlaca(2, PLACAS)))
    expect(camino.every(([x]) => x < FRANJA_DE_ESPERA.x0)).toBe(true)
  })
})

describe('girar hacia donde se avanza', () => {
  it('llegando del todo, queda mirando al destino', () => {
    expect(girarHacia(0, Math.PI / 2, 1)).toBeCloseTo(Math.PI / 2, 10)
  })

  it('gira por el lado corto, no dando la vuelta entera', () => {
    // De casi media vuelta a media vuelta: el camino corto cruza el ±PI.
    const resultado = girarHacia(3, -3, 0.5)
    const avance = Math.abs(resultado - 3)
    expect(avance).toBeLessThan(Math.PI / 2)
  })

  it('a medio camino se queda a medio camino', () => {
    expect(girarHacia(0, 1, 0.5)).toBeCloseTo(0.5, 10)
  })

  it('si ya mira donde debe, no gira', () => {
    expect(girarHacia(1.2, 1.2, 0.5)).toBeCloseTo(1.2, 10)
  })
})

/* ----------------------------------------- caminos de entrada y de salida -- */

const AVENIDAS_DEL_MAPA = ['granColombia', 'guaimaral']

/**
 * ¿Este punto cae sobre la calzada de la avenida? Las avenidas siguen en línea
 * recta hasta el borde del terreno, así que solo cuenta el ancho de la calzada,
 * no su largo.
 */
const enLaCalzada = ([x, , z], { clave, calle }) =>
  clave === 'guaimaral'
    ? Math.abs(x - calle.centro[0]) <= calle.ancho / 2 + 1e-9
    : Math.abs(z - calle.centro[2]) <= calle.fondo / 2 + 1e-9

describe('las curvas de entrada, según el mapa', () => {
  it.each(AVENIDAS_DEL_MAPA)('%s: acaba exactamente en su boca', (clave) => {
    expect(CURVAS_DE_ENTRADA[clave].at(-1)).toEqual(AVENIDAS[clave].posicion)
  })

  it.each(AVENIDAS_DEL_MAPA)('%s: empieza y se mueve sobre la calzada hasta llegar a la boca', (clave) => {
    const avenida = AVENIDAS[clave]
    const curva = CURVAS_DE_ENTRADA[clave]
    // todos los puntos menos la boca están sobre la calzada
    for (const punto of curva.slice(0, -1)) {
      expect(enLaCalzada(punto, avenida), `${clave}: ${punto}`).toBe(true)
    }
  })

  it('la de la Guaimaral sube hacia el fondo y gira hacia el local; la de la Gran Colombia se aparta hacia el fondo y vuelve', () => {
    const guaimaral = CURVAS_DE_ENTRADA.guaimaral
    expect(guaimaral[0][2]).toBeGreaterThan(guaimaral.at(-1)[2]) // sube (la Z decrece hacia el fondo)
    expect(guaimaral.at(-1)[0]).toBeGreaterThan(guaimaral[0][0]) // y gira hacia el local, a la derecha
    const gran = CURVAS_DE_ENTRADA.granColombia
    const masAlFondo = Math.min(...gran.map(([, , z]) => z))
    expect(masAlFondo).toBeLessThan(gran[0][2] - 1) // se aparta del local, hacia el fondo
    expect(gran.at(-1)[2]).toBeGreaterThan(masAlFondo) // y vuelve hacia él
    expect(gran.at(-1)[0]).toBeGreaterThan(gran[0][0]) // avanzando de izquierda a derecha
  })

  it('cada curva entra por su boca, y esta cabe en la pared o en el bordillo', () => {
    expect(ANCHO_DE_BOCA).toBeGreaterThan(MOTO.ancho * 2)
  })
})

describe('dónde caen las bocas, según el mapa superpuesto a la planta', () => {
  it('la de la Guaimaral está a media altura del borde izquierdo, no cerca del frente', () => {
    const [x, , z] = AVENIDAS.guaimaral.posicion
    expect(x).toBe(-LOCAL.ancho / 2)
    expect(Math.abs(z)).toBeLessThanOrEqual(LOCAL.fondo / 6)
  })

  it('la de la Gran Colombia está en la pared del fondo, a la derecha de la esquina y dentro de la pared', () => {
    const [x, , z] = AVENIDAS.granColombia.posicion
    expect(z).toBe(LOCAL.zSalida)
    expect(x).toBeGreaterThan(-LOCAL.ancho / 2 + PASILLO.ancho)
    expect(x - ANCHO_DE_BOCA / 2).toBeGreaterThan(-LOCAL.ancho / 2)
  })

  it.each(AVENIDAS_DEL_MAPA)('%s: los caminos de entrada y de salida pasan a más de 53,5 cm de cada columna', (clave) => {
    const libre = 0.16 + MEDIO_ANCHO_DE_MOTO
    const caminos = [caminoDeEntrada(clave), caminoDeSalida(sitioEnPuesto(0, PUESTOS), clave)]
    for (const camino of caminos) {
      for (const { punto } of muestrasDe(camino)) {
        for (const [xc, , zc] of COLUMNAS_DEL_TECHO) {
          expect(Math.hypot(punto[0] - xc, punto[2] - zc), `${clave} en (${punto[0].toFixed(2)}, ${punto[2].toFixed(2)})`).toBeGreaterThan(libre)
        }
      }
    }
  })

  it.each(AVENIDAS_DEL_MAPA)('%s: dentro del lote nunca se sale del local ni cruza la pared', (clave) => {
    const paso = caminoDeEntrada(clave).filter(([x, , z]) => x >= -LOCAL.ancho / 2 && z > LOCAL.zSalida + 0.2)
    for (const { punto } of muestrasDe(paso, 0.1)) {
      expect(punto[2]).toBeGreaterThan(LOCAL.zSalida + 0.2 - 1e-9)
      expect(punto[0]).toBeGreaterThanOrEqual(-LOCAL.ancho / 2 - 1e-9)
    }
  })
})

describe('el camino de entrada de cada avenida', () => {
  it.each(AVENIDAS_DEL_MAPA)('%s: empieza en la avenida, pasa por la boca y acaba donde se une a la fila', (clave) => {
    const camino = caminoDeEntrada(clave)
    expect(camino[0]).toEqual(CURVAS_DE_ENTRADA[clave][0])
    expect(camino.some(([x, , z]) => x === AVENIDAS[clave].posicion[0] && z === AVENIDAS[clave].posicion[2])).toBe(true)
    expect(camino.at(-1)).toEqual(PUNTO_DE_UNION_A_LA_FILA)
  })

  it('las dos confluyen en el mismo punto: una sola fila (cola 1)', () => {
    expect(caminoDeEntrada('guaimaral').at(-1)).toEqual(caminoDeEntrada('granColombia').at(-1))
  })

  it.each(AVENIDAS_DEL_MAPA)('%s: ningún punto pisa una losa, con 5, 6 y 7 placas y 3, 4 y 5 puestos', (clave) => {
    for (const [placas, puestos] of [[5, 3], [6, 4], [7, 5]]) {
      expect(noPisaLosas(caminoDeEntrada(clave), { losas: losasDe(placas, puestos) })).toEqual([])
    }
  })

  it('rechaza una avenida que no existe', () => {
    expect(() => caminoDeEntrada('otra')).toThrow(RangeError)
  })
})

/** ¿Algo del local estorba en este punto? Columnas y postes, con lo que ocupa la moto. */
function estorbo([x, , z]) {
  const estorbos = []
  for (const [xc, , zc] of COLUMNAS_DEL_TECHO) {
    if (Math.hypot(x - xc, z - zc) <= 0.16 + MEDIO_ANCHO_DE_MOTO) estorbos.push(`columna (${xc}, ${zc})`)
  }
  for (const losa of losasDe(7, 5)) {
    const xp = losa.punto[0] + POSTE_DE_LOSA.x
    const zp = losa.punto[2] + POSTE_DE_LOSA.z
    if (Math.hypot(x - xp, z - zp) <= 0.2 + MEDIO_ANCHO_DE_MOTO) estorbos.push(`poste de la ${losa.clase}`)
  }
  return estorbos
}

describe('la fila del lavado: adónde va cada moto desde cada sitio', () => {
  /** Los caminos de las motos que llegan, con y sin placa libre, y los de las que salen de la cabeza. */
  const todosLosCaminos = () => {
    const caminos = []
    for (const avenida of AVENIDAS_DEL_MAPA) {
      for (let i = 0; i < TOPE_DE_MOTOS_DIBUJADAS.lavado; i += 1) {
        caminos.push({ nombre: `${avenida} a la fila, sitio ${i + 1}`, camino: caminoHacia(sitioDeEntrada(avenida), sitioEnFila('lavado', i)) })
      }
      for (const total of [5, 6, 7]) {
        for (let i = 0; i < total; i += 1) {
          caminos.push({ nombre: `${avenida} a la placa ${i + 1} de ${total}`, camino: caminoHacia(sitioDeEntrada(avenida), sitioEnPlaca(i, total)) })
        }
      }
    }
    for (const total of [5, 6, 7]) {
      for (let i = 0; i < total; i += 1) {
        caminos.push({ nombre: `de la cabeza a la placa ${i + 1} de ${total}`, camino: caminoHacia(sitioEnFila('lavado', 0), sitioEnPlaca(i, total)) })
        caminos.push({ nombre: `del sitio 3 a la placa ${i + 1} de ${total}`, camino: caminoHacia(sitioEnFila('lavado', 2), sitioEnPlaca(i, total)) })
      }
    }
    return caminos
  }

  it('ninguno pisa una losa, con 5, 6 y 7 placas y 3, 4 y 5 puestos', () => {
    for (const { nombre, camino } of todosLosCaminos()) {
      for (const [placas, puestos] of [[5, 3], [6, 4], [7, 5]]) {
        const hasta = nombre.match(/placa (\d+) de (\d+)/)
        const suyas = hasta && Number(hasta[2]) === placas ? [`placa ${hasta[1]}`] : []
        const pisadas = noPisaLosas(camino, { losas: losasDe(placas, puestos), suyas })
        // con otro número de placas la placa de destino no es la misma: solo se mira el caso de su total
        if (hasta && Number(hasta[2]) !== placas) continue
        expect(pisadas, `${nombre}, con ${placas} placas y ${puestos} puestos`).toEqual([])
      }
    }
  })

  it('ninguno roza una columna ni un poste', () => {
    for (const { nombre, camino } of todosLosCaminos()) {
      for (const { punto } of muestrasDe(camino)) {
        expect(estorbo(punto), `${nombre}, en (${punto[0].toFixed(2)}, ${punto[2].toFixed(2)})`).toEqual([])
      }
    }
  })

  it('las motos que esperan llegan a la cola por fuera de las losas y la alcanzan por detrás', () => {
    for (const avenida of AVENIDAS_DEL_MAPA) {
      for (let i = 0; i < TOPE_DE_MOTOS_DIBUJADAS.lavado; i += 1) {
        const [, , zDelSitio] = posicionEnFila(i, 'lavado')
        const camino = caminoHacia(sitioDeEntrada(avenida), sitioEnFila('lavado', i))
        for (const { punto } of muestrasDe(camino)) {
          // Una vez en la franja, solo sube por detrás de su sitio: no atraviesa a las que esperan delante.
          if (punto[0] > FRANJA_DE_ESPERA.x0) {
            expect(punto[2], `${avenida}, sitio ${i + 1}`).toBeLessThanOrEqual(zDelSitio + 1e-9)
          }
        }
      }
    }
  })

  it('las dos avenidas llegan a la fila por el mismo punto, justo antes de su último lugar', () => {
    for (const avenida of AVENIDAS_DEL_MAPA) {
      const camino = caminoHacia(sitioDeEntrada(avenida), sitioEnFila('lavado', 0))
      expect(camino.some(([x, , z]) => x === PUNTO_DE_UNION_A_LA_FILA[0] && z === PUNTO_DE_UNION_A_LA_FILA[2])).toBe(true)
    }
  })

  it('la que llega con una placa libre va directa a ella, sin pasar por la franja de la fila', () => {
    for (const avenida of AVENIDAS_DEL_MAPA) {
      for (let i = 0; i < PLACAS; i += 1) {
        const camino = caminoHacia(sitioDeEntrada(avenida), sitioEnPlaca(i, PLACAS))
        expect(camino.every(([x]) => x < FRANJA_DE_ESPERA.x0), `${avenida}, placa ${i + 1}`).toBe(true)
      }
    }
  })

  it('de la cabeza de la fila a una placa de adelante se va de frente, por delante de las columnas', () => {
    const camino = caminoHacia(sitioEnFila('lavado', 0), sitioEnPlaca(1, PLACAS))
    expect(camino).toHaveLength(3)
    expect(camino[1][2]).toBe(Z_DE_ACCESO_A_PLACAS)
    expect(Z_DE_ACCESO_A_PLACAS).toBeGreaterThan(Math.max(...COLUMNAS_DEL_TECHO.map(([, , z]) => z)) + 1)
  })

  it('el que sale de la cabeza se aparta de la fila: no pasa por encima de las que esperan', () => {
    for (const total of [5, 6, 7]) {
      for (let i = 0; i < total; i += 1) {
        const camino = caminoHacia(sitioEnFila('lavado', 0), sitioEnPlaca(i, total))
        const [, , zCabeza] = posicionEnFila(0, 'lavado')
        for (const { punto } of muestrasDe(camino)) {
          if (Math.abs(punto[0] - FILA_DEL_LAVADO.x) < MOTO.ancho) {
            expect(punto[2], `placa ${i + 1} de ${total}`).toBeGreaterThan(zCabeza - SEPARACION_EN_FILA / 2)
          }
        }
      }
    }
  })

  it('de la cabeza a una placa de atrás entra directo por el lado derecho, sin rodear el local por la izquierda', () => {
    for (const total of [5, 6, 7]) {
      for (let i = 0; i < total; i += 1) {
        const camino = caminoHacia(sitioEnFila('lavado', 0), sitioEnPlaca(i, total))
        // Nunca llega al pasillo de la izquierda: todo el viaje queda a la derecha de las losas más a la izquierda.
        const izquierda = Math.min(...camino.map(([x]) => x))
        expect(izquierda, `placa ${i + 1} de ${total}`).toBeGreaterThan(PASILLO.centroX + PASILLO.ancho / 2)
        if (esDeLaFilaDeAtras(i, total)) {
          // por el carril de la franja, y luego por el hueco entre las filas
          expect(camino.some(([x]) => x === X_DEL_CARRIL_DE_LA_FRANJA), `placa ${i + 1} de ${total}`).toBe(true)
          expect(camino.some(([, , z]) => z === Z_ENTRE_LAS_FILAS), `placa ${i + 1} de ${total}`).toBe(true)
        }
      }
    }
  })

  it('de la cabeza a una placa de atrás, el largo ya no da la vuelta al local', () => {
    const camino = caminoHacia(sitioEnFila('lavado', 0), sitioEnPlaca(5, PLACAS))
    // antes eran unos 41 m, rodeando por el pasillo; de frente son los metros del local en línea casi recta
    expect(largoDelCamino(camino)).toBeLessThan(25)
  })

  it('el carril de la franja queda libre: a más de 53,5 cm de las columnas y sin tocar la fila', () => {
    const [xColumna] = COLUMNAS_DEL_TECHO[1]
    expect(X_DEL_CARRIL_DE_LA_FRANJA - xColumna).toBeGreaterThan(0.16 + MEDIO_ANCHO_DE_MOTO)
    expect(FILA_DEL_LAVADO.x - X_DEL_CARRIL_DE_LA_FRANJA).toBeGreaterThan(MOTO.ancho)
    expect(X_DEL_CARRIL_DE_LA_FRANJA).toBeGreaterThanOrEqual(FRANJA_DE_ESPERA.x0)
  })

  it('la moto de otro sitio de la fila sube primero hasta la cabeza antes de salir', () => {
    const camino = caminoHacia(sitioEnFila('lavado', 2), sitioEnPlaca(1, PLACAS))
    expect(camino[1]).toEqual(posicionEnFila(0, 'lavado'))
  })
})

describe('el camino de salida: la entrada al revés, por el otro carril', () => {
  it.each(AVENIDAS_DEL_MAPA)('%s: sale por la misma boca y con el mismo número de puntos que la curva de entrada', (clave) => {
    const salida = curvaDeSalida(clave)
    expect(salida).toHaveLength(CURVAS_DE_ENTRADA[clave].length)
    expect(salida[0]).toEqual(AVENIDAS[clave].posicion)
  })

  it.each(AVENIDAS_DEL_MAPA)('%s: acaba en la avenida, a un carril de donde empezó la entrada', (clave) => {
    const salida = curvaDeSalida(clave)
    const entrada = CURVAS_DE_ENTRADA[clave]
    const fin = salida.at(-1)
    const inicio = entrada[0]
    expect(Math.hypot(fin[0] - inicio[0], fin[2] - inicio[2])).toBeCloseTo(SEPARACION_DE_CARRILES, 6)
  })

  it.each(AVENIDAS_DEL_MAPA)('%s: el carril de salida queda al otro lado del eje de la calle', (clave) => {
    const { calle } = AVENIDAS[clave]
    const eje = clave === 'guaimaral' ? calle.centro[0] : calle.centro[2]
    const coordenada = (punto) => (clave === 'guaimaral' ? punto[0] : punto[2])
    const entra = coordenada(CURVAS_DE_ENTRADA[clave][0]) - eje
    const sale = coordenada(curvaDeSalida(clave).at(-1)) - eje
    expect(Math.sign(entra)).toBe(-Math.sign(sale))
  })

  it.each(AVENIDAS_DEL_MAPA)('%s: toda la curva de salida, salvo la boca, está sobre la calzada', (clave) => {
    for (const punto of curvaDeSalida(clave).slice(1)) {
      expect(enLaCalzada(punto, AVENIDAS[clave]), `${clave}: ${punto}`).toBe(true)
    }
  })

  it.each(AVENIDAS_DEL_MAPA)('%s: desde cualquier puesto sale sin pisar ninguna losa, con 3, 4 y 5 puestos', (clave) => {
    for (const puestos of [3, 4, 5]) {
      const todas = losasDe(PLACAS, puestos)
      for (let i = 0; i < puestos; i += 1) {
        const camino = caminoDeSalida(sitioEnPuesto(i, puestos), clave)
        expect(noPisaLosas(camino, { losas: todas, suyas: [`puesto ${i + 1}`] }), `${clave}, puesto ${i + 1}`).toEqual([])
      }
    }
  })

  it('en el pasillo, el que sale por la Guaimaral va por otra línea que el que entra, para no cruzarse de frente', () => {
    expect(Math.abs(X_DE_SALIDA_POR_EL_PASILLO - PASILLO.centroX)).toBeGreaterThanOrEqual(1)
    const camino = caminoDeSalida(sitioEnPuesto(1, PUESTOS), 'guaimaral')
    const enElPasillo = camino.filter(
      ([x, , z]) => Math.abs(x - PASILLO.centroX) < PASILLO.ancho / 2 - 1e-9 && z > Z_DETRAS_DE_LOS_PUESTOS + 1e-9,
    )
    expect(enElPasillo.length).toBeGreaterThan(0)
    for (const [x] of enElPasillo) expect(x).toBe(X_DE_SALIDA_POR_EL_PASILLO)
  })

  it('el que sale por la Gran Colombia no baja por el pasillo: va por el corredor hasta su boca', () => {
    const camino = caminoDeSalida(sitioEnPuesto(1, PUESTOS), 'granColombia')
    for (const [x, , z] of camino) {
      if (z >= LOCAL.zSalida) expect(z, `en (${x}, ${z})`).toBeLessThanOrEqual(LOCAL.zPuestos)
    }
  })

  it('empieza en el puesto y acaba en la avenida por la que entró', () => {
    for (const clave of AVENIDAS_DEL_MAPA) {
      const camino = caminoDeSalida(sitioEnPuesto(1, PUESTOS), clave)
      expect(camino[0]).toEqual(puntoDe(sitioEnPuesto(1, PUESTOS)))
      expect(camino.at(-1)).toEqual(curvaDeSalida(clave).at(-1))
    }
  })

  it('el que entró por la Guaimaral recorre el pasillo hasta su boca, a media altura; el de la Gran Colombia sale por el fondo', () => {
    const porGuaimaral = caminoDeSalida(sitioEnPuesto(1, PUESTOS), 'guaimaral')
    const porGranColombia = caminoDeSalida(sitioEnPuesto(1, PUESTOS), 'granColombia')
    expect(largoDelCamino(porGuaimaral)).toBeGreaterThan(largoDelCamino(porGranColombia))
    expect(porGuaimaral.some(([x, , z]) => x === X_DE_SALIDA_POR_EL_PASILLO && z === AVENIDAS.guaimaral.posicion[2])).toBe(true)
  })

  it.each(AVENIDAS_DEL_MAPA)('%s: la salida, ya apartada de la entrada, no pisa el borde de la calzada', (clave) => {
    const { calle } = AVENIDAS[clave]
    const borde = clave === 'guaimaral' ? calle.centro[0] - calle.ancho / 2 : calle.centro[2] - calle.fondo / 2
    for (const punto of curvaDeSalida(clave)) {
      const coordenada = clave === 'guaimaral' ? punto[0] : punto[2]
      expect(coordenada).toBeGreaterThanOrEqual(borde + MARGEN_EN_LA_CALZADA - 1e-9)
    }
  })
})
