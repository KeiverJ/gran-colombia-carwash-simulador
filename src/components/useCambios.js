import { useState } from 'react'

/**
 * Cuántas veces ha cambiado un valor desde que apareció (0 mientras sigue igual).
 *
 * Sirve para animar un instante solo lo que cambió: se pone el contador como `key` del
 * elemento y la animación de CSS corre otra vez cada vez que sube. Con el mismo valor no
 * sube, y la primera vez que se dibuja no cuenta como cambio.
 *
 * El contador se ajusta al dibujar (y no en un efecto) para que el valor nuevo y su
 * animación lleguen en el mismo cuadro, sin un dibujo intermedio.
 *
 * @param {unknown} valor
 * @returns {number}
 */
export function useCambios(valor) {
  const [visto, setVisto] = useState({ valor, cambios: 0 })
  if (!Object.is(visto.valor, valor)) {
    setVisto({ valor, cambios: visto.cambios + 1 })
  }
  return visto.cambios
}

export default useCambios
