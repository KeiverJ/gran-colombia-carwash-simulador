import { useEffect, useState } from 'react'

import { cargarModelosDeMoto, liberarModelo } from './cargaDeModelos.js'

/**
 * Carga los modelos de las motos al montar la escena.
 *
 * Mientras cargan, `listo` es falso y la escena no dibuja motos (son unos
 * 200 KB: tardan un instante). Cuando terminan —con todos, con algunos o con
 * ninguno—, `listo` pasa a verdadero y `modelos[i]` es el modelo cargado o
 * `null` si ese no pudo cargar, que se reemplaza por la figura de respaldo.
 * Nunca lanza un error hacia la pantalla.
 *
 * Al desmontar suelta la memoria de lo que cargó.
 */
export function useModelosDeMoto() {
  const [estado, setEstado] = useState({ listo: false, modelos: [] })

  useEffect(() => {
    let cancelado = false
    let cargados = []
    cargarModelosDeMoto().then((modelos) => {
      if (cancelado) {
        modelos.forEach(liberarModelo)
        return
      }
      cargados = modelos
      setEstado({ listo: true, modelos })
    })
    return () => {
      cancelado = true
      cargados.forEach(liberarModelo)
    }
  }, [])

  return estado
}
