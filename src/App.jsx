import './App.css'

import {
  LLEGADAS_POR_HORA,
  PLACAS_LAVADO,
  PUESTOS_ACABADO,
} from './data/parametros.js'

const unaCifra = (numero) => numero.toLocaleString('es-CO', { maximumFractionDigits: 4 })

function App() {
  return (
    <main className="pagina">
      <h1>Simulador del lavadero Gran Colombia Car Wash Express</h1>

      <p className="entrada">
        Simula las filas de un lavadero de motos de Cúcuta, en la esquina de la
        Av. Gran Colombia con la Av. Guaimaral: las motos pasan primero por el
        lavado ({PLACAS_LAVADO} placas) y después por el acabado
        ({PUESTOS_ACABADO} puestos).
      </p>

      <p className="dato">
        Con los datos de la visita del 17 de octubre de 2026 llegan{' '}
        <strong>{unaCifra(LLEGADAS_POR_HORA)} motos por hora</strong>.
      </p>

      <p className="aviso">
        Por ahora esta página solo confirma que el proyecto está montado. La
        simulación, el panel de parámetros, las gráficas y la escena en 3D
        llegan en los siguientes pasos.
      </p>
    </main>
  )
}

export default App
