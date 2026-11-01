/**
 * La parte sin pantalla de los campos numéricos de Ajustes: qué rangos valen,
 * cómo se lee un texto escrito, cómo se muestra un valor y qué mensaje se da
 * cuando el texto no sirve. JavaScript puro, para probarlo con Node.
 */

// Los rangos viven en el store, que es quien los hace cumplir; el campo, el
// deslizador y la validación comparten ese único dato.
export { RANGOS } from '../store/rangos.js'

/** Los decimales que se muestran como máximo en un campo, sin ceros sobrantes. */
export const DECIMALES_DEL_CAMPO = 4

/** Más caracteres que esto no es un número que alguien escribiría: se rechaza sin leerlo. */
const LARGO_MAXIMO = 20

/** Un número con coma o punto decimal, sin signo, sin miles y sin notación científica. */
const FORMA_DE_UN_NUMERO = /^(?:\d+(?:[.,]\d+)?|[.,]\d+)$/

/**
 * Lee lo que se escribió en un campo.
 *
 * Acepta "14,5" y "14.5" (con espacios alrededor) y rechaza lo vacío, las
 * letras, "1e3", "1.000,5", los negativos, lo que no es finito y lo que cae
 * fuera de `[minimo, maximo]`. Con `entero`, también lo que tiene decimales.
 *
 * @param {string} texto
 * @param {{ minimo: number, maximo: number, entero?: boolean }} rango
 * @returns {{ valido: true, valor: number } | { valido: false }}
 */
export function interpretarNumero(texto, { minimo, maximo, entero = false }) {
  const limpio = String(texto ?? '').trim()
  if (limpio === '' || limpio.length > LARGO_MAXIMO || !FORMA_DE_UN_NUMERO.test(limpio)) {
    return { valido: false }
  }
  const valor = Number(limpio.replace(',', '.'))
  if (!Number.isFinite(valor) || valor < minimo || valor > maximo) {
    return { valido: false }
  }
  if (entero && !Number.isInteger(valor)) {
    return { valido: false }
  }
  return { valido: true, valor }
}

/**
 * Un número tal como se muestra dentro de un campo: coma decimal, hasta 4
 * decimales sin ceros de más y sin separador de miles (la semilla se muestra
 * "4294967295" para poder copiarla y volver a escribirla).
 */
export function comoTextoDelCampo(valor) {
  if (!Number.isFinite(valor)) {
    return ''
  }
  return valor.toLocaleString('es-CO', {
    maximumFractionDigits: DECIMALES_DEL_CAMPO,
    useGrouping: false,
  })
}

/**
 * Un número para una frase: como el del campo, pero con los miles separados
 * por un espacio que no se parte ("4 294 967 295"), para no confundir el punto
 * de los miles con el decimal que el campo también acepta.
 */
export function comoTextoDeLaFrase(valor) {
  const [entera, decimales] = comoTextoDelCampo(valor).split(',')
  const conMiles = entera.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
  return decimales === undefined ? conMiles : `${conMiles},${decimales}`
}

/**
 * El mensaje de un valor que no se aplica: dice qué se espera y con qué valor
 * sigue la simulación mientras tanto.
 *
 * @param {{ minimo: number, maximo: number, entero?: boolean }} rango
 * @param {number} ultimoValido el valor con el que sigue la simulación
 * @returns {string}
 */
export function mensajeDeError({ minimo, maximo, entero = false }, ultimoValido) {
  const queEscribir = entero ? 'un número entero' : 'un número'
  return (
    `Escribe ${queEscribir} entre ${comoTextoDeLaFrase(minimo)} y ${comoTextoDeLaFrase(maximo)}. ` +
    `La simulación sigue con ${comoTextoDeLaFrase(ultimoValido)} hasta que el valor sea válido.`
  )
}

/**
 * El valor al que lleva pulsar − o + en un campo con botones.
 *
 * Suma o resta 1 (los campos con botones son de enteros) y nunca sale del
 * rango: en el mínimo, − no cambia nada, y en el máximo, + tampoco.
 *
 * @param {number} valor el valor de ahora
 * @param {{ minimo: number, maximo: number }} rango
 * @param {1 | -1} sentido
 * @returns {number}
 */
export function valorConPaso(valor, { minimo, maximo }, sentido) {
  return Math.min(maximo, Math.max(minimo, valor + sentido))
}
