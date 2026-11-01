/**
 * El servidor de la escena sobre el que está el puntero ahora, o `null`.
 *
 * Es un store aparte y diminuto: cambia al pasar el puntero, no en cada cuadro,
 * y el resaltado de la losa lo lee dentro del ciclo de dibujo sin pasar por
 * React. Solo el rótulo ("Cerrar placa 3") se vuelve a pintar cuando cambia.
 */

import { create } from 'zustand'

export const useServidorSenalado = create((set, get) => ({
  /** `{ etapa: 'lavado' | 'acabado', indice }` (desde 0) o `null`. */
  senalado: null,

  senalar: (etapa, indice) => {
    const actual = get().senalado
    if (actual?.etapa === etapa && actual.indice === indice) {
      return
    }
    set({ senalado: { etapa, indice } })
  },

  /** El puntero salió de este servidor; si ya estaba sobre otro, no se toca. */
  soltar: (etapa, indice) => {
    const actual = get().senalado
    if (actual?.etapa === etapa && actual.indice === indice) {
      set({ senalado: null })
    }
  },

  limpiar: () => set({ senalado: null }),
}))
