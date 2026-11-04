import { useInterfaz } from '../store/interfaz.js'
import { MOTIVO_SIN_EXPERIMENTOS } from '../store/presentacionDeExperimentos.js'
import {
  MODO_VISITA,
  useSimulacion,
  VELOCIDAD_MAXIMA,
  VELOCIDAD_MINIMA,
} from '../store/simulacion.js'
import { RANGOS } from '../store/rangos.js'
import { comoHoraDeLaTarde, comoNumero, comoReloj } from './formato.js'
import { RAZON_DE_LA_CORRIDA_LARGA } from './corridaLargaActiva.js'
import { IconoDeAyuda, IconoDeExperimentos, IconoDeReiniciar } from './iconos.jsx'
import LogoDeMarca from './LogoDeMarca.jsx'
import SelectorDeModo from './SelectorDeModo.jsx'

/**
 * La barra de arriba: el logo y el nombre, el modo, el reloj y los mandos de uso
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
  const enCorridaLarga = useSimulacion((estado) => estado.corridaLarga !== null)
  const corriendo = useSimulacion((estado) => estado.corriendo)
  const velocidad = useSimulacion((estado) => estado.velocidadMinPorSegundo)
  const relojMin = useSimulacion((estado) => estado.resumen.relojMin)

  const iniciar = useSimulacion((estado) => estado.iniciar)
  const pausar = useSimulacion((estado) => estado.pausar)
  const reiniciar = useSimulacion((estado) => estado.reiniciar)
  const cambiarVelocidad = useSimulacion((estado) => estado.cambiarVelocidad)
  const abrirAyuda = useInterfaz((estado) => estado.abrirAyuda)
  const experimentosAbierto = useInterfaz((estado) => estado.experimentosAbierto)
  const alternarExperimentos = useInterfaz((estado) => estado.alternarExperimentos)

  return (
    <header className="barra-superior">
      <div className="marca">
        <LogoDeMarca />
        <div className="marca-texto">
          <h1 translate="no">Gran Colombia Car Wash Express</h1>
          <p className="subtitulo">
            Simulador de colas · lavado{' '}
            <span translate="no">
              M/M/{placas} → acabado M/M/{puestos}
            </span>
          </p>
        </div>
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
          disabled={enCorridaLarga}
          title={enCorridaLarga ? RAZON_DE_LA_CORRIDA_LARGA : undefined}
        >
          <IconoDeReiniciar />
          <span className="boton-texto">Reiniciar</span>
        </button>

        {corriendo ? (
          <button type="button" className="boton-principal" onClick={pausar}>
            Pausar
          </button>
        ) : (
          <button
            type="button"
            className="boton-principal"
            onClick={iniciar}
            disabled={enCorridaLarga}
            title={enCorridaLarga ? RAZON_DE_LA_CORRIDA_LARGA : undefined}
          >
            Iniciar
          </button>
        )}

        <label className="velocidad">
          <span>
            <span className="velocidad-nombre">Velocidad </span>
            <strong>{comoNumero(velocidad, 2)} min/s</strong>
          </span>
          <input
            type="range"
            min={VELOCIDAD_MINIMA}
            max={VELOCIDAD_MAXIMA}
            step={RANGOS.velocidad.paso}
            value={velocidad}
            onChange={(evento) => cambiarVelocidad(Number(evento.target.value))}
          />
        </label>

        {/* En escritorio Experimentos y la ayuda van en la barra lateral; aquí solo en celular. */}
        <button
          type="button"
          className={enLaVisita ? 'boton-barra solo-celular boton-barra--desactivado' : 'boton-barra solo-celular'}
          onClick={enLaVisita ? undefined : alternarExperimentos}
          aria-label="Experimentos"
          aria-pressed={experimentosAbierto}
          aria-controls="vista-de-experimentos"
          aria-disabled={enLaVisita ? 'true' : undefined}
          aria-describedby={enLaVisita ? 'motivo-experimentos-celular' : undefined}
        >
          <IconoDeExperimentos />
        </button>
        {enLaVisita ? (
          <span id="motivo-experimentos-celular" className="solo-lectores">
            Experimentos {MOTIVO_SIN_EXPERIMENTOS}.
          </span>
        ) : null}
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
