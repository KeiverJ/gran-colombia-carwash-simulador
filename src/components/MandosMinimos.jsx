import { MODO_VISITA, useSimulacion } from '../store/simulacion.js'
import { comoHoraDeLaTarde, comoReloj } from './formato.js'
import { IconoDeReiniciar } from './iconos.jsx'

/**
 * Los mandos mínimos de la escena: iniciar o pausar, reiniciar y la hora.
 *
 * Solo se ven a pantalla completa (y en el modo expandido de respaldo): ahí la
 * barra superior queda fuera del elemento que se agranda, y sin esto no habría
 * cómo pausar. El resto del tiempo están ocultos por CSS.
 */
export function MandosMinimos() {
  const corriendo = useSimulacion((estado) => estado.corriendo)
  const enLaVisita = useSimulacion((estado) => estado.modo === MODO_VISITA)
  const relojMin = useSimulacion((estado) => estado.resumen.relojMin)
  const iniciar = useSimulacion((estado) => estado.iniciar)
  const pausar = useSimulacion((estado) => estado.pausar)
  const reiniciar = useSimulacion((estado) => estado.reiniciar)

  return (
    <div className="mandos-minimos" role="group" aria-label="Mandos de la simulación">
      <button type="button" className="boton-barra" onClick={() => reiniciar(null)} aria-label="Reiniciar">
        <IconoDeReiniciar />
      </button>
      {corriendo ? (
        <button type="button" className="boton-principal" onClick={pausar}>
          Pausar
        </button>
      ) : (
        <button type="button" className="boton-principal" onClick={iniciar}>
          Iniciar
        </button>
      )}
      <strong className="mandos-minimos-hora">
        {enLaVisita ? comoHoraDeLaTarde(relojMin) : comoReloj(relojMin)}
      </strong>
    </div>
  )
}

export default MandosMinimos
