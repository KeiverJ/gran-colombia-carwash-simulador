import { useExperimentos } from '../store/experimentos.js'
import { useInterfaz } from '../store/interfaz.js'
import { MOTIVO_SIN_EXPERIMENTOS } from '../store/presentacionDeExperimentos.js'
import { MODO_VISITA, useSimulacion } from '../store/simulacion.js'
import { IconoDeAjustes, IconoDeAyuda, IconoDeExperimentos, IconoDeResultados } from './iconos.jsx'

/**
 * Un botón de la barra lateral: solo el ícono. El nombre se ve en un tooltip
 * (CSS, con `data-nombre`) al pasar el mouse o enfocarlo con el teclado, y lo
 * leen las ayudas técnicas por `aria-label`.
 *
 * Con `motivo`, el botón está desactivado: se queda enfocable (`aria-disabled`, no
 * `disabled`) para que el tooltip diga por qué, y pulsarlo no hace nada.
 */
function BotonLateral({ nombre, tooltip, activo, controla, motivo, estado, alPulsar, children }) {
  const propiedades =
    activo === undefined
      ? { 'aria-haspopup': 'dialog' }
      : { 'aria-pressed': activo, 'aria-controls': controla }
  const idDeLaDescripcion = `descripcion-${nombre.toLowerCase()}`
  const descripcion = motivo ?? estado
  const clase = [
    'boton-lateral',
    activo ? 'boton-lateral--activo' : '',
    motivo ? 'boton-lateral--desactivado' : '',
  ]
    .filter(Boolean)
    .join(' ')
  return (
    <>
      <button
        type="button"
        className={clase}
        aria-label={nombre}
        aria-disabled={motivo ? 'true' : undefined}
        aria-describedby={descripcion ? idDeLaDescripcion : undefined}
        data-nombre={tooltip ?? nombre}
        onClick={motivo ? undefined : alPulsar}
        {...propiedades}
      >
        {children}
      </button>
      {descripcion ? (
        <span id={idDeLaDescripcion} className="solo-lectores">
          {descripcion}
        </span>
      ) : null}
    </>
  )
}

/** Lo que cuenta de un lote corriendo, para el tooltip y los lectores: «corriendo, 40 %». */
function estadoDelLote(corriendo, horasHechas, horasPedidas) {
  if (!corriendo) {
    return null
  }
  const porcentaje = horasPedidas > 0 ? Math.min(100, Math.floor((horasHechas / horasPedidas) * 100)) : 0
  return `Hay un experimento corriendo en segundo plano: ${porcentaje} %.`
}

/**
 * La barra angosta de la izquierda, solo con íconos: abre y cierra las dos
 * capas y la vista de Experimentos y, al pie, abre la ayuda. El botón de lo que
 * está abierto se ve activo (fondo suave e ícono de color) y lo dice con
 * `aria-pressed`.
 */
export function BarraLateral() {
  const capas = useInterfaz((estado) => estado.capas)
  const experimentosAbierto = useInterfaz((estado) => estado.experimentosAbierto)
  const alternarCapa = useInterfaz((estado) => estado.alternarCapa)
  const alternarExperimentos = useInterfaz((estado) => estado.alternarExperimentos)
  const abrirAyuda = useInterfaz((estado) => estado.abrirAyuda)
  const enLaVisita = useSimulacion((estado) => estado.modo === MODO_VISITA)
  const loteCorriendo = useExperimentos((estado) => estado.estado === 'corriendo')
  const horasHechas = useExperimentos((estado) => estado.avance.horasHechas)
  const horasPedidas = useExperimentos((estado) => estado.avance.horasPedidas)
  const estadoDelExperimento = estadoDelLote(loteCorriendo && !experimentosAbierto, horasHechas, horasPedidas)

  return (
    <nav className="barra-lateral" aria-label="Paneles">
      <BotonLateral
        nombre="Ajustes"
        activo={capas.ajustes}
        controla="capa-de-ajustes"
        alPulsar={() => alternarCapa('ajustes')}
      >
        <IconoDeAjustes />
      </BotonLateral>
      <BotonLateral
        nombre="Resultados"
        activo={capas.resultados}
        controla="panel-de-resultados"
        alPulsar={() => alternarCapa('resultados')}
      >
        <IconoDeResultados />
      </BotonLateral>
      <BotonLateral
        nombre="Experimentos"
        tooltip={
          enLaVisita
            ? `Experimentos: ${MOTIVO_SIN_EXPERIMENTOS}`
            : estadoDelExperimento
              ? `Experimentos · ${estadoDelExperimento.replace('Hay un experimento corriendo en segundo plano: ', 'corriendo, ')}`
              : 'Experimentos'
        }
        activo={experimentosAbierto}
        controla="vista-de-experimentos"
        motivo={enLaVisita ? `Experimentos ${MOTIVO_SIN_EXPERIMENTOS}.` : undefined}
        estado={estadoDelExperimento ?? undefined}
        alPulsar={alternarExperimentos}
      >
        <IconoDeExperimentos />
      </BotonLateral>

      <div className="barra-lateral-pie">
        <BotonLateral nombre="Ayuda" alPulsar={abrirAyuda}>
          <IconoDeAyuda />
        </BotonLateral>
      </div>
    </nav>
  )
}

export default BarraLateral
