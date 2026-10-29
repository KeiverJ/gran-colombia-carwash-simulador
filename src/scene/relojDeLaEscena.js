/**
 * El reloj con el que se anima la escena: **el reloj simulado del motor**, no el
 * real.
 *
 * Cada pieza que se anima (las motos, las losas que suben, las gotas de agua)
 * recuerda el último reloj simulado que vio y, en cada cuadro, mira cuántos
 * minutos simulados pasaron desde entonces. Con la simulación en pausa pasan 0 y
 * nada se mueve; si se cambia la velocidad, pasan más o menos y el ritmo cambia
 * en el cuadro siguiente.
 *
 * Y decide cuándo **no** animar sino recolocar: cuando el motor se reemplazó o
 * el estado saltó, lo que la escena recuerda ya no describe lo que hay. Eso lo
 * dice un número de «generación» que el store sube cada vez que reemplaza el
 * motor (reiniciar, terminar la corrida larga, entrar o salir de la visita…), y
 * se compara en cada cuadro; y también se recoloca si el reloj simulado retrocede
 * o salta de golpe, o si pasó mucho tiempo real entre un cuadro y otro (la
 * pestaña estuvo oculta).
 *
 * Es JavaScript puro, para poder probarlo con Node.
 */

/**
 * Lo más que puede avanzar el reloj simulado en un cuadro normal, en minutos.
 * El store no deja pasar de 100 ms reales por cuadro (`MS_TOPE_POR_CUADRO`), que a
 * 60 min/s son 6 minutos; con el doble de margen, más que eso es un salto.
 */
export const SALTO_MAXIMO_DE_RELOJ_MIN = 12

/** Lo más que puede pasar, en tiempo real, entre dos cuadros seguidos antes de recolocar, en segundos. */
export const SALTO_MAXIMO_DE_TIEMPO_REAL_S = 0.5

/** Lo que recuerda una pieza entre un cuadro y el siguiente. */
export const crearMemoriaDelReloj = () => ({ reloj: null, generacion: null })

/**
 * Cuánto avanzó el reloj simulado desde el cuadro anterior, y si hay que
 * recolocar en vez de animar. Actualiza la memoria.
 *
 * @param {{ reloj: number|null, generacion: number|null }} memoria
 * @param {object} cuadro
 * @param {number} cuadro.relojMin el reloj simulado de la foto
 * @param {number} cuadro.generacion el número de generación del store
 * @param {number} [cuadro.segundosReales] el tiempo real que pasó desde el cuadro anterior
 * @returns {{ minutos: number, recolocar: boolean }} `minutos` es 0 si hay que recolocar
 */
export function avanceDelReloj(memoria, { relojMin, generacion, segundosReales = 0 }) {
  const recolocar =
    memoria.reloj === null ||
    memoria.generacion !== generacion ||
    !Number.isFinite(relojMin) ||
    relojMin < memoria.reloj ||
    relojMin - memoria.reloj > SALTO_MAXIMO_DE_RELOJ_MIN ||
    segundosReales > SALTO_MAXIMO_DE_TIEMPO_REAL_S
  const minutos = recolocar ? 0 : relojMin - memoria.reloj
  memoria.reloj = Number.isFinite(relojMin) ? relojMin : memoria.reloj
  memoria.generacion = generacion
  return { minutos, recolocar }
}

/**
 * Cuánto avanza una animación «de adorno» (una losa que sube, una gota que cae)
 * en un cuadro, en segundos de animación: lo que dura el cuadro en tiempo real,
 * pero sin pasar de los minutos simulados que pasaron (a 1 min/s, 1 minuto es 1
 * segundo). Con la simulación en pausa es 0 y no se mueve; a menos de 1 min/s va
 * más despacio, como la simulación; a más, va igual de rápido que a 1 min/s, para
 * que no parpadee.
 */
export function pasoDeLaAnimacion(segundosReales, minutos) {
  return Math.max(0, Math.min(segundosReales, minutos))
}
