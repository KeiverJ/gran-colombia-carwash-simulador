import { useSimulacion } from '../store/simulacion.js'
import { comoNumero } from './formato.js'

/**
 * El aviso discreto que flota sobre la escena mientras corre la corrida larga en
 * cámara rápida: cuántas horas lleva de cuántas, una barra de progreso y el botón
 * Cancelar. Si la corrida larga corre sin cámara (movimiento reducido), no hay
 * escena que mirar y el progreso se ve en la tabla de resultados.
 *
 * Lo que se lee en voz alta es una sola frase fija; las cifras que cambian en cada
 * cuadro quedan fuera de lo que anuncia el lector de pantalla.
 */
export function AvisoDeCorridaLarga() {
  const corridaLarga = useSimulacion((estado) => estado.corridaLarga)
  const cancelarCorridaLarga = useSimulacion((estado) => estado.cancelarCorridaLarga)

  if (!corridaLarga?.camaraRapida) {
    return null
  }
  const { horasHechas, horasTotales } = corridaLarga

  return (
    <div className="aviso-de-corrida-larga">
      <span className="solo-lectores" role="status">
        Corrida larga en marcha
      </span>
      <p className="corrida-larga-texto" aria-hidden="true">
        Corrida larga · {comoNumero(horasHechas, 0)} h de {comoNumero(horasTotales, 0)} h
      </p>
      <div
        className="corrida-larga-barra"
        role="progressbar"
        aria-label="Avance de la corrida larga"
        aria-valuemin={0}
        aria-valuemax={horasTotales}
        aria-valuenow={horasHechas}
      >
        <div
          className="corrida-larga-relleno"
          style={{ '--avance': Math.min(1, horasHechas / horasTotales) }}
        />
      </div>
      <button type="button" className="boton-secundario" onClick={cancelarCorridaLarga}>
        Cancelar
      </button>
    </div>
  )
}

export default AvisoDeCorridaLarga
