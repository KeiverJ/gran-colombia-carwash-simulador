import { replicasNecesarias } from '../experimentos/resumen.js'
import { useExperimentos } from '../store/experimentos.js'
import {
  comoValor,
  nombreCortoDeLaMetrica,
  nombreDeLaEtapa,
  OPCIONES_DE_METRICA,
  tablasDeUnResumen,
  TEXTO_DEL_ESTADO,
  TEXTO_DE_LAS_REPLICAS_NECESARIAS,
} from '../store/presentacionDeExperimentos.js'
import Aviso from './Aviso.jsx'
import { CampoNumerico } from './CampoNumerico.jsx'
import { comoNumero } from './formato.js'

/** El intervalo de una fila: «a – b», o la razón por la que no hay. */
function CeldaDelIntervalo({ fila }) {
  if (fila.estado === 'inestable') return <td className="sin-dato" data-etiqueta="Intervalo del 95 %">no se calcula</td>
  if (fila.inferior === null) return <td className="sin-dato" data-etiqueta="Intervalo del 95 %">sin intervalo</td>
  return (
    <td className="numero" data-etiqueta="Intervalo del 95 %">
      {comoValor(fila.clave, fila.inferior)} a {comoValor(fila.clave, fila.superior)}
    </td>
  )
}

/** Una etapa (o el total) con sus métricas: promedio, desviación, intervalo y fórmulas. */
function TablaDeUnaEtapa({ tabla }) {
  return (
    <div className="experimentos-etapa">
      <h3>{tabla.titulo}</h3>
      {!tabla.estable ? (
        <Aviso tipo="peligro" role="status">
          <p>
            Etapa inestable: llegan más motos de las que alcanza a atender y la fila crece sin límite. No se calcula
            el intervalo ni se compara con las fórmulas.
          </p>
          {tabla.apoyo ? (
            <p>
              Motos en la fila, en promedio: {comoNumero(tabla.apoyo.antes, 1)} {tabla.apoyo.rotulos[0]} y{' '}
              {comoNumero(tabla.apoyo.despues, 1)} {tabla.apoyo.rotulos[1]}.
              {tabla.apoyo.despues > tabla.apoyo.antes ? ' Crece con el tiempo.' : ''}
            </p>
          ) : null}
        </Aviso>
      ) : tabla.aproximada ? (
        <p className="experimentos-nota">
          En el modo «por plan» las fórmulas son una aproximación: «dentro» o «fuera» no es una prueba exacta.
        </p>
      ) : null}
      <div className="tabla-ancha" role="region" tabIndex={0} aria-label={`Tabla: ${tabla.titulo}`}>
        <table>
          <caption className="solo-lectores">{tabla.titulo}</caption>
          <thead>
            <tr>
              <th scope="col">Métrica</th>
              <th scope="col">Promedio</th>
              <th scope="col">Desviación</th>
              <th scope="col">Intervalo del 95 %</th>
              <th scope="col">Fórmulas</th>
              <th scope="col">Estado</th>
            </tr>
          </thead>
          <tbody>
            {tabla.filas.map((fila) => (
              <tr key={fila.clave}>
                <th scope="row" className="texto">{fila.nombre}</th>
                <td className="numero" data-etiqueta="Promedio">
                  {comoValor(fila.clave, fila.promedio)}
                  {fila.unidad ? <span className="unidad"> {fila.unidad}</span> : null}
                </td>
                {fila.desviacion === null ? (
                  <td className="sin-dato" data-etiqueta="Desviación">—</td>
                ) : (
                  <td className="numero" data-etiqueta="Desviación">{comoValor(fila.clave, fila.desviacion)}</td>
                )}
                <CeldaDelIntervalo fila={fila} />
                {fila.formula === null ? (
                  <td className="sin-dato" data-etiqueta="Fórmulas">{fila.estado === 'inestable' ? 'inestable' : '—'}</td>
                ) : (
                  <td className="numero" data-etiqueta="Fórmulas">{comoValor(fila.clave, fila.formula)}</td>
                )}
                <td className={`estado-${fila.estado}`} data-etiqueta="Estado">
                  {fila.estado === 'inestable' ? 'inestable' : TEXTO_DEL_ESTADO[fila.estado]}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/**
 * Las tres tablas (etapa 1, etapa 2 y total) de un resumen de Réplicas o de Medias
 * por lotes.
 */
export function TablasDeUnResumen({ resumen, deLotes = false }) {
  const tablas = tablasDeUnResumen(
    resumen,
    deLotes ? ['al final del primer lote', 'al final del último lote'] : ['a la mitad de la corrida', 'al final de la corrida'],
  )
  return (
    <div className="metricas experimentos-tablas">
      {tablas.map((tabla) => (
        <TablaDeUnaEtapa key={tabla.id} tabla={tabla} />
      ))}
    </div>
  )
}

/* ------------------------------------------------- réplicas necesarias (n*) -- */

const OPCIONES_DE_ETAPA = [
  { valor: 'lavado', texto: nombreDeLaEtapa('lavado') },
  { valor: 'acabado', texto: nombreDeLaEtapa('acabado') },
]

/** Las unidades de una métrica para el campo del semiancho deseado. */
const UNIDAD_DE = { rho: '', lq: 'motos', wqMin: 'min', wMin: 'min', l: 'motos' }

/**
 * «¿Cuántas réplicas hacen falta?»: se elige una métrica y la precisión deseada
 * (el semiancho del intervalo) y se calcula n* = n · (h / h*)², redondeado hacia
 * arriba, con un botón para correr esa cantidad.
 */
export function ReplicasNecesarias({ resumen }) {
  const precision = useExperimentos((e) => e.precision)
  const cambiarPrecision = useExperimentos((e) => e.cambiarPrecision)
  const corriendo = useExperimentos((e) => e.estado === 'corriendo')
  const correrConReplicas = useExperimentos((e) => e.correrConReplicas)
  const cabe = useExperimentos((e) => e.cabeUnLoteDeReplicas)

  const { etapa, clave } = precision
  const metrica = resumen[etapa].metricas[clave]
  const intervalo = metrica.resumen
  const semiancho = resumen[etapa].estable && intervalo ? intervalo.semiancho : null
  const sugerido = semiancho ? Number((semiancho / 2).toPrecision(2)) : null
  const deseado = precision.deseado ?? sugerido
  const cuenta = replicasNecesarias({ n: resumen.n, semiancho, deseado })
  const unidad = UNIDAD_DE[clave]

  const nombreDeLaMetrica = `${nombreCortoDeLaMetrica(clave)} de la ${nombreDeLaEtapa(etapa)}`

  return (
    <section className="experimentos-necesarias" aria-label="Réplicas necesarias">
      <h3>¿Cuántas réplicas hacen falta?</h3>
      <div className="experimentos-selector">
        <label>
          Etapa{' '}
          <select value={etapa} onChange={(e) => cambiarPrecision({ etapa: e.target.value, deseado: null })}>
            {OPCIONES_DE_ETAPA.map((o) => (
              <option key={o.valor} value={o.valor}>
                {o.texto}
              </option>
            ))}
          </select>
        </label>
        <label>
          Métrica{' '}
          <select value={clave} onChange={(e) => cambiarPrecision({ clave: e.target.value, deseado: null })}>
            {OPCIONES_DE_METRICA.map((o) => (
              <option key={o.valor} value={o.valor}>
                {o.texto}
              </option>
            ))}
          </select>
        </label>
      </div>

      {semiancho === null ? (
        <p className="experimentos-nota">
          {!resumen[etapa].estable
            ? 'No se puede calcular: esa etapa es inestable y no tiene intervalo.'
            : 'Hacen falta al menos 2 réplicas terminadas para tener un intervalo.'}
        </p>
      ) : (
        <>
          <p>
            Con {resumen.n} réplicas, el intervalo de {nombreDeLaMetrica} mide ±{' '}
            <span className="cifra">{comoValor(clave, semiancho)}</span> {unidad} (el semiancho h).
          </p>
          <CampoNumerico
            quienSigue="Se queda con"
            etiqueta="Semiancho deseado (h*)"
            valor={deseado}
            rango={{ minimo: 0.0001, maximo: 1000, unidad: unidad || undefined }}
            conDeslizador={false}
            alAplicar={(valor) => cambiarPrecision({ deseado: valor })}
          />
          {cuenta.disponible ? (
            cuenta.alcanza ? (
              <p>
                Con las {resumen.n} réplicas ya alcanza: harían falta {cuenta.necesarias}.
              </p>
            ) : (
              <>
                <p>
                  Harían falta <span className="cifra">{cuenta.necesarias}</span> réplicas (n* = n · (h / h*)², redondeado hacia arriba).
                  {cuenta.necesarias < 5 ? ' El mínimo es 5, así que se correrían 5.' : ''}
                </p>
                {cuenta.pasaDelMaximo ? (
                  <Aviso tipo="advertencia" role="status">
                    El máximo es 100 réplicas. Pide una precisión menos exigente o sube las horas por réplica.
                  </Aviso>
                ) : !cabe(cuenta.aCorrer) ? (
                  <Aviso tipo="advertencia" role="status">
                    Ese lote pasaría del tope de horas simuladas. Baja las horas por réplica o pide menos precisión.
                  </Aviso>
                ) : null}
                <div className="experimentos-acciones">
                  <button
                    type="button"
                    className="boton-secundario"
                    disabled={corriendo || cuenta.pasaDelMaximo || !cabe(cuenta.aCorrer)}
                    onClick={() => correrConReplicas(cuenta.aCorrer)}
                  >
                    Correr {cuenta.aCorrer} réplicas
                  </button>
                </div>
              </>
            )
          ) : (
            <p className="experimentos-nota">Escribe un semiancho mayor que 0.</p>
          )}
          <p className="experimentos-nota">{TEXTO_DE_LAS_REPLICAS_NECESARIAS}</p>
        </>
      )}
    </section>
  )
}
