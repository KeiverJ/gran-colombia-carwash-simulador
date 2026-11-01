import { useSimulacion } from '../store/simulacion.js'
import Aviso from './Aviso.jsx'

/**
 * El aviso de que el motor de la simulación falló: lo que pasó, dicho sin jerga ni
 * trazas, y el botón para volver a empezar. Flota sobre la escena y no ocupa sitio
 * si todo va bien. Es una alerta: se anuncia en cuanto aparece.
 */
export function AvisoDeFallo() {
  const fallo = useSimulacion((estado) => estado.fallo)
  const reiniciar = useSimulacion((estado) => estado.reiniciar)
  if (!fallo) {
    return null
  }
  return (
    <div className="aviso-de-fallo">
      <Aviso tipo="peligro" role="alert">
        <p className="aviso-de-fallo-texto">{fallo.mensaje}</p>
        <button type="button" className="boton-principal" onClick={() => reiniciar()}>
          Reiniciar
        </button>
      </Aviso>
    </div>
  )
}

export default AvisoDeFallo
