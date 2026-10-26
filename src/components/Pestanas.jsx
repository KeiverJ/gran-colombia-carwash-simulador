/**
 * Una fila de pestañas con su panel. Sirve igual en la capa de Resultados y
 * en la hoja inferior del celular.
 *
 * @param {object} props
 * @param {string} props.etiqueta nombre del conjunto de pestañas
 * @param {Array<{ id: string, texto: string }>} props.pestanas
 * @param {string} props.elegida id de la pestaña que se ve
 * @param {(id: string) => void} props.alElegir
 * @param {string} props.prefijo para enlazar cada pestaña con su panel
 * @param {import('react').ReactNode} props.children el contenido de la pestaña elegida
 */
export function Pestanas({ etiqueta, pestanas, elegida, alElegir, prefijo, children }) {
  return (
    <div className="pestanas">
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
      <div
        id={`${prefijo}-panel`}
        className="pestanas-panel"
        role="tabpanel"
        aria-labelledby={`${prefijo}-pestana-${elegida}`}
      >
        {/* Con `key`, al cambiar de pestaña el contenido nuevo aparece con un
            fundido (CSS) y el panel no cambia de alto ni de sitio. */}
        <div key={elegida} className="pestanas-contenido">
          {children}
        </div>
      </div>
    </div>
  )
}

export default Pestanas
