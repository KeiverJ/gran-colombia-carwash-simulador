import { ESCENARIOS } from '../data/escenarios.js'
import { escenarioQueCoincide, useSimulacion } from '../store/simulacion.js'

/** El valor de la opción que se muestra cuando ya no coincide ningún escenario. */
const PERSONALIZADO = 'personalizado'

/**
 * Elegir con un clic una de las cinco configuraciones que estudia el proyecto.
 *
 * El escenario que se ve elegido se deduce de los parámetros puestos: si se
 * mueve cualquier deslizador, el selector pasa a "Personalizado" en vez de
 * seguir mostrando un escenario que ya no es cierto.
 */
export function SelectorDeEscenarios() {
  const parametros = useSimulacion((estado) => estado.parametros)
  const aviso = useSimulacion((estado) => estado.avisoDeEscenario)
  const elegirEscenario = useSimulacion((estado) => estado.elegirEscenario)

  const puesto = escenarioQueCoincide(parametros)

  return (
    <div className="escenarios">
      <label className="control">
        <span className="control-nombre">Escenario</span>
        <select
          value={puesto ? puesto.id : PERSONALIZADO}
          onChange={(evento) => elegirEscenario(evento.target.value)}
        >
          {puesto ? null : (
            <option value={PERSONALIZADO} disabled>
              Personalizado
            </option>
          )}
          {ESCENARIOS.map((escenario) => (
            <option key={escenario.id} value={escenario.id}>
              {escenario.nombre}
            </option>
          ))}
        </select>
        <small className="pista">
          Carga los parámetros por defecto con ese número de placas y puestos.
        </small>
      </label>

      {aviso ? <p className="aviso-escenario">{aviso}</p> : null}
    </div>
  )
}

export default SelectorDeEscenarios
