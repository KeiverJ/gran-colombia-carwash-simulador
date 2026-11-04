/**
 * Estadística de los experimentos: promedio, desviación estándar muestral e
 * intervalo de confianza con la t de Student.
 *
 * El cuantil t no sale de una tabla copiada: se obtiene invirtiendo la función
 * de distribución de la t (que se calcula con la beta incompleta regularizada),
 * así vale para cualquier número de grados de libertad. JavaScript puro.
 */

/** El nivel de confianza de los intervalos. */
export const NIVEL_DE_CONFIANZA = 0.95

/** Logaritmo de la función gamma (aproximación de Lanczos, g = 7). */
const COEFICIENTES_DE_LANCZOS = [
  0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313,
  -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6,
  1.5056327351493116e-7,
]

function logGamma(x) {
  if (x < 0.5) {
    return Math.log(Math.PI / Math.sin(Math.PI * x)) - logGamma(1 - x)
  }
  const z = x - 1
  let suma = COEFICIENTES_DE_LANCZOS[0]
  for (let i = 1; i < 9; i += 1) {
    suma += COEFICIENTES_DE_LANCZOS[i] / (z + i)
  }
  const t = z + 7.5
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(suma)
}

/** Fracción continua de la beta incompleta (método de Lentz). */
function fraccionContinuaDeLaBeta(x, a, b) {
  const MINIMO = 1e-300
  let c = 1
  let d = 1 - ((a + b) * x) / (a + 1)
  if (Math.abs(d) < MINIMO) d = MINIMO
  d = 1 / d
  let h = d
  for (let m = 1; m <= 300; m += 1) {
    const m2 = 2 * m
    let termino = (m * (b - m) * x) / ((a + m2 - 1) * (a + m2))
    d = 1 + termino * d
    if (Math.abs(d) < MINIMO) d = MINIMO
    c = 1 + termino / c
    if (Math.abs(c) < MINIMO) c = MINIMO
    d = 1 / d
    h *= d * c
    termino = (-(a + m) * (a + b + m) * x) / ((a + m2) * (a + m2 + 1))
    d = 1 + termino * d
    if (Math.abs(d) < MINIMO) d = MINIMO
    c = 1 + termino / c
    if (Math.abs(c) < MINIMO) c = MINIMO
    d = 1 / d
    const delta = d * c
    h *= delta
    if (Math.abs(delta - 1) < 1e-15) break
  }
  return h
}

/** Beta incompleta regularizada I_x(a, b). */
function betaIncompleta(x, a, b) {
  if (x <= 0) return 0
  if (x >= 1) return 1
  const frente = Math.exp(
    logGamma(a + b) - logGamma(a) - logGamma(b) + a * Math.log(x) + b * Math.log(1 - x),
  )
  return x < (a + 1) / (a + b + 2)
    ? (frente * fraccionContinuaDeLaBeta(x, a, b)) / a
    : 1 - (frente * fraccionContinuaDeLaBeta(1 - x, b, a)) / b
}

/** Función de distribución de la t de Student con `gl` grados de libertad. */
export function distribucionT(t, gl) {
  const cola = 0.5 * betaIncompleta(gl / (gl + t * t), gl / 2, 0.5)
  return t > 0 ? 1 - cola : cola
}

/**
 * El cuantil de la t de Student: el valor t tal que P(T ≤ t) = p, con `gl`
 * grados de libertad (entero ≥ 1) y 0 < p < 1.
 */
export function cuantilT(p, gl) {
  if (!Number.isInteger(gl) || gl < 1) {
    throw new RangeError(`Los grados de libertad deben ser un entero mayor o igual que 1; se recibió ${gl}.`)
  }
  if (!(p > 0 && p < 1)) {
    throw new RangeError(`La probabilidad debe estar entre 0 y 1; se recibió ${p}.`)
  }
  if (p === 0.5) return 0
  if (p < 0.5) return -cuantilT(1 - p, gl)
  // Con 1 grado de libertad la t es la de Cauchy y el cuantil es exacto.
  if (gl === 1) return Math.tan(Math.PI * (p - 0.5))
  let bajo = 0
  let alto = 1
  while (distribucionT(alto, gl) < p) {
    alto *= 2
  }
  for (let i = 0; i < 200; i += 1) {
    const medio = (bajo + alto) / 2
    if (distribucionT(medio, gl) < p) {
      bajo = medio
    } else {
      alto = medio
    }
    if (alto - bajo < 1e-13 * Math.max(1, alto)) break
  }
  return (bajo + alto) / 2
}

/** Promedio de una lista de números (`NaN` si está vacía). */
export function promedio(valores) {
  if (valores.length === 0) return Number.NaN
  let suma = 0
  for (const valor of valores) suma += valor
  return suma / valores.length
}

/** Desviación estándar muestral (n − 1); `null` con menos de 2 valores. */
export function desviacion(valores) {
  const n = valores.length
  if (n < 2) return null
  const media = promedio(valores)
  let suma = 0
  for (const valor of valores) suma += (valor - media) ** 2
  return Math.sqrt(suma / (n - 1))
}

/**
 * Resumen de una muestra: promedio, desviación e intervalo de confianza del
 * promedio, promedio ± t(0,975; n − 1) · s / √n. Con menos de 2 valores solo hay
 * promedio: la desviación, el semiancho y los límites son `null`.
 *
 * @param {number[]} valores
 * @returns {{ n: number, promedio: number, desviacion: number | null,
 *             semiancho: number | null, inferior: number | null, superior: number | null }}
 */
export function resumirMuestra(valores) {
  const n = valores.length
  const media = promedio(valores)
  const s = desviacion(valores)
  if (s === null) {
    return { n, promedio: media, desviacion: null, semiancho: null, inferior: null, superior: null }
  }
  const semiancho = (cuantilT(1 - (1 - NIVEL_DE_CONFIANZA) / 2, n - 1) * s) / Math.sqrt(n)
  return { n, promedio: media, desviacion: s, semiancho, inferior: media - semiancho, superior: media + semiancho }
}

/** ¿El intervalo del resumen contiene el valor? `null` si no hay intervalo. */
export function intervaloContiene(resumen, valor) {
  if (resumen.inferior === null) return null
  return valor >= resumen.inferior && valor <= resumen.superior
}
