import { useEffect, useRef } from 'react'

import { CREDITOS_DE_MODELOS, LICENCIA_DE_LOS_MODELOS } from '../data/creditosDeModelos.js'
import { NOMBRE_DE_PLAN } from '../estilos/colores.js'
import { useInterfaz } from '../store/interfaz.js'
import { IconoDeCerrar } from './iconos.jsx'
import { usePresencia } from './usePresencia.js'

/** Lo que se puede enfocar con el teclado dentro del recuadro. */
const ENFOCABLES = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'

/**
 * El recuadro de Ayuda: cómo usar la aplicación, los nombres completos de los
 * planes, qué significa cada vista y los créditos de los modelos 3D de las motos.
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

        <ContenidoDeLaAyuda />
      </div>
    </div>
  )
}

/**
 * Lo que dice la Ayuda: cómo usar la aplicación, los planes, qué significa cada
 * vista y los créditos. Es contenido fijo y va aparte del recuadro para poder
 * comprobarlo sin abrir nada.
 */
export function ContenidoDeLaAyuda() {
  return (
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
            <strong>La escena.</strong> Las motos llegan por la Av. Gran Colombia o por la Av.
            Guaimaral. Si hay una placa libre van directo a ella; si no, hacen fila en el lado
            derecho del local, afuera de las columnas, hasta que se libere una. Después del
            lavado esperan, si hace falta, en otra fila en los puestos del fondo para el
            acabado, y salen por la avenida por la que entraron. Una losa plana es una placa o
            un puesto libre; una losa elevada, uno ocupado. Por qué avenida entra cada moto es
            solo ilustrativo: la visita no registró por dónde llegaba cada una.
          </li>
          <li>
            <strong>La cámara.</strong> Arrastra para girar la vista y usa la rueda para
            acercarte. Los botones llevan a cuatro vistas: «Vista general» (el local completo,
            también sirve para volver a centrarlo), «Lavado» (las placas y su fila de espera),
            «Acabado» (los puestos) y «Planta» (el local visto desde arriba, como un plano).
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

      <section>
        <h3>Créditos</h3>
        <p className="ayuda-parrafo">
          Las motos de la escena son modelos 3D de Poly Pizza con licencia{' '}
          <a href={LICENCIA_DE_LOS_MODELOS.url} target="_blank" rel="noopener noreferrer">
            {LICENCIA_DE_LOS_MODELOS.nombre}
          </a>
          . Se les cambió el tamaño y se comprimieron para esta aplicación; a dos también se
          les quitaron detalles.
        </p>
        <ul className="ayuda-creditos">
          {CREDITOS_DE_MODELOS.map(({ n, titulo, autor, url }) => (
            <li key={n}>
              <a href={url} target="_blank" rel="noopener noreferrer">
                {titulo}
              </a>{' '}
              de {autor}
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}

export default RecuadroDeAyuda
