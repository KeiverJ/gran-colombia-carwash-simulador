import { useEffect, useState } from 'react'

/**
 * Pone la escena a pantalla completa y la devuelve.
 *
 * Usa la API del navegador, pero no se fía de ella: puede no existir o puede
 * rechazarse por permisos o por el contexto. Si falla, se cae a un modo
 * "expandido" que ocupa toda la ventana con CSS, sin salir de la página.
 * Quedarse con un botón que no hace nada sería peor que no tenerlo.
 *
 * @param {object} props
 * @param {{ current: HTMLElement|null }} props.contenedor qué se agranda
 * @param {boolean} props.expandida si está en el modo de respaldo
 * @param {(expandida: boolean) => void} props.alExpandir cambia ese modo
 */
export function BotonDePantallaCompleta({ contenedor, expandida, alExpandir }) {
  const [enPantallaCompleta, setEnPantallaCompleta] = useState(false)

  // El usuario puede salir con Escape sin pasar por el botón, así que el
  // estado se toma del navegador y no de lo que creemos haber pedido.
  useEffect(() => {
    const alCambiar = () => setEnPantallaCompleta(Boolean(document.fullscreenElement))
    document.addEventListener('fullscreenchange', alCambiar)
    return () => document.removeEventListener('fullscreenchange', alCambiar)
  }, [])

  const estaGrande = enPantallaCompleta || expandida

  const alternar = async () => {
    if (estaGrande) {
      if (document.fullscreenElement) {
        await document.exitFullscreen().catch(() => {})
      }
      alExpandir(false)
      return
    }
    const nodo = contenedor.current
    if (!nodo?.requestFullscreen) {
      alExpandir(true)
      return
    }
    try {
      await nodo.requestFullscreen()
    } catch {
      // Rechazada: queda el modo expandido, que no depende del navegador.
      alExpandir(true)
    }
  }

  return (
    <button type="button" className="boton-pantalla-completa" onClick={alternar}>
      {estaGrande ? 'Salir de pantalla completa' : 'Pantalla completa'}
    </button>
  )
}

export default BotonDePantallaCompleta
