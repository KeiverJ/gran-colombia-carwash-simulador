import {
  avisoDeSaturacion,
  comparacionEsAproximada,
  metricasCalculadas,
} from '../store/metricas.js'
import { HORAS_DE_LA_CORRIDA_LARGA, useSimulacion } from '../store/simulacion.js'
import { comoNumero } from './formato.js'

/** Las cinco métricas de una etapa, con cuántos decimales se muestra cada una. */
const FILAS = [
  { clave: 'rho', nombre: 'ρ (qué tan ocupada está)', decimales: 4, unidad: '' },
  { clave: 'lq', nombre: 'Lq (motos en la fila)', decimales: 3, unidad: '' },
  { clave: 'wqMin', nombre: 'Wq (espera en la fila)', decimales: 2, unidad: 'min' },
  { clave: 'wMin', nombre: 'W (tiempo en la etapa)', decimales: 2, unidad: 'min' },
  { clave: 'l', nombre: 'L (motos en la etapa)', decimales: 3, unidad: '' },
]

/**
 * Una celda de la tabla. Falta un valor por dos razones muy distintas: o la
 * etapa está saturada y las fórmulas no dan número ("inestable"), o todavía no
 * se ha simulado nada ("—"). Confundirlas haría leer "inestable" en la columna
 * simulada de un lavadero que va perfectamente.
 */
function Celda({ valor, decimales, unidad, cuandoFalta }) {
  if (valor === undefined || valor === null) {
    return <td className="sin-dato">{cuandoFalta}</td>
  }
  return (
    <td className="numero">
      {comoNumero(valor, decimales)}
      {unidad ? <span className="unidad"> {unidad}</span> : null}
    </td>
  )
}

function TablaDeEtapa({ titulo, simulado, calculado, saturada }) {
  return (
    <div className="etapa">
      <h3>{titulo}</h3>
      {saturada ? (
        <p className="nota-inestable">
          Esta etapa está saturada: la fila sigue creciendo, así que los valores
          simulados <strong>no se estabilizan</strong> — cuanto más tiempo simules,
          más grandes serán. No son un resultado, son cuánto rato llevas simulando.
        </p>
      ) : null}
      <table>
        <thead>
          <tr>
            <th>Métrica</th>
            <th>Simulado</th>
            <th>Calculado con fórmulas</th>
          </tr>
        </thead>
        <tbody>
          {FILAS.map(({ clave, nombre, decimales, unidad }) => (
            <tr key={clave}>
              <th scope="row">{nombre}</th>
              <Celda
                valor={simulado?.[clave]}
                decimales={decimales}
                unidad={unidad}
                cuandoFalta="—"
              />
              <Celda
                valor={calculado.estable ? calculado[clave] : null}
                decimales={decimales}
                unidad={unidad}
                cuandoFalta="inestable"
              />
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function TablaDeMetricas() {
  const parametros = useSimulacion((estado) => estado.parametros)
  const metricas = useSimulacion((estado) => estado.metricas)
  const corridaLarga = useSimulacion((estado) => estado.corridaLarga)
  const empezarCorridaLarga = useSimulacion((estado) => estado.empezarCorridaLarga)

  const calculado = metricasCalculadas(parametros)
  const avisos = avisoDeSaturacion(parametros)

  return (
    <section className="metricas">
      <h2>Métricas</h2>

      {metricas === null ? (
        <p className="nota">
          Todavía no hay nada simulado. Dale a iniciar, o simula{' '}
          {HORAS_DE_LA_CORRIDA_LARGA} horas de golpe para ver valores estables.
        </p>
      ) : null}

      {avisos.map((aviso) => (
        <p className="aviso-saturacion" key={aviso.etapa}>
          {aviso.texto}
        </p>
      ))}

      <TablaDeEtapa
        titulo="Etapa 1: lavado"
        simulado={metricas?.lavado}
        calculado={calculado.lavado}
        saturada={!calculado.lavado.estable}
      />
      <TablaDeEtapa
        titulo="Etapa 2: acabado"
        simulado={metricas?.acabado}
        calculado={calculado.acabado}
        saturada={!calculado.acabado.estable}
      />

      <p className="total">
        Tiempo total en el lavadero, de la llegada a la salida:{' '}
        <strong>
          {metricas ? `${comoNumero(metricas.total.wMin, 2)} min` : 'sin datos todavía'}
        </strong>
      </p>

      {comparacionEsAproximada(parametros) ? (
        <p className="nota">
          Estás en el modo donde cada moto usa el tiempo de su propio plan. Las
          fórmulas suponen un único tiempo medio para todas, así que la comparación
          del acabado es aproximada. Para compararla de verdad, cambia el modo de
          acabado a "un solo promedio".
        </p>
      ) : null}

      <div className="corrida-larga">
        <button
          type="button"
          className="boton-principal"
          onClick={() => empezarCorridaLarga()}
          disabled={corridaLarga !== null}
        >
          Simular {HORAS_DE_LA_CORRIDA_LARGA} horas rápido
        </button>
        {corridaLarga ? (
          <p className="progreso">Simulando… {corridaLarga.porcentaje} %</p>
        ) : (
          <p className="nota">
            Empieza de cero y simula {HORAS_DE_LA_CORRIDA_LARGA} horas de corrido,
            para que los valores simulados se acerquen a los calculados.
          </p>
        )}
      </div>
    </section>
  )
}

export default TablaDeMetricas
