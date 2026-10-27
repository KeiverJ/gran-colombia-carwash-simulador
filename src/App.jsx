import './estilos/tema.css'
import './components/interfaz.css'
import './components/paneles.css'
import './components/metricas.css'
import './components/visita.css'
import './scene/escena.css'

import BarraLateral from './components/BarraLateral.jsx'
import BarraSuperior from './components/BarraSuperior.jsx'
import HojaInferior from './components/HojaInferior.jsx'
import LineaDeTiempoDeLaVisita from './components/LineaDeTiempoDeLaVisita.jsx'
import RecuadroDeAyuda from './components/RecuadroDeAyuda.jsx'
import ZonaDeEscena from './components/ZonaDeEscena.jsx'
import { useEnlacesDeLaInterfaz } from './store/useEnlacesDeLaInterfaz.js'
import { useCicloDeSimulacion } from './store/useCicloDeSimulacion.js'

/**
 * La aplicación: una rejilla de pantalla completa con la barra superior, la
 * barra lateral y la zona de la escena. La escena ocupa todo lo que dejan las
 * dos barras; la capa de Ajustes y el panel de Resultados se abren encima de ella.
 */
function App() {
  useCicloDeSimulacion()
  useEnlacesDeLaInterfaz()

  return (
    <div className="app">
      <a className="enlace-saltar" href="#contenido-principal">
        Saltar al contenido
      </a>
      <BarraSuperior />
      <BarraLateral />
      <main id="contenido-principal" tabIndex={-1} className="zona-escena">
        <ZonaDeEscena />
        <LineaDeTiempoDeLaVisita />
      </main>
      <HojaInferior />
      <RecuadroDeAyuda />
    </div>
  )
}

export default App
