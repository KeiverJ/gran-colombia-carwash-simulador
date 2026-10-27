import { useEffect, useRef, useState } from 'react'

import BotonDePantallaCompleta from '../components/BotonDePantallaCompleta.jsx'
import { categoriaDeAncho, useInterfaz } from '../store/interfaz.js'
import { BotonesDeCamara } from './ControlesDeCamara.jsx'
import LeyendaDePlanes from './LeyendaDePlanes.jsx'

/**
 * El botón "Leyenda": cuando la fila de arriba no cabe completa, la leyenda se
 * pliega en este botón y su contenido sale en un recuadro pequeño. Se cierra
 * con Escape (que no llega a cerrar también la capa de Ajustes o el panel) o
 * con un clic fuera.
 */
function BotonDeLeyenda() {
  const [abierta, setAbierta] = useState(false)
  const raiz = useRef(null)
  const boton = useRef(null)

  useEffect(() => {
    if (!abierta) {
      return undefined
    }
    const alPulsarUnaTecla = (evento) => {
      if (evento.key === 'Escape') {
        // En el documento, antes de que el evento llegue a la ventana, donde
        // otro oyente cerraría la capa que se abrió última.
        evento.stopPropagation()
        setAbierta(false)
        boton.current?.focus()
      }
    }
    const alPulsarFuera = (evento) => {
      if (raiz.current && !raiz.current.contains(evento.target)) {
        setAbierta(false)
      }
    }
    document.addEventListener('keydown', alPulsarUnaTecla)
    document.addEventListener('pointerdown', alPulsarFuera)
    return () => {
      document.removeEventListener('keydown', alPulsarUnaTecla)
      document.removeEventListener('pointerdown', alPulsarFuera)
    }
  }, [abierta])

  return (
    <div className="leyenda-plegable" ref={raiz}>
      <button
        ref={boton}
        type="button"
        className="boton-leyenda"
        aria-expanded={abierta}
        aria-controls="leyenda-recuadro"
        onClick={() => setAbierta((valor) => !valor)}
      >
        Leyenda
      </button>
      {abierta ? (
        <div id="leyenda-recuadro" className="leyenda-recuadro">
          <LeyendaDePlanes vertical />
        </div>
      ) : null}
    </div>
  )
}

/**
 * La fila de controles de arriba de la escena: los botones de cámara a la
 * izquierda, la leyenda compacta al centro y "Pantalla completa", solo con
 * ícono, a la derecha.
 *
 * Si el ancho visible no alcanza para la fila completa, la leyenda se pliega en
 * un botón. Se mide con un `ResizeObserver` sobre la fila; como plegada ya no
 * se sabe cuánto ocupaba la leyenda, se recuerda el ancho que necesitaba la
 * última vez que se vio completa para saber cuándo volver a desplegarla.
 * En un celular se conserva la disposición de siempre (la leyenda, en una
 * segunda línea).
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
      if (!nodo.querySelector('.leyenda-plegable')) {
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
    document.fonts?.ready?.then(recalcular)
    return () => observador.disconnect()
  }, [enCelular, plegada])

  return (
    <div className="flotante-superior" ref={fila}>
      <BotonesDeCamara alPedirVista={alPedirVista} />
      <div className="flotante-centro">
        {plegada && !enCelular ? <BotonDeLeyenda /> : <LeyendaDePlanes />}
      </div>
      <BotonDePantallaCompleta contenedor={contenedor} expandida={expandida} alExpandir={alExpandir} />
    </div>
  )
}

export default FilaSuperiorDeLaEscena
