import { useId } from 'react'

import {
  CALENTAMIENTO_MAXIMO_PCT,
  CALENTAMIENTO_MINIMO_PCT,
  HORAS_POSIBLES,
  horasTotales,
  LOTES_MAXIMOS,
  LOTES_MINIMOS,
  MODO_BARRIDO,
  MODO_ESCENARIOS,
  MODO_LOTES,
  MODO_REPLICAS,
  MODOS,
  NOMBRE_DEL_MODO,
  PARAMETROS_DEL_BARRIDO,
  REPLICAS_MAXIMAS,
  REPLICAS_MINIMAS,
  TOPE_DE_HORAS,
  validarSolicitud,
} from '../experimentos/plan.js'
import { useExperimentos } from '../store/experimentos.js'
import {
  TEXTO_DE_MEDIAS_POR_LOTES,
  TEXTO_DEL_INTERVALO,
} from '../store/presentacionDeExperimentos.js'
import { RANGOS } from '../store/rangos.js'
import { useSimulacion } from '../store/simulacion.js'
import Aviso from './Aviso.jsx'
import { CampoNumerico } from './CampoNumerico.jsx'
import { comoNumero } from './formato.js'
import GrupoDeBotones from './GrupoDeBotones.jsx'

/** El rango de un campo del barrido según el parámetro que se barre. */
function rangoDelBarrido(parametro) {
  const base = {
    llegadasPorHora: RANGOS.llegadas,
    placas: RANGOS.placas,
    puestos: RANGOS.puestos,
    lavadoMin: RANGOS.lavado,
    acabadoMin: RANGOS.acabado,
  }[parametro]
  return { minimo: base.minimo, maximo: base.maximo, entero: Boolean(base.entero), unidad: PARAMETROS_DEL_BARRIDO[parametro].unidad }
}

/** El rango del paso: positivo y, si el parámetro es entero, entero. */
function rangoDelPaso(parametro) {
  const { maximo, entero, unidad } = rangoDelBarrido(parametro)
  return entero ? { minimo: 1, maximo: maximo - 1, entero: true, unidad } : { minimo: 0.01, maximo, entero: false, unidad }
}

const OPCIONES_DE_MODO = MODOS.map((modo) => ({ valor: modo, texto: NOMBRE_DEL_MODO[modo] }))
const OPCIONES_DE_HORAS = HORAS_POSIBLES.map((horas) => ({ valor: horas, texto: `${comoNumero(horas, 0)} h` }))
const OPCIONES_DE_PARAMETRO = Object.entries(PARAMETROS_DEL_BARRIDO).map(([valor, { texto }]) => ({ valor, texto }))

/** Qué se pide en cada modo, para el rótulo del campo de réplicas. */
const ROTULO_DE_LAS_REPLICAS = {
  [MODO_REPLICAS]: 'Réplicas',
  [MODO_BARRIDO]: 'Réplicas por valor',
  [MODO_ESCENARIOS]: 'Réplicas por escenario',
}

/**
 * La explicación de qué es un intervalo de confianza, en el propio módulo. Va
 * abierta: es lo primero que conviene leer.
 */
export function ExplicacionDelIntervalo() {
  return (
    <details className="experimentos-explicacion" open>
      <summary>¿Qué es un intervalo de confianza?</summary>
      {TEXTO_DEL_INTERVALO.map((parrafo) => (
        <p key={parrafo}>{parrafo}</p>
      ))}
    </details>
  )
}

/**
 * La configuración de la vista (columna izquierda): el modo, sus campos, el total de horas y los botones
 * Iniciar y Cancelar. Parte de los valores de Ajustes.
 */
export function FormularioDeExperimentos() {
  const modo = useExperimentos((e) => e.modo)
  const horas = useExperimentos((e) => e.horas)
  const calentamientoPct = useExperimentos((e) => e.calentamientoPct)
  const semillaConfigurada = useExperimentos((e) => e.semillaBase)
  const replicas = useExperimentos((e) => e.replicas)
  const lotes = useExperimentos((e) => e.lotes)
  const barrido = useExperimentos((e) => e.barrido)
  const mediaAcumulada = useExperimentos((e) => e.mediaAcumulada)
  const corriendo = useExperimentos((e) => e.estado === 'corriendo')
  const aviso = useExperimentos((e) => e.aviso)
  const solicitudDelLote = useExperimentos((e) => e.solicitudDelLote)
  const estado = useExperimentos((e) => e.estado)
  const cambiar = useExperimentos((e) => e.cambiarConfiguracion)
  const elegirModo = useExperimentos((e) => e.elegirModo)
  const cambiarBarrido = useExperimentos((e) => e.cambiarBarrido)
  const elegirParametro = useExperimentos((e) => e.elegirParametroDelBarrido)
  const iniciar = useExperimentos((e) => e.iniciar)
  const cancelar = useExperimentos((e) => e.cancelar)
  // Los parámetros de Ajustes de ahora: si cambian, el total y la validación se recalculan.
  const parametros = useSimulacion((s) => s.parametros)
  const semillaDeAjustes = useSimulacion((s) => s.semilla)
  const idDeLaCasilla = useId()

  const semillaBase = semillaConfigurada ?? semillaDeAjustes
  const solicitud = {
    modo,
    parametros,
    semillaBase,
    horas,
    calentamientoPct,
    replicas,
    lotes,
    barrido,
    mediaAcumulada,
  }
  const validacion = validarSolicitud(solicitud)
  const total = horasTotales(solicitud)
  const conMediaAcumulada = modo === MODO_REPLICAS || modo === MODO_LOTES

  return (
    <section className="experimentos-formulario" aria-label="Qué experimento correr">
      <GrupoDeBotones
        etiqueta="Modo de experimento"
        opciones={OPCIONES_DE_MODO}
        valor={modo}
        alElegir={elegirModo}
      />

      {modo === MODO_LOTES ? <p className="experimentos-nota">{TEXTO_DE_MEDIAS_POR_LOTES}</p> : null}

      {modo === MODO_BARRIDO ? (
        <>
          <GrupoDeBotones
            etiqueta="Parámetro que se barre"
            opciones={OPCIONES_DE_PARAMETRO}
            valor={barrido.parametro}
            alElegir={elegirParametro}
          />
          <div className="experimentos-campos">
            <CampoNumerico
              quienSigue="Se queda con"
              etiqueta="Desde"
              valor={barrido.inicio}
              rango={rangoDelBarrido(barrido.parametro)}
              conDeslizador={false}
              alAplicar={(inicio) => cambiarBarrido({ inicio })}
            />
            <CampoNumerico
              quienSigue="Se queda con"
              etiqueta="Hasta"
              valor={barrido.fin}
              rango={rangoDelBarrido(barrido.parametro)}
              conDeslizador={false}
              alAplicar={(fin) => cambiarBarrido({ fin })}
            />
            <CampoNumerico
              quienSigue="Se queda con"
              etiqueta="Paso"
              valor={barrido.paso}
              rango={rangoDelPaso(barrido.parametro)}
              conDeslizador={false}
              alAplicar={(paso) => cambiarBarrido({ paso })}
            />
          </div>
          <p className="experimentos-nota">
            Hasta 30 valores. El tiempo de acabado es el promedio de los tres planes: al moverlo, los planes cambian en la misma proporción.
          </p>
        </>
      ) : null}

      <div className="experimentos-campos">
        {modo === MODO_LOTES ? (
          <CampoNumerico
            quienSigue="Se queda con"
            etiqueta="Lotes"
            valor={lotes}
            rango={{ minimo: LOTES_MINIMOS, maximo: LOTES_MAXIMOS, entero: true, unidad: 'lotes' }}
            conDeslizador={false}
            alAplicar={(valor) => cambiar({ lotes: valor })}
          />
        ) : (
          <CampoNumerico
            quienSigue="Se queda con"
            etiqueta={ROTULO_DE_LAS_REPLICAS[modo]}
            valor={replicas}
            rango={{ minimo: REPLICAS_MINIMAS, maximo: REPLICAS_MAXIMAS, entero: true, unidad: 'réplicas' }}
            conDeslizador={false}
            alAplicar={(valor) => cambiar({ replicas: valor })}
          />
        )}
        <CampoNumerico
          quienSigue="Se queda con"
          etiqueta="Calentamiento"
          valor={calentamientoPct}
          rango={{ minimo: CALENTAMIENTO_MINIMO_PCT, maximo: CALENTAMIENTO_MAXIMO_PCT, entero: false, unidad: '%' }}
          conDeslizador={false}
          alAplicar={(valor) => cambiar({ calentamientoPct: valor })}
        />
        <CampoNumerico
          quienSigue="Se queda con"
          etiqueta="Semilla base"
          valor={semillaBase}
          rango={RANGOS.semilla}
          conDeslizador={false}
          alAplicar={(valor) => cambiar({ semillaBase: valor })}
        />
      </div>
      <p className="experimentos-nota">
        El calentamiento son las {comoNumero((horas * calentamientoPct) / 100, 0)} horas iniciales de cada corrida, que no cuentan para las métricas.
      </p>

      <GrupoDeBotones
        etiqueta={modo === MODO_LOTES ? 'Horas de la corrida' : 'Horas por réplica'}
        opciones={OPCIONES_DE_HORAS}
        valor={horas}
        alElegir={(valor) => cambiar({ horas: valor })}
      />

      {conMediaAcumulada ? (
        <label className="experimentos-casilla" htmlFor={idDeLaCasilla}>
          <input
            id={idDeLaCasilla}
            type="checkbox"
            checked={mediaAcumulada}
            onChange={(evento) => cambiar({ mediaAcumulada: evento.target.checked })}
          />
          Ver media acumulada (una corrida más, de {comoNumero(horas, 0)} h)
        </label>
      ) : null}

      <p className="experimentos-nota" aria-live="polite">
        Total: {comoNumero(total, 0)} horas simuladas (el tope es {comoNumero(TOPE_DE_HORAS, 0)}).
      </p>

      {!validacion.valida ? (
        <Aviso tipo="advertencia" role="status">
          {validacion.mensaje}
        </Aviso>
      ) : null}
      {aviso && estado === 'fallido' && !solicitudDelLote ? (
        <Aviso tipo="peligro" role="alert">
          {aviso}
        </Aviso>
      ) : null}

      <div className="experimentos-acciones">
        <button
          type="button"
          className="boton-principal"
          disabled={corriendo || !validacion.valida}
          onClick={() => iniciar()}
        >
          {corriendo ? 'Corriendo…' : 'Iniciar experimento'}
        </button>
        {corriendo ? (
          <button type="button" className="boton-secundario" onClick={() => cancelar()}>
            Cancelar
          </button>
        ) : null}
      </div>

      <ExplicacionDelIntervalo />
    </section>
  )
}

export default FormularioDeExperimentos
