/**
 * Fórmulas M/M/s del documento del proyecto.
 *
 * Son las de la sección 2 de docs/especificacion_simulador.md, escritas igual que
 * allí para poder leer el código al lado del documento:
 *
 *   a  = λ/μ                 (intensidad de tráfico)
 *   ρ  = λ/(μs)              (factor de utilización)
 *   P₀ = 1 / [ Σ_{n=0}^{s−1} aⁿ/n! + (aˢ/s!)·(s/(s−a)) ]
 *   Lq = a^{s+1}/(s−1)! · 1/(s−a)² · P₀
 *   Wq = Lq/λ ;  W = Wq + 1/μ ;  L = λW
 *
 * Solo valen si ρ < 1. Este archivo es JavaScript puro: no importa nada de la
 * interfaz y corre con Node en las pruebas.
 */

/** Factorial de un entero pequeño. Con s ≤ 7 no hay riesgo de desbordamiento. */
function factorial(n) {
  let resultado = 1
  for (let i = 2; i <= n; i += 1) {
    resultado *= i
  }
  return resultado
}

function exigirTasaPositiva(valor, nombre) {
  if (typeof valor !== 'number' || !Number.isFinite(valor) || valor <= 0) {
    throw new RangeError(
      `${nombre} debe ser un número de motos por hora mayor que 0; se recibió ${valor}.`,
    )
  }
}

/**
 * Métricas de una etapa del lavadero modelada como cola M/M/s.
 *
 * @param {object} parametros
 * @param {number} parametros.llegadasPorHora  λ: motos que llegan por hora.
 * @param {number} parametros.servicioPorHora  μ: motos que atiende por hora cada servidor.
 * @param {number} parametros.servidores       s: placas de lavado o puestos de acabado.
 * @returns {{ a: number, rho: number, estable: boolean, p0?: number, lq?: number,
 *             wqMin?: number, wMin?: number, l?: number }}
 *   Si la etapa está saturada (ρ ≥ 1) devuelve solo `a`, `rho` y `estable: false`:
 *   las fórmulas no valen ahí y la fila crece sin límite.
 */
export function metricasMMs({ llegadasPorHora, servicioPorHora, servidores }) {
  exigirTasaPositiva(llegadasPorHora, 'La tasa de llegadas (λ)')
  exigirTasaPositiva(servicioPorHora, 'La tasa de servicio (μ)')
  if (!Number.isInteger(servidores) || servidores < 1) {
    throw new RangeError(
      `El número de servidores (s) debe ser un entero mayor o igual que 1; se recibió ${servidores}.`,
    )
  }

  const a = llegadasPorHora / servicioPorHora
  const rho = llegadasPorHora / (servicioPorHora * servidores)

  // La especificación solo da por válidas las fórmulas si ρ < 1. Con ρ = 1 el
  // término s − a se anula y la cola tampoco se estabiliza, así que es inestable.
  if (rho >= 1) {
    return { a, rho, estable: false }
  }

  const s = servidores
  let sumatoria = 0
  for (let n = 0; n <= s - 1; n += 1) {
    sumatoria += a ** n / factorial(n)
  }
  const p0 = 1 / (sumatoria + (a ** s / factorial(s)) * (s / (s - a)))

  const lq = (a ** (s + 1) / factorial(s - 1)) * (1 / (s - a) ** 2) * p0
  const wqHoras = lq / llegadasPorHora
  const wHoras = wqHoras + 1 / servicioPorHora
  const l = llegadasPorHora * wHoras

  return {
    a,
    rho,
    estable: true,
    p0,
    lq,
    wqMin: wqHoras * 60,
    wMin: wHoras * 60,
    l,
  }
}
