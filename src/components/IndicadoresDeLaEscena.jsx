import { useMemo } from 'react'

import { etapaSaturada } from '../store/metricas.js'
import { MODO_VISITA, useSimulacion } from '../store/simulacion.js'
import { comoNumero } from './formato.js'
import { IconoDeAdvertencia } from './iconos.jsx'

/** Una medida con su etiqueta; si lleva `ocupacion`, una barra fina de x / s debajo. */
function Medida({ etiqueta, valor, ocupacion = null, advertencia = false }) {
  return (
    <div className="medida">
      <span className="medida-etiqueta">{etiqueta}</span>
      <strong className={advertencia ? 'medida-valor medida-valor--advertencia' : 'medida-valor'}>
        {advertencia ? (
          <span className="medida-aviso" role="img" aria-label="Etapa saturada">
            <IconoDeAdvertencia />
          </span>
        ) : null}
        {valor}
      </strong>
      {ocupacion === null ? null : (
        <div
          className="ocupacion"
          role="progressbar"
          aria-label={etiqueta}
          aria-valuemin={0}
          aria-valuemax={ocupacion.total}
          aria-valuenow={ocupacion.ocupados}
        >
          <div
            className="ocupacion-relleno"
            style={{ '--ocupacion': ocupacion.total > 0 ? ocupacion.ocupados / ocupacion.total : 0 }}
          />
        </div>
      )}
    </div>
  )
}

/**
 * El panel de indicadores que flota sobre la escena, abajo y al centro: un solo
 * panel semitransparente con tres grupos separados por líneas finas.
 *
 *   LAVADO   placas ocupadas (x / s₁) y motos en fila 1
 *   ACABADO  puestos ocupados (x / s₂) y motos en fila 2
 *   SALIERON motos que ya salieron
 *
 * Lee el `resumen` del store, que se refresca cuatro veces por segundo: si
 * leyera la foto, cambiaría en cada cuadro. Si la etapa 2 se satura (ρ₂ ≥ 1) la
 * cifra de la fila 2 lleva un ícono de advertencia; en la visita no, porque ahí
 * se reproduce una tarde fija y no el modelo.
 */
export function IndicadoresDeLaEscena() {
  const resumen = useSimulacion((estado) => estado.resumen)
  const parametros = useSimulacion((estado) => estado.parametros)
  const enLaVisita = useSimulacion((estado) => estado.modo === MODO_VISITA)
  const satura = useMemo(
    () => !enLaVisita && etapaSaturada(parametros, 'acabado'),
    [parametros, enLaVisita],
  )
  const entero = (valor) => comoNumero(valor, 0)

  return (
    <div className="indicadores">
      <div className="indicadores-panel" role="group" aria-label="Indicadores de la simulación">
        <section className="indicadores-grupo indicadores-grupo--lavado" aria-labelledby="grupo-lavado">
          <h3 id="grupo-lavado" className="grupo-nombre">
            Lavado
          </h3>
          <div className="medidas">
            <Medida
              etiqueta="Placas ocupadas"
              valor={`${entero(resumen.placasOcupadas)} / ${entero(resumen.placasTotales)}`}
              ocupacion={{ ocupados: resumen.placasOcupadas, total: resumen.placasTotales }}
            />
            <Medida etiqueta="Motos en fila 1" valor={entero(resumen.enFilaLavado)} />
          </div>
        </section>

        <section className="indicadores-grupo indicadores-grupo--acabado" aria-labelledby="grupo-acabado">
          <h3 id="grupo-acabado" className="grupo-nombre">
            Acabado
          </h3>
          <div className="medidas">
            <Medida
              etiqueta="Puestos ocupados"
              valor={`${entero(resumen.puestosOcupados)} / ${entero(resumen.puestosTotales)}`}
              ocupacion={{ ocupados: resumen.puestosOcupados, total: resumen.puestosTotales }}
            />
            <Medida
              etiqueta="Motos en fila 2"
              valor={entero(resumen.enFilaAcabado)}
              advertencia={satura}
            />
          </div>
        </section>

        <section className="indicadores-grupo indicadores-grupo--salieron" aria-labelledby="grupo-salieron">
          <h3 id="grupo-salieron" className="grupo-nombre">
            Salieron
          </h3>
          <div className="medidas">
            <Medida etiqueta="Motos que ya salieron" valor={entero(resumen.motosSalidas)} />
          </div>
        </section>
      </div>
    </div>
  )
}

export default IndicadoresDeLaEscena
