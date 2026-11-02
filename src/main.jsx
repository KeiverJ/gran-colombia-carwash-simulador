import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './estilos/fuentes.css'
import './index.css'
import App from './App.jsx'
import LimiteDeLaAplicacion from './components/LimiteDeLaAplicacion.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <LimiteDeLaAplicacion>
      <App />
    </LimiteDeLaAplicacion>
  </StrictMode>,
)
