/**
 * Los cinco escenarios que estudia el proyecto.
 *
 * Cada uno fija solo cuántas placas de lavado y cuántos puestos de acabado hay
 * (sección 6 de docs/especificacion_simulador.md: actual 6/3; 4 y 5 puestos;
 * 5 y 7 placas). Todo lo demás son los parámetros por defecto, que arma el
 * store al elegir uno.
 */
export const ESCENARIOS = [
  { id: 'actual', nombre: 'Situación actual (6 placas, 3 puestos)', placas: 6, puestos: 3 },
  { id: 'cuatro-puestos', nombre: '4 puestos de acabado', placas: 6, puestos: 4 },
  { id: 'cinco-puestos', nombre: '5 puestos de acabado', placas: 6, puestos: 5 },
  { id: 'cinco-placas', nombre: '5 placas', placas: 5, puestos: 3 },
  { id: 'siete-placas', nombre: '7 placas', placas: 7, puestos: 3 },
]
