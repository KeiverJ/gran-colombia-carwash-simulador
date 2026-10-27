import { OBSERVADO_EN_LA_VISITA } from '../data/censo.js'
import { comoNumero } from './formato.js'

/** Las filas del bloque de la reproducción: cuántos decimales lleva cada una. */
const FILAS_DE_LA_REPRODUCCION = [
  { nombre: 'Placas ocupadas (promedio)', valor: (m) => m.promedios.placasOcupadas, decimales: 2 },
  { nombre: 'Motos en la fila del lavado (promedio)', valor: (m) => m.promedios.enCola1, decimales: 2 },
  { nombre: 'Motos en la fila del acabado (promedio)', valor: (m) => m.promedios.enCola2, decimales: 2 },
  {
    nombre: 'Puestos de acabado ocupados (promedio)',
    valor: (m) => m.promedios.puestosOcupados,
    decimales: 2,
  },
  {
    nombre: 'Espera antes de la placa',
    valor: (m) => m.porMoto.esperaAntesDeLaPlacaMin,
    decimales: 2,
    unidad: 'min',
  },
  {
    nombre: 'Espera en la fila del acabado',
    valor: (m) => m.porMoto.esperaEnCola2Min,
    decimales: 2,
    unidad: 'min',
  },
  {
    nombre: 'Tiempo total en el lavadero',
    valor: (m) => m.porMoto.tiempoTotalMin,
    decimales: 2,
    unidad: 'min',
  },
]

/** Las filas del bloque de lo observado, con los seis valores fijos del censo. */
const FILAS_DE_LO_OBSERVADO = [
  { nombre: 'Placas ocupadas (promedio)', valor: OBSERVADO_EN_LA_VISITA.placasOcupadas, decimales: 2 },
  { nombre: 'Motos en la fila del lavadero (promedio)', valor: OBSERVADO_EN_LA_VISITA.enCola1, decimales: 2 },
  { nombre: 'Motos en la fila del acabado (promedio)', valor: OBSERVADO_EN_LA_VISITA.enCola2, decimales: 2 },
  {
    nombre: 'Puestos de acabado ocupados (promedio)',
    valor: OBSERVADO_EN_LA_VISITA.puestosOcupados,
    decimales: 2,
  },
  {
    nombre: 'Espera antes de la placa',
    valor: OBSERVADO_EN_LA_VISITA.esperaAntesDeLaPlacaMin,
    decimales: 1,
    unidad: 'min',
  },
  {
    nombre: 'Tiempo total en el lavadero',
    valor: OBSERVADO_EN_LA_VISITA.tiempoTotalMin,
    decimales: 1,
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

/**
 * Las métricas del modo "Repetir la visita", en dos bloques separados que no se
 * mezclan entre sí ni con la columna "Fórmulas" (que aquí no se
 * muestra): lo que sale de reproducir la tabla de horas, y lo que se contó
 * aquel día.
 *
 * @param {object|null} props.metricas lo que entrega el reproductor, o `null` si todavía no avanzó
 */
export function BloquesDeLaVisita({ metricas }) {
  return (
    <>
      <div className="bloques-visita">
        <div className="etapa bloque-visita">
          <h3>Según la reproducción de la tabla</h3>
          {metricas === null ? (
            <p className="nota">Aún no hay datos reproducidos. Pulsa Iniciar para ver los valores.</p>
          ) : (
            <p className="nota">
              Hasta la hora que marca el reloj. Cada promedio por moto cuenta las motos que ya
              pasaron por esa etapa; al terminar la visita cuentan las 23.
            </p>
          )}
          <table>
            <thead>
              <tr>
                <th>Métrica</th>
                <th>Reproducción</th>
              </tr>
            </thead>
            <tbody>
              {FILAS_DE_LA_REPRODUCCION.map(({ nombre, valor, decimales, unidad }) => (
                <tr key={nombre}>
                  <th scope="row">{nombre}</th>
                  <Valor
                    etiqueta="Reproducción"
                    valor={metricas ? valor(metricas) : null}
                    decimales={decimales}
                    unidad={unidad}
                  />
                </tr>
              ))}
            </tbody>
          </table>
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
              {FILAS_DE_LO_OBSERVADO.map(({ nombre, valor, decimales, unidad }) => (
                <tr key={nombre}>
                  <th scope="row">{nombre}</th>
                  <Valor etiqueta="Observado" valor={valor} decimales={decimales} unidad={unidad} />
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <p className="nota nota-visita">
        La espera antes de la placa y el tiempo total <strong>coinciden</strong> con lo que sale
        de la tabla. Las que <strong>difieren</strong> son las ocupaciones (placas ocupadas, fila
        del lavado, fila del acabado y puestos ocupados), por cuatro razones: esos valores vienen
        de 15 conteos hechos aparte; el lavadero real no asigna por primer libre; al llegar había
        motos en fila con placas libres (se tomó la hora anotada como llegada); y había una moto
        en el acabado a las 3:10 que no se reproduce.
      </p>
    </>
  )
}

export default BloquesDeLaVisita
