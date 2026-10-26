import {
  MODO_VISITA,
  useSimulacion,
  VELOCIDAD_MAXIMA,
  VELOCIDAD_MINIMA,
} from '../store/simulacion.js'
import { comoHoraDeLaTarde, comoNumero, comoReloj } from './formato.js'

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
 *
 * En el modo "Repetir la visita" el reloj muestra la hora de la tarde, y debajo
 * van los avisos de ese modo. Van aquí, junto a la escena, y no en el panel de
 * parámetros porque el panel se puede plegar y estos avisos no pueden quedar
 * escondidos.
 */
export function MandosDeLaSimulacion() {
  const corriendo = useSimulacion((estado) => estado.corriendo)
  const velocidad = useSimulacion((estado) => estado.velocidadMinPorSegundo)
  const resumen = useSimulacion((estado) => estado.resumen)
  const enLaVisita = useSimulacion((estado) => estado.modo === MODO_VISITA)
  const visitaTerminada = useSimulacion((estado) => estado.visita?.terminada === true)

  const iniciar = useSimulacion((estado) => estado.iniciar)
  const pausar = useSimulacion((estado) => estado.pausar)
  const reiniciar = useSimulacion((estado) => estado.reiniciar)
  const cambiarVelocidad = useSimulacion((estado) => estado.cambiarVelocidad)
  const volverAlModoNormal = useSimulacion((estado) => estado.volverAlModoNormal)

  return (
    <>
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
            {enLaVisita ? 'Hora' : 'Tiempo simulado'}{' '}
            <strong>
              {enLaVisita ? comoHoraDeLaTarde(resumen.relojMin) : comoReloj(resumen.relojMin)}
            </strong>
          </span>
          <span>
            En fila para lavado <strong>{resumen.enFilaLavado}</strong>
          </span>
          <span>
            Para acabado <strong>{resumen.enFilaAcabado}</strong>
          </span>
        </p>
      </div>

      {enLaVisita ? (
        <div className="aviso-de-la-visita">
          <p>
            Repitiendo la visita del 17 de octubre. Los puestos de acabado son{' '}
            <strong>aproximados</strong>: la visita no registró en qué puesto estuvo cada
            moto.
          </p>
          {visitaTerminada ? (
            <p className="visita-terminada" role="status">
              <strong>La visita terminó.</strong> Salieron las 23 motos a las 5:30 p. m.
            </p>
          ) : null}
          <button type="button" onClick={volverAlModoNormal}>
            Volver al modo normal
          </button>
        </div>
      ) : null}
    </>
  )
}

export default MandosDeLaSimulacion
