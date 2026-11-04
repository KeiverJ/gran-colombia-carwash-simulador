import { ESCENARIOS } from '../data/escenarios.js'
import { diferenciasContra, METRICAS_DE_LA_ETAPA, METRICAS_DEL_TOTAL } from '../experimentos/resumen.js'
import { useExperimentos } from '../store/experimentos.js'
import {
  comoValor,
  nombreDeLaEtapa,
  TEXTO_DE_LA_SIGNIFICANCIA,
  TEXTO_DE_LAS_DIFERENCIAS,
  textoDeLasInestables,
} from '../store/presentacionDeExperimentos.js'
import Aviso from './Aviso.jsx'
import { comoNumero } from './formato.js'

const ETAPAS = ['lavado', 'acabado', 'total']
const NOMBRES = Object.fromEntries(ESCENARIOS.map((e) => [e.id, e.nombre]))
const metricasDe = (etapa) => (etapa === 'total' ? METRICAS_DEL_TOTAL : METRICAS_DE_LA_ETAPA)

/** Una celda de la tabla de escenarios: el promedio y, debajo, su intervalo. */
function CeldaDelEscenario({ etapa, clave, escenario }) {
  const grupo = escenario.resumen?.[etapa]
  if (!grupo) return <td className="sin-dato" data-etiqueta={escenario.nombre}>—</td>
  const metrica = grupo.metricas[clave]
  if (!grupo.estable) {
    return (
      <td className="celda-con-rango" data-etiqueta={escenario.nombre}>
        <span className="estado-inestable">inestable</span>
        <span className="rango">promedio sin estabilizarse: {comoValor(clave, metrica.promedio)}</span>
      </td>
    )
  }
  const { resumen } = metrica
  return (
    <td className="numero celda-con-rango" data-etiqueta={escenario.nombre}>
      {comoValor(clave, metrica.promedio)}
      <span className="rango">
        {resumen.inferior === null ? 'sin intervalo' : `${comoValor(clave, resumen.inferior)} a ${comoValor(clave, resumen.superior)}`}
      </span>
    </td>
  )
}

/** La tabla de los cinco escenarios lado a lado para una etapa. */
function TablaDeLosEscenarios({ etapa, escenarios }) {
  return (
    <div className="experimentos-etapa">
      <h3>{nombreDeLaEtapa(etapa)}</h3>
      <div className="tabla-ancha" role="region" tabIndex={0} aria-label={`Tabla: ${nombreDeLaEtapa(etapa)} por escenario`}>
        <table>
          <caption className="solo-lectores">{nombreDeLaEtapa(etapa)}: promedio e intervalo del 95 % por escenario</caption>
          <thead>
            <tr>
              <th scope="col">Métrica</th>
              {escenarios.map((e) => (
                <th scope="col" key={e.id}>
                  {e.nombre}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {metricasDe(etapa).map(({ clave, texto }) => (
              <tr key={clave}>
                <th scope="row" className="texto">{texto}</th>
                {escenarios.map((e) => (
                  <CeldaDelEscenario key={e.id} etapa={etapa} clave={clave} escenario={e} />
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/** Una celda de diferencias: el promedio con su intervalo y si es significativa. */
function CeldaDeLaDiferencia({ nombre, clave, diferencia }) {
  const m = diferencia.metricas[clave]
  if (diferencia.inestableEn.length > 0) {
    return <td className="sin-dato" data-etiqueta={nombre}>no se calcula</td>
  }
  if (!m.calculada) return <td className="sin-dato" data-etiqueta={nombre}>sin intervalo</td>
  const r = m.resumen
  return (
    <td className="numero celda-con-rango" data-etiqueta={nombre}>
      {r.promedio > 0 ? '+' : ''}
      {comoValor(clave, r.promedio)}
      <span className="rango">
        {comoValor(clave, r.inferior)} a {comoValor(clave, r.superior)}
      </span>
      <span className={m.significativa ? 'estado-dentro' : 'rango'}>{TEXTO_DE_LA_SIGNIFICANCIA[m.significativa]}</span>
    </td>
  )
}

/** Las diferencias de cada escenario contra el de referencia, con el selector de la referencia. */
function DiferenciasContraLaReferencia({ escenarios }) {
  const referencia = useExperimentos((e) => e.referencia)
  const cambiar = useExperimentos((e) => e.cambiarConfiguracion)
  const conDatos = escenarios.filter((e) => e.replicas.length > 0)
  const hayReferencia = conDatos.some((e) => e.id === referencia)
  const diferencias = hayReferencia ? diferenciasContra(conDatos, referencia) : {}
  const ids = Object.keys(diferencias)

  return (
    <section className="experimentos-etapa" aria-label="Diferencias entre escenarios">
      <h3>Diferencias contra un escenario</h3>
      <div className="experimentos-selector">
        <label>
          Comparar contra{' '}
          <select value={referencia} onChange={(evento) => cambiar({ referencia: evento.target.value })}>
            {ESCENARIOS.map((e) => (
              <option key={e.id} value={e.id}>
                {e.nombre}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p className="experimentos-nota">{TEXTO_DE_LAS_DIFERENCIAS}</p>

      {!hayReferencia ? (
        <Aviso tipo="info" role="status">
          El escenario de referencia todavía no tiene corridas terminadas.
        </Aviso>
      ) : (
        ETAPAS.map((etapa) => {
          const inestables = [...new Set(ids.flatMap((id) => diferencias[id][etapa].inestableEn))]
          return (
            <div className="experimentos-etapa" key={etapa}>
              <h4>
                {nombreDeLaEtapa(etapa)} · contra {NOMBRES[referencia]}
              </h4>
              {inestables.length > 0 ? (
                <Aviso tipo="peligro" role="status">
                  {textoDeLasInestables(inestables, NOMBRES)}
                  {etapa === 'total' ? ' El tiempo total necesita las dos etapas estables.' : ''}
                </Aviso>
              ) : null}
              <div className="tabla-ancha" role="region" tabIndex={0} aria-label={`Tabla: diferencias en ${nombreDeLaEtapa(etapa)}`}>
                <table>
                  <caption className="solo-lectores">
                    {nombreDeLaEtapa(etapa)}: diferencia contra {NOMBRES[referencia]}
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col">Métrica</th>
                      {ids.map((id) => (
                        <th scope="col" key={id}>
                          {NOMBRES[id]}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {metricasDe(etapa).map(({ clave, texto }) => (
                      <tr key={clave}>
                        <th scope="row" className="texto">{texto}</th>
                        {ids.map((id) => (
                          <CeldaDeLaDiferencia key={id} nombre={NOMBRES[id]} clave={clave} diferencia={diferencias[id][etapa]} />
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )
        })
      )}
      {hayReferencia && ids.length > 0 ? (
        <p className="experimentos-nota">
          Diferencia = escenario − {NOMBRES[referencia]}. Parejas de réplicas con la misma semilla:{' '}
          {comoNumero(Math.min(...ids.map((id) => diferencias[id].pares)), 0)}.
        </p>
      ) : null}
    </section>
  )
}

/**
 * El resultado de Comparar escenarios: la tabla de los cinco escenarios lado a lado y,
 * debajo, las diferencias contra el escenario de referencia.
 *
 * @param {{ escenarios: Array<object> }} props lo que devuelve `armarResultados` para este modo
 */
export function ComparacionDeEscenarios({ escenarios }) {
  const conDatos = escenarios.filter((e) => e.resumen)
  if (conDatos.length === 0) return null
  return (
    <div className="metricas experimentos-tablas">
      {ETAPAS.map((etapa) => (
        <TablaDeLosEscenarios key={etapa} etapa={etapa} escenarios={escenarios} />
      ))}
      <DiferenciasContraLaReferencia escenarios={escenarios} />
    </div>
  )
}

export default ComparacionDeEscenarios
