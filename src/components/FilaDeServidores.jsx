import { useId } from 'react'

import { MODO_VISITA, useSimulacion } from '../store/simulacion.js'

/** Cómo se dice cada estado del motor, en femenino (placa) y en masculino (puesto). */
const PALABRA_DEL_ESTADO = {
  placa: { activo: 'abierta', cerrandose: 'cerrándose', cerrado: 'cerrada' },
  puesto: { activo: 'abierto', cerrandose: 'cerrándose', cerrado: 'cerrado' },
}

/** «activo» o «activa» en singular o plural, según el servidor. */
const palabrasActivos = (nombre, cuantos) =>
  `activ${nombre === 'placa' ? 'a' : 'o'}${cuantos === 1 ? '' : 's'}`

/** Por qué no se deja cerrar el último servidor activo. */
const motivoDelUltimo = (nombre) =>
  `Es ${nombre === 'placa' ? 'la única abierta' : 'el único abierto'} de la etapa: no se puede cerrar porque las motos no tendrían dónde atenderse.`

/**
 * La fila de botones para abrir y cerrar cada servidor de una etapa.
 *
 * Un botón por placa o puesto: dice su número y si está abierto, cerrándose o
 * cerrado con palabras (no solo con el color), y al activarlo lo cierra o lo
 * abre. El último servidor activo queda desactivado y explica por qué. Debajo,
 * cuántos hay activos de cuántos y, si hay cerrados, que el ρ calculado de la
 * etapa usa los activos.
 *
 * Lee del `resumen` del store, el mismo estado del que se dibuja la escena, así
 * que ambos quedan sincronizados. En la visita y durante la corrida larga la
 * fila va desactivada (el `fieldset` de Ajustes ya la desactiva) y lo dice.
 *
 * @param {object} props
 * @param {'lavado'|'acabado'} props.etapa
 * @param {'placa'|'puesto'} props.nombre cómo se llama el servidor de la etapa
 */
export function FilaDeServidores({ etapa, nombre }) {
  const estados = useSimulacion((estado) =>
    etapa === 'lavado' ? estado.resumen.estadosDePlacas : estado.resumen.estadosDePuestos,
  )
  const alternarServidor = useSimulacion((estado) => estado.alternarServidor)
  const enLaVisita = useSimulacion((estado) => estado.modo === MODO_VISITA)
  const enCorridaLarga = useSimulacion((estado) => estado.corridaLarga !== null)
  const idDelMotivo = useId()
  const idDeLaFila = useId()

  const palabras = PALABRA_DEL_ESTADO[nombre]
  const activos = estados.filter((estado) => estado === 'activo').length
  const total = estados.length
  const plural = nombre === 'placa' ? 'placas' : 'puestos'
  const sinCambios = enLaVisita || enCorridaLarga

  return (
    <div className="servidores" role="group" aria-labelledby={idDeLaFila}>
      <span id={idDeLaFila} className="servidores-nombre">
        Abrir y cerrar {plural}
      </span>
      <div className="servidores-fila">
        {estados.map((estado, indice) => {
          const esElUltimo = estado === 'activo' && activos === 1
          const palabra = palabras[estado]
          return (
            <button
              key={indice}
              type="button"
              className={`servidor servidor--${estado}`}
              aria-pressed={estado === 'activo'}
              aria-describedby={esElUltimo ? idDelMotivo : undefined}
              disabled={esElUltimo}
              onClick={() => alternarServidor(etapa, indice)}
            >
              <span className="servidor-numero">
                <span className="solo-lectores">{nombre === 'placa' ? 'Placa ' : 'Puesto '}</span>
                {indice + 1}
              </span>
              <span className="servidor-estado">{palabra}</span>
            </button>
          )
        })}
      </div>
      <p className="pista" aria-live="polite">
        {activos} {activos === 1 ? nombre : plural} {palabrasActivos(nombre, activos)} de {total}
        {activos < total ? ` · el ρ calculado de esta etapa usa los ${activos} activos` : ''}
      </p>
      {activos === 1 ? (
        <p id={idDelMotivo} className="pista">
          {motivoDelUltimo(nombre)}
        </p>
      ) : null}
      {sinCambios ? (
        <p className="pista">
          {enLaVisita
            ? 'En la visita no se pueden abrir ni cerrar: se reproduce la tarde tal como ocurrió.'
            : 'Durante la corrida larga no se pueden abrir ni cerrar.'}
        </p>
      ) : null}
    </div>
  )
}

export default FilaDeServidores
