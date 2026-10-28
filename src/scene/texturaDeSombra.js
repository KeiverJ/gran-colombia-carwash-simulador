import { CanvasTexture, SRGBColorSpace } from 'three'

/**
 * La textura de la sombra suave de una moto: un óvalo que se desvanece hacia
 * los bordes, generado en un lienzo (sin imágenes). Es blanco y negro con
 * transparencia: el color real lo pone el material.
 *
 * @param {number} [lado] píxeles del lienzo cuadrado
 */
export function crearTexturaDeSombra(lado = 128) {
  const lienzo = document.createElement('canvas')
  lienzo.width = lado
  lienzo.height = lado
  const ctx = lienzo.getContext('2d')
  const centro = lado / 2
  const degradado = ctx.createRadialGradient(centro, centro, 0, centro, centro, centro)
  degradado.addColorStop(0, 'rgba(0, 0, 0, 1)')
  degradado.addColorStop(0.45, 'rgba(0, 0, 0, 0.6)')
  degradado.addColorStop(1, 'rgba(0, 0, 0, 0)')
  ctx.fillStyle = degradado
  ctx.fillRect(0, 0, lado, lado)
  const textura = new CanvasTexture(lienzo)
  textura.colorSpace = SRGBColorSpace
  return textura
}
