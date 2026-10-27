import { useInterfaz } from '../store/interfaz.js'
import { IconoDeAjustes, IconoDeAyuda, IconoDeResultados } from './iconos.jsx'

/**
 * Un botón de la barra lateral: solo el ícono. El nombre se ve en un tooltip
 * (CSS, con `data-nombre`) al pasar el mouse o enfocarlo con el teclado, y lo
 * leen las ayudas técnicas por `aria-label`.
 */
function BotonLateral({ nombre, activo, controla, alPulsar, children }) {
  const propiedades =
    activo === undefined
      ? { 'aria-haspopup': 'dialog' }
      : { 'aria-pressed': activo, 'aria-controls': controla }
  return (
    <button
      type="button"
      className={activo ? 'boton-lateral boton-lateral--activo' : 'boton-lateral'}
      aria-label={nombre}
      data-nombre={nombre}
      onClick={alPulsar}
      {...propiedades}
    >
      {children}
    </button>
  )
}

/**
 * La barra angosta de la izquierda, solo con íconos: abre y cierra las dos
 * capas y, al pie, abre la ayuda. El botón de una capa abierta se ve activo
 * (fondo suave e ícono de color) y lo dice con `aria-pressed`.
 */
export function BarraLateral() {
  const capas = useInterfaz((estado) => estado.capas)
  const alternarCapa = useInterfaz((estado) => estado.alternarCapa)
  const abrirAyuda = useInterfaz((estado) => estado.abrirAyuda)

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

      <div className="barra-lateral-pie">
        <BotonLateral nombre="Ayuda" alPulsar={abrirAyuda}>
          <IconoDeAyuda />
        </BotonLateral>
      </div>
    </nav>
  )
}

export default BarraLateral
