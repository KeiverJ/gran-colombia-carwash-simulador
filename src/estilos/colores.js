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
  1: '#2f6fdb',
  2: '#e8792b',
  3: '#d35bb3',
}

/**
 * Estado de una placa de lavado o de un puesto de acabado.
 *
 * "Libre" es un gris azulado neutro: ya no hay verde ni rojo, que son casi el
 * mismo color para quien no distingue esos dos. "Ocupado" no tiene color
 * propio: la placa ocupada se pinta con el color de la etapa de lavado y el
 * puesto ocupado con el de la etapa de acabado (`COLOR_DE_OCUPADO`). La señal
 * que no depende del color es la altura de la losa, plana si está libre y
 * elevada si está ocupada, y "libre" y "ocupado" se escriben siempre con
 * palabras.
 */
export const COLOR_DE_ESTADO = {
  libre: '#c3cfd6',
}

/**
 * Series de las gráficas: cada fila lleva el color de su etapa, la fila 1 el de
 * la etapa 1 (lavado) y la fila 2 el de la etapa 2 (acabado). El ámbar queda
 * reservado a las advertencias.
 */
export const COLOR_DE_SERIE = {
  colaLavado: '#0b84ae',
  colaAcabado: '#6d4fc2',
}

/** Color de una placa o un puesto ocupado: el de su etapa. */
export const COLOR_DE_OCUPADO = {
  lavado: COLOR_DE_SERIE.colaLavado,
  acabado: COLOR_DE_SERIE.colaAcabado,
}

/**
 * Color de una placa o un puesto **reservado**: el motor le asignó una moto que
 * todavía va en camino. Sigue plano, con un tono suave del color de su etapa (el
 * 45 % de él sobre el gris de «libre»), para que se vea que viene alguien sin
 * levantarse antes de tiempo.
 */
export const COLOR_DE_RESERVADO = {
  lavado: '#70adc4',
  acabado: '#9c95cd',
}

/**
 * Colores del entorno de la escena 3D: avenidas, local, mobiliario y rótulos.
 * Cada uno vive también en `tema.css` como `--escena-<nombre en kebab-case>`
 * (`pinturaVial` → `--escena-pintura-vial`), y la prueba de sincronía los
 * compara. Los componentes de `src/scene/` no escriben colores propios: los
 * toman de aquí.
 *
 * El verde del letrero de calle (`#1D7348`) da 5,84 : 1 con el texto blanco,
 * por encima del mínimo de 4,5 : 1.
 */
export const COLOR_DE_ESCENA = {
  // Terreno base y su borde
  terreno: '#dfe6ea',
  fondo: '#e9eff3',
  // Avenidas
  asfalto: '#7b8890',
  pinturaVial: '#f3f5f6',
  bordillo: '#b3bec5',
  acera: '#d3dbe0',
  letreroDeCalle: '#1d7348',
  textoDeLetrero: '#ffffff',
  // Local
  piso: '#e8eef1',
  juntaDelPiso: '#d5dee3',
  pisoMojado: '#c4dce6',
  zonaDeAcabado: '#e3e0f1',
  pinturaDeEspera: '#9aa7ae',
  columna: '#9aa7ae',
  techo: '#e6ecef',
  pared: '#d4dde2',
  letreroDelLocal: '#12212c',
  // Placas y puestos
  metal: '#6b7a82',
  manguera: '#2d3a44',
  bordeDeLosa: '#e8eef1',
  mesa: '#d9dfe3',
  // Rótulos de la escena
  rotuloTexto: '#12212c',
  rotuloFondo: '#ffffff',
  rotuloBorde: '#dce3e8',
  rotuloDeAlerta: '#c8322f',
}

/** `pinturaVial` → `pintura-vial`, el nombre de la variable CSS sin su prefijo. */
const aKebab = (nombre) => nombre.replace(/[A-Z]/g, (letra) => `-${letra.toLowerCase()}`)

/**
 * Lo mismo, aplanado con el nombre exacto de la variable CSS de `tema.css`.
 * Es lo que compara la prueba de sincronía.
 */
export const COLORES_COMPARTIDOS = {
  'plan-1': COLOR_DE_PLAN[1],
  'plan-2': COLOR_DE_PLAN[2],
  'plan-3': COLOR_DE_PLAN[3],
  'estado-libre': COLOR_DE_ESTADO.libre,
  'estado-reservada-lavado': COLOR_DE_RESERVADO.lavado,
  'estado-reservada-acabado': COLOR_DE_RESERVADO.acabado,
  'serie-cola-1': COLOR_DE_SERIE.colaLavado,
  'serie-cola-2': COLOR_DE_SERIE.colaAcabado,
  ...Object.fromEntries(
    Object.entries(COLOR_DE_ESCENA).map(([nombre, color]) => [`escena-${aKebab(nombre)}`, color]),
  ),
}

/**
 * Nombre completo de cada plan. Lo usan Ajustes y la Ayuda, para que no se
 * contradigan; la leyenda sobre la escena usa solo "Plan N · forma".
 */
export const NOMBRE_DE_PLAN = {
  1: 'Plan 1 · lavado y encerado',
  2: 'Plan 2 · + partes negras',
  3: 'Plan 3 · + pulido de faros',
}
