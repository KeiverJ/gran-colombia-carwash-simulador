import { useEffect, useRef } from 'react'

import { categoriaDeAncho, useInterfaz } from '../store/interfaz.js'
import ContenidoDeExperimentos from './ContenidoDeExperimentos.jsx'
import { IconoDeCerrar, IconoDeExperimentos } from './iconos.jsx'
import { usePresencia } from './usePresencia.js'

/**
 * Lo que queda debajo de la vista y no debe recibir foco ni leerse mientras está
 * abierta: la zona de la escena siempre y, en un celular (donde la vista ocupa
 * toda la pantalla), también la barra de arriba y la hoja inferior.
 */
const DEBAJO = '.zona-escena'
const DEBAJO_EN_CELULAR = ['.barra-superior', '.hoja']

/**
 * La vista «Experimentos»: ocupa el área de la escena (en un celular, toda la
 * pantalla), con la configuración a la izquierda y los resultados en grande a la
 * derecha.
 *
 * Se cierra con el botón «Cerrar», con Escape (lo atiende el estado de la
 * interfaz) o con el ícono que la abrió. Abrirla o cerrarla no toca la simulación
 * ni el lote en marcha; la escena sigue montada debajo, sin dibujarse mientras
 * dura. Al abrir, el foco pasa al título; al cerrar, vuelve a quien la abrió.
 */
export function VistaDeExperimentos() {
  const abierta = useInterfaz((estado) => estado.experimentosAbierto)
  const cerrar = useInterfaz((estado) => estado.cerrarExperimentos)
  const ancho = useInterfaz((estado) => estado.ancho)
  const esCelular = categoriaDeAncho(ancho) === 'celular'
  const { montada, fase } = usePresencia(abierta)
  const titulo = useRef(null)
  const quienLaAbrio = useRef(null)

  // El foco entra al abrir y vuelve a quien la abrió al cerrar. Va antes que lo inerte: al
  // volver inerte lo de abajo el navegador puede quitarle el foco a quien la abrió.
  useEffect(() => {
    if (!abierta) {
      return undefined
    }
    // Algunos navegadores (Safari) no dan foco a un botón al pulsarlo: entonces el foco vuelve al
    // ícono de Experimentos que se ve (el de la barra lateral o, en un celular, el de arriba).
    const activo = document.activeElement
    quienLaAbrio.current =
      activo && activo !== document.body
        ? activo
        : [...document.querySelectorAll('[aria-controls="vista-de-experimentos"]')].find((b) => b.offsetParent !== null) ?? null
    titulo.current?.focus()
    return () => {
      const anterior = quienLaAbrio.current
      // Después de que lo inerte se quite (su limpieza corre justo después de esta).
      requestAnimationFrame(() => {
        if (anterior?.isConnected && !anterior.closest('[inert]')) {
          anterior.focus()
        }
      })
    }
  }, [abierta])

  // Lo de abajo se vuelve inerte: ni el teclado ni los lectores llegan a lo que no se ve.
  useEffect(() => {
    if (!abierta) {
      return undefined
    }
    const selectores = esCelular ? [DEBAJO, ...DEBAJO_EN_CELULAR] : [DEBAJO]
    const elementos = selectores.flatMap((selector) => [...document.querySelectorAll(selector)])
    for (const elemento of elementos) {
      elemento.setAttribute('inert', '')
    }
    return () => {
      for (const elemento of elementos) {
        elemento.removeAttribute('inert')
      }
    }
  }, [abierta, esCelular])

  if (!montada) {
    return null
  }

  return (
    <section
      id="vista-de-experimentos"
      className={`experimentos-vista experimentos-vista--${fase}`}
      aria-labelledby="titulo-de-experimentos"
    >
      <header className="experimentos-cabecera">
        <h2 id="titulo-de-experimentos" ref={titulo} tabIndex={-1} className="titulo-con-icono">
          <IconoDeExperimentos />
          Experimentos
        </h2>
        <p className="experimentos-cabecera-nota">
          Muchas simulaciones sin animación, con promedio e intervalo de confianza.
        </p>
        <button type="button" className="boton-barra" onClick={cerrar}>
          <IconoDeCerrar />
          <span>Cerrar</span>
        </button>
      </header>
      <div className="experimentos-vista-cuerpo">
        <ContenidoDeExperimentos />
      </div>
    </section>
  )
}

export default VistaDeExperimentos
