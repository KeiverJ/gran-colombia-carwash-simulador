import { useEffect, useRef } from 'react'

import { NOMBRE_DE_PLAN } from '../estilos/colores.js'
import { useInterfaz } from '../store/interfaz.js'
import { IconoDeCerrar } from './iconos.jsx'
import { usePresencia } from './usePresencia.js'

/** Lo que se puede enfocar con el teclado dentro del recuadro. */
const ENFOCABLES = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'

/**
 * El recuadro de Ayuda: cómo usar la aplicación, los nombres completos de los
 * planes y qué significa cada vista.
 *
 * Es contenido fijo. Se cierra con el botón, con Escape (lo atiende el estado
 * de la interfaz) y pulsando fuera; mientras está abierto el teclado no sale de
 * él, y al cerrarse el foco vuelve al botón que lo abrió. Abrirlo o cerrarlo no
 * toca la simulación.
 */
export function RecuadroDeAyuda() {
  const abierta = useInterfaz((estado) => estado.ayudaAbierta)
  const cerrarAyuda = useInterfaz((estado) => estado.cerrarAyuda)
  const recuadro = useRef(null)
  const quienLoAbrio = useRef(null)
  const { montada, fase } = usePresencia(abierta, '--duracion-ayuda')

  useEffect(() => {
    if (!abierta || !montada) {
      return undefined
    }
    quienLoAbrio.current = document.activeElement
    recuadro.current?.querySelector('button')?.focus()

    const atraparElFoco = (evento) => {
      if (evento.key !== 'Tab' || !recuadro.current) {
        return
      }
      const enfocables = [...recuadro.current.querySelectorAll(ENFOCABLES)]
      if (enfocables.length === 0) {
        return
      }
      const primero = enfocables[0]
      const ultimo = enfocables[enfocables.length - 1]
      if (evento.shiftKey && document.activeElement === primero) {
        evento.preventDefault()
        ultimo.focus()
      } else if (!evento.shiftKey && document.activeElement === ultimo) {
        evento.preventDefault()
        primero.focus()
      } else if (!recuadro.current.contains(document.activeElement)) {
        evento.preventDefault()
        primero.focus()
      }
    }
    document.addEventListener('keydown', atraparElFoco)
    return () => {
      document.removeEventListener('keydown', atraparElFoco)
      quienLoAbrio.current?.focus?.()
    }
  }, [abierta, montada])

  if (!montada) {
    return null
  }

  return (
    <div
      className={`ayuda-fondo ayuda-fondo--${fase}`}
      onMouseDown={(evento) => {
        if (evento.target === evento.currentTarget) {
          cerrarAyuda()
        }
      }}
    >
      <div
        ref={recuadro}
        className="ayuda"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ayuda-titulo"
      >
        <header className="ayuda-cabecera">
          <h2 id="ayuda-titulo">Ayuda</h2>
          <button type="button" className="boton-barra" onClick={cerrarAyuda}>
            <IconoDeCerrar />
            <span>Cerrar</span>
          </button>
        </header>

        <div className="ayuda-cuerpo">
          <section>
            <h3>Cómo usar la aplicación</h3>
            <ol>
              <li>Elige un escenario o ajusta los valores del lavadero en Ajustes.</li>
              <li>
                Pulsa Iniciar. La velocidad indica cuántos minutos simulados pasan por cada
                segundo real.
              </li>
              <li>Observa la escena y los indicadores que están sobre ella.</li>
              <li>Abre Resultados para ver las métricas y las gráficas de las filas.</li>
              <li>
                Usa la corrida larga para que los valores simulados se acerquen a los calculados
                con las fórmulas.
              </li>
              <li>
                En «Visita del 17 de octubre» se reproduce la tarde observada, con sus horas
                reales.
              </li>
            </ol>
          </section>

          <section>
            <h3>Los tres planes</h3>
            <ul>
              <li>{NOMBRE_DE_PLAN[1]} (esfera sobre la moto).</li>
              <li>{NOMBRE_DE_PLAN[2]} (cubo sobre la moto).</li>
              <li>{NOMBRE_DE_PLAN[3]} (cono sobre la moto).</li>
            </ul>
          </section>

          <section>
            <h3>Qué significa cada vista</h3>
            <ul>
              <li>
                <strong>La escena.</strong> Las motos entran por la Av. Gran Colombia y la Av.
                Guaimaral, forman una sola fila para el lavado, que se hace en las placas de
                delante, y después otra para el acabado, en los puestos del fondo. Una losa plana
                es una placa o un puesto libre; una losa elevada, uno ocupado. Arrastra para girar
                la vista y usa la rueda para acercarte.
              </li>
              <li>
                <strong>Los indicadores.</strong> Placas y puestos ocupados, motos en cada fila y
                motos que ya salieron.
              </li>
              <li>
                <strong>La línea de tiempo.</strong> Solo en la visita: marca la hora de la tarde
                que se está reproduciendo.
              </li>
              <li>
                <strong>Ajustes.</strong> Escenarios, llegadas, etapas del lavadero, plan que
                contratan las motos y semilla.
              </li>
              <li>
                <strong>Resultados.</strong> Métricas (simulado contra calculado), Gráficas de las
                dos filas y, en la visita, lo observado aquel día.
              </li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  )
}

export default RecuadroDeAyuda
