import { MODO_VISITA, useSimulacion } from '../store/simulacion.js'

/**
 * Los dos modos de la aplicación, en dos botones pegados: la simulación al
 * azar y la tarde del 17 de octubre. El modo elegido se distingue por el
 * relleno, el borde y la marca, no solo por el color.
 */
export function SelectorDeModo() {
  const enLaVisita = useSimulacion((estado) => estado.modo === MODO_VISITA)
  const entrarEnLaVisita = useSimulacion((estado) => estado.entrarEnLaVisita)
  const volverAlModoNormal = useSimulacion((estado) => estado.volverAlModoNormal)

  return (
    <div className="selector-de-modo" role="radiogroup" aria-label="Modo">
      <button
        type="button"
        role="radio"
        aria-checked={!enLaVisita}
        className={enLaVisita ? 'modo' : 'modo modo--elegido'}
        onClick={volverAlModoNormal}
      >
        Simulación
      </button>
      <button
        type="button"
        role="radio"
        aria-checked={enLaVisita}
        className={enLaVisita ? 'modo modo--elegido' : 'modo'}
        onClick={entrarEnLaVisita}
      >
        <span className="solo-escritorio-medio">Visita del 17 de octubre</span>
        <span className="solo-celular">Visita</span>
      </button>
    </div>
  )
}

export default SelectorDeModo
