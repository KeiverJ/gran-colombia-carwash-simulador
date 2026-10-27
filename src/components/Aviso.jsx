import { IconoDeAdvertencia, IconoDeError, IconoDeInformacion } from './iconos.jsx'

const ICONOS = {
  peligro: IconoDeError,
  advertencia: IconoDeAdvertencia,
  info: IconoDeInformacion,
}

/**
 * Un aviso: ícono, fondo suave del color que corresponde, borde fino uniforme y
 * texto en la variante oscura de ese color. Sin franjas a un lado.
 *
 * @param {object} props
 * @param {'peligro'|'advertencia'|'info'} [props.tipo] peligro es saturación o
 *   error; advertencia, algo a tener en cuenta; info, una explicación
 * @param {string} [props.role] "status" o "alert" si el aviso aparece de pronto; con
 *   "status" se anuncia con `aria-live="polite"`, sin interrumpir
 */
export function Aviso({ tipo = 'info', role, className = '', children }) {
  const Icono = ICONOS[tipo] ?? IconoDeInformacion
  return (
    <div
      className={`aviso aviso--${tipo}${className ? ` ${className}` : ''}`}
      role={role}
      aria-live={role === 'status' ? 'polite' : undefined}
    >
      <span className="aviso-icono">
        <Icono />
      </span>
      <div className="aviso-texto">{children}</div>
    </div>
  )
}

export default Aviso
