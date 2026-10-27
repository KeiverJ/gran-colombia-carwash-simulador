import {
  avisoCortoDeSaturacion,
  comparacionEsAproximada,
  metricasCalculadas,
} from '../store/metricas.js'
import { HORAS_DE_LA_CORRIDA_LARGA, useSimulacion } from '../store/simulacion.js'
import Aviso from './Aviso.jsx'
import { comoNumero } from './formato.js'

/** Lo que dice el encabezado "Fórmulas" al pasar el mouse y a las ayudas técnicas. */
const EXPLICACION_DE_LAS_FORMULAS = 'Calculado con las fórmulas M/M/s de la especificación'

/**
 * Las cinco métricas de una etapa. El nombre cabe en una línea (el símbolo y una
 * descripción corta) y la explicación completa sale como tooltip y la leen las
 * ayudas técnicas. También se dice cuántos decimales se muestra cada una.
 */
const FILAS = [
  {
    clave: 'rho',
    nombre: 'ρ · ocupación',
    explicacion: 'Qué parte del tiempo está ocupada la etapa. Si llega a 1 o más, la etapa no da abasto.',
    decimales: 4,
    unidad: '',
  },
  {
    clave: 'lq',
    nombre: 'Lq · motos en fila',
    explicacion: 'Promedio de motos esperando en la fila de la etapa.',
    decimales: 3,
    unidad: '',
  },
  {
    clave: 'wqMin',
    nombre: 'Wq · espera en fila',
    explicacion: 'Tiempo promedio que una moto espera en la fila antes de ser atendida.',
    decimales: 2,
    unidad: 'min',
  },
  {
    clave: 'wMin',
    nombre: 'W · tiempo en la etapa',
    explicacion: 'Tiempo promedio que una moto pasa en la etapa: la espera más la atención.',
    decimales: 2,
    unidad: 'min',
  },
  {
    clave: 'l',
    nombre: 'L · motos en la etapa',
    explicacion: 'Promedio de motos en la etapa: las que esperan más las que se atienden.',
    decimales: 3,
    unidad: '',
  },
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
            <th title={EXPLICACION_DE_LAS_FORMULAS} aria-label={EXPLICACION_DE_LAS_FORMULAS}>
              Fórmulas
            </th>
          </tr>
        </thead>
        <tbody>
          {FILAS.map(({ clave, nombre, explicacion, decimales, unidad }) => (
            <tr key={clave}>
              <th scope="row" className="etiqueta-metrica" title={explicacion} aria-label={`${nombre}. ${explicacion}`}>
                {nombre}
              </th>
              <Celda
                etiqueta="Simulado"
                valor={simulado?.[clave]}
                decimales={decimales}
                unidad={unidad}
                cuandoFalta="—"
              />
              <Celda
                etiqueta="Fórmulas"
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
 *
 * En el panel inferior (`enPanel`) las dos tablas van lado a lado y una tercera
 * columna lleva el tiempo total, los avisos y la corrida larga; si el ancho no
 * alcanza, las columnas se apilan. En la hoja del celular van una debajo de
 * otra, con los avisos arriba.
 */
export function ContenidoDeMetricas({ enPanel = false }) {
  const parametros = useSimulacion((estado) => estado.parametros)
  const metricas = useSimulacion((estado) => estado.metricas)
  const corridaLarga = useSimulacion((estado) => estado.corridaLarga)
  const empezarCorridaLarga = useSimulacion((estado) => estado.empezarCorridaLarga)

  const calculado = metricasCalculadas(parametros)
  const aviso = avisoCortoDeSaturacion(parametros)

  return (
    <div className={enPanel ? 'metricas metricas--panel' : 'metricas metricas--capa'}>
      <div className="metricas-columnas">
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

        <div className="metricas-lateral">
          {metricas === null ? (
            <p className="nota lateral-sin-datos">
              Aún no hay datos simulados. Pulsa Iniciar o usa la corrida larga para obtener
              valores estables.
            </p>
          ) : null}

          {aviso ? (
            <Aviso tipo="peligro" className="aviso--separado lateral-aviso" role="status">
              {aviso}
            </Aviso>
          ) : null}

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
      </div>
    </div>
  )
}

export default ContenidoDeMetricas
