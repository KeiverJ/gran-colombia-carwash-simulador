/**
 * Comprobaciones geométricas sobre los caminos de las motos, para las pruebas:
 * qué losas hay en el piso, si un punto cae encima de una losa, una columna o un
 * poste, y las muestras densas de un camino.
 *
 * Es JavaScript puro, solo para pruebas. Repite el criterio de `trayectorias.test.js`
 * (una moto roza una losa si su centro está a menos de medio ancho de moto de ella).
 */

import {
  COLUMNAS_DEL_TECHO,
  MOTO,
  posicionDePlaca,
  posicionDePuesto,
  POSTE_DE_LOSA,
  SERVIDOR,
} from './posiciones.js'
import { MEDIO_ANCHO_DE_MOTO } from './trayectorias.js'

/** Las losas que hay en el piso con una configuración dada. */
export const losasDe = (placas, puestos) => [
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

/** ¿Este punto cae encima de esa losa? Se mira el centro de la moto con holgura de medio ancho. */
export const pisa = ([x, , z], losa) =>
  Math.abs(x - losa.punto[0]) < (SERVIDOR.ancho + MOTO.ancho) / 2 - 1e-9 &&
  Math.abs(z - losa.punto[2]) < (SERVIDOR.fondo + MOTO.ancho) / 2 - 1e-9

/** Recorre un camino tomando muestras densas de todos sus tramos. */
export function* muestrasDe(camino, paso = 0.1) {
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

/** Qué losas pisa un camino, salvo las que se dicen en `suyas` (la de donde sale y la de donde llega). */
export function losasQuePisa(camino, { losas, suyas = [], paso = 0.1 }) {
  const ajenas = losas.filter((losa) => !suyas.includes(losa.clase))
  const pisadas = []
  for (const { punto } of muestrasDe(camino, paso)) {
    for (const losa of ajenas) {
      if (pisa(punto, losa) && !pisadas.includes(losa.clase)) pisadas.push(losa.clase)
    }
  }
  return pisadas
}

/** ¿Algo del local estorba en este punto? Columnas y postes, con lo que ocupa la moto. */
export function estorbosEn([x, , z], { placas, puestos }) {
  const estorbos = []
  for (const [xc, , zc] of COLUMNAS_DEL_TECHO) {
    if (Math.hypot(x - xc, z - zc) <= 0.16 + MEDIO_ANCHO_DE_MOTO) estorbos.push(`columna (${xc}, ${zc})`)
  }
  for (const losa of losasDe(placas, puestos)) {
    const xp = losa.punto[0] + POSTE_DE_LOSA.x
    const zp = losa.punto[2] + POSTE_DE_LOSA.z
    if (Math.hypot(x - xp, z - zp) <= 0.2 + MEDIO_ANCHO_DE_MOTO) estorbos.push(`poste de la ${losa.clase}`)
  }
  return estorbos
}

/** Las columnas y los postes que roza un camino. */
export function estorbosDelCamino(camino, configuracion, paso = 0.1) {
  const hallados = new Set()
  for (const { punto } of muestrasDe(camino, paso)) {
    for (const estorbo of estorbosEn(punto, configuracion)) hallados.add(estorbo)
  }
  return [...hallados]
}
