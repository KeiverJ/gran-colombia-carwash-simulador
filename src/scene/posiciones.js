/**
 * Dónde va cada cosa dentro del local, en metros.
 *
 * Son funciones puras a propósito: es lo único de la escena que se puede
 * probar sin navegador, y es donde se cuelan los errores silenciosos —placas
 * que se solapan al pasar de 6 a 7, una fila que se sale del local, un rótulo
 * de sobrantes que cuenta mal—.
 *
 * Ejes: X de izquierda a derecha, Z de delante (entradas) hacia atrás
 * (acabado), Y hacia arriba.
 */

/** Medidas del local. */
export const LOCAL = {
  ancho: 20,
  fondo: 24,
  // Dónde está cada zona a lo largo del eje Z.
  zEntrada: -11,
  zFilaLavado: -6,
  zPlacas: -1,
  zFilaAcabado: 5,
  zPuestos: 9,
  zSalida: 11,
}

/** Tamaño de una placa de lavado o de un puesto de acabado. */
export const SERVIDOR = { ancho: 2.2, fondo: 3, altoLibre: 0.12, altoOcupado: 0.5 }

/** Separación entre motos que esperan en fila. */
export const SEPARACION_EN_FILA = 1.4

/** Cuántas motos de una fila se dibujan como mucho. */
export const TOPE_DE_MOTOS_DIBUJADAS = 12

/** Las dos avenidas por las que pueden llegar las motos. */
export const AVENIDAS = {
  granColombia: { nombre: 'Av. Gran Colombia', x: -7 },
  guaimaral: { nombre: 'Av. Guaimaral', x: 7 },
}

/**
 * Reparte `total` cosas de ancho fijo a lo ancho del local, centradas.
 * El paso se calcula con el ancho disponible, así que al pasar de 6 a 7 se
 * acercan pero nunca se solapan.
 */
function repartirALoAncho(indice, total, z) {
  const anchoUtil = LOCAL.ancho - SERVIDOR.ancho
  const paso = total > 1 ? anchoUtil / (total - 1) : 0
  const x = total > 1 ? -anchoUtil / 2 + indice * paso : 0
  return [x, 0, z]
}

/**
 * Posición de la placa de lavado número `indice` (empezando en 0).
 * @returns {[number, number, number]}
 */
export function posicionDePlaca(indice, total) {
  exigirIndice(indice, total, 'placa')
  return repartirALoAncho(indice, total, LOCAL.zPlacas)
}

/** Posición del puesto de acabado número `indice` (empezando en 0). */
export function posicionDePuesto(indice, total) {
  exigirIndice(indice, total, 'puesto')
  return repartirALoAncho(indice, total, LOCAL.zPuestos)
}

function exigirIndice(indice, total, que) {
  if (!Number.isInteger(total) || total < 1) {
    throw new RangeError(`El número de ${que}s debe ser un entero mayor o igual que 1.`)
  }
  if (!Number.isInteger(indice) || indice < 0 || indice >= total) {
    throw new RangeError(`El índice de ${que} ${indice} está fuera de 0..${total - 1}.`)
  }
}

/**
 * Dónde espera la moto que ocupa el lugar `indice` de una fila.
 * La fila crece hacia la izquierda desde el centro de su etapa.
 *
 * @param {number} indice 0 es la primera en entrar
 * @param {'lavado'|'acabado'} etapa
 */
export function posicionEnFila(indice, etapa) {
  if (etapa !== 'lavado' && etapa !== 'acabado') {
    throw new RangeError(`La etapa debe ser "lavado" o "acabado"; se recibió ${etapa}.`)
  }
  const z = etapa === 'lavado' ? LOCAL.zFilaLavado : LOCAL.zFilaAcabado
  const x = (LOCAL.ancho / 2 - 1) - indice * SEPARACION_EN_FILA
  return [x, 0, z]
}

/** Por dónde entra una moto. Decorativo: la visita no registró la avenida. */
export function entradaDeLaMoto(n) {
  const avenida = n % 2 === 0 ? AVENIDAS.granColombia : AVENIDAS.guaimaral
  return { ...avenida, posicion: [avenida.x, 0, LOCAL.zEntrada] }
}

/** Por dónde salen todas. */
export const POSICION_SALIDA = [0, 0, LOCAL.zSalida]

/**
 * Qué motos de una fila se dibujan y cuántas quedan sin dibujar.
 *
 * Con la etapa 2 saturada la fila llega a miles: dibujarlas una por una sería
 * inútil y lento. El tope y el número de sobrantes salen de aquí, juntos, para
 * que no puedan descuadrarse entre sí.
 *
 * @returns {{ visibles: Array, sobrantes: number }}
 */
export function motosVisibles(cola, tope = TOPE_DE_MOTOS_DIBUJADAS) {
  const visibles = cola.slice(0, exigirTope(tope))
  return { visibles, sobrantes: sobrantesDe(cola.length, tope) }
}

/**
 * Cuántas motos de una fila quedan sin dibujar, sabiendo solo cuántas hay.
 * Comparte el tope con `motosVisibles` para que el rótulo y lo dibujado no
 * puedan descuadrarse entre sí.
 */
export function sobrantesDe(cuantasEnFila, tope = TOPE_DE_MOTOS_DIBUJADAS) {
  return Math.max(0, cuantasEnFila - exigirTope(tope))
}

function exigirTope(tope) {
  if (!Number.isInteger(tope) || tope < 0) {
    throw new RangeError('El tope de motos dibujadas debe ser un entero mayor o igual que 0.')
  }
  return tope
}
