import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { COLOR_DE_SERIE } from '../estilos/colores.js'
import { useSimulacion } from '../store/simulacion.js'
import { comoNumero } from './formato.js'

/* Numeradas por etapa: así la leyenda sale en el orden en que la moto las
   recorre, y no en el alfabético, que pondría el acabado primero. */
const NOMBRE_DE_SERIE = {
  colaLavado: '1. Fila del lavado',
  colaAcabado: '2. Fila del acabado',
}

/** Las horas del eje, a partir de los minutos simulados. */
const comoHoras = (minutos) => comoNumero(minutos / 60, 1)

/**
 * La gráfica de las dos filas a lo largo del tiempo simulado. Se usa en la
 * franja de debajo de la escena (más baja, sin título) y en la pestaña Gráficas.
 *
 * @param {object} props
 * @param {number|string} [props.alto] alto del dibujo: píxeles, o '100%' para llenar su contenedor
 * @param {boolean} [props.conTitulo]
 */
export function GraficaDeColas({ alto = 260, conTitulo = true }) {
  const puntos = useSimulacion((estado) => estado.puntos)

  if (puntos.length < 2) {
    return (
      <section className="grafica">
        {conTitulo ? <h2>Las dos filas en el tiempo</h2> : null}
        <p className="nota">
          Los datos aparecerán cuando la simulación avance.
        </p>
      </section>
    )
  }

  return (
    <section className="grafica">
      {conTitulo ? <h2>Las dos filas en el tiempo</h2> : null}
      <p className="nota">
        Motos esperando en cada fila, según avanza el tiempo simulado.
      </p>
      <div className="lienzo">
        <ResponsiveContainer width="100%" height={alto}>
          <LineChart data={puntos} margin={{ top: 8, right: 16, bottom: 24, left: 0 }}>
            <CartesianGrid stroke="var(--borde)" strokeDasharray="3 3" vertical={false} />
            {/* El eje tiene que ser numérico: por defecto Recharts reparte los
                puntos a distancias iguales como si fueran categorías, y
                entonces 25 h y 875 h quedarían a un paso, igual que 1.000,2 y
                1.000,5. El eje estaría mintiendo sobre el tiempo. */}
            <XAxis
              dataKey="minuto"
              type="number"
              domain={['dataMin', 'dataMax']}
              tickFormatter={comoHoras}
              stroke="var(--texto-secundario)"
              tick={{ fontSize: 12 }}
              label={{ value: 'horas simuladas', position: 'insideBottom', offset: -12 }}
            />
            <YAxis
              stroke="var(--texto-secundario)"
              tick={{ fontSize: 12 }}
              allowDecimals={false}
              label={{ value: 'motos', angle: -90, position: 'insideLeft' }}
            />
            <Tooltip
              formatter={(valor, nombre) => [`${valor} motos`, nombre]}
              labelFormatter={(minuto) => `${comoHoras(minuto)} h simuladas`}
            />
            <Legend verticalAlign="top" height={28} />
            {/* La animación de Recharts pelea con una serie que cambia cuatro
                veces por segundo: se ve como un temblor. */}
            <Line
              type="monotone"
              dataKey="colaLavado"
              name={NOMBRE_DE_SERIE.colaLavado}
              stroke={COLOR_DE_SERIE.colaLavado}
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="colaAcabado"
              name={NOMBRE_DE_SERIE.colaAcabado}
              stroke={COLOR_DE_SERIE.colaAcabado}
              strokeWidth={3}
              strokeDasharray="6 3"
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  )
}

export default GraficaDeColas
