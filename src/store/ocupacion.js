/**
 * La ocupación de cada placa y de cada puesto, lista para dibujar.
 *
 * En la simulación sale tal cual de las métricas del motor
 * (`ocupacionPorServidor`), que son exactas. En la visita sale de las horas de
 * la tabla: las placas, exactas; los puestos, de la asignación aproximada que el
 * reproductor ya declara. Está aparte de los componentes para poder probarlo con
 * Node.
 */

/** Los dos bloques de la gráfica, con el nombre de cada servidor. */
const ETAPAS = [
  { id: 'lavado', titulo: 'Etapa 1 · Lavado', servidor: 'Placa' },
  { id: 'acabado', titulo: 'Etapa 2 · Acabado', servidor: 'Puesto' },
]

export const NOTA_DE_LA_OCUPACION_EN_LA_VISITA =
  'Las placas salen de las horas de la tabla. Los puestos son aproximados: la tabla no dice qué puesto usó cada moto.'

const promedioDe = (valores) =>
  valores.length === 0 ? 0 : valores.reduce((suma, valor) => suma + valor, 0) / valores.length

/** Arma el modelo a partir de las proporciones de cada etapa. */
function modeloDe({ proporciones, vacia, nota }) {
  return {
    vacia,
    nota,
    etapas: ETAPAS.map(({ id, titulo, servidor }) => ({
      id,
      titulo,
      servidores: proporciones[id].map((proporcion, i) => ({
        nombre: `${servidor} ${i + 1}`,
        proporcion,
      })),
      promedio: promedioDe(proporciones[id]),
    })),
  }
}

/**
 * La ocupación de cada servidor en el modo Simulación.
 *
 * @param {object|null} metricas lo que entrega `motor.metricas()`, o `null` si todavía no hay
 * @returns {{ vacia: boolean, nota: null, etapas: Array }}
 */
export function ocupacionDeLaSimulacion(metricas) {
  if (!metricas || !(metricas.tiempoObservadoMin > 0)) {
    return { vacia: true, nota: null, etapas: [] }
  }
  return modeloDe({
    vacia: false,
    nota: null,
    proporciones: {
      lavado: metricas.lavado.ocupacionPorServidor,
      acabado: metricas.acabado.ocupacionPorServidor,
    },
  })
}

/** Minutos de [desde, hasta) que caen dentro de [0, relojMin]. */
const minutosHasta = (desde, hasta, relojMin) =>
  Math.max(0, Math.min(hasta, relojMin) - Math.max(desde, 0))

/**
 * La ocupación de cada servidor en la visita, hasta la hora del reloj.
 *
 * Una placa está ocupada de `entraPlacaMin` a `salePlacaMin`; un puesto, de que
 * la moto lo toma a que termina su acabado, según `detalleDeLaEtapa2()`. Es el
 * mismo criterio del reproductor, así que el promedio de cada etapa coincide con
 * sus promedios en el tiempo.
 *
 * @param {object} datos
 * @param {Array} datos.motos las motos de la visita (minutos desde las 3:00 p. m.)
 * @param {Array} datos.detalle lo que entrega `detalleDeLaEtapa2()` (minutos del reloj)
 * @param {number} datos.inicioMin el minuto de la tabla en que empieza el reloj
 * @param {number} datos.relojMin minutos transcurridos desde el inicio
 * @param {number} datos.placas
 * @param {number} datos.puestos
 */
export function ocupacionDeLaVisita({ motos, detalle, inicioMin, relojMin, placas, puestos }) {
  if (!(relojMin > 0)) {
    return { vacia: true, nota: NOTA_DE_LA_OCUPACION_EN_LA_VISITA, etapas: [] }
  }
  const ocupadoPlaca = Array.from({ length: placas }, () => 0)
  const ocupadoPuesto = Array.from({ length: puestos }, () => 0)

  for (const moto of motos) {
    ocupadoPlaca[moto.placa - 1] += minutosHasta(
      moto.entraPlacaMin - inicioMin,
      moto.salePlacaMin - inicioMin,
      relojMin,
    )
  }
  const motoPorNumero = new Map(motos.map((moto) => [moto.n, moto]))
  for (const registro of detalle) {
    // Una moto que salió desde la fila 2 sin puesto no ocupó ninguno.
    if (registro.puesto === null) {
      continue
    }
    const moto = motoPorNumero.get(registro.n)
    ocupadoPuesto[registro.puesto - 1] += minutosHasta(
      registro.tomaPuestoMin,
      moto.finAcabadoMin - inicioMin,
      relojMin,
    )
  }

  return modeloDe({
    vacia: false,
    nota: NOTA_DE_LA_OCUPACION_EN_LA_VISITA,
    proporciones: {
      lavado: ocupadoPlaca.map((minutos) => minutos / relojMin),
      acabado: ocupadoPuesto.map((minutos) => minutos / relojMin),
    },
  })
}
