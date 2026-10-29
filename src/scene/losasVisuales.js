/**
 * El estado visual de cada placa y de cada puesto: lo que **se ve**, que sale de
 * dónde están las motos en la escena y no directamente del motor.
 *
 * El motor asigna una moto a una placa en un instante, pero la moto tarda en
 * llegar (y en irse) según el reloj simulado. Si la losa se levantara cuando el
 * motor la asigna y bajara cuando termina el servicio, se vería levantada antes
 * de que llegue la moto y bajada antes de que salga. Aquí cada losa está:
 *
 * - **libre**: plana y gris. No hay moto encima ni asignada;
 * - **reservada**: el motor le asignó una moto que todavía va en camino. Sigue
 *   plana, con un tono suave del color de su etapa;
 * - **ocupada**: tiene una moto encima. Levantada y del color de su etapa. Se
 *   levanta cuando la moto llega a ella y baja cuando la moto ya salió de su
 *   superficie, aunque el motor haya terminado el servicio antes. Si la siguiente
 *   moto ya está asignada mientras la anterior aún sale, sigue levantada hasta que
 *   la anterior la deja y entonces pasa a reservada, o se queda levantada si la
 *   siguiente ya está encima.
 *
 * Es JavaScript puro. Los indicadores y las métricas no usan esto: siguen saliendo
 * del motor.
 */

import { MOTO, posicionDePlaca, posicionDePuesto, SERVIDOR } from './posiciones.js'

/** Cuánto, a cada lado, se agranda la losa para decidir que una moto ya la dejó. */
export const AIRE_AL_SALIR = 0.1

const MEDIO_ANCHO = SERVIDOR.ancho / 2
const MEDIO_FONDO = SERVIDOR.fondo / 2

/** ¿Está el centro de la moto sobre la losa? Es lo que la levanta. */
export function motoEncimaDeLaLosa(punto, centro) {
  return Math.abs(punto[0] - centro[0]) < MEDIO_ANCHO && Math.abs(punto[2] - centro[2]) < MEDIO_FONDO
}

/**
 * ¿Toca alguna parte de la moto la losa (agrandada `aire`)? La moto es un
 * rectángulo de su largo y su ancho, girado hacia donde mira (`rumbo`); se
 * compara con el de la losa por el método de los ejes separadores.
 */
export function motoTocaLaLosa(punto, rumbo, centro, aire = AIRE_AL_SALIR) {
  const hx = MEDIO_ANCHO + aire
  const hz = MEDIO_FONDO + aire
  const adelante = [Math.sin(rumbo), Math.cos(rumbo)]
  const lado = [Math.cos(rumbo), -Math.sin(rumbo)]
  const d = [punto[0] - centro[0], punto[2] - centro[2]]
  for (const eje of [[1, 0], [0, 1], adelante, lado]) {
    const radioDeLaLosa = hx * Math.abs(eje[0]) + hz * Math.abs(eje[1])
    const radioDeLaMoto =
      (MOTO.largo / 2) * Math.abs(adelante[0] * eje[0] + adelante[1] * eje[1]) +
      (MOTO.ancho / 2) * Math.abs(lado[0] * eje[0] + lado[1] * eje[1])
    if (Math.abs(d[0] * eje[0] + d[1] * eje[1]) > radioDeLaLosa + radioDeLaMoto) return false
  }
  return true
}

/** El estado de una losa según el motor, sin mirar las motos: libre u ocupada. */
export const estadoSegunElMotor = (servidor) => (servidor.libre ? 'libre' : 'ocupada')

/**
 * El estado visual de todas las losas.
 *
 * @param {object} datos
 * @param {object} datos.foto la foto del motor
 * @param {Array<{ n: number, punto: number[], rumbo: number }>} datos.motos dónde está cada moto ahora
 * @param {Map<number, { recorrido: number, largo: number }>} datos.viajes el viaje de cada moto
 * @param {{ placas: boolean[], puestos: boolean[] }} datos.levantadas qué losas estaban
 *   levantadas en el cuadro anterior; se actualiza
 * @returns {{ placas: string[], puestos: string[] }} `'libre'`, `'reservada'` u `'ocupada'` de cada una
 */
export function estadoVisualDeLasLosas({ foto, motos, viajes, levantadas }) {
  const resolver = (servidores, centroDe, previas) =>
    servidores.map((servidor, i) => {
      const centro = centroDe(i, servidores.length)
      const encima = motos.some(({ punto }) => motoEncimaDeLaLosa(punto, centro))
      // Una losa ya levantada sigue así mientras alguna moto la toque.
      const sigue = previas[i] === true && motos.some(({ punto, rumbo }) => motoTocaLaLosa(punto, rumbo, centro))
      const levantada = encima || sigue
      previas[i] = levantada
      if (levantada) return 'ocupada'
      const viaje = servidor.moto ? viajes.get(servidor.moto.n) : null
      // Asignada por el motor y con la moto todavía en camino.
      return viaje && viaje.recorrido < viaje.largo ? 'reservada' : 'libre'
    })
  return {
    placas: resolver(foto.placas, posicionDePlaca, levantadas.placas),
    puestos: resolver(foto.puestos, posicionDePuesto, levantadas.puestos),
  }
}
