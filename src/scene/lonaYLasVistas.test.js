import { describe, expect, it } from 'vitest'

import { vistaDeLaClave } from './camara.js'
import {
  alturaAbsolutaDeLaLona,
  LONA,
  posicionesDeLosArcos,
  semianchoEntreVigas,
} from './lonaDelTecho.js'
import { colocacionDelLetreroDeLaPared } from './logoEnLaEscena.js'
import {
  COLUMNAS_DEL_TECHO,
  LOCAL,
  MOTO,
  PARED_DEL_FONDO,
  posicionDePlaca,
  posicionDePuesto,
  SERVIDOR,
  TECHO,
} from './posiciones.js'
import { tramosConHuecos } from './geometriasDelEntorno.js'
import { CENTRO_DEL_SUELO_CUBIERTO, estadoDeLaOpacidad, medidasDelTecho, opacidadDelTecho } from './techo.js'

const PANTALLAS = [
  ['1366 × 768', 1366 / 768],
  ['1920 × 1080', 1920 / 1080],
  ['390 × 844', 390 / 844],
]

const [CX, , CZ] = CENTRO_DEL_SUELO_CUBIERTO
const { ancho: ANCHO_DE_LA_LONA, fondo: FONDO_DE_LA_LONA } = medidasDelTecho()

/** ¿El segmento de `origen` a `destino` cruza la superficie de la lona? Se recorre a pasos de 2 cm. */
function cruzaLaLona(origen, destino) {
  const largo = Math.hypot(destino[0] - origen[0], destino[1] - origen[1], destino[2] - origen[2])
  const pasos = Math.ceil(largo / 0.02)
  let antes = null
  for (let i = 0; i <= pasos; i += 1) {
    const t = i / pasos
    const [x, y, z] = [0, 1, 2].map((k) => origen[k] + (destino[k] - origen[k]) * t)
    const dentro = Math.abs(x - CX) <= ANCHO_DE_LA_LONA / 2 && Math.abs(z - CZ) <= FONDO_DE_LA_LONA / 2
    if (!dentro) {
      antes = null
      continue
    }
    const encima = y > alturaAbsolutaDeLaLona(x - CX)
    if (antes !== null && encima !== antes) return true
    antes = encima
  }
  return false
}

/** ¿El segmento pasa a menos de `radio` del eje de algún arco de tubo? */
function tocaUnArco(origen, destino, radio = LONA.radioDelArco) {
  const largo = Math.hypot(destino[0] - origen[0], destino[1] - origen[1], destino[2] - origen[2])
  const pasos = Math.ceil(largo / 0.02)
  for (let i = 0; i <= pasos; i += 1) {
    const t = i / pasos
    const [x, y, z] = [0, 1, 2].map((k) => origen[k] + (destino[k] - origen[k]) * t)
    if (Math.abs(x - CX) > semianchoEntreVigas()) continue
    const yDelArco = alturaAbsolutaDeLaLona(x - CX) + LONA.radioDelArco
    for (const zDelArco of posicionesDeLosArcos()) {
      if (Math.hypot(y - yDelArco, z - zDelArco) < radio) return true
    }
  }
  return false
}

describe('la lona no tapa lo que hay debajo con las vistas de cerca', () => {
  const centrosDeLosServidores = [
    ...Array.from({ length: 14 }, (_, i) => posicionDePlaca(i, 14)),
    ...Array.from({ length: 7 }, (_, i) => posicionDePuesto(i, 7)),
  ]

  describe.each(['lavado', 'acabado', 'planta'])('«%s»', (clave) => {
    it.each(PANTALLAS)('a %s la lona se aparta del todo', (_nombre, aspecto) => {
      const { posicion } = vistaDeLaClave(clave, aspecto)
      const opacidad = opacidadDelTecho(posicion)
      expect(estadoDeLaOpacidad(opacidad).visible).toBe(false)
    })

    it.each(PANTALLAS)('a %s ningún rayo a una placa o a un puesto (14 y 7) cruza la lona que se ve', (_nombre, aspecto) => {
      const { posicion } = vistaDeLaClave(clave, aspecto)
      const visible = estadoDeLaOpacidad(opacidadDelTecho(posicion)).visible
      for (const [x, , z] of centrosDeLosServidores) {
        for (const alto of [SERVIDOR.altoOcupado, SERVIDOR.altoOcupado + MOTO.alto]) {
          const tapa = visible && cruzaLaLona(posicion, [x, alto, z])
          expect(tapa, `${clave}: (${x.toFixed(1)}, ${z.toFixed(1)}) a ${alto.toFixed(2)} m`).toBe(false)
        }
      }
    })
  })

  it('el detector sí encuentra la lona: un rayo desde arriba hacia el suelo la cruza', () => {
    expect(cruzaLaLona([CX, 20, CZ], [CX, 0.5, CZ])).toBe(true)
    expect(cruzaLaLona([CX, 3, CZ + 12], [CX, 0.5, CZ])).toBe(false)
  })
})

describe('el letrero horizontal de la pared se ve entero con la lona y los arcos', () => {
  const { aberturas, z: zDeLaPared, grosor } = PARED_DEL_FONDO
  const huecos = aberturas.map(({ centroX, ancho }) => ({ centro: centroX, ancho }))
  const macizos = tramosConHuecos(-LOCAL.ancho / 2, LOCAL.ancho / 2, huecos)
  const [desde, hasta] = macizos.reduce((mejor, tramo) => (tramo[1] - tramo[0] > mejor[1] - mejor[0] ? tramo : mejor))
  const letrero = colocacionDelLetreroDeLaPared({ z: zDeLaPared, grosor }, desde, hasta)
  const zDelLetrero = letrero.position[2]
  const esquinas = [-1, 1].flatMap((lado) =>
    [letrero.position[1] - letrero.alto / 2, letrero.position[1] + letrero.alto / 2].map((y) => [
      letrero.position[0] + (lado * letrero.ancho) / 2,
      y,
      zDelLetrero,
    ]),
  )

  it.each(PANTALLAS.slice(0, 2))('a %s ni la lona ni los arcos tapan ninguna esquina del letrero', (_nombre, aspecto) => {
    const { posicion } = vistaDeLaClave('general', aspecto)
    for (const esquina of esquinas) {
      expect(cruzaLaLona(posicion, esquina), `lona, esquina ${esquina.map((v) => v.toFixed(2))}`).toBe(false)
      expect(tocaUnArco(posicion, esquina), `arco, esquina ${esquina.map((v) => v.toFixed(2))}`).toBe(false)
    }
  })

  it('los arcos arrancan a la altura de las vigas: no bajan más que ellas', () => {
    const viga = TECHO.alto - 0.06
    for (const x of [-semianchoEntreVigas(), 0, semianchoEntreVigas()]) {
      expect(alturaAbsolutaDeLaLona(x) + LONA.radioDelArco - LONA.radioDelArco).toBeGreaterThanOrEqual(viga)
    }
    for (const [, , z] of COLUMNAS_DEL_TECHO) expect(posicionesDeLosArcos()).toContain(z)
  })
})
