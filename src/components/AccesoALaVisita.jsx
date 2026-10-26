import { MODO_VISITA, useSimulacion } from '../store/simulacion.js'

/**
 * La puerta de entrada y de salida del modo "Repetir la visita del 17 de octubre",
 * arriba del panel.
 *
 * Va fuera del bloque de parámetros, que se desactiva en la visita: si no, el
 * botón de volver quedaría desactivado junto con todo lo demás.
 */
export function AccesoALaVisita() {
  const enLaVisita = useSimulacion((estado) => estado.modo === MODO_VISITA)
  const entrarEnLaVisita = useSimulacion((estado) => estado.entrarEnLaVisita)
  const volverAlModoNormal = useSimulacion((estado) => estado.volverAlModoNormal)

  if (enLaVisita) {
    return (
      <div className="acceso-visita">
        <p className="aviso-visita">
          Estás viendo la visita del 17 de octubre. En este modo los tiempos{' '}
          <strong>no son aleatorios</strong>: salen de la tabla de la visita. Por eso
          la semilla, los tiempos, las proporciones de los planes, las placas y los
          puestos no se usan y no se pueden mover.
        </p>
        <button type="button" className="boton-visita" onClick={volverAlModoNormal}>
          Volver al modo normal
        </button>
      </div>
    )
  }

  return (
    <div className="acceso-visita">
      <button type="button" className="boton-visita" onClick={entrarEnLaVisita}>
        Repetir la visita del 17 de octubre
      </button>
      <small className="pista">
        Reproduce las 23 motos de aquella tarde, con sus horas reales.
      </small>
    </div>
  )
}

export default AccesoALaVisita
