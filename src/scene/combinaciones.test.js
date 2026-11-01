import { describe, expect, it } from 'vitest'

import {
  COLUMNAS_DEL_TECHO,
  FILA_DEL_LAVADO,
  FRANJA_DE_ESPERA,
  LOCAL,
  MOTO,
  posicionDePlaca,
  posicionDePuesto,
  posicionEnFila,
  POSTE_DE_LOSA,
  posteDeLaPlaca,
  posteDelPuesto,
  RADIO_DE_LA_BASE_DEL_POSTE,
  SERVIDOR,
  TOPE_DE_MOTOS_DIBUJADAS,
} from './posiciones.js'
import {
  caminoDeEntrada,
  caminoDeSalida,
  caminoHacia,
  MEDIO_ANCHO_DE_MOTO,
  sitioEnFila,
  sitioEnPlaca,
  sitioEnPuesto,
} from './trayectorias.js'

/**
 * Todas las combinaciones de 1 a 14 placas con 1 a 7 puestos, comprobadas en 2D
 * (X y Z, vista desde arriba): lo que se solapa o se sale del local se ve aquí,
 * sin navegador. Las combinaciones del cambio anterior (5–7 placas, 3–5 puestos)
 * están dentro de este recorrido.
 */
const PLACAS = Array.from({ length: 14 }, (_, i) => i + 1)
const PUESTOS = Array.from({ length: 7 }, (_, i) => i + 1)
const COMBINACIONES = PLACAS.flatMap((placas) => PUESTOS.map((puestos) => [placas, puestos]))

/** Lo que mide una columna a lo ancho, en metros de radio. */
const RADIO_DE_COLUMNA = 0.16

/** Las losas de una combinación: `{ clase, centro: [x, z] }`. */
const enPlanta = ([x, , z]) => [x, z]
const losasDe = (placas, puestos) => [
  ...Array.from({ length: placas }, (_, i) => ({
    clase: `placa ${i + 1}`,
    centro: enPlanta(posicionDePlaca(i, placas)),
    poste: posteDeLaPlaca(i, placas),
  })),
  ...Array.from({ length: puestos }, (_, i) => ({
    clase: `puesto ${i + 1}`,
    centro: enPlanta(posicionDePuesto(i, puestos)),
    poste: posteDelPuesto(i, puestos),
  })),
]

/** Dónde está el poste de una losa, en X y Z, y qué radio tiene su base. */
function posteDe(losa) {
  return {
    x: losa.centro[0] + losa.poste.x,
    z: losa.centro[1] + losa.poste.z,
    radio: RADIO_DE_LA_BASE_DEL_POSTE * losa.poste.escala,
  }
}

/** Distancia entre un punto y el rectángulo de una losa (0 si está dentro). */
function distanciaALaLosa(x, z, losa) {
  const dx = Math.max(Math.abs(x - losa.centro[0]) - SERVIDOR.ancho / 2, 0)
  const dz = Math.max(Math.abs(z - losa.centro[1]) - SERVIDOR.fondo / 2, 0)
  return Math.hypot(dx, dz)
}

const sePisan = (a, b) =>
  Math.abs(a.centro[0] - b.centro[0]) < SERVIDOR.ancho - 1e-9 && Math.abs(a.centro[1] - b.centro[1]) < SERVIDOR.fondo - 1e-9

const pisaLaMoto = ([x, , z], losa) =>
  Math.abs(x - losa.centro[0]) < (SERVIDOR.ancho + MOTO.ancho) / 2 - 1e-9 &&
  Math.abs(z - losa.centro[1]) < (SERVIDOR.fondo + MOTO.ancho) / 2 - 1e-9

function* muestrasDe(camino, paso = 0.25) {
  for (let i = 1; i < camino.length; i += 1) {
    const [x0, , z0] = camino[i - 1]
    const [x1, , z1] = camino[i]
    const cuantas = Math.max(1, Math.ceil(Math.hypot(x1 - x0, z1 - z0) / paso))
    for (let k = 0; k <= cuantas; k += 1) {
      const t = k / cuantas
      yield [x0 + (x1 - x0) * t, 0, z0 + (z1 - z0) * t]
    }
  }
}

/** Los problemas de una combinación, uno por línea; vacío si no hay ninguno. */
function problemasDeLasLosas(placas, puestos) {
  const losas = losasDe(placas, puestos)
  const problemas = []
  for (let i = 0; i < losas.length; i += 1) {
    for (let j = i + 1; j < losas.length; j += 1) {
      if (sePisan(losas[i], losas[j])) problemas.push(`${losas[i].clase} y ${losas[j].clase} se solapan`)
    }
  }
  return problemas
}

function problemasDePostes(placas, puestos) {
  const losas = losasDe(placas, puestos)
  const problemas = []
  for (const losa of losas) {
    const poste = posteDe(losa)
    for (const otra of losas) {
      if (distanciaALaLosa(poste.x, poste.z, otra) < poste.radio - 1e-9) {
        problemas.push(`el poste de la ${losa.clase} cae sobre la ${otra.clase}`)
      }
    }
  }
  return problemas
}

describe('todas las combinaciones de 1 a 14 placas con 1 a 7 puestos', () => {
  it('son 98 combinaciones', () => {
    expect(COMBINACIONES).toHaveLength(98)
  })

  it('ninguna losa se solapa con otra', () => {
    for (const [placas, puestos] of COMBINACIONES) {
      expect(problemasDeLasLosas(placas, puestos), `${placas} placas y ${puestos} puestos`).toEqual([])
    }
  })

  it('el poste de cada losa no cae sobre ninguna losa, ni la suya ni las vecinas', () => {
    for (const [placas, puestos] of COMBINACIONES) {
      expect(problemasDePostes(placas, puestos), `${placas} placas y ${puestos} puestos`).toEqual([])
    }
  })

  it('las losas no tocan las columnas del techo', () => {
    for (const [placas, puestos] of COMBINACIONES) {
      for (const losa of losasDe(placas, puestos)) {
        for (const [xc, , zc] of COLUMNAS_DEL_TECHO) {
          expect(
            distanciaALaLosa(xc, zc, losa),
            `${losa.clase} (${placas} placas, ${puestos} puestos) contra la columna (${xc}, ${zc})`,
          ).toBeGreaterThan(RADIO_DE_COLUMNA)
        }
      }
    }
  })

  it('las losas quedan dentro del local', () => {
    for (const [placas, puestos] of COMBINACIONES) {
      for (const losa of losasDe(placas, puestos)) {
        expect(losa.centro[0] - SERVIDOR.ancho / 2).toBeGreaterThanOrEqual(-LOCAL.ancho / 2)
        expect(losa.centro[0] + SERVIDOR.ancho / 2).toBeLessThanOrEqual(LOCAL.ancho / 2)
        expect(Math.abs(losa.centro[1]) + SERVIDOR.fondo / 2).toBeLessThanOrEqual(LOCAL.fondo / 2)
      }
    }
  })

  it('los rótulos con el número no se pisan entre sí', () => {
    // Un rótulo mide de ancho como mucho 1,2 m a lo ancho de la vista: dos números no pueden
    // estar a menos de eso en X si están a la misma altura de la losa (misma fila).
    for (const [placas, puestos] of COMBINACIONES) {
      const rotulos = losasDe(placas, puestos).map((losa) => ({ clase: losa.clase, ...posteDe(losa) }))
      for (let i = 0; i < rotulos.length; i += 1) {
        for (let j = i + 1; j < rotulos.length; j += 1) {
          const cerca = Math.abs(rotulos[i].x - rotulos[j].x) < 1.2 && Math.abs(rotulos[i].z - rotulos[j].z) < 1.5
          expect(cerca, `${rotulos[i].clase} y ${rotulos[j].clase} (${placas}/${puestos})`).toBe(false)
        }
      }
    }
  })

  it('las filas de espera caen dentro del local y su franja, y no pisan ninguna losa', () => {
    const derecha = FRANJA_DE_ESPERA.x0 + FRANJA_DE_ESPERA.ancho
    for (const [placas, puestos] of COMBINACIONES) {
      const losas = losasDe(placas, puestos)
      for (const etapa of ['lavado', 'acabado']) {
        for (let i = 0; i < TOPE_DE_MOTOS_DIBUJADAS[etapa]; i += 1) {
          const punto = posicionEnFila(i, etapa)
          expect(punto[0]).toBeGreaterThanOrEqual(-LOCAL.ancho / 2)
          expect(punto[0]).toBeLessThanOrEqual(derecha)
          expect(Math.abs(punto[2])).toBeLessThanOrEqual(LOCAL.fondo / 2)
          expect(losas.filter((losa) => pisaLaMoto(punto, losa)).map((losa) => losa.clase)).toEqual([])
        }
      }
    }
    expect(FILA_DEL_LAVADO.x).toBeLessThanOrEqual(derecha)
  })
})

describe('lo que ya estaba no se mueve', () => {
  it('con 5 a 7 placas y 3 a 5 puestos cada poste está donde siempre, sin encoger', () => {
    for (const placas of [5, 6, 7]) {
      for (let i = 0; i < placas; i += 1) {
        expect(posteDeLaPlaca(i, placas), `placa ${i + 1} de ${placas}`).toEqual({ ...POSTE_DE_LOSA, escala: 1 })
      }
    }
    for (const puestos of [3, 4, 5]) {
      for (let j = 0; j < puestos; j += 1) {
        expect(posteDelPuesto(j, puestos), `puesto ${j + 1} de ${puestos}`).toEqual({ ...POSTE_DE_LOSA, escala: 1 })
      }
    }
  })

  it('con las losas más juntas el poste se acerca al hueco y, si no cabe, se encoge', () => {
    const apretado = posteDelPuesto(1, 7)
    expect(apretado.x).toBeGreaterThan(POSTE_DE_LOSA.x)
    expect(apretado.escala).toBeLessThan(1)
    expect(apretado.escala).toBeGreaterThan(0.5)
    // La primera de la fila no tiene vecina a la izquierda: queda como siempre.
    expect(posteDelPuesto(0, 7)).toEqual({ ...POSTE_DE_LOSA, escala: 1 })
  })
})

describe('los caminos hacia cada placa y cada puesto, con todas las combinaciones', () => {
  const derecha = FRANJA_DE_ESPERA.x0 + FRANJA_DE_ESPERA.ancho

  /** Lo que estorba a lo largo de un camino: losas ajenas, columnas y fuera del local. */
  function estorbosDe(camino, { placas, puestos, suyas }) {
    const losas = losasDe(placas, puestos).filter((losa) => !suyas.includes(losa.clase))
    const estorbos = new Set()
    for (const punto of muestrasDe(camino)) {
      for (const losa of losas) {
        if (pisaLaMoto(punto, losa)) estorbos.add(`pisa la ${losa.clase}`)
      }
      for (const [xc, , zc] of COLUMNAS_DEL_TECHO) {
        if (Math.hypot(punto[0] - xc, punto[2] - zc) <= RADIO_DE_COLUMNA + MEDIO_ANCHO_DE_MOTO - 0.05) {
          estorbos.add(`roza la columna (${xc}, ${zc})`)
        }
      }
      if (punto[0] < -LOCAL.ancho / 2 - 20 || punto[0] > derecha || Math.abs(punto[2]) > LOCAL.fondo / 2 + 20) {
        estorbos.add('se sale del local')
      }
    }
    return [...estorbos]
  }

  it('de la fila del lavado a cada placa y de cada placa a la fila del acabado', () => {
    for (const [placas, puestos] of COMBINACIONES) {
      for (let i = 0; i < placas; i += 1) {
        const suyas = [`placa ${i + 1}`]
        const ida = caminoHacia(sitioEnFila('lavado', 0), sitioEnPlaca(i, placas))
        const vuelta = caminoHacia(sitioEnPlaca(i, placas), sitioEnFila('acabado', 0))
        expect(estorbosDe(ida, { placas, puestos, suyas }), `fila → placa ${i + 1} (${placas}/${puestos})`).toEqual([])
        expect(estorbosDe(vuelta, { placas, puestos, suyas }), `placa ${i + 1} → fila (${placas}/${puestos})`).toEqual([])
      }
    }
  })

  it('de la fila del acabado a cada puesto, y de cada puesto a la salida', () => {
    for (const [placas, puestos] of COMBINACIONES) {
      for (let j = 0; j < puestos; j += 1) {
        const suyas = [`puesto ${j + 1}`]
        const ida = caminoHacia(sitioEnFila('acabado', 0), sitioEnPuesto(j, puestos))
        expect(estorbosDe(ida, { placas, puestos, suyas }), `fila → puesto ${j + 1} (${placas}/${puestos})`).toEqual([])
        for (const avenida of ['guaimaral', 'granColombia']) {
          const salida = caminoDeSalida(sitioEnPuesto(j, puestos), avenida)
          expect(estorbosDe(salida, { placas, puestos, suyas }), `puesto ${j + 1} → ${avenida} (${placas}/${puestos})`).toEqual([])
        }
      }
    }
  })

  it('de cada avenida a cada placa libre y a la fila', () => {
    for (const [placas, puestos] of COMBINACIONES) {
      for (const avenida of ['guaimaral', 'granColombia']) {
        expect(estorbosDe(caminoDeEntrada(avenida), { placas, puestos, suyas: [] }), `${avenida} (${placas}/${puestos})`).toEqual([])
        for (let i = 0; i < placas; i += 1) {
          const camino = caminoHacia({ zona: 'entrada', avenida }, sitioEnPlaca(i, placas))
          expect(estorbosDe(camino, { placas, puestos, suyas: [`placa ${i + 1}`] }), `${avenida} → placa ${i + 1} (${placas}/${puestos})`).toEqual([])
        }
      }
    }
  })
})
