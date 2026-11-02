import { IconoDeCerrar } from './iconos.jsx'

/**
 * Una capa lateral: se abre encima de la escena, con sombra, y se cierra con su
 * botón (o con Escape, que atiende el estado de la interfaz). No empuja ni
 * achica nada: está en otro plano.
 *
 * Entra y sale deslizándose desde su lado; la `fase` (de `usePresencia`) pone
 * la clase que el CSS anima con `transform` y `opacity`.
 *
 * @param {object} props
 * @param {string} props.id para enlazarla con su botón de la barra lateral
 * @param {'izquierda'|'derecha'} props.lado
 * @param {string} props.titulo
 * @param {import('react').ComponentType} [props.Icono] ícono decorativo (`aria-hidden`) delante del título
 * @param {'entrando'|'visible'|'saliendo'} props.fase
 * @param {() => void} props.alCerrar
 */
export function Capa({ id, lado, titulo, Icono, fase, alCerrar, children }) {
  return (
    <aside id={id} className={`capa capa--${lado} capa--${fase}`} aria-label={titulo}>
      <header className="capa-cabecera">
        <h2 className="titulo-con-icono">
          {Icono ? <Icono /> : null}
          {titulo}
        </h2>
        <button type="button" className="boton-barra" onClick={alCerrar}>
          <IconoDeCerrar />
          <span>Cerrar</span>
        </button>
      </header>
      <div className="capa-cuerpo">{children}</div>
    </aside>
  )
}

export default Capa
