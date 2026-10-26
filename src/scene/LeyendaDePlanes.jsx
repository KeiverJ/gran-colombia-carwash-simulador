import { COLOR_DE_ESTADO, COLOR_DE_PLAN } from '../estilos/colores.js'

/** La forma que lleva encima cada moto según su plan. */
const FORMA_DE_PLAN = {
  1: { clase: 'forma-esfera', nombre: 'esfera' },
  2: { clase: 'forma-cubo', nombre: 'cubo' },
  3: { clase: 'forma-cono', nombre: 'cono' },
}

/**
 * La leyenda de la escena, compacta y en una sola línea.
 *
 * Nombra el plan y dice su forma, no solo su color: el verde y el rojo de las
 * placas son casi el mismo color para quien no distingue esos dos, y los
 * planes tienen que poder leerse igual. Los nombres completos de los planes
 * están en Ajustes y en la Ayuda.
 */
export function LeyendaDePlanes() {
  return (
    <ul className="leyenda" aria-label="Leyenda de la escena">
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
        <span
          className="muestra muestra-losa"
          style={{ '--color-muestra': COLOR_DE_ESTADO.libre }}
          aria-hidden="true"
        />
        <span>Libre · losa plana</span>
      </li>
      <li>
        <span
          className="muestra muestra-losa muestra-levantada"
          style={{ '--color-muestra': COLOR_DE_ESTADO.ocupada }}
          aria-hidden="true"
        />
        <span>Ocupado · losa elevada</span>
      </li>
    </ul>
  )
}

export default LeyendaDePlanes
