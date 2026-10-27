import { useEffect, useRef } from 'react'

import {
  altoEfectivoDelPanel,
  altoMaximoDelPanel,
  ALTO_MINIMO_DEL_PANEL,
  limitarAltoDelPanel,
  PASO_DE_TECLADO_DEL_PANEL,
  pestanasDeResultados,
  useInterfaz,
} from '../store/interfaz.js'
import { MODO_VISITA, useSimulacion } from '../store/simulacion.js'
import ContenidoDeLaVisita from './ContenidoDeLaVisita.jsx'
import GraficaDeColas from './GraficaDeColas.jsx'
import { IconoDeFlecha } from './iconos.jsx'
import { ListaDePestanas, PanelDeLaPestana } from './Pestanas.jsx'
import { ContenidoDeMetricas } from './TablaDeMetricas.jsx'
import { usePresencia } from './usePresencia.js'

const TEXTO_DE_LA_PESTANA = { metricas: 'Métricas', graficas: 'Gráficas', visita: 'Visita' }

/** La clase que lleva la página mientras se arrastra el borde: sin selección de texto. */
const CLASE_DE_ARRASTRE = 'arrastrando-panel'

/** Cuántos píxeles tiene que moverse el puntero para que el gesto cuente como arrastre y no como clic. */
const MARGEN_DE_CLIC_PX = 3

/**
 * El contenido de una pestaña de Resultados, en el panel inferior (en
 * horizontal) o en la hoja del celular (apilado).
 */
export function ContenidoDeResultados({ pestana, enPanel = false }) {
  if (pestana === 'visita') {
    return <ContenidoDeLaVisita enPanel={enPanel} />
  }
  if (pestana === 'graficas') {
    return (
      <div className={enPanel ? 'metricas metricas--panel metricas--grafica' : 'metricas metricas--capa'}>
        <GraficaDeColas alto={enPanel ? '100%' : 260} conTitulo={!enPanel} />
      </div>
    )
  }
  return <ContenidoDeMetricas enPanel={enPanel} />
}

/**
 * El borde de arriba del panel: se arrastra para cambiar su alto, se pulsa
 * dos veces para alternar entre 260 px y el último alto elegido, y con las
 * flechas del teclado sube o baja de 20 en 20 px.
 *
 * Mientras se arrastra solo se escribe el alto del panel (una variable de CSS,
 * como mucho una vez por cuadro): ni el lienzo ni la cámara se tocan; la
 * cámara pasa al nuevo encuadre al soltar (ver `AjusteALasCapas`).
 */
function BordeDelPanel({ panel, altoActual }) {
  const alturaDeVentana = useInterfaz((estado) => estado.alto)
  const empezar = useInterfaz((estado) => estado.empezarAArrastrarElPanel)
  const terminar = useInterfaz((estado) => estado.terminarDeArrastrarElPanel)
  const fijar = useInterfaz((estado) => estado.fijarAltoDelPanel)
  const alternar = useInterfaz((estado) => estado.alternarAltoDelPanel)
  const arrastre = useRef(null)

  // Si el borde desaparece en pleno arrastre, la página no se queda sin selección.
  useEffect(() => () => document.documentElement.classList.remove(CLASE_DE_ARRASTRE), [])

  const escribirElAlto = (alto) => {
    panel.current?.style.setProperty('--alto-panel', `${alto}px`)
  }

  const alBajarElPuntero = (evento) => {
    if (evento.button !== 0) {
      return
    }
    evento.currentTarget.setPointerCapture?.(evento.pointerId)
    document.documentElement.classList.add(CLASE_DE_ARRASTRE)
    arrastre.current = { inicioY: evento.clientY, inicioAlto: altoActual, alto: altoActual, cuadro: null, movido: false }
    empezar()
  }

  const alMoverElPuntero = (evento) => {
    const actual = arrastre.current
    if (!actual) {
      return
    }
    const desplazamiento = actual.inicioY - evento.clientY
    if (Math.abs(desplazamiento) > MARGEN_DE_CLIC_PX) {
      actual.movido = true
    }
    actual.alto = limitarAltoDelPanel(actual.inicioAlto + desplazamiento, alturaDeVentana)
    if (actual.cuadro === null) {
      actual.cuadro = requestAnimationFrame(() => {
        actual.cuadro = null
        escribirElAlto(actual.alto)
      })
    }
  }

  const alSoltarElPuntero = () => {
    const actual = arrastre.current
    arrastre.current = null
    document.documentElement.classList.remove(CLASE_DE_ARRASTRE)
    if (!actual) {
      return
    }
    cancelAnimationFrame(actual.cuadro)
    if (actual.movido) {
      escribirElAlto(actual.alto)
      terminar(actual.alto)
    } else {
      // Un clic sin arrastre (el primero de un doble clic): no cambia nada.
      useInterfaz.setState({ arrastrandoElPanel: false })
    }
  }

  const alPulsarUnaTecla = (evento) => {
    if (evento.key === 'ArrowUp' || evento.key === 'ArrowDown') {
      evento.preventDefault()
      const paso = evento.key === 'ArrowUp' ? PASO_DE_TECLADO_DEL_PANEL : -PASO_DE_TECLADO_DEL_PANEL
      fijar(altoActual + paso)
    }
  }

  return (
    <div
      className="panel-borde"
      role="separator"
      aria-orientation="horizontal"
      aria-label="Alto del panel de Resultados (flechas arriba y abajo para cambiarlo)"
      aria-valuemin={ALTO_MINIMO_DEL_PANEL}
      aria-valuemax={altoMaximoDelPanel(alturaDeVentana)}
      aria-valuenow={altoActual}
      tabIndex={0}
      onPointerDown={alBajarElPuntero}
      onPointerMove={alMoverElPuntero}
      onPointerUp={alSoltarElPuntero}
      onPointerCancel={alSoltarElPuntero}
      onDoubleClick={alternar}
      onKeyDown={alPulsarUnaTecla}
    >
      <span className="panel-asa" aria-hidden="true" />
    </div>
  )
}

/**
 * El panel inferior de Resultados. Flota sobre la escena y no cambia el
 * tamaño del lienzo. Plegado es una barra de 40 px al pie con el título y un
 * botón para desplegarlo; desplegado tiene las pestañas Métricas, Gráficas y,
 * en la visita, Visita, y su alto se ajusta arrastrando el borde de arriba.
 *
 * El panel mide siempre su alto completo y se pliega con `transform` (solo
 * queda a la vista su barra), así que se mueve sin tocar el diseño de la
 * página y la cámara puede seguir su movimiento.
 */
export function PanelDeResultados() {
  const abierto = useInterfaz((estado) => estado.capas.resultados)
  const pestana = useInterfaz((estado) => estado.pestanaResultados)
  const elegirPestana = useInterfaz((estado) => estado.elegirPestanaDeResultados)
  const alternarCapa = useInterfaz((estado) => estado.alternarCapa)
  const altoElegido = useInterfaz((estado) => estado.altoDelPanel)
  const alturaDeVentana = useInterfaz((estado) => estado.alto)
  const enLaVisita = useSimulacion((estado) => estado.modo === MODO_VISITA)
  const panel = useRef(null)
  const { montada, fase } = usePresencia(abierto)

  const altoPx = altoEfectivoDelPanel(altoElegido, alturaDeVentana)
  const ids = pestanasDeResultados(enLaVisita)
  // Si la pestaña guardada no existe en este modo (un instante, entre el cambio
  // de modo y su enlace), se muestra la primera.
  const visible = ids.includes(pestana) ? pestana : ids[0]

  return (
    <section
      id="panel-de-resultados"
      ref={panel}
      className={`panel-resultados panel-resultados--${fase}`}
      style={{ '--alto-panel': `${altoPx}px` }}
      aria-label="Resultados"
    >
      {montada ? <BordeDelPanel panel={panel} altoActual={altoPx} /> : null}

      <header className="panel-cabecera">
        <h2>Resultados</h2>
        {montada ? (
          <ListaDePestanas
            etiqueta="Resultados"
            prefijo="resultados"
            pestanas={ids.map((id) => ({ id, texto: TEXTO_DE_LA_PESTANA[id] }))}
            elegida={visible}
            alElegir={elegirPestana}
          />
        ) : null}
        <button
          type="button"
          className="boton-barra panel-boton"
          aria-expanded={abierto}
          aria-controls="resultados-panel"
          onClick={() => alternarCapa('resultados')}
        >
          <IconoDeFlecha haciaArriba={!abierto} />
          <span>{abierto ? 'Plegar' : 'Desplegar'}</span>
        </button>
      </header>

      {montada ? (
        <PanelDeLaPestana prefijo="resultados" elegida={visible} className="panel-cuerpo">
          <ContenidoDeResultados pestana={visible} enPanel />
        </PanelDeLaPestana>
      ) : null}
    </section>
  )
}

export default PanelDeResultados
