import { OBSERVADO_EN_LA_VISITA } from '../data/censo.js'
import { comoNumero } from './formato.js'

/**
 * Las filas de las dos tablas, definidas una sola vez: así las etiquetas son
 * idénticas, fila por fila, en "Según la reproducción de la tabla" y en
 * "Observado en la visita". Cada fila dice cómo sale su valor al reproducir la
 * tabla, qué se contó aquel día (`null` si no se midió: se ve "—", no un cero)
 * y cuántos decimales lleva cada uno.
 */
const FILAS = [
  {
    nombre: 'Placas ocupadas (promedio)',
    reproduccion: (m) => m.promedios.placasOcupadas,
    observado: OBSERVADO_EN_LA_VISITA.placasOcupadas,
    decimales: { reproduccion: 2, observado: 2 },
  },
  {
    nombre: 'Motos en la fila del lavado (promedio)',
    reproduccion: (m) => m.promedios.enCola1,
    observado: OBSERVADO_EN_LA_VISITA.enCola1,
    decimales: { reproduccion: 2, observado: 2 },
  },
  {
    nombre: 'Motos en la fila del acabado (promedio)',
    reproduccion: (m) => m.promedios.enCola2,
    observado: OBSERVADO_EN_LA_VISITA.enCola2,
    decimales: { reproduccion: 2, observado: 2 },
  },
  {
    nombre: 'Puestos de acabado ocupados (promedio)',
    reproduccion: (m) => m.promedios.puestosOcupados,
    observado: OBSERVADO_EN_LA_VISITA.puestosOcupados,
    decimales: { reproduccion: 2, observado: 2 },
  },
  {
    nombre: 'Espera antes de la placa',
    reproduccion: (m) => m.porMoto.esperaAntesDeLaPlacaMin,
    observado: OBSERVADO_EN_LA_VISITA.esperaAntesDeLaPlacaMin,
    decimales: { reproduccion: 2, observado: 1 },
    unidad: 'min',
  },
  {
    nombre: 'Espera en la fila del acabado',
    reproduccion: (m) => m.porMoto.esperaEnCola2Min,
    // La visita no la midió: la fila queda para que las dos tablas se alineen.
    observado: null,
    decimales: { reproduccion: 2, observado: 1 },
    unidad: 'min',
  },
  {
    nombre: 'Tiempo total en el lavadero',
    reproduccion: (m) => m.porMoto.tiempoTotalMin,
    observado: OBSERVADO_EN_LA_VISITA.tiempoTotalMin,
    decimales: { reproduccion: 2, observado: 1 },
    unidad: 'min',
  },
]

function Valor({ etiqueta, valor, decimales, unidad }) {
  // Sin datos todavía no se muestra un cero: sería decir que no pasó nada.
  if (valor === null || valor === undefined) {
    return (
      <td className="sin-dato" data-etiqueta={etiqueta}>
        —
      </td>
    )
  }
  return (
    <td className="numero" data-etiqueta={etiqueta}>
      {comoNumero(valor, decimales)}
      {unidad ? <span className="unidad"> {unidad}</span> : null}
    </td>
  )
}

/** La nota de debajo de las tablas: en qué coinciden la reproducción y lo observado, y en qué no. */
const NOTA_DE_LAS_DIFERENCIAS = (
  <p className="nota nota-visita">
    La espera antes de la placa y el tiempo total <strong>coinciden</strong> con lo que sale de la
    tabla. Las que <strong>difieren</strong> son las ocupaciones (placas ocupadas, fila del lavado,
    fila del acabado y puestos ocupados), por cuatro razones: esos valores vienen de 15 conteos
    hechos aparte; el lavadero real no asigna por primer libre; al llegar había motos en fila con
    placas libres (se tomó la hora anotada como llegada); y había una moto en el acabado a las 3:10
    que no se reproduce.
  </p>
)

/**
 * Las métricas del modo "Repetir la visita", en dos bloques separados que no se
 * mezclan entre sí ni con la columna "Fórmulas" (que aquí no se muestra): lo
 * que sale de reproducir la tabla de horas, y lo que se contó aquel día. Van
 * lado a lado y con las mismas filas; las notas, debajo de cada tabla.
 *
 * En el celular (`unida`) las dos tablas son una sola, con las columnas
 * Reproducción y Observado: cada tarjeta muestra las dos cifras, como las de
 * Métricas muestran Simulado y Fórmulas.
 *
 * @param {object|null} props.metricas lo que entrega el reproductor, o `null` si todavía no avanzó
 * @param {boolean} [props.unida] una sola tabla con las dos columnas
 */
export function BloquesDeLaVisita({ metricas, unida = false }) {
  if (unida) {
    return (
      <>
        <div className="etapa bloque-visita">
          <h3>Reproducción y observado (15 conteos)</h3>
          <table>
            <thead>
              <tr>
                <th>Métrica</th>
                <th>Reproducción</th>
                <th>Observado</th>
              </tr>
            </thead>
            <tbody>
              {FILAS.map(({ nombre, reproduccion, observado, decimales, unidad }) => (
                <tr key={nombre}>
                  <th scope="row">{nombre}</th>
                  <Valor
                    etiqueta="Reproducción"
                    valor={metricas ? reproduccion(metricas) : null}
                    decimales={decimales.reproduccion}
                    unidad={unidad}
                  />
                  <Valor etiqueta="Observado" valor={observado} decimales={decimales.observado} unidad={unidad} />
                </tr>
              ))}
            </tbody>
          </table>
          {metricas === null ? (
            <p className="nota">Aún no hay datos reproducidos. Pulsa Iniciar para ver los valores.</p>
          ) : (
            <p className="nota">
              Hasta la hora que marca el reloj. Cada promedio por moto cuenta las motos que ya
              pasaron por esa etapa; al terminar la visita cuentan las 23.
            </p>
          )}
          <p className="nota">
            La espera en la fila del acabado y los puestos ocupados salen de una asignación
            aproximada, porque la tabla no dice qué puesto usó cada moto. La visita no midió la
            espera en la fila del acabado.
          </p>
        </div>
        {NOTA_DE_LAS_DIFERENCIAS}
      </>
    )
  }

  return (
    <>
      <div className="bloques-visita">
        <div className="etapa bloque-visita">
          <h3>Según la reproducción de la tabla</h3>
          <table>
            <thead>
              <tr>
                <th>Métrica</th>
                <th>Reproducción</th>
              </tr>
            </thead>
            <tbody>
              {FILAS.map(({ nombre, reproduccion, decimales, unidad }) => (
                <tr key={nombre}>
                  <th scope="row">{nombre}</th>
                  <Valor
                    etiqueta="Reproducción"
                    valor={metricas ? reproduccion(metricas) : null}
                    decimales={decimales.reproduccion}
                    unidad={unidad}
                  />
                </tr>
              ))}
            </tbody>
          </table>
          {metricas === null ? (
            <p className="nota">Aún no hay datos reproducidos. Pulsa Iniciar para ver los valores.</p>
          ) : (
            <p className="nota">
              Hasta la hora que marca el reloj. Cada promedio por moto cuenta las motos que ya
              pasaron por esa etapa; al terminar la visita cuentan las 23.
            </p>
          )}
          <p className="nota">
            La espera en la fila del acabado y los puestos ocupados salen de una asignación
            aproximada, porque la tabla no dice qué puesto usó cada moto.
          </p>
        </div>

        <div className="etapa bloque-visita">
          <h3>Observado en la visita (15 conteos)</h3>
          <table>
            <thead>
              <tr>
                <th>Métrica</th>
                <th>Observado</th>
              </tr>
            </thead>
            <tbody>
              {FILAS.map(({ nombre, observado, decimales, unidad }) => (
                <tr key={nombre}>
                  <th scope="row">{nombre}</th>
                  <Valor etiqueta="Observado" valor={observado} decimales={decimales.observado} unidad={unidad} />
                </tr>
              ))}
            </tbody>
          </table>
          <p className="nota">La visita no midió la espera en la fila del acabado.</p>
        </div>
      </div>

      {NOTA_DE_LAS_DIFERENCIAS}
    </>
  )
}

export default BloquesDeLaVisita
