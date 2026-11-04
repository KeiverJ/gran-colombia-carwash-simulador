import { useEffect, useRef } from 'react'

import { CREDITOS_DE_FUENTES, LICENCIA_DE_LAS_FUENTES } from '../data/creditosDeFuentes.js'
import {
  CREDITOS_DE_AMBIENTE,
  CREDITOS_DE_MODELOS,
  LICENCIA_CC0,
  LICENCIA_DE_LOS_MODELOS,
} from '../data/creditosDeModelos.js'
import { NOMBRE_DE_PLAN } from '../estilos/colores.js'
import { useInterfaz } from '../store/interfaz.js'
import { TEXTO_DE_LA_AYUDA, TEXTO_DEL_INTERVALO } from '../store/presentacionDeExperimentos.js'
import { IconoDeAyuda, IconoDeCerrar } from './iconos.jsx'
import LogoDeMarca from './LogoDeMarca.jsx'
import { usePresencia } from './usePresencia.js'

/** Lo que se puede enfocar con el teclado dentro del recuadro. */
const ENFOCABLES = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'

/**
 * El recuadro de Ayuda: cómo usar la aplicación, los nombres completos de los
 * planes, qué significa cada vista y los créditos de los modelos 3D (motos y ambiente).
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
        <EncabezadoDeLaAyuda onCerrar={cerrarAyuda} />

        <ContenidoDeLaAyuda />
      </div>
    </div>
  )
}

/** El encabezado del recuadro: el logo y el título a la izquierda, y el botón Cerrar. */
export function EncabezadoDeLaAyuda({ onCerrar }) {
  return (
    <header className="ayuda-cabecera">
      <div className="ayuda-marca">
        <LogoDeMarca />
        <h2 id="ayuda-titulo" className="titulo-con-icono">
          <IconoDeAyuda />
          Ayuda
        </h2>
      </div>
      <button type="button" className="boton-barra" onClick={onCerrar}>
        <IconoDeCerrar />
        <span>Cerrar</span>
      </button>
    </header>
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
            con las fórmulas. La escena la muestra en cámara rápida durante unos segundos y
            puedes cancelarla.
          </li>
          <li>
            Puedes cerrar y volver a abrir placas y puestos con la simulación en marcha o en
            pausa: mira «Cerrar y abrir placas y puestos», más abajo.
          </li>
          <li>
            En «Visita del 17 de octubre» se reproduce la tarde observada, con sus horas
            reales.
          </li>
          <li>
            Para resultados con respaldo estadístico, usa la pestaña Experimentos de
            Resultados: mira «Experimentos», más abajo.
          </li>
        </ol>

        <p>
          <strong>Experimentos.</strong>
        </p>
        {TEXTO_DE_LA_AYUDA.map((parrafo) => (
          <p key={parrafo}>{parrafo}</p>
        ))}
        <p>
          <strong>¿Qué es un intervalo de confianza?</strong>
        </p>
        {TEXTO_DEL_INTERVALO.map((parrafo) => (
          <p key={parrafo}>{parrafo}</p>
        ))}
      </section>

      <section>
        <h3>Los tres planes</h3>
        <p className="ayuda-parrafo">
          Cada moto lleva en el piso un aro con el color y el trazo de su plan.
        </p>
        <ul>
          <li>{NOMBRE_DE_PLAN[1]} (aro sólido).</li>
          <li>{NOMBRE_DE_PLAN[2]} (aro en segmentos).</li>
          <li>{NOMBRE_DE_PLAN[3]} (aro doble, dos anillos finos).</li>
        </ul>
      </section>

      <section>
        <h3>Cerrar y abrir placas y puestos</h3>
        <p className="ayuda-parrafo">
          Sirve para ver qué pasa si, por ejemplo, una placa se daña o un puesto se queda sin
          personal. Se puede hacer de dos maneras: con la fila de botones que hay debajo del
          número de placas y de puestos en Ajustes, o tocando una placa o un puesto en la
          escena (con el puntero aparece «Cerrar placa 3» o «Abrir placa 3»).
        </p>
        <ul>
          <li>
            Un servidor cerrado no recibe motos nuevas. Se ve más bajo y gris, con una barrera
            y una señal de aviso de tránsito.
          </li>
          <li>
            Si tenía una moto, no se la quita: la termina de atender y entonces se cierra.
            Mientras tanto se lee «cerrándose» y sigue elevado, con la señal de aviso.
          </li>
          <li>
            En cada etapa tiene que quedar al menos un servidor abierto: el último no se
            puede cerrar (su botón aparece desactivado y explica por qué).
          </li>
          <li>
            La simulación no se reinicia al cerrar o abrir. Las fórmulas de la tabla de
            métricas usan los servidores que están abiertos en ese momento, y una nota avisa
            de que lo simulado incluye periodos con otro número de servidores. Reiniciar,
            elegir un escenario o cambiar el número de placas o de puestos vuelve a abrirlo
            todo.
          </li>
          <li>En la visita y durante la corrida larga no se puede abrir ni cerrar nada.</li>
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
            acabado, y salen por la avenida por la que entraron. Una losa plana y gris es una placa o
            un puesto libre; una plana con un tono suave del color de su etapa está reservada
            (hay una moto en camino hacia ella); una elevada está ocupada, con la moto encima. Por qué avenida entra cada moto es
            solo ilustrativo: la visita no registró por dónde llegaba cada una.
          </li>
          <li>
            <strong>Los trabajadores.</strong> Son ilustrativos: hasta 2 en el lavado, con
            manguera, y hasta 3 en el acabado, con trapo, junto a las placas y los puestos que
            están ocupados (los de número menor primero). El modelo no los toma como
            servidores y no cambian ninguna cifra. Lo mismo vale para la cafetería de
            adelante y sus clientes: son de adorno, las motos no pasan por ahí y el pago no
            es una etapa.
          </li>
          <li>
            <strong>El lavado de carros.</strong> Los techos grandes que se ven a la derecha del
            lavadero de motos son la zona de lavado de carros del mismo local. Se muestra como
            referencia del lugar y no forma parte del estudio: el modelo sigue siendo solo de motos,
            y los carros que se ven ahí, quietos, no cambian ninguna cifra.
          </li>
          <li>
            <strong>La cámara.</strong> Con el clic izquierdo sostenido, la vista gira; con el clic
            derecho sostenido, se desplaza (arriba y abajo cambia la altura, y a los lados recorre
            la escena); la rueda acerca. En el celular, un dedo gira y dos dedos desplazan y
            acercan. La cámara no baja del piso ni se aleja más que la vista «Planta». Los
            botones devuelven la cámara a su sitio y llevan a cuatro vistas: «Vista general» (el
            local completo, también sirve para volver a centrarlo), «Lavado» (las placas y su fila
            de espera), «Acabado» (los puestos) y «Planta» (el local visto desde arriba, como un
            plano). El botón «Leyenda» abre un recuadro que explica los aros de los planes y las
            losas.
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
            <strong>Resultados.</strong> Métricas (simulado contra calculado), Gráficas y, en la
            visita, lo observado aquel día.
          </li>
          <li>
            <strong>Las gráficas.</strong> Las dos filas a lo largo del tiempo, cuánto estuvo
            ocupada cada placa y cada puesto, y en qué se va el tiempo de una moto entre
            esperas y atenciones. En la visita se suma el tiempo de cada una de las 23 motos, y
            allí los puestos son aproximados porque la tabla no dice qué puesto usó cada moto.
            Cada gráfica se puede ver también como tabla.
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
        <p className="ayuda-parrafo">
          Los carros, los árboles, la planta, el farol, el semáforo, la señal, el
          balde, la caja, la nevera y las personas de pie también son modelos de Poly Pizza:
          casi todos con licencia{' '}
          <a href={LICENCIA_DE_LOS_MODELOS.url} target="_blank" rel="noopener noreferrer">
            {LICENCIA_DE_LOS_MODELOS.nombre}
          </a>{' '}
          y cuatro con{' '}
          <a href={LICENCIA_CC0.url} target="_blank" rel="noopener noreferrer">
            {LICENCIA_CC0.nombre}
          </a>{' '}
          (dominio público). También se les cambió el tamaño y se comprimieron.
        </p>
        <ul className="ayuda-creditos">
          {CREDITOS_DE_AMBIENTE.map(({ clave, titulo, autor, licencia, url }) => (
            <li key={clave}>
              <a href={url} target="_blank" rel="noopener noreferrer">
                {titulo}
              </a>{' '}
              de {autor} ({licencia})
            </li>
          ))}
        </ul>
        <p className="ayuda-parrafo">
          El texto del logo del lavadero se dibujó con las fuentes Anton y Pacifico, ambas con
          licencia{' '}
          <a href={LICENCIA_DE_LAS_FUENTES.url} target="_blank" rel="noopener noreferrer">
            {LICENCIA_DE_LAS_FUENTES.nombre}
          </a>
          . Ya vienen convertidas en trazos dentro del logo: la aplicación no las carga.
        </p>
        <ul className="ayuda-creditos">
          {CREDITOS_DE_FUENTES.map(({ nombre, autor, url }) => (
            <li key={nombre}>
              <a href={url} target="_blank" rel="noopener noreferrer">
                {nombre}
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
