import { describe, expect, it } from 'vitest'

import {
  ASIENTOS_OCUPADOS,
  CAJAS_DE_LOS_MUEBLES,
  CAJAS_DEL_EDIFICIO,
  CAFETERIA,
  FRANJA_DE_ESPERA_EN_PLANTA,
  HUELLA_DE_LA_CAFETERIA,
  seSolapan,
} from './cafeteria.js'
import { cajasDeLaVegetacion } from './colocacion.js'
import { AVENIDAS, CURVAS_DE_ENTRADA, LOCAL } from './posiciones.js'
import {
  CLAVES_DE_LAS_VISTAS,
  camaraDeLaVista,
  ojosDelAsiento,
  PANTALLAS_DE_LA_PRUEBA,
  puntosClave,
  puntosTapados,
  rayoCruzaCaja,
} from './visibilidad.js'

const CAJA = { nombre: 'una caja', min: [0, 0, 0], max: [2, 2, 2] }

describe('el rayo contra una caja', () => {
  it('un rayo que la atraviesa la cruza', () => {
    expect(rayoCruzaCaja([-1, 1, 1], [3, 1, 1], CAJA)).toBe(true)
    expect(rayoCruzaCaja([1, 5, 1], [1, -5, 1], CAJA)).toBe(true)
  })

  it('un rayo que pasa por un lado, por encima o se queda corto no la cruza', () => {
    expect(rayoCruzaCaja([-1, 3, 1], [3, 3, 1], CAJA)).toBe(false)
    expect(rayoCruzaCaja([-1, 1, 5], [3, 1, 5], CAJA)).toBe(false)
    expect(rayoCruzaCaja([-5, 1, 1], [-1, 1, 1], CAJA)).toBe(false)
  })

  it('el segmento termina en el punto: una caja detrás del destino no cuenta', () => {
    expect(rayoCruzaCaja([-3, 1, 1], [-1, 1, 1], CAJA)).toBe(false)
    expect(rayoCruzaCaja([-3, 1, 1], [1, 1, 1], CAJA)).toBe(true)
  })

  it('un rayo paralelo a una cara y fuera de ella no la cruza', () => {
    expect(rayoCruzaCaja([-1, 3, 1], [3, 3, 1.5], CAJA)).toBe(false)
  })

  it('una caja puesta a propósito delante de una placa da un rayo bloqueado, y una fuera del paso no', () => {
    const origen = camaraDeLaVista('general', PANTALLAS_DE_LA_PRUEBA[0])
    const placa = puntosClave(6, 3).find(({ nombre }) => nombre === 'placa 1 (moto)')
    const [x, y, z] = placa.punto
    const delante = { nombre: 'una pared', min: [x - 1, 0, z + 2], max: [x + 1, 6, z + 3] }
    const fueraDelPaso = { nombre: 'un cajón lejano', min: [40, 0, 40], max: [42, 2, 42] }
    expect(puntosTapados(origen, [placa], [delante])).toEqual(['placa 1 (moto) tapado por una pared'])
    expect(puntosTapados(origen, [placa], [fueraDelPaso])).toEqual([])
    expect(y).toBeGreaterThan(0)
  })
})

describe('los puntos clave', () => {
  it('incluyen placas, puestos, filas, caminos, bocas, letrero y columnas', () => {
    const nombres = puntosClave(6, 3).map((p) => p.nombre)
    for (const parte of ['placa 6 (losa)', 'puesto 3 (moto)', 'fila de lavado', 'fila de acabado', 'camino de las motos', 'boca de la Av. Gran Colombia', 'boca de la Av. Guaimaral', 'letrero de la pared', 'columna']) {
      expect(nombres.some((n) => n.startsWith(parte)), parte).toBe(true)
    }
  })

  it('con 14 placas y 7 puestos hay un punto para cada una', () => {
    const nombres = puntosClave(14, 7).map((p) => p.nombre)
    expect(nombres).toContain('placa 14 (losa)')
    expect(nombres).toContain('puesto 7 (moto)')
  })
})

describe('la cafetería: dónde está', () => {
  it('su huella no pisa la calzada de la Guaimaral, las curvas de entrada ni la franja de espera', () => {
    const guaimaral = AVENIDAS.guaimaral.calle
    const calzada = {
      x0: guaimaral.centro[0] - guaimaral.ancho / 2,
      x1: guaimaral.centro[0] + guaimaral.ancho / 2,
      z0: -1e9,
      z1: 1e9,
    }
    expect(seSolapan(HUELLA_DE_LA_CAFETERIA, calzada)).toBe(false)
    const granColombia = AVENIDAS.granColombia.calle
    expect(
      seSolapan(HUELLA_DE_LA_CAFETERIA, {
        x0: granColombia.centro[0] - granColombia.ancho / 2,
        x1: granColombia.centro[0] + granColombia.ancho / 2,
        z0: granColombia.centro[2] - granColombia.fondo / 2,
        z1: granColombia.centro[2] + granColombia.fondo / 2,
      }),
    ).toBe(false)
    expect(seSolapan(HUELLA_DE_LA_CAFETERIA, FRANJA_DE_ESPERA_EN_PLANTA)).toBe(false)
    // ningún punto de las curvas de entrada cae dentro de la huella, con un metro de holgura
    for (const curva of Object.values(CURVAS_DE_ENTRADA)) {
      for (const [x, , z] of curva) {
        const dentro =
          x > HUELLA_DE_LA_CAFETERIA.x0 - 1 && x < HUELLA_DE_LA_CAFETERIA.x1 + 1 && z > HUELLA_DE_LA_CAFETERIA.z0 - 1 && z < HUELLA_DE_LA_CAFETERIA.z1 + 1
        expect(dentro, `curva (${x}, ${z})`).toBe(false)
      }
    }
  })

  it('está adelante del local, del lado de la Guaimaral (a la izquierda)', () => {
    expect(HUELLA_DE_LA_CAFETERIA.z0).toBeGreaterThan(LOCAL.zFrente)
    expect(HUELLA_DE_LA_CAFETERIA.x1).toBeLessThan(0)
    expect(CAFETERIA.zToldo).toBeLessThan(CAFETERIA.zCuerpo)
  })

  it('el punto más alto es el tanque de agua, a unos 4,2 m', () => {
    const alto = Math.max(...CAJAS_DEL_EDIFICIO.map((c) => c.max[1]))
    const tanque = CAJAS_DEL_EDIFICIO.find((c) => c.nombre === 'tanque')
    expect(alto).toBeGreaterThanOrEqual(tanque.max[1])
    expect(tanque.max[1]).toBeCloseTo(4.27, 2)
  })
})

describe('la cafetería no tapa nada del lavadero', () => {
  const CAJAS = [...CAJAS_DEL_EDIFICIO, ...CAJAS_DE_LOS_MUEBLES]
  const CONFIGURACIONES = [
    [1, 1],
    [6, 3],
    [10, 5],
    [14, 7],
  ]

  describe.each(PANTALLAS_DE_LA_PRUEBA)('a $nombre', (pantalla) => {
    it.each(CLAVES_DE_LAS_VISTAS)('desde «%s»', (clave) => {
      const origen = camaraDeLaVista(clave, pantalla)
      for (const [placas, puestos] of CONFIGURACIONES) {
        const tapados = puntosTapados(origen, puntosClave(placas, puestos), CAJAS)
        expect(tapados.slice(0, 5), `${placas} placas y ${puestos} puestos`).toEqual([])
      }
    })
  })

  it('desde los asientos de la sala de espera tampoco tapa nada del lavadero', () => {
    for (const asiento of ASIENTOS_OCUPADOS) {
      const ojos = ojosDelAsiento(asiento)
      for (const [placas, puestos] of CONFIGURACIONES) {
        const tapados = puntosTapados(ojos, puntosClave(placas, puestos), CAJAS_DEL_EDIFICIO)
        expect(tapados.slice(0, 5), `asiento (${asiento.x}, ${asiento.z}) con ${placas}/${puestos}`).toEqual([])
      }
    }
  })
})

describe('la vegetación no tapa nada del lavadero', () => {
  const ARBOLES = cajasDeLaVegetacion()
  const CONFIGURACIONES = [
    [1, 1],
    [6, 3],
    [10, 5],
    [14, 7],
  ]

  it('hay árboles que revisar', () => {
    expect(ARBOLES.length).toBeGreaterThan(15)
  })

  describe.each(PANTALLAS_DE_LA_PRUEBA)('a $nombre', (pantalla) => {
    it.each(CLAVES_DE_LAS_VISTAS)('desde «%s» ningún rayo cruza un árbol o una planta', (clave) => {
      const origen = camaraDeLaVista(clave, pantalla)
      for (const [placas, puestos] of CONFIGURACIONES) {
        const tapados = puntosTapados(origen, puntosClave(placas, puestos), ARBOLES)
        expect(tapados.slice(0, 5), `${placas} placas y ${puestos} puestos`).toEqual([])
      }
    })
  })

  it('desde los asientos de la cafetería tampoco', () => {
    for (const asiento of ASIENTOS_OCUPADOS) {
      for (const [placas, puestos] of CONFIGURACIONES) {
        const tapados = puntosTapados(ojosDelAsiento(asiento), puntosClave(placas, puestos), ARBOLES)
        expect(tapados.slice(0, 5), `asiento (${asiento.x}, ${asiento.z}) con ${placas}/${puestos}`).toEqual([])
      }
    }
  })

  it('el detector sí encuentra un árbol que estorbe: uno puesto delante de una placa', () => {
    const origen = camaraDeLaVista('general', PANTALLAS_DE_LA_PRUEBA[0])
    const placa = puntosClave(6, 3).find(({ nombre }) => nombre === 'placa 2 (moto)')
    const [x, , z] = placa.punto
    const arbol = { nombre: 'un árbol mal puesto', min: [x - 1.5, 0, z + 3], max: [x + 1.5, 5, z + 6] }
    expect(puntosTapados(origen, [placa], [arbol])).toHaveLength(1)
  })
})
