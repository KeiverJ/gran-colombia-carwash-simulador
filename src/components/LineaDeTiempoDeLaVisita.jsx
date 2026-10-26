import { INICIO_OBSERVACION_MIN, MOTOS_VISITA } from '../data/visita.js'
import { MODO_VISITA, useSimulacion } from '../store/simulacion.js'
import Aviso from './Aviso.jsx'
import { comoHoraDeLaTarde } from './formato.js'

/** Cuánto dura la visita en minutos: de las 3:10 al fin del acabado de la última moto. */
const DURACION_DE_LA_VISITA_MIN =
  Math.max(...MOTOS_VISITA.map((moto) => moto.finAcabadoMin)) - INICIO_OBSERVACION_MIN

/** Las horas que se rotulan sobre la línea, en minutos desde las 3:10. */
const MARCAS_MIN = [0, 30, 60, 90, 120, DURACION_DE_LA_VISITA_MIN]

const aPorcentaje = (minutos) => `${(Math.min(minutos, DURACION_DE_LA_VISITA_MIN) / DURACION_DE_LA_VISITA_MIN) * 100}%`

/**
 * La línea de tiempo del modo visita, debajo de la escena: de las 3:10 a las
 * 5:30 p. m., con una marca en la hora que se está reproduciendo y la nota de
 * que las horas son reales y los puestos de acabado se asignan de forma
 * aproximada. Al terminar la visita, el aviso de fin con el botón para volver.
 */
export function LineaDeTiempoDeLaVisita() {
  const enLaVisita = useSimulacion((estado) => estado.modo === MODO_VISITA)
  const terminada = useSimulacion((estado) => estado.visita?.terminada === true)
  const relojMin = useSimulacion((estado) => estado.resumen.relojMin)
  const volverAlModoNormal = useSimulacion((estado) => estado.volverAlModoNormal)

  if (!enLaVisita) {
    return null
  }
  const avance = Math.min(relojMin, DURACION_DE_LA_VISITA_MIN)

  return (
    <section className="linea-de-tiempo" aria-label="Línea de tiempo de la visita">
      <div
        className="linea-pista"
        role="progressbar"
        aria-label="Hora de la visita"
        aria-valuemin={0}
        aria-valuemax={DURACION_DE_LA_VISITA_MIN}
        aria-valuenow={Math.floor(avance)}
        aria-valuetext={comoHoraDeLaTarde(avance)}
      >
        <div className="linea-relleno" style={{ width: aPorcentaje(avance) }} />
        <div className="linea-marca" style={{ left: aPorcentaje(avance) }} />
      </div>

      <ol className="linea-horas" aria-hidden="true">
        {MARCAS_MIN.map((minutos) => (
          <li key={minutos} style={{ left: aPorcentaje(minutos) }}>
            {comoHoraDeLaTarde(minutos)}
          </li>
        ))}
      </ol>

      <p className="linea-nota">
        Reproducción con horas reales · puestos de acabado asignados de forma aproximada
      </p>

      {terminada ? (
        <Aviso tipo="info" role="status" className="aviso--visita-terminada">
          <p>
            <strong>La visita terminó.</strong> Salieron las 23 motos a las 5:30 p. m.
          </p>
          <button type="button" className="boton-secundario" onClick={volverAlModoNormal}>
            Volver al modo normal
          </button>
        </Aviso>
      ) : null}
    </section>
  )
}

export default LineaDeTiempoDeLaVisita
