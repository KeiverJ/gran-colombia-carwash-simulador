import { useMemo } from 'react'

import { modelosDeLasGraficas } from '../store/instantaneaDeLasGraficas.js'
import GraficaDeColas from './GraficaDeColas.jsx'
import GraficaDeLasMotos from './GraficaDeLasMotos.jsx'
import GraficaDeOcupacion from './GraficaDeOcupacion.jsx'
import GraficaDeTiempos from './GraficaDeTiempos.jsx'
import { TramasDeLasGraficas } from './TramasDeLasGraficas.jsx'
import { useInstantaneaDeLasGraficas } from './useInstantaneaDeLasGraficas.js'

const COMPONENTE_DE_CADA_GRAFICA = {
  filas: GraficaDeColas,
  ocupacion: GraficaDeOcupacion,
  desglose: GraficaDeTiempos,
  motos: GraficaDeLasMotos,
}

/**
 * La pestaña Gráficas: las gráficas del modo en una cuadrícula que pasa a dos
 * columnas cuando el panel es lo bastante ancho. Se desplaza dentro del panel.
 * Lee una instantánea que se renueva como mucho cuatro veces por segundo.
 */
export function PestanaDeGraficas() {
  const instantanea = useInstantaneaDeLasGraficas()
  const modelos = useMemo(() => modelosDeLasGraficas(instantanea), [instantanea])

  return (
    <div className="pestana-de-graficas">
      <TramasDeLasGraficas />
      <div className="graficas-cuadricula">
        {modelos.map((modelo) => {
          const Grafica = COMPONENTE_DE_CADA_GRAFICA[modelo.id]
          return <Grafica key={modelo.id} modelo={modelo} />
        })}
      </div>
    </div>
  )
}

export default PestanaDeGraficas
