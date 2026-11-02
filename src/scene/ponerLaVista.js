/**
 * Cómo se pone la cámara en una vista sin que el control de órbita la mueva después.
 *
 * Está aparte y sin React para poder comprobarlo con pruebas: el amortiguado de
 * `OrbitControls` sigue aplicando, cuadro tras cuadro, lo que quedó del último
 * arrastre (el giro o el desplazamiento que no alcanzó a gastarse). Si se coloca la
 * cámara encima de ese resto, la vista no queda donde se pidió: se corre unos metros
 * mientras el resto se agota.
 */

/**
 * Gasta de golpe lo que quedó del último arrastre: aplica el resto y lo deja en cero,
 * sin tocar el amortiguado para lo que venga después.
 *
 * @param {{ enableDamping: boolean, update: () => unknown }} control
 */
export function soltarElImpulso(control) {
  const amortiguado = control.enableDamping
  control.enableDamping = false
  control.update()
  control.enableDamping = amortiguado
}

/**
 * Pone la cámara y su objetivo en la vista dada, con el control ya sin impulso.
 *
 * @param {{ object: { position: { set: (...c: number[]) => void } }, target: { set: (...c: number[]) => void },
 *   enableDamping: boolean, update: () => unknown }} control
 * @param {{ posicion: number[], objetivo: number[] }} vista
 */
export function ponerLaVista(control, vista) {
  soltarElImpulso(control)
  control.object.position.set(...vista.posicion)
  control.target.set(...vista.objetivo)
  control.update()
}
