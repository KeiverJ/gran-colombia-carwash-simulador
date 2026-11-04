import { useId, useRef, useState } from 'react'

import { comoTextoDelCampo, interpretarNumero, mensajeDeError, valorConPaso } from './campoNumerico.js'

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
 * @param {string} [props.quienSigue] cómo empieza la frase del valor vigente cuando el texto no sirve
 * @param {{ menos: string, mas: string }} [props.pasos] los nombres accesibles de los
 *   botones − y +; si se pasan, el campo lleva esos dos botones a los lados (para
 *   enteros pequeños, como las placas) y se aplica de a uno. El − se desactiva en el
 *   mínimo del rango y el + en el máximo, y entonces el foco pasa al campo.
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
  pasos,
  quienSigue,
}) {
  const idDelCampo = useId()
  const campo = useRef(null)
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
      setEdicion({ ...edicion, error: mensajeDeError(rango, valor, quienSigue) })
      return
    }
    setEdicion(null)
    if (leido.valor !== valor) {
      alAplicar(leido.valor)
    }
  }

  const paso = (sentido) => {
    const nuevo = valorConPaso(valor, rango, sentido)
    // El botón que llega al extremo se desactiva: el foco no se pierde, pasa al campo.
    if (nuevo === rango.minimo || nuevo === rango.maximo) {
      campo.current?.focus()
    }
    setEdicion(null)
    if (nuevo !== valor) {
      alAplicar(nuevo)
    }
  }

  const describedBy = [error ? idDelError : null, pista ? idDeLaPista : null].filter(Boolean).join(' ')

  const caja = (
    <div className={error ? 'campo campo--invalido' : 'campo'}>
      <input
        ref={campo}
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
  )

  return (
    <div className={compacto ? 'control control--compacto' : 'control'}>
      <label className="control-nombre" htmlFor={idDelCampo}>
        {etiqueta}
      </label>
      {pasos ? (
        <div className="campo-con-pasos">
          <button
            type="button"
            className="campo-paso"
            aria-label={pasos.menos}
            disabled={valor <= rango.minimo}
            onClick={() => paso(-1)}
          >
            <span aria-hidden="true">−</span>
          </button>
          {caja}
          <button
            type="button"
            className="campo-paso"
            aria-label={pasos.mas}
            disabled={valor >= rango.maximo}
            onClick={() => paso(1)}
          >
            <span aria-hidden="true">+</span>
          </button>
        </div>
      ) : (
        caja
      )}
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
