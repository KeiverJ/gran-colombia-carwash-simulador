import { COLOR_DE_ESTADO, COLOR_DE_OCUPADO, COLOR_DE_PLAN } from '../estilos/colores.js'

/** La forma que lleva encima cada moto según su plan. */
const FORMA_DE_PLAN = {
  1: { clase: 'forma-esfera', nombre: 'esfera' },
  2: { clase: 'forma-cubo', nombre: 'cubo' },
  3: { clase: 'forma-cono', nombre: 'cono' },
}

/**
 * La leyenda de la escena, compacta y en una sola línea.
 *
 * Nombra el plan y dice su forma (la del marcador de encima) y, aparte, que el
 * aro del piso lleva el color del plan. No se queda en el color: los planes
 * tienen que poder leerse igual para quien no distingue los colores. Y una
 * placa o un puesto libre es plano y gris, y uno ocupado está elevado y lleva
 * el color de su etapa; la altura es la señal que no depende del color. Los
 * nombres completos de los planes están en Ajustes y en la Ayuda.
 */
export function LeyendaDePlanes({ vertical = false }) {
  return (
    <ul className={vertical ? 'leyenda leyenda--vertical' : 'leyenda'} aria-label="Leyenda de la escena">
      {[1, 2, 3].map((plan) => (
        <li key={plan}>
          <span
            className={`muestra ${FORMA_DE_PLAN[plan].clase}`}
            style={{ '--color-muestra': COLOR_DE_PLAN[plan] }}
            aria-hidden="true"
          />
          <span>
            Plan {plan} · {FORMA_DE_PLAN[plan].nombre}
          </span>
        </li>
      ))}
      <li>
        <span className="muestras-de-aro" aria-hidden="true">
          {[1, 2, 3].map((plan) => (
            <span
              key={plan}
              className="muestra muestra-aro"
              style={{ '--color-muestra': COLOR_DE_PLAN[plan] }}
            />
          ))}
        </span>
        <span>Aro en el piso · color del plan</span>
      </li>
      <li>
        <span
          className="muestra muestra-losa"
          style={{ '--color-muestra': COLOR_DE_ESTADO.libre }}
          aria-hidden="true"
        />
        <span>Libre · losa plana</span>
      </li>
      <li>
        <span className="muestras-de-aro" aria-hidden="true">
          {['lavado', 'acabado'].map((etapa) => (
            <span
              key={etapa}
              className="muestra muestra-losa muestra-levantada"
              style={{ '--color-muestra': COLOR_DE_OCUPADO[etapa] }}
            />
          ))}
        </span>
        <span>Ocupado · losa elevada, color de su etapa</span>
      </li>
    </ul>
  )
}

export default LeyendaDePlanes
