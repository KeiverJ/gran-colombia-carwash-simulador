/**
 * Las vistas de la cámara y sus límites.
 *
 * Están aparte y sin nada de Three.js para poder comprobarlas con pruebas: la
 * altura de la vista inicial no es un número puesto a ojo, sino uno que supera
 * la altura mínima que hace falta para ver la fila de atrás por encima de la
 * de adelante, y eso se calcula aquí.
 */

import { LOCAL, MOTO, RETRANQUEO_EN_LA_LOSA, SERVIDOR } from './posiciones.js'

/** Hasta dónde llega una moto posada en una losa ocupada. */
const ALTO_DE_MOTO_POSADA = SERVIDOR.altoOcupado + MOTO.alto

/** Hasta qué altura de la moto de atrás queremos verle el cuerpo, no solo la punta. */
const ALTURA_QUE_SE_QUIERE_VER = SERVIDOR.altoOcupado + 0.9

/**
 * Altura mínima de la cámara para que las motos de la fila de adelante no
 * tapen las de atrás, mirando de frente desde la distancia dada.
 *
 * La moto de adelante tapa con su borde de arriba más cercano a la cámara. Se
 * pide que el rayo que va de la cámara al cuerpo de la moto de atrás pase por
 * encima de ese borde; de ahí sale la altura.
 */
export function alturaParaVerLaFilaDeAtras(distancia) {
  const zDeAdelante = LOCAL.zPlacasAdelante - RETRANQUEO_EN_LA_LOSA + MOTO.largo / 2
  const zDeAtras = LOCAL.zPlacasAtras - RETRANQUEO_EN_LA_LOSA
  const separacion = zDeAdelante - zDeAtras
  const cuantoFalta = ALTO_DE_MOTO_POSADA - ALTURA_QUE_SE_QUIERE_VER
  return ALTURA_QUE_SE_QUIERE_VER + (cuantoFalta * (distancia - zDeAtras)) / separacion
}

/** Ángulo de visión vertical de la cámara, en grados. */
export const CAMPO_DE_VISION = 48

/**
 * Qué medio alto del mundo abarca la cámara a una distancia dada.
 * Sirve para saber si una vista deja ver el local entero.
 */
export function medioAltoVisible(distancia) {
  return distancia * Math.tan((CAMPO_DE_VISION / 2) * (Math.PI / 180))
}

/** A qué distancia del centro se mira el local en la vista inicial. */
const DISTANCIA_INICIAL = 19

/**
 * Las tres vistas a las que se puede volver con un botón.
 *
 * "Como en la foto" es baja y de frente, como se ve el lavadero desde la
 * acera, pero no a ras de suelo: su altura está por encima de la que calcula
 * `alturaParaVerLaFilaDeAtras`, así que se ve también la fila de atrás.
 */
export const VISTAS = {
  comoEnLaFoto: {
    nombre: 'Como en la foto',
    posicion: [0, 5, DISTANCIA_INICIAL],
    // Se mira al medio del local, no a su borde de delante: así no sobra
    // calle en primer plano y entra la zona de acabado del fondo.
    objetivo: [0, 0.8, -2],
  },
  desdeArriba: {
    nombre: 'Desde arriba (plano)',
    posicion: [0, 32, 0.6],
    objetivo: [0, 0, 0],
  },
}

/** La vista con la que arranca la escena. */
export const VISTA_INICIAL = VISTAS.comoEnLaFoto

/** A qué distancia de su objetivo está la cámara en una vista. */
export function distanciaDe({ posicion, objetivo }) {
  return Math.hypot(
    posicion[0] - objetivo[0],
    posicion[1] - objetivo[1],
    posicion[2] - objetivo[2],
  )
}

/**
 * Volver a encuadrar el local sin cambiar desde dónde se mira.
 *
 * Recentrar no es lo mismo que volver a la vista de la foto: conserva el
 * ángulo que el usuario eligió y solo arregla lo que se le fue —el centro y,
 * si se había acercado de más, la distancia—. Nunca acerca más de lo que
 * estaba: solo aleja lo justo para que el local vuelva a entrar.
 */
export function vistaRecentrada(posicionCamara) {
  const objetivo = VISTA_INICIAL.objetivo
  const hacia = [
    posicionCamara[0] - objetivo[0],
    posicionCamara[1] - objetivo[1],
    posicionCamara[2] - objetivo[2],
  ]
  const distanciaActual = Math.hypot(...hacia)
  if (distanciaActual < 1e-6) {
    return { posicion: [...VISTA_INICIAL.posicion], objetivo: [...objetivo] }
  }
  const distancia = Math.max(distanciaActual, distanciaDe(VISTA_INICIAL))
  return {
    nombre: 'Recentrar',
    posicion: hacia.map((componente, i) => objetivo[i] + (componente / distanciaActual) * distancia),
    objetivo: [...objetivo],
  }
}

/**
 * Hasta dónde deja moverse el control.
 *
 * El ángulo polar se mide desde arriba: 90° sería a ras de suelo, así que algo
 * menos impide meterse por debajo del piso. Las distancias acotan el
 * acercamiento por los dos lados.
 */
export const LIMITES_DE_CAMARA = {
  distanciaMinima: 10,
  distanciaMaxima: 60,
  anguloPolarMaximo: 1.45,
}

/** La diagonal del local, para saber si una distancia lo deja ver entero. */
export const DIAGONAL_DEL_LOCAL = Math.hypot(LOCAL.ancho, LOCAL.fondo)
