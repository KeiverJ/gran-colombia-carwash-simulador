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
 */
export function GrupoDeBotones({ etiqueta, opciones, valor, alElegir }) {
  return (
    <div className="grupo-de-botones" role="radiogroup" aria-label={etiqueta}>
      {opciones.map((opcion) => {
        const elegida = opcion.valor === valor
        return (
          <button
            key={String(opcion.valor)}
            type="button"
            role="radio"
            aria-checked={elegida}
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
