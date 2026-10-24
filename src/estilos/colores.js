/**
 * Los colores compartidos, como datos de JavaScript.
 *
 * Three.js (la escena 3D) y Recharts (las gráficas) no leen variables CSS:
 * necesitan el valor. Por eso estos colores viven en dos sitios, `tema.css`
 * y este archivo, y `colores.test.js` abre el CSS como texto y falla si
 * alguno de los dos se queda atrás. Cambiar un color aquí obliga a cambiarlo
 * allí, y al revés.
 *
 * El nombre de cada clave es el de la variable CSS sin los dos guiones.
 */

/** Color de cada plan, para pintar las motos y su leyenda. */
export const COLOR_DE_PLAN = {
  1: '#1f6feb',
  2: '#d9730d',
  3: '#9340b8',
}

/**
 * Estado de una placa de lavado o de un puesto de acabado.
 * Reservados: nunca se usan como color de serie ni de plan. Y nunca van
 * solos: "libre" y "ocupada" se escriben siempre con palabras, porque los dos
 * colores son casi iguales para quien no distingue el rojo del verde.
 */
export const COLOR_DE_ESTADO = {
  libre: '#4a8c5a',
  ocupada: '#b65050',
}

/** Series de las gráficas: una fila por color. */
export const COLOR_DE_SERIE = {
  colaLavado: '#0e9aa7',
  colaAcabado: '#b5531f',
}

/**
 * Lo mismo, aplanado con el nombre exacto de la variable CSS de `tema.css`.
 * Es lo que compara la prueba de sincronía.
 */
export const COLORES_COMPARTIDOS = {
  'plan-1': COLOR_DE_PLAN[1],
  'plan-2': COLOR_DE_PLAN[2],
  'plan-3': COLOR_DE_PLAN[3],
  'estado-libre': COLOR_DE_ESTADO.libre,
  'estado-ocupada': COLOR_DE_ESTADO.ocupada,
  'serie-cola-1': COLOR_DE_SERIE.colaLavado,
  'serie-cola-2': COLOR_DE_SERIE.colaAcabado,
}

/** Nombre de cada plan, para que la leyenda no sea solo un cuadrito de color. */
export const NOMBRE_DE_PLAN = {
  1: 'Plan 1: lavado y encerado',
  2: 'Plan 2: + partes negras',
  3: 'Plan 3: + pulido de faros',
}
