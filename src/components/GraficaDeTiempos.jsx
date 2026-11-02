import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

import { COLOR_DE_OCUPADO } from '../estilos/colores.js'
import { comoNumero } from './formato.js'
import MarcoDeGrafica from './MarcoDeGrafica.jsx'
import { MuestraDeLaLeyenda, TRAMA_DE_ESPERA } from './TramasDeLasGraficas.jsx'

const TEXTO_DEL_EJE = { fontSize: 12, fill: 'var(--texto-secundario)' }

/** Las esperas llevan trama y tono suave; las atenciones, el color liso de su etapa. */
const rellenoDelTramo = (tramo) =>
  tramo.tipo === 'espera' ? `url(#${TRAMA_DE_ESPERA[tramo.etapa]})` : COLOR_DE_OCUPADO[tramo.etapa]

const conMinutos = (minutos) => `${comoNumero(minutos, 2)} min`

/**
 * «En qué se va el tiempo promedio»: una barra apilada con la espera en la fila
 * 1, el lavado, la espera en la fila 2 y el acabado; al lado, la de las fórmulas
 * cuando las dos etapas son estables.
 *
 * @param {object} props
 * @param {object} props.modelo el de `modelosDeLasGraficas` con id «desglose»
 */
export function GraficaDeTiempos({ modelo }) {
  const tramos = modelo.barras[0]?.tramos ?? []
  const datos = modelo.barras.map((barra) => ({
    nombre: `${barra.nombre} · ${conMinutos(barra.total)}`,
    ...Object.fromEntries(barra.tramos.map((tramo) => [tramo.id, tramo.minutos])),
  }))

  return (
    <MarcoDeGrafica
      titulo={modelo.titulo}
      vacia={modelo.vacia}
      mensajeVacio={modelo.mensajeVacio}
      ilustracion="barras"
      descripcion={modelo.descripcion}
      notas={modelo.notas}
      tabla={modelo.tabla}
      leyenda={
        <ul className="grafica-leyenda">
          {tramos.map((tramo) => (
            <li key={tramo.id}>
              <MuestraDeLaLeyenda relleno={rellenoDelTramo(tramo)} />
              {tramo.nombre}
            </li>
          ))}
        </ul>
      }
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={datos} layout="vertical" margin={{ top: 8, right: 16, bottom: 24, left: 0 }}>
          <XAxis
            type="number"
            stroke="var(--texto-secundario)"
            tick={TEXTO_DEL_EJE}
            tickFormatter={(minutos) => comoNumero(minutos, 0)}
            label={{ value: 'minutos', position: 'insideBottom', offset: -12, ...TEXTO_DEL_EJE }}
          />
          <YAxis
            type="category"
            dataKey="nombre"
            width={112}
            stroke="var(--texto-secundario)"
            tick={TEXTO_DEL_EJE}
          />
          <Tooltip
            cursor={{ fill: 'var(--seleccion)' }}
            formatter={(minutos, nombre) => [conMinutos(minutos), nombre]}
            itemSorter={(elemento) => tramos.findIndex((tramo) => tramo.id === elemento.dataKey)}
          />
          {tramos.map((tramo) => (
            <Bar
              key={tramo.id}
              dataKey={tramo.id}
              name={tramo.nombre}
              stackId="tiempo"
              fill={rellenoDelTramo(tramo)}
              stroke="var(--fondo-tarjeta)"
              barSize={28}
              isAnimationActive={false}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </MarcoDeGrafica>
  )
}

export default GraficaDeTiempos
