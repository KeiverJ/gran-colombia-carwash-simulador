import EscenaDelLavadero from '../scene/EscenaDelLavadero.jsx'
import CapaDeAjustes from './CapaDeAjustes.jsx'
import PanelDeResultados from './PanelDeResultados.jsx'

/**
 * La zona de la escena: el lienzo a todo el espacio y, encima, la capa de
 * Ajustes (a la izquierda) y el panel de Resultados (abajo).
 *
 * La capa y el panel son hermanos de la escena y van en otro plano (`position:
 * absolute`), así que abrirlas no cambia el tamaño del lienzo. La escena
 * (`AjusteALasCapas`) se encarga de acomodar la imagen y los elementos que
 * flotan a lo que las capas dejan libre.
 */
export function ZonaDeEscena() {
  return (
    <div className="zona-lienzo">
      <EscenaDelLavadero />
      <CapaDeAjustes />
      <PanelDeResultados />
    </div>
  )
}

export default ZonaDeEscena
