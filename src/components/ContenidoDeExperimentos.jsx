import { aCsv, nombreDelArchivoCsv } from '../experimentos/csv.js'
import { MODO_BARRIDO, MODO_ESCENARIOS, MODO_LOTES, MODO_REPLICAS } from '../experimentos/plan.js'
import { useExperimentos } from '../store/experimentos.js'
import { resumenDeLosParametros } from '../store/presentacionDeExperimentos.js'
import { useResultadosDeExperimentos } from '../store/useResultadosDeExperimentos.js'
import ComparacionDeEscenarios from './ComparacionDeEscenarios.jsx'
import FormularioDeExperimentos from './FormularioDeExperimentos.jsx'
import { GraficaDeLaMediaAcumulada, GraficaDelBarrido } from './GraficasDeExperimentos.jsx'
import ProgresoDeExperimentos from './ProgresoDeExperimentos.jsx'
import { ReplicasNecesarias, TablasDeUnResumen } from './TablasDeExperimentos.jsx'

/** Baja un texto como archivo, sin red: un enlace temporal a un `Blob`. */
function descargar(texto, nombre) {
  const url = URL.createObjectURL(new Blob([texto], { type: 'text/csv;charset=utf-8' }))
  const enlace = document.createElement('a')
  enlace.href = url
  enlace.download = nombre
  document.body.appendChild(enlace)
  enlace.click()
  enlace.remove()
  URL.revokeObjectURL(url)
}

/** El botón que exporta a CSV lo que se ve: desactivado mientras no hay resultados. */
export function BotonDeExportar({ resultados }) {
  const referencia = useExperimentos((e) => e.referencia)
  const hayResultados = Boolean(resultados) && resultadosTienenDatos(resultados)
  return (
    <button
      type="button"
      className="boton-secundario"
      disabled={!hayResultados}
      onClick={() => descargar(aCsv(resultados, { referencia }), nombreDelArchivoCsv(resultados))}
    >
      Exportar a CSV
    </button>
  )
}

/** ¿Hay al menos una pieza terminada que exportar? */
function resultadosTienenDatos(resultados) {
  if (resultados.modo === MODO_REPLICAS || resultados.modo === MODO_LOTES) return resultados.resumen !== null
  if (resultados.modo === MODO_BARRIDO) return resultados.puntos.some((p) => p.resumen)
  if (resultados.modo === MODO_ESCENARIOS) return resultados.escenarios.some((e) => e.resumen)
  return false
}

/** La parte de la derecha: encabezado, avance, tablas o gráficas, y exportar. */
function Resultados() {
  const resultados = useResultadosDeExperimentos()
  const estado = useExperimentos((e) => e.estado)
  if (!resultados) {
    return (
      <section className="experimentos-resultados" aria-label="Resultados del experimento">
        <p className="experimentos-nota">
          Elige un modo, revisa los valores y pulsa «Iniciar experimento». Los resultados aparecen aquí a medida que
          terminan las corridas.
        </p>
      </section>
    )
  }

  const { solicitud } = resultados
  const hay = resultadosTienenDatos(resultados)
  return (
    <section className="experimentos-resultados" aria-label="Resultados del experimento">
      <ProgresoDeExperimentos />
      <p className="experimentos-encabezado">
        {resumenDeLosParametros(solicitud)}
      </p>

      {(resultados.modo === MODO_REPLICAS || resultados.modo === MODO_LOTES) && hay ? (
        <>
          <div className="metricas">
            <TablasDeUnResumen resumen={resultados.resumen} deLotes={resultados.modo === MODO_LOTES} />
          </div>
          {resultados.modo === MODO_REPLICAS && resultados.resumen.n >= 2 && estado !== 'corriendo' ? (
            <ReplicasNecesarias resumen={resultados.resumen} />
          ) : null}
          {resultados.observacion ? <GraficaDeLaMediaAcumulada resultados={resultados} /> : null}
        </>
      ) : null}

      {resultados.modo === MODO_BARRIDO && hay ? <GraficaDelBarrido resultados={resultados} /> : null}

      {resultados.modo === MODO_ESCENARIOS && hay ? (
        <ComparacionDeEscenarios escenarios={resultados.escenarios} />
      ) : null}

      <div className="experimentos-acciones">
        <BotonDeExportar resultados={resultados} />
      </div>
    </section>
  )
}

/**
 * El contenido de la vista «Experimentos»: la configuración a la izquierda y los
 * resultados a la derecha. Muchas simulaciones sin animación, en segundo plano,
 * con promedio, desviación e intervalo de confianza del 95 %. Los resultados
 * sobreviven al cierre de la vista.
 */
export function ContenidoDeExperimentos() {
  return (
    <div className="experimentos">
      <div className="experimentos-cuerpo">
        <FormularioDeExperimentos />
        <Resultados />
      </div>
    </div>
  )
}

export default ContenidoDeExperimentos
