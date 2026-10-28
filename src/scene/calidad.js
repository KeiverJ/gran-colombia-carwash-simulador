import { create } from 'zustand'

/**
 * Calidad adaptable de la escena.
 *
 * Si los cuadros por segundo bajan (un equipo sin tarjeta gráfica, un celular
 * modesto), la escena apaga por pasos lo que menos se echa de menos y al final
 * baja la resolución; si la cosa mejora, lo va devolviendo en el orden contrario.
 * Nada de esto toca la simulación: solo cómo se dibuja.
 *
 * Es JavaScript puro más un pequeño store: `CalidadAdaptable.jsx` mide los
 * cuadros por segundo con `PerformanceMonitor` de drei y llama a `empeorar` y
 * `mejorar`; cada pieza de la escena lee de aquí si le toca dibujarse.
 */

/**
 * Los niveles, del 0 (todo) hacia abajo. Cada uno apaga algo más que el anterior:
 *
 * - 0: todo encendido, con la resolución de la pantalla (hasta 2×).
 * - 1: sin las gotas de agua de las placas.
 * - 2: además, sin las sombras suaves de contacto (de las motos y de lo fijo).
 * - 3: además, sin el entorno de reflejos (las luces directas siguen) y con
 *   tres cuartos de la resolución.
 * - 4: la mitad de la resolución.
 */
export const NIVELES_DE_CALIDAD = [
  { particulas: true, sombras: true, ambiente: true, resolucion: 1 },
  { particulas: false, sombras: true, ambiente: true, resolucion: 1 },
  { particulas: false, sombras: false, ambiente: true, resolucion: 1 },
  { particulas: false, sombras: false, ambiente: false, resolucion: 0.75 },
  { particulas: false, sombras: false, ambiente: false, resolucion: 0.5 },
]

export const NIVEL_MAS_BAJO = NIVELES_DE_CALIDAD.length - 1

/** Lo más que se sube la resolución en pantallas de mucha densidad: más no se nota y cuesta el cuadrado. */
export const RESOLUCION_MAXIMA = 2

/** Lo menos que se baja la resolución, sea cual sea la pantalla. */
export const RESOLUCION_MINIMA = 0.5

/** La resolución (píxeles por píxel de CSS) de un nivel, para una pantalla con esa densidad. */
export function resolucionDelNivel(nivel, densidadDeLaPantalla = 1) {
  const { resolucion } = NIVELES_DE_CALIDAD[Math.min(NIVEL_MAS_BAJO, Math.max(0, nivel))]
  const base = Math.min(RESOLUCION_MAXIMA, Math.max(1, densidadDeLaPantalla))
  return Math.max(RESOLUCION_MINIMA, base * resolucion)
}

/**
 * Cuántas veces se puede bajar y volver a subir antes de dejar el nivel fijo
 * (si cada vez que se sube vuelve a bajar, el equipo está justo en el límite).
 */
export const VAIVENES_PERMITIDOS = 2

export const useCalidad = create((set, get) => ({
  nivel: 0,
  /** El nivel más alto al que se permite volver: baja si subir resultó en volver a bajar. */
  techo: 0,
  vaivenes: 0,
  ultimoMovimiento: null,

  /** Los cuadros por segundo bajaron: se apaga un paso más. */
  empeorar: () => {
    const { nivel, techo, vaivenes, ultimoMovimiento } = get()
    if (nivel >= NIVEL_MAS_BAJO) return
    // Bajar justo después de subir es un vaivén: el equipo no aguanta el nivel de arriba.
    const hayVaiven = ultimoMovimiento === 'mejorar'
    const vaivenesAhora = vaivenes + (hayVaiven ? 1 : 0)
    set({
      nivel: nivel + 1,
      vaivenes: vaivenesAhora,
      techo: hayVaiven && vaivenesAhora >= VAIVENES_PERMITIDOS ? nivel + 1 : techo,
      ultimoMovimiento: 'empeorar',
    })
  },

  /** Los cuadros por segundo van sobrados: se devuelve un paso, si no se ha fijado el techo. */
  mejorar: () => {
    const { nivel, techo } = get()
    if (nivel <= techo) return
    set({ nivel: nivel - 1, ultimoMovimiento: 'mejorar' })
  },

  /** Vuelve a empezar con todo encendido (al reiniciar la escena o en las pruebas). */
  restablecer: () => set({ nivel: 0, techo: 0, vaivenes: 0, ultimoMovimiento: null }),
}))

/** Lo que enciende el nivel actual. */
export const calidadActual = () => NIVELES_DE_CALIDAD[useCalidad.getState().nivel]
