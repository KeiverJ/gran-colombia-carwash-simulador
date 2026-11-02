import { Bar, BarChart, LabelList, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

import { COLOR_DE_OCUPADO } from '../estilos/colores.js'
import { comoPorcentaje } from './formato.js'
import MarcoDeGrafica from './MarcoDeGrafica.jsx'

const TEXTO_DEL_EJE = { fontSize: 12, fill: 'var(--texto-secundario)' }

/** Alto de cada barra y espacio fijo para el eje y el rótulo del promedio, en píxeles. */
const ALTO_POR_SERVIDOR_PX = 26
const ALTO_FIJO_PX = 64

const comoPorcentajeEntero = (proporcion) => `${Math.round(proporcion * 100)} %`

/** Un bloque: las barras de las placas o las de los puestos, con el promedio de la etapa. */
function BloqueDeOcupacion({ etapa }) {
  const color = COLOR_DE_OCUPADO[etapa.id]
  const alto = ALTO_FIJO_PX + etapa.servidores.length * ALTO_POR_SERVIDOR_PX
  return (
    <div className="grafica-bloque">
      <h4>{etapa.titulo}</h4>
      <div style={{ height: alto }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={etapa.servidores}
            layout="vertical"
            margin={{ top: 16, right: 48, bottom: 20, left: 0 }}
          >
            <XAxis
              type="number"
              domain={[0, 1]}
              ticks={[0, 0.25, 0.5, 0.75, 1]}
              tickFormatter={comoPorcentajeEntero}
              stroke="var(--texto-secundario)"
              tick={TEXTO_DEL_EJE}
              label={{ value: 'tiempo ocupado', position: 'insideBottom', offset: -12, ...TEXTO_DEL_EJE }}
            />
            <YAxis
              type="category"
              dataKey="nombre"
              width={76}
              stroke="var(--texto-secundario)"
              tick={TEXTO_DEL_EJE}
            />
            <Tooltip
              cursor={{ fill: 'var(--seleccion)' }}
              formatter={(proporcion) => [comoPorcentaje(proporcion), 'Ocupado']}
            />
            <Bar dataKey="proporcion" name="Ocupado" fill={color} barSize={14} isAnimationActive={false}>
              <LabelList
                dataKey="proporcion"
                position="right"
                formatter={comoPorcentaje}
                fontSize={12}
                fill="var(--texto)"
              />
            </Bar>
            <ReferenceLine
              x={etapa.promedio}
              stroke="var(--texto)"
              strokeDasharray="4 3"
              label={{
                value: `promedio ${comoPorcentaje(etapa.promedio)}`,
                position: 'top',
                fontSize: 12,
                fill: 'var(--texto)',
              }}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

/**
 * Ocupación de cada placa y de cada puesto, en dos bloques, con el promedio de
 * la etapa (el ρ de la tabla de Métricas).
 *
 * @param {object} props
 * @param {object} props.modelo el de `modelosDeLasGraficas` con id «ocupacion»
 */
export function GraficaDeOcupacion({ modelo }) {
  return (
    <MarcoDeGrafica
      titulo={modelo.titulo}
      vacia={modelo.vacia}
      mensajeVacio={modelo.mensajeVacio}
      ilustracion="barras"
      descripcion={modelo.descripcion}
      notas={modelo.nota ? [modelo.nota] : []}
      tabla={modelo.tabla}
      altoLibre
    >
      <div className="grafica-bloques">
        {modelo.etapas.map((etapa) => (
          <BloqueDeOcupacion key={etapa.id} etapa={etapa} />
        ))}
      </div>
    </MarcoDeGrafica>
  )
}

export default GraficaDeOcupacion
