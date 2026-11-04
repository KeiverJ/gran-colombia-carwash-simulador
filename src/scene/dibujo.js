/**
 * Cuándo se dibuja la escena. Mientras la vista de Experimentos la cubre entera no
 * hay nada que ver, así que el lienzo deja de dibujar (`frameloop="never"` de React
 * Three Fiber): sin cuadros nuevos y sin gastar tarjeta gráfica, pero sin desmontar
 * nada. La cámara, las motos y los modelos cargados quedan como estaban y, al volver,
 * se retoma sin recargar.
 *
 * @param {boolean} vistaAbierta ¿la vista de Experimentos está abierta?
 * @returns {'always' | 'never'}
 */
export function modoDeDibujo(vistaAbierta) {
  return vistaAbierta ? 'never' : 'always'
}
