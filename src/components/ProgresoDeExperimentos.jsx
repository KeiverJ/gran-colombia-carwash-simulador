import { useExperimentos } from '../store/experimentos.js'
import { comoTiempoRestante, PIEZA_DE_AVANCE } from '../store/presentacionDeExperimentos.js'
import Aviso from './Aviso.jsx'

/** Cada cuántos puntos de porcentaje se anuncia el avance a las ayudas técnicas. */
const PASO_DEL_ANUNCIO = 10

/**
 * El avance de un lote: una barra con el porcentaje (de horas simuladas), cuántas
 * piezas van de las pedidas y el tiempo que falta, más el aviso de cómo terminó
 * (cancelado o fallido). El avance se anuncia por decenas de porcentaje y no por
 * cuadro, para no abrumar a un lector de pantalla.
 */
export function ProgresoDeExperimentos() {
  const estado = useExperimentos((e) => e.estado)
  const avance = useExperimentos((e) => e.avance)
  const solicitud = useExperimentos((e) => e.solicitudDelLote)
  const aviso = useExperimentos((e) => e.aviso)

  if (!solicitud || estado === 'inactivo') return null

  const fraccion = avance.horasPedidas > 0 ? Math.min(1, avance.horasHechas / avance.horasPedidas) : 0
  const porcentaje = estado === 'terminado' ? 100 : Math.floor(fraccion * 100)
  const unidad = PIEZA_DE_AVANCE[solicitud.modo]
  const restante = comoTiempoRestante(avance.tiempoRestanteMs)
  const anunciado = Math.min(100, Math.floor(porcentaje / PASO_DEL_ANUNCIO) * PASO_DEL_ANUNCIO)

  return (
    <div className="experimentos-progreso">
      {estado === 'corriendo' ? (
        <>
          <span
            className="experimentos-barra"
            role="progressbar"
            aria-label="Avance del experimento"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={porcentaje}
            aria-valuetext={`${porcentaje} %`}
          >
            <span className="experimentos-barra-relleno" style={{ transform: `scaleX(${porcentaje / 100})` }} />
          </span>
          <p>
            {porcentaje} % · {avance.hechas} de {avance.pedidas || '…'} {unidad}
            {restante ? ` · faltan ${restante}` : ''}
          </p>
          <p className="experimentos-nota" role="status" aria-live="polite">
            Avance: {anunciado} %. La escena y los controles siguen funcionando.
          </p>
        </>
      ) : null}

      {estado === 'cancelado' ? (
        <Aviso tipo="info" role="status">
          Cancelado: {avance.hechas} de {avance.pedidas} {unidad}. Se muestran las que alcanzaron a terminar
          {avance.hechas === 1 ? '; con una sola no hay intervalo, hacen falta al menos dos.' : '.'}
        </Aviso>
      ) : null}

      {estado === 'fallido' ? (
        <Aviso tipo="peligro" role="alert">
          {aviso}
        </Aviso>
      ) : null}
    </div>
  )
}

export default ProgresoDeExperimentos
