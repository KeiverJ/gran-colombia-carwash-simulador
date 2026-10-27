import { useEffect, useId, useRef, useState } from 'react'

/**
 * Un botón que, antes de hacer lo que hace, pide confirmar en un recuadro
 * pequeño pegado a él (no es `window.confirm`): dice qué va a pasar y ofrece
 * "Cancelar" y la acción con su nombre.
 *
 * El foco pasa a "Cancelar" (lo seguro es lo primero), Escape cierra el
 * recuadro y devuelve el foco al botón —sin cerrar también las capas—, y un
 * clic fuera también lo cierra. Con `necesitaConfirmacion` en falso el botón
 * actúa de inmediato, como uno cualquiera.
 *
 * @param {object} props
 * @param {string} [props.className] las clases del botón
 * @param {boolean} [props.disabled]
 * @param {boolean} [props.necesitaConfirmacion] si pide confirmar (por defecto, sí)
 * @param {string} props.pregunta lo que va a pasar, en una frase
 * @param {string} props.textoDeLaAccion el nombre de la acción en el botón de confirmar
 * @param {() => void} props.alConfirmar
 * @param {'abajo'|'arriba'} [props.lado] de qué lado del botón sale el recuadro
 * @param {boolean} [props.ancha] si el botón ocupa todo el ancho
 */
export function BotonConConfirmacion({
  className = '',
  disabled = false,
  necesitaConfirmacion = true,
  pregunta,
  textoDeLaAccion,
  alConfirmar,
  lado = 'abajo',
  ancha = false,
  children,
}) {
  const [abierta, setAbierta] = useState(false)
  const raiz = useRef(null)
  const boton = useRef(null)
  const cancelar = useRef(null)
  const idDelRecuadro = useId()
  const visible = abierta && !disabled

  useEffect(() => {
    if (!visible) {
      return undefined
    }
    cancelar.current?.focus()
    const alPulsarUnaTecla = (evento) => {
      if (evento.key === 'Escape') {
        // En el documento, antes de que llegue a la ventana, donde otro oyente
        // cerraría la capa que se abrió última.
        evento.stopPropagation()
        setAbierta(false)
        boton.current?.focus()
      }
    }
    const alPulsarFuera = (evento) => {
      if (raiz.current && !raiz.current.contains(evento.target)) {
        setAbierta(false)
      }
    }
    document.addEventListener('keydown', alPulsarUnaTecla)
    document.addEventListener('pointerdown', alPulsarFuera)
    return () => {
      document.removeEventListener('keydown', alPulsarUnaTecla)
      document.removeEventListener('pointerdown', alPulsarFuera)
    }
  }, [visible])

  const alPulsarElBoton = () => {
    if (!necesitaConfirmacion) {
      alConfirmar()
      return
    }
    setAbierta((valor) => !valor)
  }

  const alConfirmarLaAccion = () => {
    setAbierta(false)
    boton.current?.focus()
    alConfirmar()
  }

  return (
    <div
      className={ancha ? 'confirmacion-envoltura confirmacion-envoltura--ancha' : 'confirmacion-envoltura'}
      ref={raiz}
    >
      <button
        ref={boton}
        type="button"
        className={className}
        disabled={disabled}
        aria-haspopup={necesitaConfirmacion ? 'true' : undefined}
        aria-expanded={necesitaConfirmacion ? visible : undefined}
        aria-controls={visible ? idDelRecuadro : undefined}
        onClick={alPulsarElBoton}
      >
        {children}
      </button>
      {visible ? (
        <div
          id={idDelRecuadro}
          className={`confirmacion confirmacion--${lado}`}
          role="group"
          aria-label="Confirmar"
        >
          <p className="confirmacion-pregunta">{pregunta}</p>
          <div className="confirmacion-botones">
            <button ref={cancelar} type="button" className="boton-secundario" onClick={() => setAbierta(false)}>
              Cancelar
            </button>
            <button type="button" className="boton-principal" onClick={alConfirmarLaAccion}>
              {textoDeLaAccion}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default BotonConConfirmacion
