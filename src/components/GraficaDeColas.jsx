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
import { comoNumero } from './formato.js'
import MarcoDeGrafica from './MarcoDeGrafica.jsx'

/* Numeradas por etapa: así la leyenda sale en el orden en que la moto las
   recorre, y no en el alfabético, que pondría el acabado primero. */
const NOMBRE_DE_SERIE = {
  colaLavado: '1. Fila del lavado',
  colaAcabado: '2. Fila del acabado',
}

/** Desde cuántas horas simuladas el eje deja los decimales: con cifras grandes estorban. */
const HORAS_SIN_DECIMALES = 100

/** Las horas del eje y del tooltip, a partir de los minutos simulados. */
const comoHoras = (minutos) => {
  const horas = minutos / 60
  return comoNumero(horas, horas > HORAS_SIN_DECIMALES ? 0 : 1)
}

const TEXTO_DEL_EJE = { fontSize: 12, fill: 'var(--texto-secundario)' }

/**
 * La gráfica de las dos filas a lo largo del tiempo simulado.
 *
 * @param {object} props
 * @param {object} props.modelo el de `modelosDeLasGraficas` con id «filas»
 */
export function GraficaDeColas({ modelo }) {
  return (
    <MarcoDeGrafica
      titulo={modelo.titulo}
      vacia={modelo.vacia}
      mensajeVacio={modelo.mensajeVacio}
      descripcion={modelo.descripcion}
      notas={['Motos esperando en cada fila, según avanza el tiempo simulado.']}
      tabla={modelo.tabla}
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={modelo.puntos} margin={{ top: 8, right: 16, bottom: 24, left: 0 }}>
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
            tick={TEXTO_DEL_EJE}
            label={{ value: 'horas simuladas', position: 'insideBottom', offset: -12, ...TEXTO_DEL_EJE }}
          />
          <YAxis
            stroke="var(--texto-secundario)"
            tick={TEXTO_DEL_EJE}
            allowDecimals={false}
            label={{ value: 'motos', angle: -90, position: 'insideLeft', ...TEXTO_DEL_EJE }}
          />
          <Tooltip
            formatter={(valor, nombre) => [`${comoNumero(valor, 0)} motos`, nombre]}
            labelFormatter={(minuto) => `${comoHoras(minuto)} h simuladas`}
          />
          <Legend verticalAlign="top" height={28} />
          {/* La animación de Recharts pelea con una serie que se renueva cuatro
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
    </MarcoDeGrafica>
  )
}

export default GraficaDeColas
