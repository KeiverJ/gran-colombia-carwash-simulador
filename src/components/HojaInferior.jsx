import { useEffect, useLayoutEffect, useRef } from 'react'

import {
  alturaTrasArrastrar,
  categoriaDeAncho,
  pestanasDeLaHoja,
  useInterfaz,
} from '../store/interfaz.js'
import { MODO_VISITA, useSimulacion } from '../store/simulacion.js'
import { ContenidoDeAjustes } from './CapaDeAjustes.jsx'
import { ContenidoDeResultados } from './CapaDeResultados.jsx'
import Pestanas from './Pestanas.jsx'

const TEXTO_DE_LA_PESTANA = {
  ajustes: 'Ajustes',
  graficas: 'Gráficas',
  metricas: 'Métricas',
  visita: 'Visita',
}

/** Cuántos píxeles se puede mover el puntero y que aún cuente como un toque. */
const MARGEN_DE_TOQUE_PX = 6

/**
 * La hoja inferior del celular: reemplaza a las capas laterales.
 *
 * Tiene tres alturas —recogida (solo las pestañas), media y alta— y se cambia
 * arrastrando el asa o pulsándola. El asa es un botón, así que también se
 * maneja con el teclado. La escena nunca baja de un tercio de la pantalla: lo
 * garantiza el CSS (la hoja puede encogerse, la escena no).
 *
 * Al cambiar de altura se desliza en vez de saltar (técnica FLIP): el cambio de
 * altura ya ocurrió en el diseño, así que se mide dónde estaba el borde de
 * arriba, se la desplaza de vuelta con `transform` y se suelta para que el CSS
 * anime el regreso. Solo se anima `transform`.
 */
export function HojaInferior() {
  const ancho = useInterfaz((estado) => estado.ancho)
  const altura = useInterfaz((estado) => estado.hoja)
  const pestana = useInterfaz((estado) => estado.pestanaHoja)
  const elegirPestana = useInterfaz((estado) => estado.elegirPestanaDeLaHoja)
  const elegirAltura = useInterfaz((estado) => estado.elegirAlturaDeLaHoja)
  const siguienteAltura = useInterfaz((estado) => estado.siguienteAlturaDeLaHoja)
  const enLaVisita = useSimulacion((estado) => estado.modo === MODO_VISITA)
  const arrastre = useRef(null)
  const hoja = useRef(null)
  const bordeAnterior = useRef(null)
  const esCelular = categoriaDeAncho(ancho) === 'celular'

  useLayoutEffect(() => {
    const nodo = hoja.current
    if (!nodo) {
      bordeAnterior.current = null
      return
    }
    const borde = nodo.getBoundingClientRect().top
    const anterior = bordeAnterior.current
    bordeAnterior.current = borde
    if (anterior === null || Math.abs(anterior - borde) < 1) {
      return
    }
    nodo.style.transition = 'none'
    nodo.style.transform = `translateY(${anterior - borde}px)`
    nodo.getBoundingClientRect()
    nodo.style.transition = ''
    nodo.style.transform = ''
  }, [altura, esCelular])

  // Si la ventana cambia de tamaño el borde cambia sin que haya animación que
  // hacer: se vuelve a medir para que el próximo cambio parta del sitio real.
  useEffect(() => {
    const remedir = () => {
      if (hoja.current) {
        bordeAnterior.current = hoja.current.getBoundingClientRect().top
      }
    }
    window.addEventListener('resize', remedir)
    return () => window.removeEventListener('resize', remedir)
  }, [])

  if (!esCelular) {
    return null
  }

  const ids = pestanasDeLaHoja(enLaVisita)
  const visible = ids.includes(pestana) ? pestana : ids[0]

  const alBajarElPuntero = (evento) => {
    arrastre.current = { inicio: evento.clientY, ultimo: evento.clientY }
    evento.currentTarget.setPointerCapture?.(evento.pointerId)
  }
  const alMoverElPuntero = (evento) => {
    if (arrastre.current) {
      arrastre.current.ultimo = evento.clientY
    }
  }
  const alSoltarElPuntero = () => {
    const actual = arrastre.current
    arrastre.current = null
    if (!actual) {
      return
    }
    const desplazamiento = actual.ultimo - actual.inicio
    if (Math.abs(desplazamiento) <= MARGEN_DE_TOQUE_PX) {
      siguienteAltura()
    } else {
      elegirAltura(alturaTrasArrastrar(altura, desplazamiento))
    }
  }

  const alElegirPestana = (id) => {
    elegirPestana(id)
    // Tocar una pestaña con la hoja recogida la sube a la altura media.
    if (altura === 'recogida') {
      elegirAltura('media')
    }
  }

  return (
    <section ref={hoja} className="hoja" data-altura={altura} aria-label="Paneles">
      <button
        type="button"
        className="hoja-asa"
        aria-label="Subir o bajar el panel"
        aria-expanded={altura !== 'recogida'}
        onPointerDown={alBajarElPuntero}
        onPointerMove={alMoverElPuntero}
        onPointerUp={alSoltarElPuntero}
        onPointerCancel={() => {
          arrastre.current = null
        }}
        onKeyDown={(evento) => {
          if (evento.key === 'Enter' || evento.key === ' ') {
            evento.preventDefault()
            siguienteAltura()
          }
        }}
      >
        <span className="hoja-asa-barra" aria-hidden="true" />
      </button>
      <Pestanas
        etiqueta="Paneles"
        prefijo="hoja"
        pestanas={ids.map((id) => ({ id, texto: TEXTO_DE_LA_PESTANA[id] }))}
        elegida={visible}
        alElegir={alElegirPestana}
      >
        {visible === 'ajustes' ? <ContenidoDeAjustes /> : <ContenidoDeResultados pestana={visible} />}
      </Pestanas>
    </section>
  )
}

export default HojaInferior
