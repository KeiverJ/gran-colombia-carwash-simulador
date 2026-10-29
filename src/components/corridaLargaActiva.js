/** Por qué están desactivados los mandos que reinician mientras corre la corrida larga. */
export const RAZON_DE_LA_CORRIDA_LARGA = 'Disponible cuando termine la corrida larga o la canceles.'

/**
 * ¿Pidió el sistema menos movimiento? Con eso la corrida larga no se muestra como
 * cámara rápida: se salta directo al final.
 */
export function prefiereMenosMovimiento() {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  } catch {
    return false
  }
}
