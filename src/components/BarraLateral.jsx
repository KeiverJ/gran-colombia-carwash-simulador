import { useInterfaz } from '../store/interfaz.js'
import { IconoDeAjustes, IconoDeResultados } from './iconos.jsx'

/**
 * La barra angosta de la izquierda: abre y cierra las dos capas. El botón de la
 * capa abierta lleva una barra a un lado además del relleno, y `aria-expanded`
 * para las ayudas técnicas.
 */
export function BarraLateral() {
  const capas = useInterfaz((estado) => estado.capas)
  const alternarCapa = useInterfaz((estado) => estado.alternarCapa)

  return (
    <nav className="barra-lateral" aria-label="Paneles">
      <button
        type="button"
        className={capas.ajustes ? 'boton-lateral boton-lateral--activo' : 'boton-lateral'}
        aria-expanded={capas.ajustes}
        aria-controls="capa-de-ajustes"
        onClick={() => alternarCapa('ajustes')}
      >
        <IconoDeAjustes />
        <span>Ajustes</span>
      </button>
      <button
        type="button"
        className={capas.resultados ? 'boton-lateral boton-lateral--activo' : 'boton-lateral'}
        aria-expanded={capas.resultados}
        aria-controls="capa-de-resultados"
        onClick={() => alternarCapa('resultados')}
      >
        <IconoDeResultados />
        <span>Resultados</span>
      </button>
    </nav>
  )
}

export default BarraLateral
