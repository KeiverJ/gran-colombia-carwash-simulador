import './estilos/tema.css'
import './App.css'
import './components/paneles.css'
import './components/metricas.css'
import './scene/escena.css'

import GraficaDeColas from './components/GraficaDeColas.jsx'
import PanelDeParametros from './components/PanelDeParametros.jsx'
import TablaDeMetricas from './components/TablaDeMetricas.jsx'
import EscenaDelLavadero from './scene/EscenaDelLavadero.jsx'
import { useCicloDeSimulacion } from './store/useCicloDeSimulacion.js'

function App() {
  useCicloDeSimulacion()

  return (
    <main className="pagina">
      <h1>Simulador del lavadero Gran Colombia Car Wash Express</h1>

      <p className="entrada">
        Las motos llegan por la Av. Gran Colombia y la Av. Guaimaral, hacen una
        sola fila para el lavado y después otra para el acabado. Mueve los
        parámetros y mira qué pasa con las filas.
      </p>

      <div className="columnas">
        <PanelDeParametros />
        <div className="principal">
          <EscenaDelLavadero />
          <GraficaDeColas />
          <TablaDeMetricas />
        </div>
      </div>
    </main>
  )
}

export default App
