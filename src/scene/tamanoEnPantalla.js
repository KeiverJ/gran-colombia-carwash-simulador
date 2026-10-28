/**
 * Qué escala darle a un `sprite` sin atenuación por distancia para que mida
 * `pixeles` de alto en la pantalla, sea cual sea la distancia de la cámara.
 *
 * Con `sizeAttenuation` apagado, three.js multiplica la escala del sprite por
 * la distancia, así que lo que queda es una fracción fija de la altura de la
 * imagen: `escala / tan(fov / 2)` de su mitad. De ahí sale la escala.
 *
 * @param {number} pixeles alto que se quiere en pantalla, en píxeles CSS
 * @param {number} altoDelCuadro alto del cuadro de la cámara, en píxeles: el del
 *   lienzo, o el del cuadro virtual si se usa `setViewOffset` (`camera.view.fullHeight`)
 * @param {number} fov ángulo de visión vertical de la cámara, en grados
 */
export function escalaParaPixeles(pixeles, altoDelCuadro, fov) {
  return (pixeles * 2 * Math.tan((fov * Math.PI) / 360)) / altoDelCuadro
}

/** El alto del cuadro que usa una cámara: el virtual si tiene `setViewOffset` puesto, y si no el del lienzo. */
export function altoDelCuadroDe(camara, altoDelLienzo) {
  return camara.view?.enabled ? camara.view.fullHeight : altoDelLienzo
}

/**
 * Qué punto del rótulo (de 0 a 1 a lo ancho) tiene que caer sobre su posición para
 * que el rótulo quede entero dentro del lienzo: el que se quería (`ancla`) si cabe,
 * y si no, el que lo deja pegado al borde.
 *
 * @param {number} xEnPantalla dónde cae la posición del rótulo, en píxeles desde el borde izquierdo
 * @param {number} anchoDelRotulo lo que mide el rótulo a lo ancho, en píxeles
 * @param {number} ancla el punto del rótulo que se quería sobre la posición
 * @param {number} anchoDelLienzo
 * @param {number} [margen] píxeles que se dejan hasta el borde
 */
export function anclaDentroDelLienzo(xEnPantalla, anchoDelRotulo, ancla, anchoDelLienzo, margen = 4) {
  if (!(anchoDelRotulo > 0)) return ancla
  const izquierda = xEnPantalla - ancla * anchoDelRotulo
  const maxima = Math.max(margen, anchoDelLienzo - margen - anchoDelRotulo)
  const dentro = Math.min(Math.max(izquierda, margen), maxima)
  return (xEnPantalla - dentro) / anchoDelRotulo
}
