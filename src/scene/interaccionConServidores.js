/**
 * Lo que dice y hace la escena cuando se señala o se pulsa una placa o un puesto.
 *
 * JavaScript puro, aparte del componente, para probarlo con Node.
 */

/**
 * Cuánto se puede mover el puntero entre pulsar y soltar para que cuente como un
 * clic. Más que esto es un arrastre (la persona está girando la cámara), y no
 * debe cerrar ni abrir nada. Son píxeles de pantalla, el `delta` de R3F.
 */
export const UMBRAL_DE_ARRASTRE_PX = 2

/** ¿Fue un arrastre y no un clic? Un `delta` que no es número cuenta como arrastre. */
export const esUnArrastre = (delta) => !(delta <= UMBRAL_DE_ARRASTRE_PX)

const NOMBRE = { lavado: 'placa', acabado: 'puesto' }

/**
 * El texto del rótulo que sale al señalar un servidor, o `null` si no hay nada que
 * ofrecer (en la visita y durante la corrida larga no se puede abrir ni cerrar).
 *
 * @param {object} datos
 * @param {'lavado'|'acabado'} datos.etapa
 * @param {number} datos.indice posición del servidor, desde 0
 * @param {string[]} datos.estados el estado de cada servidor de la etapa
 * @param {boolean} datos.enLaVisita
 * @param {boolean} datos.enCorridaLarga
 * @returns {string|null}
 */
export function textoDelRotulo({ etapa, indice, estados, enLaVisita, enCorridaLarga }) {
  const estado = estados?.[indice]
  if (enLaVisita || enCorridaLarga || estado === undefined || !NOMBRE[etapa]) {
    return null
  }
  const nombre = NOMBRE[etapa]
  const numero = indice + 1
  if (estado !== 'activo') {
    return `Abrir ${nombre} ${numero}`
  }
  const activos = estados.filter((otro) => otro === 'activo').length
  if (activos > 1) {
    return `Cerrar ${nombre} ${numero}`
  }
  const unica = etapa === 'lavado' ? 'la única abierta' : 'el único abierto'
  return `${nombre[0].toUpperCase()}${nombre.slice(1)} ${numero}: es ${unica}, no se puede cerrar`
}

/**
 * Qué hacer con un clic sobre un servidor: alternarlo, salvo que haya sido un
 * arrastre. La visita y la corrida larga las rechaza el store.
 *
 * @returns {boolean} si se pidió el cambio al store
 */
export function alHacerClicEnUnServidor({ delta, etapa, indice, alternarServidor }) {
  if (esUnArrastre(delta)) {
    return false
  }
  alternarServidor(etapa, indice)
  return true
}

/** El cursor sobre la escena: la mano cuando el servidor se puede abrir o cerrar, el de siempre si no. */
export function fijarElCursor(esUnaMano) {
  if (typeof document !== 'undefined') {
    document.body.style.cursor = esUnaMano ? 'pointer' : ''
  }
}

/** Con qué se pulsó: `'touch'`, `'mouse'` o `'pen'`. Los eventos de R3F copian los del navegador. */
export const tipoDeLaPulsacion = (evento) => evento.nativeEvent?.pointerType ?? evento.pointerType
