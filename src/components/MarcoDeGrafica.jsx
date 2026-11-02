import { useState } from 'react'

import { ILUSTRACIONES } from './IlustracionesDeGraficas.jsx'

/**
 * La tabla de los datos de una gráfica, plegada. Solo se arma cuando alguien la
 * abre: una tabla que nadie mira no cuesta nada, aunque la gráfica se renueve
 * cuatro veces por segundo.
 *
 * @param {object} props
 * @param {() => { columnas: string[], filas: string[][], nota: string|null }} props.tabla
 * @param {boolean} [props.abiertaDeEntrada]
 */
export function TablaDeLosDatos({ tabla, abiertaDeEntrada = false }) {
  const [abierta, setAbierta] = useState(abiertaDeEntrada)
  const datos = abierta ? tabla() : null

  return (
    <details
      className="grafica-datos"
      open={abierta}
      onToggle={(evento) => setAbierta(evento.currentTarget.open)}
    >
      <summary>Ver los datos como tabla</summary>
      {datos ? (
        <>
          <table>
            <thead>
              <tr>
                {datos.columnas.map((columna) => (
                  <th key={columna} scope="col">
                    {columna}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {datos.filas.map((fila, i) => (
                <tr key={i}>
                  {fila.map((celda, j) => (
                    <td key={j}>{celda}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {datos.nota ? <p className="nota">{datos.nota}</p> : null}
        </>
      ) : null}
    </details>
  )
}

/**
 * El marco que comparten todas las gráficas de la pestaña: un `figure` con su
 * título, el dibujo con su descripción de texto para las ayudas técnicas, las
 * notas y la opción de ver los datos como tabla. Mientras no hay datos, en lugar
 * del dibujo va una ilustración sencilla (si se pide) y una sola línea que dice qué falta.
 *
 * @param {object} props
 * @param {string} props.titulo
 * @param {boolean} props.vacia
 * @param {string} props.mensajeVacio lo que falta, en una línea
 * @param {'lineas'|'barras'|'moto'} [props.ilustracion] el dibujo decorativo que acompaña al mensaje cuando no hay datos
 * @param {string} props.descripcion texto alternativo del dibujo
 * @param {string[]} [props.notas]
 * @param {() => object} [props.tabla] arma la tabla de datos; solo se llama abierta
 * @param {boolean} [props.tablaAbiertaDeEntrada]
 * @param {boolean} [props.ancha] ocupa todo el ancho de la cuadrícula
 * @param {import('react').ReactNode} [props.leyenda] la leyenda, bajo el dibujo y fuera de su descripción
 * @param {boolean} [props.altoLibre] el dibujo mide lo que mide su contenido y no el alto fijo
 * @param {import('react').ReactNode} props.children el dibujo
 */
export function MarcoDeGrafica({
  titulo,
  vacia,
  mensajeVacio,
  ilustracion,
  descripcion,
  notas = [],
  tabla,
  tablaAbiertaDeEntrada = false,
  ancha = false,
  altoLibre = false,
  leyenda = null,
  children,
}) {
  const Ilustracion = ILUSTRACIONES[ilustracion]
  return (
    <figure className={ancha ? 'grafica-marco grafica-marco--ancha' : 'grafica-marco'}>
      <figcaption>
        <h3>{titulo}</h3>
      </figcaption>
      {vacia ? (
        <div className="grafica-vacia-marco">
          {Ilustracion ? <Ilustracion /> : null}
          <p className="grafica-vacia">{mensajeVacio}</p>
        </div>
      ) : (
        <>
          <div
            className={altoLibre ? 'grafica-dibujo grafica-dibujo--libre' : 'grafica-dibujo'}
            role="img"
            aria-label={descripcion}
          >
            {children}
          </div>
          {leyenda}
          {notas.map((nota) => (
            <p key={nota} className="nota">
              {nota}
            </p>
          ))}
          {tabla ? <TablaDeLosDatos tabla={tabla} abiertaDeEntrada={tablaAbiertaDeEntrada} /> : null}
        </>
      )}
    </figure>
  )
}

export default MarcoDeGrafica
