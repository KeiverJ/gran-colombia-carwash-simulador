import { useInterfaz } from '../store/interfaz.js'
import {
  MODO_VISITA,
  useSimulacion,
  VELOCIDAD_MAXIMA,
  VELOCIDAD_MINIMA,
} from '../store/simulacion.js'
import { comoHoraDeLaTarde, comoNumero, comoReloj } from './formato.js'
import { IconoDeAyuda, IconoDeReiniciar } from './iconos.jsx'
import SelectorDeModo from './SelectorDeModo.jsx'

/**
 * La barra de arriba: el nombre, el modo, el reloj y los mandos de uso
 * frecuente (reiniciar, iniciar o pausar y la velocidad), más la ayuda.
 *
 * El reloj lee el resumen del store, que se refresca cuatro veces por segundo:
 * si leyera la foto, a velocidad alta cambiaría en cada cuadro y arrastraría
 * con él un render por cuadro.
 */
export function BarraSuperior() {
  const placas = useSimulacion((estado) => estado.parametros.placas)
  const puestos = useSimulacion((estado) => estado.parametros.puestos)
  const enLaVisita = useSimulacion((estado) => estado.modo === MODO_VISITA)
  const corriendo = useSimulacion((estado) => estado.corriendo)
  const velocidad = useSimulacion((estado) => estado.velocidadMinPorSegundo)
  const relojMin = useSimulacion((estado) => estado.resumen.relojMin)

  const iniciar = useSimulacion((estado) => estado.iniciar)
  const pausar = useSimulacion((estado) => estado.pausar)
  const reiniciar = useSimulacion((estado) => estado.reiniciar)
  const cambiarVelocidad = useSimulacion((estado) => estado.cambiarVelocidad)
  const abrirAyuda = useInterfaz((estado) => estado.abrirAyuda)

  return (
    <header className="barra-superior">
      <div className="marca">
        <h1>Gran Colombia Car Wash Express</h1>
        <p className="subtitulo">
          Simulador de colas · lavado M/M/{placas} → acabado M/M/{puestos}
        </p>
      </div>

      <SelectorDeModo />

      <div className="barra-derecha">
        <p className="reloj-de-la-barra">
          <span className="reloj-etiqueta">{enLaVisita ? 'Hora de la visita' : 'Tiempo simulado'}</span>
          <strong>{enLaVisita ? comoHoraDeLaTarde(relojMin) : comoReloj(relojMin)}</strong>
        </p>

        <button
          type="button"
          className="boton-barra"
          onClick={() => reiniciar(null)}
          aria-label="Reiniciar"
        >
          <IconoDeReiniciar />
          <span className="boton-texto">Reiniciar</span>
        </button>

        {corriendo ? (
          <button type="button" className="boton-principal" onClick={pausar}>
            Pausar
          </button>
        ) : (
          <button type="button" className="boton-principal" onClick={iniciar}>
            Iniciar
          </button>
        )}

        <label className="velocidad">
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

        {/* En escritorio la ayuda va al pie de la barra lateral; aquí solo en celular. */}
        <button
          type="button"
          className="boton-barra solo-celular"
          onClick={abrirAyuda}
          aria-label="Ayuda"
        >
          <IconoDeAyuda />
        </button>
      </div>
    </header>
  )
}

export default BarraSuperior
