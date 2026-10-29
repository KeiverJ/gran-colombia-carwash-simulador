import { Bar, BarChart, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

import { ROTULO_SIN_PUESTO } from '../store/tiemposDeLaVisita.js'
import { comoNumero } from './formato.js'
import MarcoDeGrafica from './MarcoDeGrafica.jsx'
import { MuestraDeLaLeyenda, TRAMA_SIN_PUESTO } from './TramasDeLasGraficas.jsx'

const TEXTO_DEL_EJE = { fontSize: 12, fill: 'var(--texto-secundario)' }
const COLOR_DE_LA_BARRA = 'var(--texto-tenue)'
const RELLENO_SIN_PUESTO = `url(#${TRAMA_SIN_PUESTO})`

const conMinutos = (minutos) => `${comoNumero(minutos, 2)} min`

/**
 * «Tiempo de cada moto en el lavadero» (solo en la visita): una barra por moto,
 * de la llegada a la salida, que aparece cuando la moto sale. Las que salieron
 * desde la fila 2 sin puesto llevan trama y el rótulo escrito.
 *
 * @param {object} props
 * @param {object} props.modelo el de `modelosDeLasGraficas` con id «motos»
 */
export function GraficaDeLasMotos({ modelo }) {
  const sinPuesto = modelo.motos.filter((moto) => moto.sinPuesto).map((moto) => moto.n)
  const notas =
    sinPuesto.length > 0
      ? [
          `Con trama, ${sinPuesto.map((n) => `moto ${n}`).join(' y ')}: ${ROTULO_SIN_PUESTO}.`,
        ]
      : []

  return (
    <MarcoDeGrafica
      titulo={modelo.titulo}
      vacia={modelo.vacia}
      mensajeVacio={modelo.mensajeVacio}
      descripcion={modelo.descripcion}
      notas={notas}
      tabla={modelo.tabla}
      leyenda={
        sinPuesto.length > 0 ? (
          <ul className="grafica-leyenda">
            <li>
              <MuestraDeLaLeyenda relleno={COLOR_DE_LA_BARRA} />
              Moto con puesto
            </li>
            <li>
              <MuestraDeLaLeyenda relleno={RELLENO_SIN_PUESTO} />
              Moto que {ROTULO_SIN_PUESTO}
            </li>
          </ul>
        ) : null
      }
      ancha
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={modelo.motos} margin={{ top: 16, right: 16, bottom: 24, left: 0 }}>
          <XAxis
            dataKey="n"
            interval={0}
            stroke="var(--texto-secundario)"
            tick={TEXTO_DEL_EJE}
            label={{ value: 'número de moto', position: 'insideBottom', offset: -12, ...TEXTO_DEL_EJE }}
          />
          <YAxis
            stroke="var(--texto-secundario)"
            tick={TEXTO_DEL_EJE}
            allowDecimals={false}
            label={{ value: 'minutos', angle: -90, position: 'insideLeft', ...TEXTO_DEL_EJE }}
          />
          <Tooltip
            cursor={{ fill: 'var(--seleccion)' }}
            labelFormatter={(n) => `Moto ${n}`}
            formatter={(minutos, _nombre, elemento) => [
              conMinutos(minutos),
              elemento.payload.sinPuesto ? `En el lavadero (${ROTULO_SIN_PUESTO})` : 'En el lavadero',
            ]}
          />
          <Bar dataKey="minutos" fill={COLOR_DE_LA_BARRA} isAnimationActive={false}>
            {modelo.motos.map((moto) => (
              <Cell key={moto.n} fill={moto.sinPuesto ? RELLENO_SIN_PUESTO : COLOR_DE_LA_BARRA} />
            ))}
          </Bar>
          {modelo.promedio === null ? null : (
            <ReferenceLine
              y={modelo.promedio}
              stroke="var(--texto)"
              strokeDasharray="4 3"
              label={{
                value: `promedio ${conMinutos(modelo.promedio)}`,
                position: 'insideTopLeft',
                fontSize: 12,
                fill: 'var(--texto)',
              }}
            />
          )}
        </BarChart>
      </ResponsiveContainer>
    </MarcoDeGrafica>
  )
}

export default GraficaDeLasMotos
