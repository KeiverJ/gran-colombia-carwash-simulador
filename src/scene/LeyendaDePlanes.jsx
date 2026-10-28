import { COLOR_DE_ESTADO, COLOR_DE_OCUPADO, COLOR_DE_PLAN } from '../estilos/colores.js'
import { SEGMENTOS_DEL_ARO } from './recursosDeMoto.js'

/** El radio y el grosor de la muestra de un aro, en la unidad de su dibujo (18 × 18). */
const RADIO = 7
const GROSOR = 2.4
const CENTRO = 9

/**
 * La muestra del aro de un plan, con el mismo trazo que el del piso: sólido el
 * del plan 1, en segmentos el del plan 2 y doble el del plan 3. Se distingue por
 * el trazo y no solo por el color, igual que en la escena.
 */
function MuestraDeAro({ plan }) {
  const color = COLOR_DE_PLAN[plan]
  const circunferencia = 2 * Math.PI * RADIO
  const segmento = circunferencia / SEGMENTOS_DEL_ARO.cuantos
  return (
    <svg className="muestra-de-aro" viewBox="0 0 18 18" width="18" height="18" aria-hidden="true">
      {plan === 3 ? (
        <>
          <circle cx={CENTRO} cy={CENTRO} r={RADIO + 1.4} fill="none" stroke={color} strokeWidth="1.3" />
          <circle cx={CENTRO} cy={CENTRO} r={RADIO - 1.4} fill="none" stroke={color} strokeWidth="1.3" />
        </>
      ) : (
        <circle
          cx={CENTRO}
          cy={CENTRO}
          r={RADIO}
          fill="none"
          stroke={color}
          strokeWidth={GROSOR}
          strokeDasharray={
            plan === 2
              ? `${segmento * SEGMENTOS_DEL_ARO.relleno} ${segmento * (1 - SEGMENTOS_DEL_ARO.relleno)}`
              : undefined
          }
        />
      )}
    </svg>
  )
}

/**
 * La leyenda de la escena: el contenido del recuadro que abre el botón «Leyenda».
 *
 * Cada plan se reconoce por el aro que su moto lleva en el piso, con su color y
 * su trazo; no se queda en el color, para que se lean igual quien no distingue
 * los colores o una captura en escala de grises. Y una placa o un puesto libre
 * es plano y gris, y uno ocupado está elevado y lleva el color de su etapa: la
 * altura es la señal que no depende del color. Los nombres completos de los
 * planes están en Ajustes y en la Ayuda.
 */
export function LeyendaDePlanes() {
  return (
    <ul className="leyenda" aria-label="Leyenda de la escena">
      {[1, 2, 3].map((plan) => (
        <li key={plan}>
          <MuestraDeAro plan={plan} />
          <span>Plan {plan}</span>
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
