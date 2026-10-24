import { useState } from 'react'

import { MODO_MMS, MODO_POR_PLAN } from '../engine/simulador.js'
import { PLACAS_POSIBLES, PUESTOS_POSIBLES, useSimulacion } from '../store/simulacion.js'
import { comoNumero, comoPorcentaje } from './formato.js'

/** Un deslizador con su etiqueta y el valor que tiene ahora. */
function Deslizador({ etiqueta, valor, minimo, maximo, paso, decimales, unidad, alCambiar }) {
  return (
    <label className="control">
      <span className="control-nombre">
        {etiqueta}
        <strong>
          {comoNumero(valor, decimales)} {unidad}
        </strong>
      </span>
      <input
        type="range"
        min={minimo}
        max={maximo}
        step={paso}
        value={valor}
        onChange={(evento) => alCambiar(Number(evento.target.value))}
      />
    </label>
  )
}

export function PanelDeParametros() {
  // Plegar es cosa de la interfaz, no de la simulación: por eso vive aquí y
  // no en el store. Si estuviera en el store, plegar tocaría el mismo estado
  // que los parámetros y podría reiniciar la corrida.
  const [plegado, setPlegado] = useState(false)

  const parametros = useSimulacion((estado) => estado.parametros)
  const semilla = useSimulacion((estado) => estado.semilla)
  const aviso = useSimulacion((estado) => estado.aviso)

  const cambiarParametro = useSimulacion((estado) => estado.cambiarParametro)
  const cambiarAcabadoDePlan = useSimulacion((estado) => estado.cambiarAcabadoDePlan)
  const cambiarProporcion = useSimulacion((estado) => estado.cambiarProporcion)
  const cambiarSemilla = useSimulacion((estado) => estado.cambiarSemilla)

  if (plegado) {
    return (
      <section className="panel panel--plegado">
        <button
          type="button"
          className="panel-pestana"
          onClick={() => setPlegado(false)}
          aria-expanded="false"
        >
          Parámetros
        </button>
      </section>
    )
  }

  return (
    <section className="panel">
      <div className="panel-cabecera">
        <h2>Parámetros</h2>
        <button
          type="button"
          className="panel-plegar"
          onClick={() => setPlegado(true)}
          aria-expanded="true"
        >
          Plegar
        </button>
      </div>

      <Deslizador
        etiqueta="Motos que llegan por hora"
        valor={parametros.llegadasPorHora}
        minimo={1}
        maximo={40}
        paso={0.0001}
        decimales={4}
        unidad="motos/h"
        alCambiar={(valor) => cambiarParametro('llegadasPorHora', valor)}
      />

      <Deslizador
        etiqueta="Tiempo de lavado"
        valor={parametros.lavadoMin}
        minimo={1}
        maximo={30}
        paso={0.1}
        decimales={2}
        unidad="min"
        alCambiar={(valor) => cambiarParametro('lavadoMin', valor)}
      />

      <h3>Tiempo de acabado de cada plan</h3>
      {[1, 2, 3].map((plan) => (
        <Deslizador
          key={plan}
          etiqueta={`Plan ${plan}`}
          valor={parametros.acabadoPlanMin[plan]}
          minimo={1}
          maximo={40}
          paso={0.1}
          decimales={2}
          unidad="min"
          alCambiar={(valor) => cambiarAcabadoDePlan(plan, valor)}
        />
      ))}

      <h3>Qué plan contratan las motos</h3>
      <p className="nota">Las tres proporciones siempre suman 100 %.</p>
      {[1, 2, 3].map((plan) => (
        <label className="control" key={plan}>
          <span className="control-nombre">
            Plan {plan}
            <strong>{comoPorcentaje(parametros.proporcionPlan[plan])}</strong>
          </span>
          <input
            type="range"
            min={0}
            max={100}
            step={0.1}
            value={parametros.proporcionPlan[plan] * 100}
            onChange={(evento) => cambiarProporcion(plan, Number(evento.target.value) / 100)}
          />
        </label>
      ))}

      <h3>El lavadero</h3>
      <label className="control">
        <span className="control-nombre">Placas de lavado</span>
        <select
          value={parametros.placas}
          onChange={(evento) => cambiarParametro('placas', Number(evento.target.value))}
        >
          {PLACAS_POSIBLES.map((placas) => (
            <option key={placas} value={placas}>
              {placas} placas
            </option>
          ))}
        </select>
      </label>

      <label className="control">
        <span className="control-nombre">Puestos de acabado</span>
        <select
          value={parametros.puestos}
          onChange={(evento) => cambiarParametro('puestos', Number(evento.target.value))}
        >
          {PUESTOS_POSIBLES.map((puestos) => (
            <option key={puestos} value={puestos}>
              {puestos} puestos
            </option>
          ))}
        </select>
      </label>

      <label className="control">
        <span className="control-nombre">Cómo se calcula el acabado</span>
        <select
          value={parametros.modoAcabado}
          onChange={(evento) => cambiarParametro('modoAcabado', evento.target.value)}
        >
          <option value={MODO_POR_PLAN}>Según el plan de cada moto</option>
          <option value={MODO_MMS}>Un solo promedio (para comparar con las fórmulas)</option>
        </select>
      </label>

      <h3>La corrida</h3>
      <label className="control">
        <span className="control-nombre">Semilla del azar</span>
        <input
          type="number"
          value={semilla}
          min={0}
          step={1}
          onChange={(evento) => cambiarSemilla(Number(evento.target.value))}
        />
        <small className="pista">Con la misma semilla se repite la misma tarde simulada.</small>
      </label>

      {aviso ? <p className="aviso-reinicio">{aviso}</p> : null}
    </section>
  )
}

export default PanelDeParametros
