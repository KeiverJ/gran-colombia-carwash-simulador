import LimiteDeError from './LimiteDeError.jsx'

/**
 * El último recurso: si algo de la aplicación entera lanza un error al dibujarse, en
 * lugar de la pantalla en blanco sale un aviso en español con un botón para recargar.
 */
export function LimiteDeLaAplicacion({ children }) {
  return (
    <LimiteDeError
      fallback={() => (
        <main className="aviso-de-la-aplicacion" role="alert">
          <h1>Algo salió mal</h1>
          <p>El simulador se detuvo por un error inesperado. Recarga la página para volver a empezar.</p>
          <button type="button" className="boton-principal" onClick={() => window.location.reload()}>
            Recargar
          </button>
        </main>
      )}
    >
      {children}
    </LimiteDeError>
  )
}

export default LimiteDeLaAplicacion
