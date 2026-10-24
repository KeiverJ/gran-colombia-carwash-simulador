import {
  useSimulacion,
  VELOCIDAD_MAXIMA,
  VELOCIDAD_MINIMA,
} from '../store/simulacion.js'
import { comoNumero, comoReloj } from './formato.js'

/**
 * Los mandos que se usan mirando la simulación: iniciar, pausar, reiniciar,
 * la velocidad y el reloj.
 *
 * Van pegados a la escena y no dentro del panel de parámetros porque son los
 * que se tocan todo el rato; el panel queda para los valores del modelo, que
 * se ponen una vez.
 *
 * El reloj lee el resumen del store, que se refresca cuatro veces por segundo.
 * Si leyera la foto, a velocidad alta cambiaría en cada cuadro y arrastraría
 * con él un render por cuadro.
 */
export function MandosDeLaSimulacion() {
  const corriendo = useSimulacion((estado) => estado.corriendo)
  const velocidad = useSimulacion((estado) => estado.velocidadMinPorSegundo)
  const resumen = useSimulacion((estado) => estado.resumen)

  const iniciar = useSimulacion((estado) => estado.iniciar)
  const pausar = useSimulacion((estado) => estado.pausar)
  const reiniciar = useSimulacion((estado) => estado.reiniciar)
  const cambiarVelocidad = useSimulacion((estado) => estado.cambiarVelocidad)

  return (
    <div className="mandos">
      <div className="mandos-botones">
        {corriendo ? (
          <button type="button" className="boton-principal" onClick={pausar}>
            Pausar
          </button>
        ) : (
          <button type="button" className="boton-principal" onClick={iniciar}>
            Iniciar
          </button>
        )}
        <button type="button" onClick={() => reiniciar(null)}>
          Reiniciar
        </button>
      </div>

      <label className="mandos-velocidad">
        <span>
          Velocidad <strong>{comoNumero(velocidad, 2)} min/s</strong>
        </span>
        <input
          type="range"
          min={VELOCIDAD_MINIMA}
          max={VELOCIDAD_MAXIMA}
          step={0.25}
          value={velocidad}
          onChange={(evento) => cambiarVelocidad(Number(evento.target.value))}
        />
      </label>

      <p className="reloj">
        <span>
          Tiempo simulado <strong>{comoReloj(resumen.relojMin)}</strong>
        </span>
        <span>
          En fila para lavado <strong>{resumen.enFilaLavado}</strong>
        </span>
        <span>
          Para acabado <strong>{resumen.enFilaAcabado}</strong>
        </span>
      </p>
    </div>
  )
}

export default MandosDeLaSimulacion
