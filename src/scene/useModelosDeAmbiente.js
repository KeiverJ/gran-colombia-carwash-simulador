import { useEffect, useState } from 'react'

import { CLAVES_DE_AMBIENTE, cargaDeAmbiente } from './cargaDeModelos.js'

/**
 * Carga los modelos de ambiente: `{ estados, modelos }`, con una entrada por
 * clave. `estados[clave]` es `cargando`, `listo` o `fallo`, y `modelos[clave]`
 * es el modelo cargado o `null` si no cargó (la pieza que lo usa se omite).
 *
 * Cada modelo aparece en cuanto llega, sin esperar a los demás. Nunca lanza un
 * error hacia la pantalla. Los archivos se piden una vez y quedan en memoria
 * mientras la página esté abierta, así que no se liberan al desmontar (los
 * comparten varias piezas de la escena).
 *
 * @param {string[]} claves  Cuáles se necesitan (por defecto, todos).
 * @param {ReturnType<typeof cargaDeAmbiente>} carga  La carga a usar (solo cambia en las pruebas).
 */
export function useModelosDeAmbiente(claves = CLAVES_DE_AMBIENTE, carga = cargaDeAmbiente()) {
  const [instantanea, setInstantanea] = useState(() => carga.instantanea(claves))
  const llave = claves.join('|')

  useEffect(() => {
    let cancelado = false
    const pedidas = llave.split('|').filter(Boolean)
    for (const clave of pedidas) {
      carga.pedir(clave).then(() => {
        if (!cancelado) setInstantanea(carga.instantanea(pedidas))
      })
    }
    return () => {
      cancelado = true
    }
  }, [llave, carga])

  return instantanea
}
