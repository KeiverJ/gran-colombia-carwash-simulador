import { describe, expect, it } from 'vitest'

import {
  ANCHO_DE_CALLE,
  AVENIDAS,
  COLUMNAS_DEL_TECHO,
  entradaDeLaMoto,
  LOCAL,
  cuantasMotosCabenEnLaFila,
  MOTO,
  motosVisibles,
  NUMERO_EN_LA_LOSA,
  PASILLO,
  posadaEnLaLosa,
  posicionDePlaca,
  posicionDelRotuloDeSobrantes,
  posicionEnFila,
  posicionDePuesto,
  FILA_DEL_LAVADO,
  FRANJA_DE_ESPERA,
  PUNTO_DE_UNION_A_LA_FILA,
  PASO_A_LA_COLA,
  Z_DETRAS_DE_LOS_PUESTOS,
  REJILLA_DE_DESAGUE,
  repartoDePlacas,
  SEPARACION_EN_FILA,
  SERVIDOR,
  sobrantesDe,
  TECHO,
  TOPE_DE_MOTOS_DIBUJADAS,
  X_DEL_CARRIL_DE_LA_FRANJA,
  X_CABEZA_DE_FILA,
  TERRENO,
  ZONA_DE_SERVIDORES,
} from './posiciones.js'

const equisDe = (cuantos, posicion) =>
  Array.from({ length: cuantos }, (_, i) => posicion(i, cuantos)[0])

const cabeEnElLocal = (x) => Math.abs(x) + SERVIDOR.ancho / 2 <= LOCAL.ancho / 2 + 1e-9

/** Las placas de cada fila, en el orden en que están numeradas. */
const porFilas = (total) => {
  const { adelante } = repartoDePlacas(total)
  const todas = Array.from({ length: total }, (_, i) => posicionDePlaca(i, total))
  return { adelante: todas.slice(0, adelante), atras: todas.slice(adelante) }
}

const enOrden = (xs) => xs.every((x, i) => i === 0 || x > xs[i - 1])

describe('el reparto de las placas en dos filas', () => {
  it('con 5, 6 y 7 placas reparte 3+2, 3+3 y 4+3', () => {
    expect(repartoDePlacas(5)).toEqual({ adelante: 3, atras: 2 })
    expect(repartoDePlacas(6)).toEqual({ adelante: 3, atras: 3 })
    expect(repartoDePlacas(7)).toEqual({ adelante: 4, atras: 3 })
  })

  it('nunca pierde ni inventa placas', () => {
    for (let total = 1; total <= 12; total += 1) {
      const { adelante, atras } = repartoDePlacas(total)
      expect(adelante + atras).toBe(total)
      // Con un número impar la de adelante lleva una más, nunca la de atrás.
      expect(adelante).toBeGreaterThanOrEqual(atras)
      expect(adelante - atras).toBeLessThanOrEqual(1)
    }
  })

  it('rechaza un número de placas imposible', () => {
    expect(() => repartoDePlacas(0)).toThrow(/mayor o igual que 1/)
    expect(() => repartoDePlacas(2.5)).toThrow(/entero/)
  })
})

describe('las placas de lavado', () => {
  it('los números van de izquierda a derecha, empezando por la fila de adelante', () => {
    for (const total of [5, 6, 7]) {
      const { adelante, atras } = porFilas(total)
      expect(enOrden(adelante.map((p) => p[0])), `fila de adelante con ${total}`).toBe(true)
      expect(enOrden(atras.map((p) => p[0])), `fila de atrás con ${total}`).toBe(true)
    }
  })

  it('cada placa de atrás comparte la x con la que le corresponde por orden', () => {
    for (const total of [5, 6, 7]) {
      const { adelante, atras } = porFilas(total)
      atras.forEach((placa, i) => {
        expect(
          placa[0],
          `con ${total} placas, la de atrás ${i + 1} no está detrás de la ${i + 1}`,
        ).toBeCloseTo(adelante[i][0], 10)
      })
    }
  })

  it('la fila de adelante está delante de la de atrás', () => {
    const { adelante, atras } = porFilas(6)
    for (const placa of adelante) expect(placa[2]).toBe(LOCAL.zPlacasAdelante)
    for (const placa of atras) expect(placa[2]).toBe(LOCAL.zPlacasAtras)
    expect(LOCAL.zPlacasAdelante).toBeGreaterThan(LOCAL.zPlacasAtras)
  })

  it('no se solapan dentro de su fila con 5, 6 ni 7 placas', () => {
    for (const total of [5, 6, 7]) {
      for (const fila of ['adelante', 'atras']) {
        const xs = porFilas(total)[fila].map((p) => p[0])
        for (let i = 1; i < xs.length; i += 1) {
          expect(
            xs[i] - xs[i - 1],
            `con ${total} placas, la ${i} y la ${i + 1} de ${fila} se solapan`,
          ).toBeGreaterThanOrEqual(SERVIDOR.ancho)
        }
      }
    }
  })

  it('las dos filas no se solapan entre sí ni con los puestos', () => {
    const separacionSuficiente = (unaZ, otraZ) =>
      Math.abs(unaZ - otraZ) >= SERVIDOR.fondo - 1e-9
    expect(separacionSuficiente(LOCAL.zPlacasAdelante, LOCAL.zPlacasAtras)).toBe(true)
    expect(separacionSuficiente(LOCAL.zPlacasAtras, LOCAL.zPuestos)).toBe(true)
  })

  it('todas caben dentro del local y en su zona', () => {
    for (const total of [5, 6, 7]) {
      for (const x of equisDe(total, posicionDePlaca)) {
        expect(cabeEnElLocal(x)).toBe(true)
        const desdeElCentro = Math.abs(x - ZONA_DE_SERVIDORES.centroX)
        expect(desdeElCentro + SERVIDOR.ancho / 2).toBeLessThanOrEqual(
          ZONA_DE_SERVIDORES.ancho / 2 + 1e-9,
        )
      }
    }
  })

  it('quedan centradas en su zona', () => {
    const xs = equisDe(6, posicionDePlaca)
    const izquierda = Math.min(...xs)
    const derecha = Math.max(...xs)
    expect((izquierda + derecha) / 2).toBeCloseTo(ZONA_DE_SERVIDORES.centroX, 10)
  })

  it('dejan libre el pasillo de la izquierda, por donde se entra y se rodea', () => {
    // Las dos avenidas quedan de ese lado. Sin el pasillo, entrar desde
    // cualquiera de las dos pasaría por encima de las losas.
    const bordeIzquierdoDeLaZona = ZONA_DE_SERVIDORES.centroX - ZONA_DE_SERVIDORES.ancho / 2
    const bordeDerechoDelPasillo = PASILLO.centroX + PASILLO.ancho / 2
    expect(bordeIzquierdoDeLaZona).toBeGreaterThanOrEqual(bordeDerechoDelPasillo)
    expect(PASILLO.centroX - PASILLO.ancho / 2).toBeGreaterThanOrEqual(-LOCAL.ancho / 2)
    expect(X_CABEZA_DE_FILA).toBeGreaterThan(bordeDerechoDelPasillo)
  })

  it('ninguna losa estorba el pasillo, ni con 7 placas ni con 5 puestos', () => {
    // Por el pasillo suben las motos que entran por la Av. Gran Colombia,
    // desde el fondo hasta la fila del lavado.
    const losas = [
      ...Array.from({ length: 7 }, (_, i) => posicionDePlaca(i, 7)),
      ...Array.from({ length: 5 }, (_, i) => posicionDePuesto(i, 5)),
    ]
    for (const [x] of losas) {
      expect(Math.abs(x - PASILLO.centroX)).toBeGreaterThan(
        (PASILLO.ancho + SERVIDOR.ancho) / 2 - 1e-9,
      )
    }
  })

  it('rechaza índices imposibles', () => {
    expect(() => posicionDePlaca(6, 6)).toThrow(/fuera de/)
    expect(() => posicionDePlaca(-1, 6)).toThrow(/fuera de/)
    expect(() => posicionDePlaca(0, 0)).toThrow(/mayor o igual que 1/)
  })
})

describe('la moto posada en su losa', () => {
  it('no tapa el número, que va pegado al borde de delante', () => {
    const [, , z] = posadaEnLaLosa([0, 0, 0])
    const morro = z + MOTO.largo / 2
    const bordeDeAtrasDelNumero = NUMERO_EN_LA_LOSA.z - NUMERO_EN_LA_LOSA.lado / 2
    expect(morro).toBeLessThan(bordeDeAtrasDelNumero)
  })

  it('cabe entera sobre la losa', () => {
    const [, , z] = posadaEnLaLosa([0, 0, 0])
    expect(Math.abs(z) + MOTO.largo / 2).toBeLessThanOrEqual(SERVIDOR.fondo / 2)
    expect(MOTO.ancho).toBeLessThanOrEqual(SERVIDOR.ancho)
  })

  it('el número cabe dentro de la losa', () => {
    expect(NUMERO_EN_LA_LOSA.z + NUMERO_EN_LA_LOSA.lado / 2).toBeLessThanOrEqual(
      SERVIDOR.fondo / 2,
    )
  })
})

describe('los puestos de acabado', () => {
  it('no se solapan con 3, 4 ni 5 puestos y caben', () => {
    for (const total of [3, 4, 5]) {
      const xs = equisDe(total, posicionDePuesto)
      for (let i = 1; i < xs.length; i += 1) {
        expect(xs[i] - xs[i - 1]).toBeGreaterThanOrEqual(SERVIDOR.ancho)
      }
      for (const x of xs) {
        expect(cabeEnElLocal(x)).toBe(true)
      }
    }
  })

  it('van en una sola fila, detrás de las dos de placas', () => {
    for (let i = 0; i < 5; i += 1) {
      expect(posicionDePuesto(i, 5)[2]).toBe(LOCAL.zPuestos)
    }
    expect(LOCAL.zPuestos).toBeLessThan(LOCAL.zPlacasAtras)
  })
})

const ETAPAS = ['lavado', 'acabado']

describe('las filas de espera', () => {
  it('la del lavado y la del acabado están en planos distintos', () => {
    expect(posicionEnFila(0, 'lavado')).not.toEqual(posicionEnFila(0, 'acabado'))
    expect(posicionEnFila(0, 'lavado')[0]).not.toBe(posicionEnFila(0, 'acabado')[0])
  })

  it('la del acabado está entre la fila de placas de atrás y los puestos', () => {
    expect(posicionEnFila(0, 'acabado')[2]).toBeGreaterThan(LOCAL.zPuestos)
    expect(posicionEnFila(0, 'acabado')[2]).toBeLessThan(LOCAL.zPlacasAtras)
  })

  it('las motos de una fila se separan entre sí y van en orden', () => {
    // La del acabado crece hacia la izquierda, hacia el pasillo.
    expect(posicionEnFila(0, 'acabado')[0] - posicionEnFila(1, 'acabado')[0]).toBeCloseTo(SEPARACION_EN_FILA, 10)
    // La del lavado crece hacia el fondo, a lo largo del lado derecho.
    expect(posicionEnFila(0, 'lavado')[2] - posicionEnFila(1, 'lavado')[2]).toBeCloseTo(SEPARACION_EN_FILA, 10)
  })

  it('ninguna moto de la fila se monta sobre la de delante', () => {
    for (const etapa of ETAPAS) {
      for (let i = 1; i < TOPE_DE_MOTOS_DIBUJADAS[etapa]; i += 1) {
        const [x, , z] = posicionEnFila(i, etapa)
        const [xAntes, , zAntes] = posicionEnFila(i - 1, etapa)
        expect(Math.hypot(x - xAntes, z - zAntes), `${etapa}, motos ${i} y ${i + 1}`).toBeGreaterThan(MOTO.largo)
      }
    }
  })

  it('la del acabado no se mete en el pasillo aunque la cola crezca', () => {
    // Con la etapa 2 saturada la cola llega a miles. Lo que la corta antes de
    // invadir el pasillo es el tope de dibujadas.
    const bordeDelPasillo = PASILLO.centroX + PASILLO.ancho / 2
    for (let i = 0; i < TOPE_DE_MOTOS_DIBUJADAS.acabado; i += 1) {
      const morro = posicionEnFila(i, 'acabado')[0] - MOTO.largo / 2
      expect(morro, `moto ${i + 1}`).toBeGreaterThanOrEqual(bordeDelPasillo)
    }
    const siguiente = posicionEnFila(TOPE_DE_MOTOS_DIBUJADAS.acabado, 'acabado')[0] - MOTO.largo / 2
    expect(siguiente).toBeLessThan(bordeDelPasillo)
  })

  it('la fila dibujada no pisa ninguna losa, ni con 7 placas ni con 5 puestos', () => {
    const losas = [
      ...Array.from({ length: 7 }, (_, i) => posicionDePlaca(i, 7)),
      ...Array.from({ length: 5 }, (_, i) => posicionDePuesto(i, 5)),
    ]
    for (const etapa of ETAPAS) {
      for (let i = 0; i < TOPE_DE_MOTOS_DIBUJADAS[etapa]; i += 1) {
        const [x, , z] = posicionEnFila(i, etapa)
        // Las motos de la fila del lavado van de largo a lo largo de Z; las del acabado, de X.
        const [medioEnX, medioEnZ] =
          etapa === 'lavado' ? [MOTO.ancho / 2, MOTO.largo / 2] : [MOTO.largo / 2, MOTO.ancho / 2]
        for (const [lx, , lz] of losas) {
          const seSolapanEnX = Math.abs(x - lx) < SERVIDOR.ancho / 2 + medioEnX
          const seSolapanEnZ = Math.abs(z - lz) < SERVIDOR.fondo / 2 + medioEnZ
          expect(seSolapanEnX && seSolapanEnZ, `${etapa}, moto ${i + 1}`).toBe(false)
        }
      }
    }
  })

  it('el tope sale de la geometría, no de un número puesto a mano', () => {
    for (const etapa of ETAPAS) {
      expect(TOPE_DE_MOTOS_DIBUJADAS[etapa]).toBe(cuantasMotosCabenEnLaFila(etapa))
      expect(TOPE_DE_MOTOS_DIBUJADAS[etapa]).toBeGreaterThan(1)
    }
  })

  it('rechaza una etapa que no existe', () => {
    expect(() => posicionEnFila(0, 'pintura')).toThrow(/lavado/)
    expect(() => cuantasMotosCabenEnLaFila('pintura')).toThrow(/lavado/)
  })
})

describe('la fila del lavado, en el lado derecho', () => {
  const COLUMNAS_DE_LA_DERECHA = COLUMNAS_DEL_TECHO.filter(([x]) => x > 0)
  /** La mitad del ancho de la moto: va de largo a lo largo de Z. */
  const MEDIO_ANCHO = MOTO.ancho / 2

  it('va por fuera de las columnas, sobre la franja de espera del lado derecho', () => {
    for (let i = 0; i < TOPE_DE_MOTOS_DIBUJADAS.lavado; i += 1) {
      const [x] = posicionEnFila(i, 'lavado')
      for (const [cx] of COLUMNAS_DE_LA_DERECHA) {
        expect(x - MEDIO_ANCHO - cx, `moto ${i + 1}`).toBeGreaterThan(0.5)
      }
      expect(x - MEDIO_ANCHO).toBeGreaterThanOrEqual(FRANJA_DE_ESPERA.x0)
      expect(x + MEDIO_ANCHO).toBeLessThanOrEqual(FRANJA_DE_ESPERA.x0 + FRANJA_DE_ESPERA.ancho)
    }
  })

  it('queda fuera del techo, que termina en las columnas más su vuelo', () => {
    const [x] = posicionEnFila(0, 'lavado')
    const bordeDelTecho = COLUMNAS_DE_LA_DERECHA[0][0] + TECHO.vuelo
    expect(x - MEDIO_ANCHO).toBeGreaterThan(bordeDelTecho)
  })

  it('empieza cerca de la esquina del frente y crece hacia el fondo', () => {
    const cabeza = posicionEnFila(0, 'lavado')
    expect(cabeza[2] + MOTO.largo / 2).toBeLessThanOrEqual(LOCAL.zFrente)
    expect(LOCAL.zFrente - (cabeza[2] + MOTO.largo / 2)).toBeLessThan(1)
    expect(posicionEnFila(1, 'lavado')[2]).toBeLessThan(cabeza[2])
  })

  it('la última moto dibujada no llega al corredor de detrás de los puestos', () => {
    const ultima = posicionEnFila(TOPE_DE_MOTOS_DIBUJADAS.lavado - 1, 'lavado')[2]
    expect(ultima - MOTO.largo / 2).toBeGreaterThan(Z_DETRAS_DE_LOS_PUESTOS)
    // Y la siguiente ya no dejaría sitio para la que viene a unirse: el tope corta justo antes.
    const siguiente = posicionEnFila(TOPE_DE_MOTOS_DIBUJADAS.lavado, 'lavado')[2]
    expect(siguiente - MOTO.largo).toBeLessThan(Z_DETRAS_DE_LOS_PUESTOS)
  })

  it('caben al menos diez motos dibujadas, y el resto se cuenta en el rótulo', () => {
    expect(TOPE_DE_MOTOS_DIBUJADAS.lavado).toBeGreaterThanOrEqual(10)
  })

  it('el punto donde las dos entradas se juntan queda en el carril libre, justo antes del último sitio de la fila', () => {
    const [x, , z] = PUNTO_DE_UNION_A_LA_FILA
    const ultima = posicionEnFila(TOPE_DE_MOTOS_DIBUJADAS.lavado - 1, 'lavado')
    expect(x).toBe(X_DEL_CARRIL_DE_LA_FRANJA)
    expect(z).toBeLessThanOrEqual(ultima[2])
    expect(ultima[2] - z).toBeLessThan(MOTO.largo)
    expect(z).toBeGreaterThan(Z_DETRAS_DE_LOS_PUESTOS)
    for (const camino of Object.values(PASO_A_LA_COLA)) {
      expect(camino.at(-1)).toEqual(PUNTO_DE_UNION_A_LA_FILA)
    }
  })
})

describe('cuántas motos se dibujan de una fila', () => {
  const colaDe = (cuantas) =>
    Array.from({ length: cuantas }, (_, i) => ({ n: i + 1, plan: 2 }))
  const TOPE = TOPE_DE_MOTOS_DIBUJADAS.acabado

  it('con la cola vacía no hay nada que dibujar', () => {
    expect(motosVisibles([], TOPE)).toEqual({ visibles: [], sobrantes: 0 })
  })

  it('cuando caben, se dibujan todas', () => {
    const cola = colaDe(5)
    const { visibles, sobrantes } = motosVisibles(cola, TOPE)
    expect(visibles).toEqual(cola)
    expect(sobrantes).toBe(0)
  })

  it('justo en el tope no hay sobrantes', () => {
    const { visibles, sobrantes } = motosVisibles(colaDe(TOPE), TOPE)
    expect(visibles).toHaveLength(TOPE)
    expect(sobrantes).toBe(0)
  })

  it('con la fila del acabado desbordada se dibujan las primeras y se cuentan las demás', () => {
    // Lo que pasa de verdad con 3 puestos tras mil horas simuladas.
    const { visibles, sobrantes } = motosVisibles(colaDe(3090), TOPE)
    expect(visibles).toHaveLength(TOPE)
    expect(sobrantes).toBe(3090 - TOPE)
    expect(visibles.length + sobrantes).toBe(3090)
  })

  it('cada fila tiene su propio tope: con quince en espera, la del lavado dibuja las que caben', () => {
    const { visibles, sobrantes } = motosVisibles(colaDe(15), TOPE_DE_MOTOS_DIBUJADAS.lavado)
    expect(visibles).toHaveLength(TOPE_DE_MOTOS_DIBUJADAS.lavado)
    expect(sobrantes).toBe(15 - TOPE_DE_MOTOS_DIBUJADAS.lavado)
  })

  it('ni pierde ni duplica motos', () => {
    const cola = colaDe(100)
    const { visibles, sobrantes } = motosVisibles(cola, 7)
    expect(visibles.length + sobrantes).toBe(cola.length)
    expect(new Set(visibles.map((m) => m.n)).size).toBe(visibles.length)
    expect(visibles[0]).toBe(cola[0]) // las primeras de la fila, no unas cualesquiera
  })

  it('no modifica la cola que recibe', () => {
    const cola = colaDe(20)
    const copia = [...cola]
    motosVisibles(cola, 5)
    expect(cola).toEqual(copia)
  })

  it('sobrantesDe cuenta lo mismo sabiendo solo cuántas hay en la fila', () => {
    // El rótulo de la escena solo conoce el número; tiene que coincidir con
    // lo que se dibuja o diría una cosa distinta de la que se ve.
    for (const etapa of ETAPAS) {
      for (const cuantas of [0, 5, 12, 13, 100, 3090]) {
        const cola = colaDe(cuantas)
        const tope = TOPE_DE_MOTOS_DIBUJADAS[etapa]
        expect(sobrantesDe(cuantas, tope)).toBe(motosVisibles(cola, tope).sobrantes)
      }
    }
  })

  it('sobrantesDe nunca es negativo', () => {
    expect(sobrantesDe(0, TOPE)).toBe(0)
    expect(sobrantesDe(3, TOPE)).toBe(0)
  })

  it('rechaza un tope imposible o que falte', () => {
    expect(() => motosVisibles([], -1)).toThrow(/mayor o igual que 0/)
    expect(() => motosVisibles([])).toThrow(/mayor o igual que 0/)
  })
})

describe('las dos avenidas', () => {
  it('la Z crece hacia el frente, para que la X sea la derecha en pantalla', () => {
    // La cámara mira el local de frente. Si el frente estuviera en la Z
    // negativa, la pantalla saldría espejada y la Guaimaral, que va por el
    // borde izquierdo, se vería a la derecha.
    expect(LOCAL.zFrente).toBeGreaterThan(LOCAL.zPuestos)
    expect(LOCAL.zFrente).toBeGreaterThan(LOCAL.zSalida)
  })

  it('la Gran Colombia va a lo largo del borde del fondo', () => {
    const { granColombia } = AVENIDAS
    expect(granColombia.lado).toBe('fondo')
    expect(granColombia.calle.centro[2]).toBeLessThan(LOCAL.zSalida)
    expect(granColombia.calle.ancho).toBeGreaterThanOrEqual(LOCAL.ancho)
    expect(granColombia.calle.fondo).toBe(ANCHO_DE_CALLE)
  })

  it('la Gran Colombia queda enfrente de los puestos de acabado', () => {
    const { granColombia } = AVENIDAS
    for (let i = 0; i < 3; i += 1) {
      const [x, , z] = posicionDePuesto(i, 3)
      // Los puestos quedan entre la calle y el resto del local.
      expect(granColombia.calle.centro[2]).toBeLessThan(z)
      const frenteALaCalle =
        Math.abs(x - granColombia.calle.centro[0]) <= granColombia.calle.ancho / 2
      expect(frenteALaCalle).toBe(true)
    }
  })

  it('la Guaimaral va a lo largo de todo el borde izquierdo', () => {
    const { guaimaral } = AVENIDAS
    expect(guaimaral.lado).toBe('izquierda')
    expect(guaimaral.calle.centro[0]).toBeLessThan(-LOCAL.ancho / 2)
    expect(guaimaral.calle.ancho).toBe(ANCHO_DE_CALLE)
    expect(guaimaral.calle.fondo).toBeGreaterThanOrEqual(LOCAL.fondo)
  })

  it('las dos calles se juntan en la esquina del fondo a la izquierda', () => {
    const { granColombia, guaimaral } = AVENIDAS
    const alcance = (calle, eje) => {
      const largo = eje === 0 ? calle.ancho : calle.fondo
      return [calle.centro[eje] - largo / 2, calle.centro[eje] + largo / 2]
    }
    const [izquierda, derecha] = alcance(granColombia.calle, 0)
    expect(guaimaral.calle.centro[0]).toBeGreaterThanOrEqual(izquierda)
    expect(guaimaral.calle.centro[0]).toBeLessThanOrEqual(derecha)
    const [fondo, frente] = alcance(guaimaral.calle, 2)
    expect(granColombia.calle.centro[2]).toBeGreaterThanOrEqual(fondo)
    expect(granColombia.calle.centro[2]).toBeLessThanOrEqual(frente)
  })

  it('cada rótulo va sobre su propia calle', () => {
    for (const avenida of Object.values(AVENIDAS)) {
      const { calle, rotulo } = avenida
      expect(Math.abs(rotulo[0] - calle.centro[0]), avenida.nombre).toBeLessThanOrEqual(
        calle.ancho / 2,
      )
      expect(Math.abs(rotulo[2] - calle.centro[2]), avenida.nombre).toBeLessThanOrEqual(
        calle.fondo / 2,
      )
    }
  })

  it('ningún rótulo puede taparle nada al local, porque va pintado en el suelo', () => {
    // Un letrero de pie mira a la cámara y crece al acercarse: al recentrar
    // llegó a tapar media escena. A ras de suelo eso no puede pasar.
    for (const avenida of Object.values(AVENIDAS)) {
      expect(avenida.rotulo[1], avenida.nombre).toBeLessThan(0.1)
      expect(avenida.rotulo[1], avenida.nombre).toBeGreaterThanOrEqual(0)
    }
  })

  it('y además ninguno se mete entre la cámara y el local', () => {
    // La cámara mira desde delante, en la Z positiva.
    for (const avenida of Object.values(AVENIDAS)) {
      const delanteDelLocal = avenida.rotulo[2] > LOCAL.zFrente
      const dentroDelAncho = Math.abs(avenida.rotulo[0]) <= LOCAL.ancho / 2
      expect(delanteDelLocal && dentroDelAncho, avenida.nombre).toBe(false)
    }
  })

  it('se entra por la izquierda o por el fondo, nunca por el frente', () => {
    for (const avenida of Object.values(AVENIDAS)) {
      const [x, , z] = avenida.posicion
      const porLaIzquierda = x <= -LOCAL.ancho / 2
      const porElFondo = z <= LOCAL.zSalida
      expect(porLaIzquierda || porElFondo, avenida.nombre).toBe(true)
      expect(z).toBeLessThan(LOCAL.zFrente)
    }
  })

  it('las dos se juntan al final de una sola fila (cola 1), en el lado derecho', () => {
    for (const camino of Object.values(PASO_A_LA_COLA)) {
      expect(camino.at(-1)).toEqual(PUNTO_DE_UNION_A_LA_FILA)
    }
    // y por el carril libre de al lado de la fila, no por encima de las motos que esperan
    expect(PUNTO_DE_UNION_A_LA_FILA[0]).toBe(X_DEL_CARRIL_DE_LA_FRANJA)
    expect(posicionEnFila(0, 'lavado')[0] - PUNTO_DE_UNION_A_LA_FILA[0]).toBeGreaterThan(MOTO.ancho)
  })
})

describe('por qué avenida entra cada moto', () => {
  it('es siempre la misma para la misma moto', () => {
    for (const n of [1, 2, 37, 1000]) {
      expect(entradaDeLaMoto(n).nombre).toBe(entradaDeLaMoto(n).nombre)
    }
  })

  it('reparte entre las dos avenidas', () => {
    const nombres = new Set(
      Array.from({ length: 20 }, (_, i) => entradaDeLaMoto(i + 1).nombre),
    )
    expect(nombres.size).toBe(2)
    expect(nombres).toContain(AVENIDAS.granColombia.nombre)
    expect(nombres).toContain(AVENIDAS.guaimaral.nombre)
  })

  it('cada moto entra por el lado que le toca a su avenida', () => {
    const una = entradaDeLaMoto(1)
    const otra = entradaDeLaMoto(2)
    expect(new Set([una.lado, otra.lado])).toEqual(new Set(['fondo', 'izquierda']))
  })
})

describe('el piso del lavadero', () => {
  it('la rejilla de desagüe va al frente de las placas, a lo ancho de su zona', () => {
    expect(REJILLA_DE_DESAGUE.z).toBeGreaterThan(LOCAL.zPlacasAdelante)
    expect(REJILLA_DE_DESAGUE.z).toBeLessThan(LOCAL.zFrente)
    expect(REJILLA_DE_DESAGUE.ancho).toBe(ZONA_DE_SERVIDORES.ancho)
    expect(REJILLA_DE_DESAGUE.centroX).toBe(ZONA_DE_SERVIDORES.centroX)
  })

  it('las columnas van en el orden del perímetro, sin diagonales', () => {
    // Unidas en este orden, las vigas recorren el contorno. En otro orden se
    // cruzan en aspa por el medio de la escena, que es lo que pasó.
    for (let i = 0; i < COLUMNAS_DEL_TECHO.length; i += 1) {
      const [x, , z] = COLUMNAS_DEL_TECHO[i]
      const [xSiguiente, , zSiguiente] = COLUMNAS_DEL_TECHO[(i + 1) % COLUMNAS_DEL_TECHO.length]
      const comparteLado = x === xSiguiente || z === zSiguiente
      expect(comparteLado, `la viga ${i} va en diagonal`).toBe(true)
    }
  })

  it('las columnas del techo van en las esquinas y no encima de una placa', () => {
    expect(COLUMNAS_DEL_TECHO).toHaveLength(4)
    for (const [x, , z] of COLUMNAS_DEL_TECHO) {
      expect(Math.abs(x)).toBeLessThanOrEqual(LOCAL.ancho / 2)
      expect(Math.abs(z)).toBeLessThanOrEqual(LOCAL.fondo / 2)
      const sobreUnaFilaDePlacas =
        Math.abs(z - LOCAL.zPlacasAdelante) < SERVIDOR.fondo / 2 ||
        Math.abs(z - LOCAL.zPlacasAtras) < SERVIDOR.fondo / 2
      expect(sobreUnaFilaDePlacas).toBe(false)
    }
  })
})

describe('el rótulo de "+X motos más"', () => {
  it('marca el final de la fila dibujada, sin solaparse con la última moto', () => {
    for (const etapa of ETAPAS) {
      const [x, , z] = posicionDelRotuloDeSobrantes(etapa)
      const [ultimaX, , ultimaZ] = posicionEnFila(TOPE_DE_MOTOS_DIBUJADAS[etapa] - 1, etapa)
      expect(Math.hypot(x - ultimaX, z - ultimaZ), etapa).toBeGreaterThanOrEqual(MOTO.largo)
    }
  })

  it('cae del lado por el que crece la fila, no encima de ella', () => {
    // La del acabado crece hacia la izquierda; la del lavado, hacia el fondo.
    const [xAcabado] = posicionDelRotuloDeSobrantes('acabado')
    expect(xAcabado).toBeLessThan(posicionEnFila(TOPE_DE_MOTOS_DIBUJADAS.acabado - 1, 'acabado')[0])
    const [, , zLavado] = posicionDelRotuloDeSobrantes('lavado')
    expect(zLavado).toBeLessThan(posicionEnFila(TOPE_DE_MOTOS_DIBUJADAS.lavado - 1, 'lavado')[2])
  })

  it('va por encima de las motos, para que no lo tapen', () => {
    expect(posicionDelRotuloDeSobrantes('lavado')[1]).toBeGreaterThan(MOTO.alto)
  })

  it('no se sale del local ni de su franja de espera', () => {
    for (const etapa of ETAPAS) {
      const [x, , z] = posicionDelRotuloDeSobrantes(etapa)
      expect(x, etapa).toBeLessThanOrEqual(FRANJA_DE_ESPERA.x0 + FRANJA_DE_ESPERA.ancho)
      expect(x, etapa).toBeGreaterThanOrEqual(-LOCAL.ancho / 2)
      expect(Math.abs(z), etapa).toBeLessThanOrEqual(LOCAL.fondo / 2)
    }
  })

  it('las dos filas tienen su rótulo, cada uno en su sitio', () => {
    const lavado = posicionDelRotuloDeSobrantes('lavado')
    const acabado = posicionDelRotuloDeSobrantes('acabado')
    expect(lavado[0]).toBe(FILA_DEL_LAVADO.x)
    expect(acabado[2]).toBe(LOCAL.zFilaAcabado)
    expect(lavado[0]).not.toBe(acabado[0])
  })
})

describe('el terreno base', () => {
  const [cx, , cz] = TERRENO.centro
  const distancia = ([x, z]) => Math.hypot(x - cx, z - cz)

  it('cubre el local y las dos avenidas sin desvanecerlos', () => {
    const { x0, x1, z0, z1 } = {
      x0: AVENIDAS.guaimaral.calle.centro[0] - AVENIDAS.guaimaral.calle.ancho / 2,
      x1: LOCAL.ancho / 2,
      z0: AVENIDAS.granColombia.calle.centro[2] - AVENIDAS.granColombia.calle.fondo / 2,
      z1: LOCAL.fondo / 2,
    }
    for (const esquina of [[x0, z0], [x0, z1], [x1, z0], [x1, z1]]) {
      expect(distancia(esquina)).toBeLessThan(TERRENO.desvanecerDesde)
    }
  })

  it('el velo termina de tapar antes de donde acaban las avenidas, y estas antes que el terreno', () => {
    expect(TERRENO.desvanecerDesde).toBeLessThan(TERRENO.desvanecerHasta)
    expect(TERRENO.desvanecerHasta).toBeLessThan(TERRENO.alcanceDeLasAvenidas)
    expect(TERRENO.alcanceDeLasAvenidas).toBeLessThan(TERRENO.radio)
    expect(TERRENO.radio).toBeLessThan(TERRENO.radioDelVelo)
  })
})
