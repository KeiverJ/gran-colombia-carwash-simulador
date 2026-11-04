import {
  Area,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { COLOR_DE_SERIE } from '../estilos/colores.js'
import { useExperimentos } from '../store/experimentos.js'
import {
  comoValor,
  descripcionDeLaMedia,
  descripcionDelBarrido,
  modeloDeLaMediaAcumulada,
  modeloDelBarrido,
  nombreCortoDeLaMetrica,
  nombreDeLaEtapa,
  OPCIONES_DE_METRICA,
  rotuloDeLaMetrica,
  tablaDeLaMedia,
  tablaDelBarrido,
} from '../store/presentacionDeExperimentos.js'
import { comoNumero } from './formato.js'
import MarcoDeGrafica from './MarcoDeGrafica.jsx'

const TEXTO_DEL_EJE = { fontSize: 12, fill: 'var(--texto-secundario)' }

/** El color de una etapa en las gráficas: el de su fila. */
const COLOR_DE_LA_ETAPA = { lavado: COLOR_DE_SERIE.colaLavado, acabado: COLOR_DE_SERIE.colaAcabado }

const OPCIONES_DE_ETAPA = [
  { valor: 'lavado', texto: nombreDeLaEtapa('lavado') },
  { valor: 'acabado', texto: nombreDeLaEtapa('acabado') },
]

/** Dos listas para elegir la etapa y la métrica que se dibujan. */
export function SelectorDeLaMetrica({ elegida, alElegir, etiqueta }) {
  return (
    <div className="experimentos-selector" role="group" aria-label={etiqueta}>
      <label>
        Etapa{' '}
        <select value={elegida.etapa} onChange={(evento) => alElegir({ etapa: evento.target.value })}>
          {OPCIONES_DE_ETAPA.map((o) => (
            <option key={o.valor} value={o.valor}>
              {o.texto}
            </option>
          ))}
        </select>
      </label>
      <label>
        Métrica{' '}
        <select value={elegida.clave} onChange={(evento) => alElegir({ clave: evento.target.value })}>
          {OPCIONES_DE_METRICA.map((o) => (
            <option key={o.valor} value={o.valor}>
              {o.texto}
            </option>
          ))}
        </select>
      </label>
    </div>
  )
}

/** El valor crítico (donde ρ = 1), siempre con dos decimales: 11,34 y no 11,3. */
const comoCritico = (valor) => comoNumero(valor, 2)

/** El valor de un tick de un parámetro (los enteros sin decimales). */
const comoParametro = (parametro) => (valor) =>
  comoNumero(valor, parametro === 'placas' || parametro === 'puestos' ? 0 : 1)

/**
 * La gráfica del barrido: el promedio simulado, la franja plana de su intervalo del
 * 95 % y la curva de las fórmulas, con la zona inestable marcada. Debajo, la misma
 * información en una tabla.
 *
 * @param {{ resultados: object }} props lo que devuelve `armarResultados` para un barrido
 */
export function GraficaDelBarrido({ resultados }) {
  const elegida = useExperimentos((e) => e.grafica)
  const cambiarGrafica = useExperimentos((e) => e.cambiarGrafica)
  const modelo = modeloDelBarrido(resultados, elegida)
  const color = COLOR_DE_LA_ETAPA[elegida.etapa]
  const tabla = tablaDelBarrido(modelo)
  const rotuloX = `${modelo.textoDelParametro} (${modelo.unidad})`

  return (
    <div className="experimentos-grafica">
      <SelectorDeLaMetrica elegida={elegida} alElegir={cambiarGrafica} etiqueta="Métrica de la gráfica del barrido" />
      <MarcoDeGrafica
        titulo={`${rotuloDeLaMetrica(elegida.clave)} de la ${nombreDeLaEtapa(elegida.etapa)} contra ${modelo.textoDelParametro}`}
        vacia={!modelo.hayDatos}
        mensajeVacio="Todavía no hay valores terminados."
        ilustracion="lineas"
        descripcion={descripcionDelBarrido(modelo)}
        notas={[
          modelo.hayInestables
            ? modelo.critico !== null
              ? `La etapa se satura (ρ = 1) en ${comoCritico(modelo.critico)} ${modelo.unidad}; la zona sombreada es inestable y no tiene franja ni curva de fórmulas.`
              : 'Los valores con la etapa inestable (ρ ≥ 1) no llevan franja ni curva de fórmulas.'
            : 'En todo el rango la etapa es estable.',
        ]}
        ancha
      >
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={modelo.filas} margin={{ top: 8, right: 16, bottom: 24, left: 8 }}>
            <CartesianGrid stroke="var(--borde)" strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="valor"
              type="number"
              domain={['dataMin', 'dataMax']}
              tickFormatter={comoParametro(modelo.parametro)}
              stroke="var(--texto-secundario)"
              tick={TEXTO_DEL_EJE}
              label={{ value: rotuloX, position: 'insideBottom', offset: -12, ...TEXTO_DEL_EJE }}
            />
            <YAxis
              width={72}
              stroke="var(--texto-secundario)"
              tick={TEXTO_DEL_EJE}
              tickFormatter={(valor) => comoValor(elegida.clave, valor)}
              label={{ value: rotuloDeLaMetrica(elegida.clave), angle: -90, position: 'insideLeft', ...TEXTO_DEL_EJE }}
            />
            <Tooltip
              formatter={(valor, nombre) =>
                Array.isArray(valor)
                  ? [`${comoValor(elegida.clave, valor[0])} a ${comoValor(elegida.clave, valor[1])}`, nombre]
                  : [comoValor(elegida.clave, valor), nombre]
              }
              labelFormatter={(valor) => `${modelo.textoDelParametro}: ${comoParametro(modelo.parametro)(valor)} ${modelo.unidad}`}
            />
            <Legend verticalAlign="top" height={28} />
            {modelo.tramosInestables.map((tramo, i) => (
              <ReferenceArea
                key={i}
                x1={tramo.x1}
                x2={tramo.x2}
                fill="var(--peligro-fondo)"
                stroke="none"
                ifOverflow="visible"
              />
            ))}
            {modelo.critico !== null ? (
              <ReferenceLine
                x={modelo.critico}
                stroke="var(--peligro)"
                strokeDasharray="4 3"
                label={{ value: `ρ = 1 en ${comoCritico(modelo.critico)}`, position: 'insideTopRight', fill: 'var(--peligro)', fontSize: 12 }}
              />
            ) : null}
            {/* Una franja plana, sin degradado: es el intervalo del 95 % de cada promedio. */}
            <Area
              type="monotone"
              dataKey="banda"
              name="Intervalo del 95 %"
              stroke="none"
              fill={color}
              fillOpacity={0.2}
              connectNulls={false}
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="formula"
              name="Fórmulas"
              stroke="var(--texto)"
              strokeWidth={2}
              strokeDasharray="6 3"
              dot={false}
              connectNulls={false}
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="promedioEstable"
              name="Promedio simulado"
              stroke={color}
              strokeWidth={2}
              dot={{ r: 3 }}
              connectNulls={false}
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="promedioInestable"
              name="Promedio sin estabilizarse"
              stroke={color}
              strokeWidth={2}
              strokeDasharray="2 4"
              dot={{ r: 2 }}
              connectNulls={false}
              isAnimationActive={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </MarcoDeGrafica>

      <div className="metricas">
        <h3>Valores del barrido</h3>
        <div className="tabla-ancha" role="region" tabIndex={0} aria-label="Tabla: valores del barrido">
          <table>
            <caption className="solo-lectores">
              {rotuloDeLaMetrica(elegida.clave)} de la {nombreDeLaEtapa(elegida.etapa)} para cada valor de {modelo.textoDelParametro}
            </caption>
            <thead>
              <tr>
                {tabla.columnas.map((columna) => (
                  <th scope="col" key={columna}>
                    {columna}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tabla.filas.map((fila, i) => (
                <tr key={modelo.filas[i].valor}>
                  <th scope="row" className="texto">{fila[0]}</th>
                  {fila.slice(1).map((celda, j) => (
                    <td key={j} className={j === 3 ? `texto ${modelo.filas[i].estable ? '' : 'estado-inestable'}` : 'numero'} data-etiqueta={tabla.columnas[j + 1]}>
                      {celda}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

/**
 * La media acumulada de una métrica a lo largo de la corrida de observación (sin
 * calentamiento): se ve dónde se estabiliza. Cambiar de métrica no corre nada.
 *
 * @param {{ resultados: object }} props lo que devuelve `armarResultados` con `observacion`
 */
export function GraficaDeLaMediaAcumulada({ resultados }) {
  const elegida = useExperimentos((e) => e.serie)
  const cambiarSerie = useExperimentos((e) => e.cambiarSerie)
  const modelo = modeloDeLaMediaAcumulada(resultados, elegida)
  if (!modelo) return null
  const color = COLOR_DE_LA_ETAPA[elegida.etapa]

  return (
    <div className="experimentos-grafica">
      <SelectorDeLaMetrica elegida={elegida} alElegir={cambiarSerie} etiqueta="Métrica de la media acumulada" />
      <MarcoDeGrafica
        titulo={`Media acumulada de ${nombreCortoDeLaMetrica(elegida.clave)} de la ${nombreDeLaEtapa(elegida.etapa)}`}
        vacia={modelo.puntos.length === 0}
        mensajeVacio="Todavía no hay datos."
        ilustracion="lineas"
        descripcion={descripcionDeLaMedia(modelo)}
        notas={[
          modelo.estable
            ? 'La línea punteada es el valor de las fórmulas. Se ve desde qué hora la media se asienta cerca de él.'
            : 'La etapa es inestable: la media no se estabiliza y no hay línea de fórmulas.',
        ]}
        tabla={() => tablaDeLaMedia(modelo)}
        ancha
      >
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={modelo.puntos} margin={{ top: 8, right: 16, bottom: 24, left: 8 }}>
            <CartesianGrid stroke="var(--borde)" strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="horas"
              type="number"
              domain={[0, 'dataMax']}
              tickFormatter={(h) => comoNumero(h, h >= 100 ? 0 : 1)}
              stroke="var(--texto-secundario)"
              tick={TEXTO_DEL_EJE}
              label={{ value: 'horas simuladas', position: 'insideBottom', offset: -12, ...TEXTO_DEL_EJE }}
            />
            <YAxis
              width={72}
              stroke="var(--texto-secundario)"
              tick={TEXTO_DEL_EJE}
              tickFormatter={(valor) => comoValor(elegida.clave, valor)}
              domain={['auto', 'auto']}
              label={{ value: rotuloDeLaMetrica(elegida.clave), angle: -90, position: 'insideLeft', ...TEXTO_DEL_EJE }}
            />
            <Tooltip
              formatter={(valor) => [comoValor(elegida.clave, valor), 'Media acumulada']}
              labelFormatter={(h) => `${comoNumero(h, h >= 100 ? 0 : 1)} h simuladas`}
            />
            <Legend verticalAlign="top" height={28} />
            {modelo.calentamientoHoras > 0 ? (
              <ReferenceLine
                x={modelo.calentamientoHoras}
                stroke="var(--texto-tenue)"
                strokeDasharray="4 3"
                label={{ value: 'fin del calentamiento', position: 'insideTopRight', fill: 'var(--texto-secundario)', fontSize: 12 }}
              />
            ) : null}
            {modelo.formula !== null ? (
              <ReferenceLine
                y={modelo.formula}
                stroke="var(--texto)"
                strokeDasharray="6 3"
                strokeWidth={2}
                label={{ value: 'fórmulas', position: 'insideBottomRight', fill: 'var(--texto)', fontSize: 12 }}
              />
            ) : null}
            <Line
              type="monotone"
              dataKey="valor"
              name="Media acumulada"
              stroke={color}
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </MarcoDeGrafica>
    </div>
  )
}
