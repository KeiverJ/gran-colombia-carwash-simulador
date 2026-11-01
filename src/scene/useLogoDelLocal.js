import { useEffect, useState } from 'react'

import { cargarLetreroUnaVez, cargarLogoUnaVez } from './cargaDelLogo.js'

/** Los tres estados de lo que se carga: el logo del techo y el letrero de la pared. */
export const ESTADO_DEL_LOGO = { cargando: 'cargando', listo: 'listo', fallo: 'fallo' }

/** Pide `cargar()` al montar y devuelve `{ estado, logo }`. */
function useLogoCargado(cargar) {
  const [resultado, setResultado] = useState({ estado: ESTADO_DEL_LOGO.cargando, logo: null })

  useEffect(() => {
    let cancelado = false
    cargar().then((logo) => {
      if (!cancelado) {
        setResultado(logo ? { estado: ESTADO_DEL_LOGO.listo, logo } : { estado: ESTADO_DEL_LOGO.fallo, logo: null })
      }
    })
    return () => {
      cancelado = true
    }
  }, [cargar])

  return resultado
}

/**
 * El logo del local, el del techo: `{ estado, logo }`.
 *
 * Mientras se pide el archivo el estado es `cargando`; al terminar es `listo`, con
 * el logo construido, o `fallo`. En los dos casos distintos de `listo` la escena
 * simplemente no dibuja el logo del techo. Nunca lanza un error hacia la pantalla.
 *
 * El logo se pide una vez y queda en memoria mientras la página esté abierta, así
 * que no se libera al desmontar.
 */
export function useLogoDelLocal() {
  return useLogoCargado(cargarLogoUnaVez)
}

/**
 * La versión horizontal del logo, el letrero de la pared: `{ estado, logo }`, con
 * los mismos tres estados. Si falla, la pared conserva su letrero de texto.
 */
export function useLetreroDelLocal() {
  return useLogoCargado(cargarLetreroUnaVez)
}
