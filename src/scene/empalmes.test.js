import { describe, expect, it } from 'vitest'

import { estorbosDelCamino, losasDe, losasQuePisa } from './comprobacionesDeCaminos.js'
import { TOPE_DE_MOTOS_DIBUJADAS } from './posiciones.js'
import {
  caminoDeLlegada,
  caminoHacia,
  caminoReplanificado,
  caminoReplanificadoEnRuta,
  empalmeConElCaminoDirecto,
  empalmeCortandoElLazo,
  largoDelCamino,
  puntoDe,
  puntoEnElCamino,
  puntoMasCercano,
  sinRetrocesos,
  sitioEnFila,
  sitioEnPlaca,
  TOLERANCIA_DEL_EMPALME,
} from './trayectorias.js'

const AVENIDAS = ['guaimaral', 'granColombia']
const PLACAS = [5, 6, 7]
const PUESTOS = 3

/** Cada lugar de la fila que se prueba: la cabeza, el segundo y el último que se dibuja. */
const LUGARES = [0, 1, TOPE_DE_MOTOS_DIBUJADAS.lavado - 1]

/** Todas las situaciones: una moto en camino a su lugar en la fila, a la que le cambian el destino a una placa. */
function* situaciones() {
  for (const avenida of AVENIDAS) {
    for (const placas of PLACAS) {
      for (let p = 0; p < placas; p += 1) {
        for (const lugar of LUGARES) {
          const sitioViejo = sitioEnFila('lavado', lugar)
          const sitioNuevo = sitioEnPlaca(p, placas)
          const viejo = caminoDeLlegada(avenida, sitioViejo)
          const largo = largoDelCamino(viejo)
          for (let metros = 0; metros < largo - 0.3; metros += 0.75) {
            yield {
              nombre: `${avenida}, lugar ${lugar} → placa ${p + 1} de ${placas}, a los ${metros.toFixed(2)} m`,
              avenida,
              placas,
              sitioViejo,
              sitioNuevo,
              viejo,
              metros,
              desdeSuSitio: caminoHacia(sitioViejo, sitioNuevo),
              directo: caminoDeLlegada(avenida, sitioNuevo),
            }
          }
        }
      }
    }
  }
}

describe('sinRetrocesos y la media vuelta', () => {
  it('si el camino sube y vuelve a pasar por donde salió, va directo al punto siguiente', () => {
    const camino = [[0, 0, 7.5], [0, 0, 9.7], [0, 0, 2], [-5, 0, 2]]
    expect(sinRetrocesos(camino)).toEqual([[0, 0, 7.5], [0, 0, 2], [-5, 0, 2]])
  })

  it('una vuelta de verdad (que no pasa por donde salió) se queda como está', () => {
    const camino = [[0, 0, 0], [0, 0, 10], [3, 0, 10], [3, 0, 0]]
    expect(sinRetrocesos(camino)).toEqual(camino)
  })
})

describe('puntoMasCercano', () => {
  const camino = [
    [0, 0, 0],
    [10, 0, 0],
    [10, 0, 10],
  ]

  it('da el punto, la distancia y los metros que hay hasta él', () => {
    const cerca = puntoMasCercano(camino, [4, 0, 1.5])
    expect(cerca.punto).toEqual([4, 0, 0])
    expect(cerca.distancia).toBeCloseTo(1.5, 9)
    expect(cerca.metros).toBeCloseTo(4, 9)
    expect(cerca.tramo).toBe(1)
  })

  it('en el segundo tramo cuenta lo que ya recorrió del primero', () => {
    const cerca = puntoMasCercano(camino, [11, 0, 6])
    expect(cerca.punto).toEqual([10, 0, 6])
    expect(cerca.metros).toBeCloseTo(16, 9)
    expect(cerca.tramo).toBe(2)
  })
})

describe('el empalme con el camino directo (a)', () => {
  const directo = caminoDeLlegada('granColombia', sitioEnPlaca(2, 6))

  it('una moto que va por el tramo común sigue por el camino directo hasta la placa', () => {
    const viejo = caminoDeLlegada('granColombia', sitioEnFila('lavado', 0))
    const camino = empalmeConElCaminoDirecto(viejo, 10, directo)
    expect(camino).not.toBeNull()
    expect(camino.at(-1)).toEqual(directo.at(-1))
    expect(largoDelCamino(camino)).toBeLessThanOrEqual(largoDelCamino(directo) - 10 + TOLERANCIA_DEL_EMPALME * 2)
  })

  it('una moto que ya se apartó del camino directo no puede unirse a él', () => {
    const viejo = caminoDeLlegada('granColombia', sitioEnFila('lavado', 0))
    expect(empalmeConElCaminoDirecto(viejo, 45, directo)).toBeNull()
  })

  it('no se une en sentido contrario: la moto no se da la vuelta', () => {
    const alReves = [...directo].reverse()
    expect(empalmeConElCaminoDirecto(alReves, 10, directo)).toBeNull()
  })
})

describe('el empalme que corta el lazo (b)', () => {
  it('nunca es más largo que terminar el viaje viejo y seguir con el nuevo', () => {
    for (const s of situaciones()) {
      const cortando = empalmeCortandoElLazo(s.viejo, s.metros, s.desdeSuSitio)
      const completo = caminoReplanificado(s.viejo, s.metros, s.desdeSuSitio)
      expect(largoDelCamino(cortando), s.nombre).toBeLessThanOrEqual(largoDelCamino(completo) + 1e-6)
    }
  })

  it('si el camino nuevo no cruza al viejo, deja el de siempre', () => {
    const viejo = [[0, 0, 0], [0, 0, 10]]
    const nuevo = [[0, 0, 10], [5, 0, 10], [5, 0, 20]]
    expect(empalmeCortandoElLazo(viejo, 2, nuevo)).toEqual(caminoReplanificado(viejo, 2, nuevo))
  })

  it('corta el lazo en el cruce: no llega al lugar de la fila', () => {
    const viejo = [[0, 0, 0], [0, 0, 10], [3, 0, 10]]
    const nuevo = [[3, 0, 10], [-1, 0, 6], [-8, 0, 6]]
    const camino = empalmeCortandoElLazo(viejo, 0, nuevo)
    expect(camino.at(-1)).toEqual([-8, 0, 6])
    expect(camino.some(([x, , z]) => x === 3 && z === 10)).toBe(false)
  })
})

describe('el camino de una moto a la que le cambian el destino en ruta', () => {
  it('termina en su placa, sin retrocesos, y no es más largo que el de siempre', () => {
    for (const s of situaciones()) {
      const camino = caminoReplanificadoEnRuta(s.viejo, s.metros, s.desdeSuSitio, s.directo)
      expect(camino.at(-1), s.nombre).toEqual(puntoDe(s.sitioNuevo))
      expect(sinRetrocesos(camino).length, s.nombre).toBe(camino.length)
      const deSiempre = caminoReplanificado(s.viejo, s.metros, s.desdeSuSitio)
      expect(largoDelCamino(camino), s.nombre).toBeLessThanOrEqual(largoDelCamino(deSiempre) + 1e-6)
    }
  })

  it('arranca donde está la moto', () => {
    for (const s of situaciones()) {
      const camino = caminoReplanificadoEnRuta(s.viejo, s.metros, s.desdeSuSitio, s.directo)
      const { punto } = puntoEnElCamino(s.viejo, s.metros)
      expect(camino[0], s.nombre).toEqual(punto)
    }
  })

  it('no pisa ninguna losa ajena, ni columnas ni postes, desde ningún punto del viaje', () => {
    for (const s of situaciones()) {
      const camino = caminoReplanificadoEnRuta(s.viejo, s.metros, s.desdeSuSitio, s.directo)
      const configuracion = { placas: s.placas, puestos: PUESTOS }
      const suyas = [`placa ${s.sitioNuevo.indice + 1}`]
      expect(losasQuePisa(camino, { losas: losasDe(s.placas, PUESTOS), suyas, paso: 0.25 }), s.nombre).toEqual([])
      expect(estorbosDelCamino(camino, configuracion, 0.25), s.nombre).toEqual([])
    }
  })

  it('las que todavía van por el tramo común llegan por el camino directo', () => {
    let unidas = 0
    for (const s of situaciones()) {
      const { punto } = puntoEnElCamino(s.viejo, s.metros)
      if (puntoMasCercano(s.directo, punto).distancia > TOLERANCIA_DEL_EMPALME) continue
      const camino = caminoReplanificadoEnRuta(s.viejo, s.metros, s.desdeSuSitio, s.directo)
      const falta = largoDelCamino(s.directo) - puntoMasCercano(s.directo, punto).metros
      if (empalmeConElCaminoDirecto(s.viejo, s.metros, s.directo)) {
        unidas += 1
        expect(largoDelCamino(camino), s.nombre).toBeLessThanOrEqual(falta + 1)
      }
    }
    expect(unidas).toBeGreaterThan(50)
  })
})
