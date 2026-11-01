import Aviso from './Aviso.jsx'

/**
 * El aviso que ocupa el lugar de la escena 3D cuando esta no se puede dibujar (un
 * error al dibujarla o la pérdida del contexto gráfico). El resto de la aplicación
 * sigue en pie. Lleva un botón para volver a intentarlo.
 *
 * @param {object} props
 * @param {() => void} props.alReintentar
 */
export function AvisoDeLaEscenaCaida({ alReintentar }) {
  return (
    <section className="escena" aria-label="El lavadero en 3D">
      <Aviso tipo="peligro" role="alert" className="aviso-sin-3d">
        <p className="aviso-sin-3d-texto">
          La vista en 3D se detuvo. Los ajustes, los resultados y las gráficas siguen funcionando.
        </p>
        <button type="button" className="boton-secundario" onClick={alReintentar}>
          Volver a dibujar
        </button>
      </Aviso>
    </section>
  )
}

export default AvisoDeLaEscenaCaida
