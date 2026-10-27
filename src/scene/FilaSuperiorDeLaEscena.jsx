import { useEffect, useRef, useState } from 'react'

import BotonDePantallaCompleta from '../components/BotonDePantallaCompleta.jsx'
import { categoriaDeAncho, useInterfaz } from '../store/interfaz.js'
import { BotonesDeCamara } from './ControlesDeCamara.jsx'
import LeyendaDePlanes from './LeyendaDePlanes.jsx'

/**
 * Un botón que abre un recuadro pequeño pegado a él, para las cosas que no
 * caben en la fila de arriba: el menú de vistas de la cámara y la leyenda. Se
 * cierra con Escape (que no llega a cerrar también la capa de Ajustes o el
 * panel) o con un clic fuera.
 *
 * @param {object} props
 * @param {string} props.texto lo que dice el botón
 * @param {string} [props.clase] una clase extra para la envoltura
 * @param {'centro'|'izquierda'} [props.alineacion] cómo sale el recuadro respecto al botón
 * @param {import('react').ReactNode | ((cerrar: () => void) => import('react').ReactNode)} props.children
 *   el contenido del recuadro; si es una función, recibe cómo cerrarlo
 */
function BotonConRecuadro({ texto, clase = '', alineacion = 'centro', children, ...atributos }) {
  const [abierto, setAbierto] = useState(false)
  const raiz = useRef(null)
  const boton = useRef(null)
  const cerrar = () => setAbierto(false)

  useEffect(() => {
    if (!abierto) {
      return undefined
    }
    const alPulsarUnaTecla = (evento) => {
      if (evento.key === 'Escape') {
        // En el documento, antes de que el evento llegue a la ventana, donde
        // otro oyente cerraría la capa que se abrió última.
        evento.stopPropagation()
        setAbierto(false)
        boton.current?.focus()
      }
    }
    const alPulsarFuera = (evento) => {
      if (raiz.current && !raiz.current.contains(evento.target)) {
        setAbierto(false)
      }
    }
    document.addEventListener('keydown', alPulsarUnaTecla)
    document.addEventListener('pointerdown', alPulsarFuera)
    return () => {
      document.removeEventListener('keydown', alPulsarUnaTecla)
      document.removeEventListener('pointerdown', alPulsarFuera)
    }
  }, [abierto])

  return (
    <div className={`boton-con-recuadro${clase ? ` ${clase}` : ''}`} ref={raiz} {...atributos}>
      <button
        ref={boton}
        type="button"
        className="boton-del-recuadro"
        aria-expanded={abierto}
        aria-haspopup="true"
        onClick={() => setAbierto((valor) => !valor)}
      >
        {texto}
      </button>
      {abierto ? (
        <div className={`recuadro-flotante recuadro-flotante--${alineacion}`}>
          {typeof children === 'function' ? children(cerrar) : children}
        </div>
      ) : null}
    </div>
  )
}

/**
 * La fila de controles de arriba de la escena.
 *
 * En escritorio: los botones de cámara a la izquierda, la leyenda compacta al
 * centro y "Pantalla completa", solo con ícono, a la derecha. Si el ancho
 * visible no alcanza para la fila completa, la leyenda se pliega en un botón.
 * Se mide con un `ResizeObserver` sobre la fila; como plegada ya no se sabe
 * cuánto ocupaba la leyenda, se recuerda el ancho que necesitaba la última vez
 * que se vio completa para saber cuándo volver a desplegarla.
 *
 * En un celular (menos de 768 px) todo cabe en una sola fila: un botón "Vista"
 * que abre el menú con las vistas, un botón "Leyenda" con su recuadro y, a la
 * derecha, "Pantalla completa". Así los controles ocupan una línea y no tres.
 */
export function FilaSuperiorDeLaEscena({ alPedirVista, contenedor, expandida, alExpandir }) {
  const fila = useRef(null)
  const necesario = useRef(0)
  const [plegada, setPlegada] = useState(false)
  const ancho = useInterfaz((estado) => estado.ancho)
  const enCelular = categoriaDeAncho(ancho) === 'celular'

  useEffect(() => {
    const nodo = fila.current
    if (!nodo) {
      return undefined
    }
    const recalcular = () => {
      if (enCelular) {
        setPlegada(false)
        return
      }
      const disponible = nodo.clientWidth
      if (!nodo.querySelector('[data-leyenda-plegada]')) {
        const estilo = getComputedStyle(nodo)
        const hueco = Number.parseFloat(estilo.columnGap) || 0
        const hijos = [...nodo.children]
        necesario.current =
          hijos.reduce((suma, hijo) => suma + hijo.offsetWidth, 0) + hueco * Math.max(hijos.length - 1, 0)
        if (necesario.current > disponible) {
          setPlegada(true)
        }
      } else if (disponible >= necesario.current) {
        setPlegada(false)
      }
    }
    const observador = new ResizeObserver(recalcular)
    observador.observe(nodo)
    recalcular()
    // Cuando llega la fuente cambian los anchos de los textos.
    void document.fonts?.ready?.then(recalcular)
    return () => observador.disconnect()
  }, [enCelular, plegada])

  return (
    <div className="flotante-superior" ref={fila}>
      {enCelular ? (
        <BotonConRecuadro texto="Vista" alineacion="izquierda" clase="boton-con-recuadro--vista">
          {(cerrar) => <BotonesDeCamara alPedirVista={alPedirVista} vertical alElegir={cerrar} />}
        </BotonConRecuadro>
      ) : (
        <BotonesDeCamara alPedirVista={alPedirVista} />
      )}
      <div className="flotante-centro">
        {plegada || enCelular ? (
          <BotonConRecuadro
            texto="Leyenda"
            alineacion={enCelular ? 'izquierda' : 'centro'}
            data-leyenda-plegada=""
          >
            <LeyendaDePlanes vertical />
          </BotonConRecuadro>
        ) : (
          <LeyendaDePlanes />
        )}
      </div>
      <BotonDePantallaCompleta contenedor={contenedor} expandida={expandida} alExpandir={alExpandir} />
    </div>
  )
}

export default FilaSuperiorDeLaEscena
