import { useCallback, useEffect, useRef, useState } from 'react'

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
 * @param {boolean} [props.abierto] si se da, el estado del recuadro lo lleva quien lo usa
 *   (para recordarlo); si no, lo lleva el propio botón
 * @param {(abierto: boolean) => void} [props.alCambiar] avisa de que hay que abrirlo o cerrarlo
 * @param {import('react').ReactNode | ((cerrar: () => void) => import('react').ReactNode)} props.children
 *   el contenido del recuadro; si es una función, recibe cómo cerrarlo
 */
function BotonConRecuadro({
  texto,
  clase = '',
  alineacion = 'centro',
  abierto: abiertoDeFuera,
  alCambiar,
  children,
  ...atributos
}) {
  const [abiertoPropio, setAbiertoPropio] = useState(false)
  const controlado = abiertoDeFuera !== undefined
  const abierto = controlado ? abiertoDeFuera : abiertoPropio
  const setAbierto = useCallback(
    (valor) => {
      if (!controlado) setAbiertoPropio(valor)
      alCambiar?.(valor)
    },
    [controlado, alCambiar],
  )
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
  }, [abierto, setAbierto])

  return (
    <div className={`boton-con-recuadro${clase ? ` ${clase}` : ''}`} ref={raiz} {...atributos}>
      <button
        ref={boton}
        type="button"
        className="boton-del-recuadro"
        aria-expanded={abierto}
        aria-haspopup="true"
        onClick={() => setAbierto(!abierto)}
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
 * En escritorio: los botones de cámara a la izquierda, el botón «Leyenda» al
 * centro y «Pantalla completa», solo con ícono, a la derecha. La leyenda va
 * siempre plegada: su contenido sale en un recuadro debajo de la fila (no tapa
 * los botones de cámara) que se abre y se cierra con el mismo botón, con Escape
 * o con un clic fuera, y cuyo estado se recuerda durante la sesión.
 *
 * En un celular (menos de 768 px) todo cabe en una sola fila: un botón «Vista»
 * que abre el menú con las vistas, el botón «Leyenda» y, a la derecha,
 * «Pantalla completa».
 */
export function FilaSuperiorDeLaEscena({ alPedirVista, contenedor, expandida, alExpandir }) {
  const ancho = useInterfaz((estado) => estado.ancho)
  const leyendaAbierta = useInterfaz((estado) => estado.leyendaAbierta)
  const cambiarLeyenda = useInterfaz((estado) => estado.cambiarLeyenda)
  const enCelular = categoriaDeAncho(ancho) === 'celular'

  return (
    <div className="flotante-superior">
      {enCelular ? (
        <BotonConRecuadro texto="Vista" alineacion="izquierda" clase="boton-con-recuadro--vista">
          {(cerrar) => <BotonesDeCamara alPedirVista={alPedirVista} vertical alElegir={cerrar} />}
        </BotonConRecuadro>
      ) : (
        <BotonesDeCamara alPedirVista={alPedirVista} />
      )}
      <div className="flotante-centro">
        <BotonConRecuadro
          texto="Leyenda"
          alineacion={enCelular ? 'izquierda' : 'centro'}
          abierto={leyendaAbierta}
          alCambiar={cambiarLeyenda}
        >
          <LeyendaDePlanes />
        </BotonConRecuadro>
      </div>
      <BotonDePantallaCompleta contenedor={contenedor} expandida={expandida} alExpandir={alExpandir} />
    </div>
  )
}

export default FilaSuperiorDeLaEscena
