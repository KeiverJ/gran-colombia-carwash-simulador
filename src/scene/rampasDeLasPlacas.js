import { medidasDeLaEstructura } from './geometriasDelEntorno.js'
import {
  LOCAL,
  MOTO,
  posicionDePlaca,
  REJILLA_DE_DESAGUE,
  repartoDePlacas,
  SERVIDOR,
} from './posiciones.js'
import { Z_DE_ACCESO_A_PLACAS } from './trayectorias.js'

/**
 * Cuánto mide la rampa de cada placa, decidido con la geometría y no a ojo.
 *
 * La rampa sale del frente de la placa (+Z) y no puede pisar nada de lo que hay
 * delante: la rejilla de desagüe del piso, la placa de adelante, ni el carril
 * por el que llegan las motos (que van de lado a lado a lo largo de la fila,
 * con medio ancho de moto a cada lado de su eje). Se queda con lo que quepa,
 * hasta `LARGO_MAXIMO_DE_LA_RAMPA`.
 *
 * - **Fila de adelante**: por delante está la rejilla del piso (que empieza a
 *   85 cm del borde de la placa) y, más allá, el carril de acceso a 2,1 m: cabe la
 *   rampa entera, de 80 cm.
 * - **Fila de atrás**: por delante está el hueco entre las dos filas, de 1 m, y
 *   su carril (el de `Z_ENTRE_LAS_FILAS`) pasa a 1,63 m del borde de la placa: solo
 *   quedan 12 cm libres, y 10 cm no se leen como una rampa. **No llevan rampa**
 *   (decisión de Keiver en el punto de control): solo las cuatro patas.
 */
export const LARGO_MAXIMO_DE_LA_RAMPA = 0.8

/** Lo que se deja libre entre la rampa y lo que haya delante, en metros. */
export const HOLGURA_DE_LA_RAMPA = 0.02

/** El medio ancho de la moto, que es lo que ocupa a cada lado del eje de su carril. */
const MEDIO_ANCHO_DE_MOTO = MOTO.ancho / 2

/** Se redondea hacia abajo al centímetro. */
const alCentimetro = (metros) => Math.floor(metros * 100 + 1e-6) / 100

/**
 * El largo de la rampa de una placa de la fila de adelante (`deAtras = false`)
 * o de la de atrás.
 */
export function largoDeLaRampa(deAtras) {
  if (deAtras) return 0
  const zDelBorde = LOCAL.zPlacasAdelante + SERVIDOR.fondo / 2
  const carril = Z_DE_ACCESO_A_PLACAS - MEDIO_ANCHO_DE_MOTO
  const limites = [carril - zDelBorde, REJILLA_DE_DESAGUE.z - REJILLA_DE_DESAGUE.fondo / 2 - zDelBorde]
  return alCentimetro(Math.min(LARGO_MAXIMO_DE_LA_RAMPA, ...limites) - HOLGURA_DE_LA_RAMPA)
}

/** ¿La placa `indice` (de `total`) es de la fila de atrás? */
export const esDeAtras = (indice, total) => indice >= repartoDePlacas(total).adelante

/**
 * Las patas y la rampa de una placa, en el mundo: `{ patas: [{ x0, x1, z0, z1 }], rampa: { x0, x1, z0, z1 } }`
 * (rectángulos vistos desde arriba); `rampa` es `null` en las placas de atrás, que no llevan.
 */
export function estructuraEnElMundo(indice, total) {
  const [cx, , cz] = posicionDePlaca(indice, total)
  const medidas = medidasDeLaEstructura({
    ancho: SERVIDOR.ancho,
    fondo: SERVIDOR.fondo,
    largoDeLaRampa: largoDeLaRampa(esDeAtras(indice, total)),
  })
  const mover = ({ x0, x1, z0, z1 }) => ({ x0: x0 + cx, x1: x1 + cx, z0: z0 + cz, z1: z1 + cz })
  return {
    patas: medidas.patas.map(({ x, z, lado }) => mover({ x0: x - lado / 2, x1: x + lado / 2, z0: z - lado / 2, z1: z + lado / 2 })),
    rampa: medidas.rampa ? mover(medidas.rampa) : null,
  }
}
