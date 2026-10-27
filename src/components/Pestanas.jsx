/**
 * Una fila de pestañas con su panel. Sirve igual en el panel de Resultados y
 * en la hoja inferior del celular.
 *
 * La fila y el panel también se pueden usar por separado (`ListaDePestanas` y
 * `PanelDeLaPestana`), para poner la fila en la cabecera del panel de
 * Resultados y el contenido debajo.
 */

/**
 * @param {object} props
 * @param {string} props.etiqueta nombre del conjunto de pestañas
 * @param {Array<{ id: string, texto: string }>} props.pestanas
 * @param {string} props.elegida id de la pestaña que se ve
 * @param {(id: string) => void} props.alElegir
 * @param {string} props.prefijo para enlazar cada pestaña con su panel
 */
export function ListaDePestanas({ etiqueta, pestanas, elegida, alElegir, prefijo }) {
  return (
    <div className="pestanas-lista" role="tablist" aria-label={etiqueta}>
      {pestanas.map((pestana) => {
        const activa = pestana.id === elegida
        return (
          <button
            key={pestana.id}
            id={`${prefijo}-pestana-${pestana.id}`}
            type="button"
            role="tab"
            aria-selected={activa}
            aria-controls={`${prefijo}-panel`}
            tabIndex={activa ? 0 : -1}
            className={activa ? 'pestana pestana--activa' : 'pestana'}
            onClick={() => alElegir(pestana.id)}
          >
            {pestana.texto}
          </button>
        )
      })}
    </div>
  )
}

/**
 * El contenido de la pestaña elegida. Con `key`, al cambiar de pestaña el
 * contenido nuevo aparece con un fundido (CSS) y el panel no cambia de alto ni
 * de sitio.
 */
export function PanelDeLaPestana({ prefijo, elegida, className = '', children }) {
  return (
    <div
      id={`${prefijo}-panel`}
      className={`pestanas-panel${className ? ` ${className}` : ''}`}
      role="tabpanel"
      aria-labelledby={`${prefijo}-pestana-${elegida}`}
    >
      <div key={elegida} className="pestanas-contenido">
        {children}
      </div>
    </div>
  )
}

/**
 * @param {import('react').ReactNode} props.children el contenido de la pestaña elegida
 */
export function Pestanas({ etiqueta, pestanas, elegida, alElegir, prefijo, children }) {
  return (
    <div className="pestanas">
      <ListaDePestanas
        etiqueta={etiqueta}
        pestanas={pestanas}
        elegida={elegida}
        alElegir={alElegir}
        prefijo={prefijo}
      />
      <PanelDeLaPestana prefijo={prefijo} elegida={elegida}>
        {children}
      </PanelDeLaPestana>
    </div>
  )
}

export default Pestanas
