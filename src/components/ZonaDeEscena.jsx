import { useInterfaz } from '../store/interfaz.js'
import EscenaDelLavadero from '../scene/EscenaDelLavadero.jsx'
import CapaDeAjustes from './CapaDeAjustes.jsx'
import CapaDeResultados from './CapaDeResultados.jsx'

/**
 * La zona de la escena: el lienzo a todo el espacio y, encima, las dos capas.
 *
 * Las capas son hermanas de la escena y van en otro plano (`position:
 * absolute`), así que abrirlas no cambia el tamaño del lienzo. Lo que sí
 * hacen es correr los elementos que flotan de su lado: la zona lo cuenta con
 * `data-` para el CSS.
 */
export function ZonaDeEscena() {
  const capas = useInterfaz((estado) => estado.capas)
  return (
    <div
      className="zona-lienzo"
      data-ajustes={capas.ajustes ? 'abierta' : 'cerrada'}
      data-resultados={capas.resultados ? 'abierta' : 'cerrada'}
    >
      <EscenaDelLavadero />
      <CapaDeAjustes />
      <CapaDeResultados />
    </div>
  )
}

export default ZonaDeEscena
