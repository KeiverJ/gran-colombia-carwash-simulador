/**
 * El tiempo de cada moto en el lavadero durante la visita, de la llegada a la
 * salida, para la gráfica de barras.
 *
 * Los tiempos salen de las horas de la tabla; qué motos salieron desde la fila 2
 * sin haber tenido puesto, de lo que entrega el reproductor (`detalleDeLaEtapa2`).
 * Cada moto aparece cuando sale en la reproducción. Está aparte de los
 * componentes para poder probarlo con Node.
 */

/** El texto con que se rotula una moto que salió desde la fila 2 sin puesto. */
export const ROTULO_SIN_PUESTO = 'salió desde la fila 2 sin puesto'

/**
 * Las motos que ya salieron a la hora del reloj. Es la misma regla del
 * reproductor: una moto salió si su fin de acabado cae en el minuto del reloj o
 * antes.
 *
 * @param {Array} motos las motos de la visita (minutos desde las 3:00 p. m.)
 * @param {number} inicioMin el minuto de la tabla en que empieza el reloj
 * @param {number} relojMin minutos transcurridos desde el inicio
 * @returns {Array} las motos que ya salieron
 */
export function motosQueYaSalieron(motos, inicioMin, relojMin) {
  const minutoDelReloj = Math.floor(relojMin)
  return motos.filter((moto) => moto.finAcabadoMin - inicioMin <= minutoDelReloj)
}

/**
 * @param {object} datos
 * @param {Array} datos.motos las motos de la visita
 * @param {Array} datos.detalle lo que entrega `detalleDeLaEtapa2()`
 * @param {number} datos.inicioMin
 * @param {number} datos.relojMin
 * @returns {{ vacia: boolean, motos: Array<{ n: number, minutos: number|null, sinPuesto: boolean }>,
 *             promedio: number|null, cuantasSalieron: number, sumaMin: number }}
 *   Siempre trae las motos en orden de número; `minutos` es `null` mientras la moto no ha salido.
 */
export function tiemposDeLaVisita({ motos, detalle, inicioMin, relojMin }) {
  const salieron = new Set(motosQueYaSalieron(motos, inicioMin, relojMin).map((moto) => moto.n))
  const sinPuesto = new Set(detalle.filter((d) => d.puesto === null).map((d) => d.n))

  const filas = [...motos]
    .sort((a, b) => a.n - b.n)
    .map((moto) => {
      const salio = salieron.has(moto.n)
      return {
        n: moto.n,
        minutos: salio ? moto.finAcabadoMin - moto.llegadaMin : null,
        sinPuesto: salio && sinPuesto.has(moto.n),
      }
    })

  const conTiempo = filas.filter((fila) => fila.minutos !== null)
  const sumaMin = conTiempo.reduce((suma, fila) => suma + fila.minutos, 0)
  return {
    vacia: conTiempo.length === 0,
    motos: filas,
    promedio: conTiempo.length === 0 ? null : sumaMin / conTiempo.length,
    cuantasSalieron: conTiempo.length,
    sumaMin,
  }
}
