import { pestanasDeResultados, useInterfaz } from '../store/interfaz.js'
import { MODO_VISITA, useSimulacion } from '../store/simulacion.js'
import Capa from './Capa.jsx'
import ContenidoDeLaVisita from './ContenidoDeLaVisita.jsx'
import { ContenidoDeMetricas } from './TablaDeMetricas.jsx'
import GraficaDeColas from './GraficaDeColas.jsx'
import Pestanas from './Pestanas.jsx'
import { usePresencia } from './usePresencia.js'

const TEXTO_DE_LA_PESTANA = { metricas: 'Métricas', graficas: 'Gráficas', visita: 'Visita' }

/** El contenido de una pestaña de Resultados (o de la hoja del celular). */
export function ContenidoDeResultados({ pestana }) {
  if (pestana === 'visita') {
    return <ContenidoDeLaVisita />
  }
  if (pestana === 'graficas') {
    return (
      <div className="metricas metricas--capa">
        <GraficaDeColas alto={260} conTitulo />
      </div>
    )
  }
  return <ContenidoDeMetricas />
}

/**
 * La capa de la derecha, con las pestañas Métricas, Gráficas y, solo en el
 * modo visita, Visita. En la visita la pestaña Métricas no existe y la capa
 * abre en Visita.
 */
export function CapaDeResultados() {
  const abierta = useInterfaz((estado) => estado.capas.resultados)
  const pestana = useInterfaz((estado) => estado.pestanaResultados)
  const elegirPestana = useInterfaz((estado) => estado.elegirPestanaDeResultados)
  const cerrarCapa = useInterfaz((estado) => estado.cerrarCapa)
  const enLaVisita = useSimulacion((estado) => estado.modo === MODO_VISITA)

  const { montada, fase } = usePresencia(abierta)

  if (!montada) {
    return null
  }

  const ids = pestanasDeResultados(enLaVisita)
  // Si la pestaña guardada no existe en este modo (un instante, entre el cambio
  // de modo y su enlace), se muestra la primera.
  const visible = ids.includes(pestana) ? pestana : ids[0]

  return (
    <Capa
      id="capa-de-resultados"
      lado="derecha"
      titulo="Resultados"
      fase={fase}
      alCerrar={() => cerrarCapa('resultados')}
    >
      <Pestanas
        etiqueta="Resultados"
        prefijo="resultados"
        pestanas={ids.map((id) => ({ id, texto: TEXTO_DE_LA_PESTANA[id] }))}
        elegida={visible}
        alElegir={elegirPestana}
      >
        <ContenidoDeResultados pestana={visible} />
      </Pestanas>
    </Capa>
  )
}

export default CapaDeResultados
