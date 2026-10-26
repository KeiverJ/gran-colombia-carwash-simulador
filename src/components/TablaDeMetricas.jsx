import {
  avisoCortoDeSaturacion,
  comparacionEsAproximada,
  metricasCalculadas,
} from '../store/metricas.js'
import { HORAS_DE_LA_CORRIDA_LARGA, useSimulacion } from '../store/simulacion.js'
import Aviso from './Aviso.jsx'
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
function Celda({ etiqueta, valor, decimales, unidad, cuandoFalta }) {
  if (valor === undefined || valor === null) {
    return (
      <td className="sin-dato" data-etiqueta={etiqueta}>
        {cuandoFalta}
      </td>
    )
  }
  return (
    <td className="numero" data-etiqueta={etiqueta}>
      {comoNumero(valor, decimales)}
      {unidad ? <span className="unidad"> {unidad}</span> : null}
    </td>
  )
}

/**
 * La advertencia de la columna simulada, en una frase.
 *
 * Solo aparece cuando **ya hay valores simulados que advertir**: antes de
 * simular no hay ningún número que se pueda malinterpretar, así que advertir
 * no aporta nada y resta. El "¿por qué?" es un `<details>` nativo: funciona sin
 * JavaScript, se maneja con el teclado y no hay que mantenerlo.
 */
function AdvertenciaDeLoSimulado() {
  return (
    <Aviso tipo="advertencia" className="aviso--separado">
      <details className="nota-inestable">
        <summary>
          Estos valores simulados <strong>no se estabilizan</strong>: crecen mientras
          más tiempo se simule. <span className="porque">¿Por qué?</span>
        </summary>
        <p>
          La etapa está saturada: llegan más motos de las que alcanza a atender, así
          que la fila crece mientras el lavadero esté abierto y nunca se asienta en
          un valor. Lo que miden estos números no es cómo funciona el lavadero, sino
          cuánto tiempo se lleva simulando.
        </p>
      </details>
    </Aviso>
  )
}

function TablaDeEtapa({ titulo, simulado, calculado, saturada }) {
  return (
    <div className="etapa">
      <h3>{titulo}</h3>
      {saturada && simulado ? <AdvertenciaDeLoSimulado /> : null}
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
                etiqueta="Simulado"
                valor={simulado?.[clave]}
                decimales={decimales}
                unidad={unidad}
                cuandoFalta="—"
              />
              <Celda
                etiqueta="Calculado con fórmulas"
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

/**
 * El contenido de la pestaña Métricas (y de la hoja del celular): la tabla de
 * simulado contra calculado de cada etapa, el tiempo total, el aviso de
 * saturación y la corrida larga. En el modo visita esta pestaña no existe.
 */
export function ContenidoDeMetricas() {
  const parametros = useSimulacion((estado) => estado.parametros)
  const metricas = useSimulacion((estado) => estado.metricas)
  const corridaLarga = useSimulacion((estado) => estado.corridaLarga)
  const empezarCorridaLarga = useSimulacion((estado) => estado.empezarCorridaLarga)

  const calculado = metricasCalculadas(parametros)
  const aviso = avisoCortoDeSaturacion(parametros)

  return (
    <div className="metricas metricas--capa">
      {metricas === null ? (
        <p className="nota">
          Aún no hay datos simulados. Pulsa Iniciar o usa la corrida larga para obtener
          valores estables.
        </p>
      ) : null}

      {aviso ? (
        <Aviso tipo="peligro" className="aviso--separado" role="status">
          {aviso}
        </Aviso>
      ) : null}

      <TablaDeEtapa
        titulo="Etapa 1 · Lavado"
        simulado={metricas?.lavado}
        calculado={calculado.lavado}
        saturada={!calculado.lavado.estable}
      />
      <TablaDeEtapa
        titulo="Etapa 2 · Acabado"
        simulado={metricas?.acabado}
        calculado={calculado.acabado}
        saturada={!calculado.acabado.estable}
      />

      <p className="total">
        Tiempo total en el lavadero, de la llegada a la salida:{' '}
        <strong>
          {metricas ? `${comoNumero(metricas.total.wMin, 2)} min` : 'sin datos'}
        </strong>
      </p>

      {comparacionEsAproximada(parametros) ? (
        <p className="nota">
          Con el modo «Según su plan», cada moto usa el tiempo de su propio plan; las
          fórmulas suponen un único tiempo medio, así que la comparación del acabado
          es aproximada. Para compararla con exactitud, elige «Un solo promedio (M/M/s)».
        </p>
      ) : null}

      <div className="corrida-larga">
        <button
          type="button"
          className="boton-principal"
          onClick={() => empezarCorridaLarga()}
          disabled={corridaLarga !== null}
        >
          Corrida larga (estado estable)
        </button>
        {corridaLarga ? (
          <p className="progreso">Simulando… {corridaLarga.porcentaje} %</p>
        ) : (
          <p className="nota">
            Simula {HORAS_DE_LA_CORRIDA_LARGA} horas seguidas, desde cero, para que los
            valores simulados se acerquen a los calculados.
          </p>
        )}
      </div>
    </div>
  )
}

export default ContenidoDeMetricas
