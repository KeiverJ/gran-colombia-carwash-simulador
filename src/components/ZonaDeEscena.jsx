import EscenaDelLavadero from '../scene/EscenaDelLavadero.jsx'
import CapaDeAjustes from './CapaDeAjustes.jsx'
import CapaDeResultados from './CapaDeResultados.jsx'

/**
 * La zona de la escena: el lienzo a todo el espacio y, encima, las dos capas.
 *
 * Las capas son hermanas de la escena y van en otro plano (`position:
 * absolute`), así que abrirlas no cambia el tamaño del lienzo. La escena
 * (`AjusteALasCapas`) se encarga de acomodar la imagen y los elementos que
 * flotan a lo que las capas dejan libre.
 */
export function ZonaDeEscena() {
  return (
    <div className="zona-lienzo">
      <EscenaDelLavadero />
      <CapaDeAjustes />
      <CapaDeResultados />
    </div>
  )
}

export default ZonaDeEscena
