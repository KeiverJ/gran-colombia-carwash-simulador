import { useEffect, useState } from 'react'

import { cargarLogoUnaVez } from './cargaDelLogo.js'

/** Los tres estados del logo. */
export const ESTADO_DEL_LOGO = { cargando: 'cargando', listo: 'listo', fallo: 'fallo' }

/**
 * El logo del local: `{ estado, logo }`.
 *
 * Mientras se pide el archivo el estado es `cargando` (la escena no dibuja ni
 * logo ni letrero en ese tramo, para que no parpadee el letrero negro antes
 * del logo); al terminar es `listo`, con el logo construido, o `fallo`, y la
 * escena usa el letrero de texto. Nunca lanza un error hacia la pantalla.
 *
 * El logo se pide una vez y queda en memoria mientras la página esté abierta:
 * lo comparten todas las copias, así que no se libera al desmontar.
 */
export function useLogoDelLocal() {
  const [resultado, setResultado] = useState({ estado: ESTADO_DEL_LOGO.cargando, logo: null })

  useEffect(() => {
    let cancelado = false
    cargarLogoUnaVez().then((logo) => {
      if (!cancelado) setResultado(logo ? { estado: ESTADO_DEL_LOGO.listo, logo } : { estado: ESTADO_DEL_LOGO.fallo, logo: null })
    })
    return () => {
      cancelado = true
    }
  }, [])

  return resultado
}
