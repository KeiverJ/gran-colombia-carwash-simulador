import { useSimulacion } from '../store/simulacion.js'
import BloquesDeLaVisita from './BloquesDeLaVisita.jsx'

/**
 * La pestaña Visita: los dos bloques de métricas del modo "Visita del 17 de
 * octubre", lo que sale de reproducir la tabla y lo que se contó aquel día.
 */
export function ContenidoDeLaVisita({ enPanel = false }) {
  const metricas = useSimulacion((estado) => estado.metricas)
  return (
    <div className={enPanel ? 'metricas metricas--panel' : 'metricas metricas--capa'}>
      <BloquesDeLaVisita metricas={metricas} unida={!enPanel} />
    </div>
  )
}

export default ContenidoDeLaVisita
