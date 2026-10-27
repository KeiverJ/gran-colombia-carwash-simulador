import { moverConLasFlechas } from './moverConLasFlechas.js'
import { indiceDeLaParadaDeTab } from './navegacionPorFlechas.js'

/**
 * Un grupo de botones del que se elige uno solo (placas, puestos, modo de
 * acabado). Es un grupo de opciones para las ayudas técnicas, y el elegido se
 * distingue por un borde grueso, la letra en negrita y una marca, no solo por
 * el color.
 *
 * @param {object} props
 * @param {string} props.etiqueta nombre del grupo, para las ayudas técnicas
 * @param {Array<{ valor: any, texto: string, ayuda?: string }>} props.opciones
 * @param {any} props.valor la opción elegida
 * @param {(valor: any) => void} props.alElegir
 *
 * Teclado: una sola parada de Tab (la opción elegida) y, dentro del grupo, las
 * flechas, Inicio y Fin pasan de opción y la eligen, como en un grupo de
 * radios.
 */
export function GrupoDeBotones({ etiqueta, opciones, valor, alElegir }) {
  const paradaDeTab = indiceDeLaParadaDeTab(opciones.map((opcion) => opcion.valor === valor))
  return (
    <div
      className="grupo-de-botones"
      role="radiogroup"
      aria-label={etiqueta}
      onKeyDown={(evento) => moverConLasFlechas(evento, { selector: '[role="radio"]', conVerticales: true })}
    >
      {opciones.map((opcion, indice) => {
        const elegida = opcion.valor === valor
        return (
          <button
            key={String(opcion.valor)}
            type="button"
            role="radio"
            aria-checked={elegida}
            tabIndex={indice === paradaDeTab ? 0 : -1}
            title={opcion.ayuda}
            className={elegida ? 'opcion opcion--elegida' : 'opcion'}
            onClick={() => alElegir(opcion.valor)}
          >
            {opcion.texto}
          </button>
        )
      })}
    </div>
  )
}

export default GrupoDeBotones
