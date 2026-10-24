import { COLOR_DE_ESTADO, COLOR_DE_PLAN, NOMBRE_DE_PLAN } from '../estilos/colores.js'

/** La forma que lleva encima cada moto según su plan. */
const FORMA_DE_PLAN = {
  1: { clase: 'forma-esfera', nombre: 'esfera' },
  2: { clase: 'forma-cubo', nombre: 'cubo' },
  3: { clase: 'forma-cono', nombre: 'cono' },
}

/**
 * Qué es cada cosa en la escena.
 *
 * Nombra el plan y describe su forma, no solo su color: el verde y el rojo de
 * las placas son casi el mismo color para quien no distingue esos dos, y los
 * planes tienen que poder leerse igual.
 */
export function LeyendaDePlanes() {
  return (
    <div className="leyenda">
      <h3>Qué es cada cosa</h3>

      <ul className="leyenda-lista">
        {[1, 2, 3].map((plan) => (
          <li key={plan}>
            <span
              className={`muestra ${FORMA_DE_PLAN[plan].clase}`}
              style={{ '--color-muestra': COLOR_DE_PLAN[plan] }}
              aria-hidden="true"
            />
            <span>
              {NOMBRE_DE_PLAN[plan]} <small>({FORMA_DE_PLAN[plan].nombre} encima)</small>
            </span>
          </li>
        ))}
      </ul>

      <ul className="leyenda-lista">
        <li>
          <span
            className="muestra muestra-losa"
            style={{ '--color-muestra': COLOR_DE_ESTADO.libre }}
            aria-hidden="true"
          />
          <span>Placa o puesto libre: losa plana</span>
        </li>
        <li>
          <span
            className="muestra muestra-losa muestra-levantada"
            style={{ '--color-muestra': COLOR_DE_ESTADO.ocupada }}
            aria-hidden="true"
          />
          <span>Ocupado: la losa se levanta</span>
        </li>
      </ul>

      <p className="nota">
        La franja de delante es el lavado y la del fondo, el acabado; las motos
        salen por abajo. Arrastra para girar la vista y usa la rueda para
        acercarte.
      </p>
    </div>
  )
}

export default LeyendaDePlanes
