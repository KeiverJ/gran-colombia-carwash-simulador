import { ESCENARIOS } from '../data/escenarios.js'
import { MODO_MMS, MODO_POR_PLAN } from '../engine/simulador.js'
import { NOMBRE_DE_PLAN } from '../estilos/colores.js'
import { useInterfaz } from '../store/interfaz.js'
import { metricasCalculadas, rho2DelEscenario } from '../store/metricas.js'
import {
  acabadoPromedioDe,
  escenarioQueCoincide,
  MODO_VISITA,
  PLACAS_POSIBLES,
  PUESTOS_POSIBLES,
  useSimulacion,
} from '../store/simulacion.js'
import Aviso from './Aviso.jsx'
import { RANGOS } from './campoNumerico.js'
import CampoNumerico from './CampoNumerico.jsx'
import Capa from './Capa.jsx'
import { comoNumero, comoPorcentaje } from './formato.js'
import GrupoDeBotones from './GrupoDeBotones.jsx'
import { usePresencia } from './usePresencia.js'

/** El ρ₂ de cada escenario no cambia mientras la aplicación vive: se calcula una vez. */
const RHO_DE_LOS_ESCENARIOS = new Map(
  ESCENARIOS.map((escenario) => [escenario.id, rho2DelEscenario(escenario)]),
)

/** Las cinco tarjetas de escenario, con su ρ₂ y la línea de parámetros cargados. */
function Escenarios() {
  const parametros = useSimulacion((estado) => estado.parametros)
  const avisoDeEscenario = useSimulacion((estado) => estado.avisoDeEscenario)
  const elegirEscenario = useSimulacion((estado) => estado.elegirEscenario)
  const puesto = escenarioQueCoincide(parametros)

  return (
    <section className="seccion" aria-labelledby="ajustes-escenario">
      <header className="seccion-cabecera">
        <h3 id="ajustes-escenario">Escenario</h3>
        {puesto ? null : <span className="etiqueta-personalizado">Personalizado</span>}
      </header>
      <div className="tarjetas">
        {ESCENARIOS.map((escenario) => {
          const rho = RHO_DE_LOS_ESCENARIOS.get(escenario.id)
          const satura = rho >= 1
          const elegido = puesto?.id === escenario.id
          return (
            <button
              key={escenario.id}
              type="button"
              className={elegido ? 'tarjeta tarjeta--elegida' : 'tarjeta'}
              aria-pressed={elegido}
              title={escenario.nombre}
              onClick={() => elegirEscenario(escenario.id)}
            >
              <span className="tarjeta-nombre">
                {elegido ? <span className="tarjeta-marca" aria-hidden="true">✓ </span> : null}
                {escenario.nombre}
              </span>
              <span className={satura ? 'tarjeta-rho tarjeta-rho--satura' : 'tarjeta-rho'}>
                ρ₂ {comoNumero(rho, 4)}
                {satura ? ' · se satura' : ''}
              </span>
            </button>
          )
        })}
      </div>
      {avisoDeEscenario ? (
        <Aviso tipo="info" className="aviso--en-linea">
          {avisoDeEscenario}
        </Aviso>
      ) : null}
    </section>
  )
}

/** La tasa de llegadas λ. */
function Llegadas() {
  const parametros = useSimulacion((estado) => estado.parametros)
  const cambiarParametro = useSimulacion((estado) => estado.cambiarParametro)
  return (
    <section className="seccion" aria-labelledby="ajustes-llegadas">
      <header className="seccion-cabecera">
        <h3 id="ajustes-llegadas">
          Llegadas (<span className="sin-mayusculas">λ</span>)
        </h3>
      </header>
      <CampoNumerico
        etiqueta="Motos por hora"
        valor={parametros.llegadasPorHora}
        rango={RANGOS.llegadas}
        alAplicar={(valor) => cambiarParametro('llegadasPorHora', valor)}
      />
    </section>
  )
}

/** La etapa 1: el tiempo de lavado y las placas. */
function EtapaDeLavado() {
  const parametros = useSimulacion((estado) => estado.parametros)
  const cambiarParametro = useSimulacion((estado) => estado.cambiarParametro)
  const calculado = metricasCalculadas(parametros)

  return (
    <section className="seccion seccion--etapa-1" aria-labelledby="ajustes-etapa-1">
      <header className="seccion-cabecera">
        <h3 id="ajustes-etapa-1">Etapa 1 · Lavado</h3>
        <span className="cifra-rho cifra-rho--etapa-1">
          ρ₁ = {comoNumero(calculado.lavado.rho, 4)}
        </span>
      </header>
      <CampoNumerico
        etiqueta="Tiempo medio de lavado"
        valor={parametros.lavadoMin}
        rango={RANGOS.lavado}
        alAplicar={(valor) => cambiarParametro('lavadoMin', valor)}
      />
      <p className="calculado">
        μ₁ = {comoNumero(calculado.servicioLavadoPorHora, 4)} motos/h por placa
      </p>
      <div className="control">
        <span className="control-nombre">Placas</span>
        <GrupoDeBotones
          etiqueta="Placas de lavado"
          opciones={PLACAS_POSIBLES.map((placas) => ({ valor: placas, texto: String(placas) }))}
          valor={parametros.placas}
          alElegir={(placas) => cambiarParametro('placas', placas)}
        />
      </div>
    </section>
  )
}

/** La etapa 2: el tiempo de cada plan, los puestos y el modo de acabado. */
function EtapaDeAcabado() {
  const parametros = useSimulacion((estado) => estado.parametros)
  const cambiarParametro = useSimulacion((estado) => estado.cambiarParametro)
  const cambiarAcabadoDePlan = useSimulacion((estado) => estado.cambiarAcabadoDePlan)
  const calculado = metricasCalculadas(parametros)
  const rho = calculado.acabado.rho
  const satura = rho >= 1

  return (
    <section className="seccion seccion--etapa-2" aria-labelledby="ajustes-etapa-2">
      <header className="seccion-cabecera">
        <h3 id="ajustes-etapa-2">Etapa 2 · Acabado</h3>
        <span className={satura ? 'cifra-rho cifra-rho--satura' : 'cifra-rho cifra-rho--etapa-2'}>
          ρ₂ = {comoNumero(rho, 4)}
          {satura ? ' · se satura' : ''}
        </span>
      </header>

      <h4 className="subtitulo-de-seccion">Tiempo de acabado por plan</h4>
      <div className="tres-columnas">
        {[1, 2, 3].map((plan) => (
          <CampoNumerico
            key={plan}
            compacto
            etiqueta={NOMBRE_DE_PLAN[plan]}
            valor={parametros.acabadoPlanMin[plan]}
            rango={RANGOS.acabado}
            alAplicar={(valor) => cambiarAcabadoDePlan(plan, valor)}
          />
        ))}
      </div>
      <p className="calculado">
        E[S₂] = {comoNumero(acabadoPromedioDe(parametros), 2)} min · μ₂ ={' '}
        {comoNumero(calculado.servicioAcabadoPorHora, 4)} motos/h por puesto
      </p>

      <div className="control">
        <span className="control-nombre">Puestos</span>
        <GrupoDeBotones
          etiqueta="Puestos de acabado"
          opciones={PUESTOS_POSIBLES.map((puestos) => ({ valor: puestos, texto: String(puestos) }))}
          valor={parametros.puestos}
          alElegir={(puestos) => cambiarParametro('puestos', puestos)}
        />
      </div>

      <div className="control">
        <span className="control-nombre">Cómo se calcula el acabado</span>
        <GrupoDeBotones
          etiqueta="Cómo se calcula el acabado"
          opciones={[
            { valor: MODO_POR_PLAN, texto: 'Según su plan' },
            {
              valor: MODO_MMS,
              texto: 'Un solo promedio (M/M/s)',
              ayuda: 'Usa un único tiempo medio para comparar con las fórmulas.',
            },
          ]}
          valor={parametros.modoAcabado}
          alElegir={(modo) => cambiarParametro('modoAcabado', modo)}
        />
        {parametros.modoAcabado === MODO_MMS ? (
          <small className="pista">Usa un único tiempo medio para comparar con las fórmulas.</small>
        ) : null}
      </div>
    </section>
  )
}

/** La proporción de motos de cada plan: barra, tres controles y la suma. */
function PlanQueContratan() {
  const parametros = useSimulacion((estado) => estado.parametros)
  const cambiarProporcion = useSimulacion((estado) => estado.cambiarProporcion)
  const proporcion = parametros.proporcionPlan
  const suma = proporcion[1] + proporcion[2] + proporcion[3]

  return (
    <section className="seccion" aria-labelledby="ajustes-plan">
      <header className="seccion-cabecera">
        <h3 id="ajustes-plan">Plan que contratan</h3>
        <span className="cifra-suma">Suma {comoPorcentaje(suma)}</span>
      </header>
      <p className="nota">Las tres proporciones siempre suman 100 %.</p>

      <div className="barra-de-planes" role="img" aria-label="Proporción de cada plan">
        {[1, 2, 3].map((plan) => (
          <span
            key={plan}
            className={`barra-de-planes-tramo barra-de-planes-tramo--plan-${plan}`}
            style={{ flexGrow: proporcion[plan] }}
          />
        ))}
      </div>

      {[1, 2, 3].map((plan) => (
        <CampoNumerico
          key={plan}
          etiqueta={
            <span className="nombre-de-plan">
              <span className={`muestra-de-plan muestra-de-plan--${plan}`} aria-hidden="true" />
              {NOMBRE_DE_PLAN[plan]}
            </span>
          }
          nombreAccesible={`Proporción del ${NOMBRE_DE_PLAN[plan]}`}
          valor={proporcion[plan] * 100}
          rango={RANGOS.proporcion}
          alAplicar={(porcentaje) => cambiarProporcion(plan, porcentaje / 100)}
        />
      ))}
    </section>
  )
}

/** Lo que casi nunca se toca: la semilla, plegada por defecto. */
function Avanzado() {
  const semilla = useSimulacion((estado) => estado.semilla)
  const cambiarSemilla = useSimulacion((estado) => estado.cambiarSemilla)
  return (
    <details className="seccion seccion--avanzado">
      <summary>
        <h3>Avanzado</h3>
      </summary>
      <CampoNumerico
        etiqueta="Semilla"
        valor={semilla}
        rango={RANGOS.semilla}
        conDeslizador={false}
        alAplicar={cambiarSemilla}
        pista="La misma semilla repite la misma simulación."
      />
    </details>
  )
}

/** Todo lo que se puede ajustar, en el orden en que lo recorre una moto. */
export function ContenidoDeAjustes() {
  const enLaVisita = useSimulacion((estado) => estado.modo === MODO_VISITA)
  const aviso = useSimulacion((estado) => estado.aviso)
  const restablecerValores = useSimulacion((estado) => estado.restablecerValores)

  return (
    <div className="ajustes">
      <button
        type="button"
        className="boton-secundario boton-ancho"
        onClick={restablecerValores}
        disabled={enLaVisita}
      >
        Restablecer valores
      </button>

      {enLaVisita ? (
        <Aviso tipo="info" className="aviso--separado">
          En la visita los tiempos <strong>no son aleatorios</strong>: salen de la tabla de la
          visita. Por eso los ajustes están desactivados.
        </Aviso>
      ) : null}

      {/* En la visita todo esto se ve pero no se mueve: los tiempos salen de la
          tabla. Se desactiva en vez de ocultarse para que se vea qué valores se
          recuperan al volver. */}
      <fieldset className="parametros" disabled={enLaVisita}>
        <Escenarios />
        <Llegadas />
        <EtapaDeLavado />
        <EtapaDeAcabado />
        <PlanQueContratan />
        <Avanzado />
      </fieldset>

      {aviso ? (
        <Aviso tipo="info" className="aviso--separado">
          {aviso}
        </Aviso>
      ) : null}
    </div>
  )
}

/** La capa de la izquierda, que se abre encima de la escena. */
export function CapaDeAjustes() {
  const abierta = useInterfaz((estado) => estado.capas.ajustes)
  const cerrarCapa = useInterfaz((estado) => estado.cerrarCapa)
  const { montada, fase } = usePresencia(abierta)
  if (!montada) {
    return null
  }
  return (
    <Capa
      id="capa-de-ajustes"
      lado="izquierda"
      titulo="Ajustes"
      fase={fase}
      alCerrar={() => cerrarCapa('ajustes')}
    >
      <ContenidoDeAjustes />
    </Capa>
  )
}

export default CapaDeAjustes
