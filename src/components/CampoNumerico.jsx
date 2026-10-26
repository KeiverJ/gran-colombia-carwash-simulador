import { useId, useState } from 'react'

import { comoTextoDelCampo, interpretarNumero, mensajeDeError } from './campoNumerico.js'

/**
 * Un valor numérico de Ajustes: un campo donde escribirlo y, debajo, un
 * deslizador para moverlo. Los dos muestran siempre el mismo valor, que viene
 * del store.
 *
 * Mientras se escribe, el campo guarda su propio texto; no toca el store. Se
 * aplica con Enter o al salir del campo, y solo si el texto cambió (entrar y
 * salir sin escribir no redondea un valor con más decimales de los que se
 * ven). Si no es válido, se marca en rojo con su mensaje, no se aplica y la
 * simulación sigue como estaba. Escape vuelve al último valor válido.
 *
 * @param {object} props
 * @param {import('react').ReactNode} props.etiqueta lo que se mide
 * @param {string} [props.nombreAccesible] si la etiqueta no es un texto
 * @param {number} props.valor el valor de ahora, en la unidad del campo
 * @param {{ minimo: number, maximo: number, paso?: number, unidad?: string, entero?: boolean }} props.rango
 * @param {(valor: number) => void} props.alAplicar recibe un valor ya validado
 * @param {boolean} [props.conDeslizador] false para la semilla
 * @param {boolean} [props.compacto] etiqueta arriba y letra chica, para tres en fila
 * @param {string} [props.pista] una explicación corta debajo
 */
export function CampoNumerico({
  etiqueta,
  nombreAccesible,
  valor,
  rango,
  alAplicar,
  conDeslizador = true,
  compacto = false,
  pista,
}) {
  const idDelCampo = useId()
  const idDelError = `${idDelCampo}-error`
  const idDeLaPista = `${idDelCampo}-pista`
  // `base` es el valor que había al empezar a escribir: si el valor cambia por
  // otro lado (el deslizador, un escenario), lo escrito deja de valer.
  const [edicion, setEdicion] = useState(null)

  const editando = edicion !== null && edicion.base === valor
  const texto = editando ? edicion.texto : comoTextoDelCampo(valor)
  const error = editando ? edicion.error : null
  const nombre = nombreAccesible ?? (typeof etiqueta === 'string' ? etiqueta : 'Valor')

  const confirmar = () => {
    if (!editando) {
      return
    }
    const textoDelValor = comoTextoDelCampo(valor)
    if (edicion.texto === textoDelValor) {
      setEdicion(null)
      return
    }
    const leido = interpretarNumero(edicion.texto, rango)
    if (!leido.valido) {
      setEdicion({ ...edicion, error: mensajeDeError(rango, valor) })
      return
    }
    setEdicion(null)
    if (leido.valor !== valor) {
      alAplicar(leido.valor)
    }
  }

  const describedBy = [error ? idDelError : null, pista ? idDeLaPista : null].filter(Boolean).join(' ')

  return (
    <div className={compacto ? 'control control--compacto' : 'control'}>
      <label className="control-nombre" htmlFor={idDelCampo}>
        {etiqueta}
      </label>
      <div className={error ? 'campo campo--invalido' : 'campo'}>
        <input
          id={idDelCampo}
          type="text"
          inputMode={rango.entero ? 'numeric' : 'decimal'}
          autoComplete="off"
          spellCheck={false}
          value={texto}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={describedBy || undefined}
          onChange={(evento) => setEdicion({ texto: evento.target.value, base: valor, error: null })}
          onBlur={confirmar}
          onKeyDown={(evento) => {
            if (evento.key === 'Enter') {
              evento.preventDefault()
              confirmar()
            } else if (evento.key === 'Escape' && editando) {
              evento.preventDefault()
              evento.stopPropagation()
              setEdicion(null)
            }
          }}
        />
        {rango.unidad ? <span className="campo-unidad">{rango.unidad}</span> : null}
      </div>
      {error ? (
        <p id={idDelError} className="campo-error" role="alert">
          {error}
        </p>
      ) : null}
      {conDeslizador ? (
        <input
          type="range"
          className="campo-deslizador"
          min={rango.minimo}
          max={rango.maximo}
          step={rango.paso}
          value={valor}
          aria-label={`${nombre}, deslizador${rango.unidad ? ` (${rango.unidad})` : ''}`}
          onChange={(evento) => alAplicar(Number(evento.target.value))}
        />
      ) : null}
      {pista ? (
        <small id={idDeLaPista} className="pista">
          {pista}
        </small>
      ) : null}
    </div>
  )
}

export default CampoNumerico
