/**
 * Las acciones al azar y los invariantes de la prueba de estrés del store.
 *
 * Está aparte de la prueba (`estres.test.js`) para poder leerlo sin ejecutarlo: aquí
 * está **todo lo que se le hace a la aplicación** y **todo lo que debe seguir siendo
 * cierto** después de cada acción. JavaScript puro, sin Vitest.
 *
 * La prueba aplica miles de acciones elegidas con un generador con semilla (la misma
 * semilla da la misma secuencia) sobre `useSimulacion` y, tras cada una, comprueba
 * los invariantes. Los valores no válidos entran por las mismas puertas que los
 * válidos: son parte del azar.
 */

import { crearGenerador } from '../engine/aleatorio.js'
import { MODO_MMS, MODO_POR_PLAN } from '../engine/simulador.js'
import { ESCENARIOS } from '../data/escenarios.js'
import { MOTOS_EN_LA_FOTO } from './filas.js'
import { HORAS_DE_LA_CORRIDA_LARGA_POSIBLES, RANGOS, validarParametro } from './rangos.js'
import { MODO_VISITA, useSimulacion } from './simulacion.js'

/** Valores que no deben llegar al motor, de todos los tipos que pueden aparecer. */
export const VALORES_NO_VALIDOS = [
  Number.NaN,
  Infinity,
  -Infinity,
  -1,
  0,
  1e9,
  -1e9,
  2.5,
  0.001,
  '12',
  '',
  ' ',
  null,
  undefined,
  {},
  [],
  [3],
  true,
  false,
]

const NOMBRES_DE_PARAMETROS = ['llegadasPorHora', 'lavadoMin', 'placas', 'puestos', 'modoAcabado']

/** Un valor al azar que SÍ es válido para ese parámetro. */
function valorValido(azar, nombre) {
  const entre = (minimo, maximo) => minimo + azar() * (maximo - minimo)
  switch (nombre) {
    case 'llegadasPorHora':
      return entre(RANGOS.llegadas.minimo, azar() < 0.3 ? RANGOS.llegadas.maximo : 30)
    case 'lavadoMin':
      return entre(RANGOS.lavado.minimo, 30)
    case 'placas':
      return RANGOS.placas.minimo + Math.floor(azar() * (RANGOS.placas.maximo - RANGOS.placas.minimo + 1))
    case 'puestos':
      return RANGOS.puestos.minimo + Math.floor(azar() * (RANGOS.puestos.maximo - RANGOS.puestos.minimo + 1))
    case 'modoAcabado':
      return azar() < 0.5 ? MODO_POR_PLAN : MODO_MMS
    default:
      throw new Error(`parámetro sin valor de prueba: ${nombre}`)
  }
}

const elegir = (azar, lista) => lista[Math.floor(azar() * lista.length)]
const noValido = (azar) => elegir(azar, VALORES_NO_VALIDOS)

/** Un valor que, para ese parámetro en concreto, no es válido (2,5 sí vale de velocidad, pero no de placas). */
function noValidoPara(azar, nombre) {
  for (let intento = 0; intento < 50; intento += 1) {
    const valor = noValido(azar)
    if (!validarParametro(nombre, valor).valido) return valor
  }
  return Number.NaN
}

/** Un número de servidor al azar, a veces fuera de la lista. */
const indiceAlAzar = (azar) => (azar() < 0.15 ? elegir(azar, [-1, 99, 2.5, Number.NaN]) : Math.floor(azar() * 14))

/**
 * Todas las acciones posibles, con su peso. Cada una recibe el generador y el store
 * y devuelve un texto que la describe (para el informe si algo falla) y, si pidió
 * un valor, el valor, para que la prueba sepa si debía aplicarse.
 */
const ACCIONES = [
  { peso: 8, nombre: 'iniciar', hacer: (s) => s.iniciar() },
  { peso: 8, nombre: 'pausar', hacer: (s) => s.pausar() },
  {
    peso: 6,
    nombre: 'velocidad válida',
    hacer: (s, azar) => s.cambiarVelocidad(RANGOS.velocidad.minimo + Math.floor(azar() * 480) * 0.25),
  },
  { peso: 5, nombre: 'velocidad no válida', hacer: (s, azar) => s.cambiarVelocidad(noValidoPara(azar, 'velocidad')), invalido: true },
  { peso: 3, nombre: 'reiniciar', hacer: (s) => s.reiniciar() },
  { peso: 3, nombre: 'escenario', hacer: (s, azar) => s.elegirEscenario(elegir(azar, ESCENARIOS).id) },
  { peso: 1, nombre: 'escenario que no existe', hacer: (s, azar) => s.elegirEscenario(noValido(azar)) },
  { peso: 1, nombre: 'restablecer valores', hacer: (s) => s.restablecerValores() },
  {
    peso: 6,
    nombre: 'parámetro válido',
    hacer: (s, azar) => {
      const nombre = elegir(azar, NOMBRES_DE_PARAMETROS)
      return s.cambiarParametro(nombre, valorValido(azar, nombre))
    },
  },
  {
    peso: 6,
    nombre: 'parámetro no válido',
    hacer: (s, azar) => {
      const nombre = elegir(azar, NOMBRES_DE_PARAMETROS.slice(0, 4))
      return s.cambiarParametro(nombre, noValidoPara(azar, nombre))
    },
    invalido: true,
  },
  { peso: 1, nombre: 'parámetro que no existe', hacer: (s, azar) => s.cambiarParametro(noValido(azar), 5) },
  {
    peso: 2,
    nombre: 'acabado de un plan',
    hacer: (s, azar) => s.cambiarAcabadoDePlan(1 + Math.floor(azar() * 3), 0.5 + azar() * 60),
  },
  {
    peso: 2,
    nombre: 'acabado no válido',
    hacer: (s, azar) => s.cambiarAcabadoDePlan(elegir(azar, [0, 4, 1.5, Number.NaN, 2]), noValidoPara(azar, 'acabadoPlanMin')),
    invalido: true,
  },
  { peso: 2, nombre: 'proporción', hacer: (s, azar) => s.cambiarProporcion(1 + Math.floor(azar() * 3), azar()) },
  { peso: 2, nombre: 'proporción no válida', hacer: (s, azar) => s.cambiarProporcion(2, noValidoPara(azar, 'proporcionPlan')), invalido: true },
  { peso: 2, nombre: 'semilla', hacer: (s, azar) => s.cambiarSemilla(Math.floor(azar() * 1000)) },
  { peso: 2, nombre: 'semilla no válida', hacer: (s, azar) => s.cambiarSemilla(noValidoPara(azar, 'semilla')), invalido: true },
  { peso: 6, nombre: 'cerrar', hacer: (s, azar) => s.cerrarServidor(azar() < 0.5 ? 'lavado' : 'acabado', indiceAlAzar(azar)) },
  { peso: 6, nombre: 'abrir', hacer: (s, azar) => s.abrirServidor(azar() < 0.5 ? 'lavado' : 'acabado', indiceAlAzar(azar)) },
  { peso: 6, nombre: 'alternar', hacer: (s, azar) => s.alternarServidor(azar() < 0.5 ? 'lavado' : 'acabado', indiceAlAzar(azar)) },
  { peso: 1, nombre: 'servidor de una etapa que no existe', hacer: (s, azar) => s.cerrarServidor(noValido(azar), 0) },
  {
    peso: 2,
    nombre: 'empezar la corrida larga',
    hacer: (s, azar) => s.empezarCorridaLarga(azar() < 0.8 ? undefined : elegir(azar, [100, 1000]), { camaraRapida: azar() < 0.5 }),
  },
  { peso: 1, nombre: 'corrida larga con horas no válidas', hacer: (s, azar) => s.empezarCorridaLarga(noValido(azar)) },
  { peso: 2, nombre: 'cancelar la corrida larga', hacer: (s) => s.cancelarCorridaLarga() },
  {
    peso: 4,
    nombre: 'horas de la corrida larga',
    hacer: (s, azar) => s.cambiarHorasDeLaCorridaLarga(elegir(azar, [...HORAS_DE_LA_CORRIDA_LARGA_POSIBLES, ...VALORES_NO_VALIDOS])),
  },
  { peso: 30, nombre: 'cuadros', hacer: (s, azar) => cuadros(s, 1 + Math.floor(azar() * 6), 10 + azar() * 90) },
  { peso: 6, nombre: 'cuadros de la corrida larga', hacer: (s) => cuadrosDeLaCorridaLarga(s, 3) },
  { peso: 2, nombre: 'entrar en la visita', hacer: (s) => s.entrarEnLaVisita() },
  { peso: 2, nombre: 'volver al modo normal', hacer: (s) => s.volverAlModoNormal() },
]

function cuadros(s, cuantos, ms) {
  for (let i = 0; i < cuantos; i += 1) {
    s.avanzarCuadro(ms)
  }
}

function cuadrosDeLaCorridaLarga(s, cuantos) {
  for (let i = 0; i < cuantos && s.corridaLarga; i += 1) {
    s.avanzarCorridaLarga()
  }
}

/**
 * Las acciones de la corrida larga que dejan el motor en un punto que depende del
 * tiempo real: los trozos se ajustan a lo que tarda cada uno, así que una corrida
 * larga cancelada a medias queda en una hora distinta cada vez. Los resultados de una
 * corrida COMPLETA sí son idénticos (eso lo prueba el motor); lo que no se repite es
 * dónde se queda una cancelada.
 */
const DEPENDEN_DEL_TIEMPO_REAL = new Set([
  'empezar la corrida larga',
  'cancelar la corrida larga',
  'cuadros de la corrida larga',
])

function accionAlAzar(azar, acciones, pesoTotal) {
  let punto = azar() * pesoTotal
  for (const accion of acciones) {
    punto -= accion.peso
    if (punto < 0) return accion
  }
  return acciones.at(-1)
}

/* ---------------------------------------------------------- invariantes -- */

/** Todo lo que debe cumplirse después de cualquier acción. Devuelve las faltas, una por línea. */
export function faltasDelEstado(s = useSimulacion.getState()) {
  const faltas = []
  const debe = (condicion, texto) => {
    if (!condicion) faltas.push(texto)
  }
  const { parametros, foto, resumen, corridaLarga } = s

  // Ningún valor fuera de rango llegó a quedar guardado.
  debe(validarParametro('llegadasPorHora', parametros.llegadasPorHora).valido, `λ fuera de rango: ${parametros.llegadasPorHora}`)
  debe(validarParametro('lavadoMin', parametros.lavadoMin).valido, `lavado fuera de rango: ${parametros.lavadoMin}`)
  debe(validarParametro('placas', parametros.placas).valido, `placas no válidas: ${parametros.placas}`)
  debe(validarParametro('puestos', parametros.puestos).valido, `puestos no válidos: ${parametros.puestos}`)
  debe(validarParametro('modoAcabado', parametros.modoAcabado).valido, `modo de acabado no válido: ${parametros.modoAcabado}`)
  for (const plan of [1, 2, 3]) {
    debe(validarParametro('acabadoPlanMin', parametros.acabadoPlanMin[plan]).valido, `acabado del plan ${plan} fuera de rango`)
    debe(Number.isFinite(parametros.proporcionPlan[plan]) && parametros.proporcionPlan[plan] >= 0, `proporción del plan ${plan} no válida`)
  }
  const suma = parametros.proporcionPlan[1] + parametros.proporcionPlan[2] + parametros.proporcionPlan[3]
  debe(Math.abs(suma - 1) < 1e-9, `las proporciones suman ${suma}`)
  debe(validarParametro('semilla', s.semilla).valido, `semilla no válida: ${s.semilla}`)
  debe(validarParametro('velocidad', s.velocidadMinPorSegundo).valido, `velocidad fuera de rango: ${s.velocidadMinPorSegundo}`)
  debe(
    HORAS_DE_LA_CORRIDA_LARGA_POSIBLES.includes(s.horasDeLaCorridaLarga),
    `horas de la corrida larga no válidas: ${s.horasDeLaCorridaLarga}`,
  )

  // El motor no falló: nada de lo que hace la prueba debería hacerlo fallar.
  debe(s.fallo === null, `el motor falló: ${s.fallo?.detalle}`)

  // La foto es coherente con los parámetros y con sí misma.
  debe(Number.isFinite(foto.relojMin) && foto.relojMin >= 0, `reloj no válido: ${foto.relojMin}`)
  debe(foto.placas.length === parametros.placas, `la foto tiene ${foto.placas.length} placas y los parámetros dicen ${parametros.placas}`)
  debe(foto.puestos.length === parametros.puestos, `la foto tiene ${foto.puestos.length} puestos y los parámetros dicen ${parametros.puestos}`)
  const enVisita = s.modo === MODO_VISITA
  if (!enVisita) {
    // Nunca se queda una etapa sin ningún servidor activo.
    debe(foto.placas.some((placa) => placa.estado === 'activo'), 'ninguna placa activa')
    debe(foto.puestos.some((puesto) => puesto.estado === 'activo'), 'ningún puesto activo')
    // Un servidor cerrado nunca tiene moto; uno ocupado nunca está libre.
    for (const servidor of [...foto.placas, ...foto.puestos]) {
      debe(servidor.estado !== 'cerrado' || servidor.moto === null, 'un servidor cerrado tiene moto')
      debe(servidor.libre === (servidor.moto === null), 'libre no coincide con moto')
    }
    debe(foto.colaLavado.length <= MOTOS_EN_LA_FOTO, 'la foto trae toda la fila del lavado')
    debe(foto.colaAcabado.length <= MOTOS_EN_LA_FOTO, 'la foto trae toda la fila del acabado')
    debe(foto.largoColaLavado >= foto.colaLavado.length, 'el largo de la fila del lavado es menor que lo que trae la foto')
    debe(foto.largoColaAcabado >= foto.colaAcabado.length, 'el largo de la fila del acabado es menor que lo que trae la foto')
  }

  // El resumen que lee la interfaz describe el mismo motor (no tiene por qué estar al día al milisegundo).
  debe(resumen.placasTotales === foto.placas.length, 'el resumen cuenta otras placas')
  debe(resumen.puestosTotales === foto.puestos.length, 'el resumen cuenta otros puestos')
  debe(resumen.estadosDePlacas.length === resumen.placasTotales, 'estados de placas de otro tamaño')
  debe(resumen.estadosDePuestos.length === resumen.puestosTotales, 'estados de puestos de otro tamaño')
  debe(resumen.placasActivas >= 1 && resumen.puestosActivos >= 1, 'el resumen dice que una etapa no tiene activos')
  for (const [nombre, valor] of Object.entries(resumen)) {
    if (typeof valor === 'number') debe(Number.isFinite(valor) && valor >= 0, `el resumen trae ${nombre} = ${valor}`)
  }

  // La corrida larga y la marcha normal no se mezclan.
  if (corridaLarga) {
    debe(s.corriendo === false, 'corriendo durante la corrida larga')
    debe(HORAS_DE_LA_CORRIDA_LARGA_POSIBLES.includes(corridaLarga.horasTotales), `corrida larga de ${corridaLarga.horasTotales} horas`)
    debe(corridaLarga.horasHechas >= 0 && corridaLarga.horasHechas <= corridaLarga.horasTotales, 'horas hechas fuera de lo posible')
    debe(!enVisita, 'corrida larga en la visita')
  }
  if (enVisita) {
    debe(s.antesDeLaVisita !== null, 'visita sin parámetros guardados')
  }
  debe(Number.isInteger(s.generacion) && s.generacion >= 0, 'generación no válida')

  return faltas
}

/* ------------------------------------------------------------ la prueba -- */

/** Una huella corta del estado, para comprobar que la misma semilla da lo mismo. */
export function huellaDelEstado(s = useSimulacion.getState()) {
  return JSON.stringify([
    s.generacion,
    s.modo,
    s.corriendo,
    s.velocidadMinPorSegundo,
    s.semilla,
    s.parametros,
    s.foto.relojMin,
    s.foto.motosSalidas,
    s.foto.placas.map((placa) => placa.estado),
    s.foto.puestos.map((puesto) => puesto.estado),
    s.foto.largoColaLavado ?? s.foto.colaLavado.length,
    s.foto.largoColaAcabado ?? s.foto.colaAcabado.length,
    s.corridaLarga?.horasTotales ?? null,
    s.horasDeLaCorridaLarga,
  ])
}

/**
 * Aplica `cuantas` acciones al azar y comprueba los invariantes después de cada una.
 *
 * @param {object} opciones
 * @param {number} opciones.semilla la del generador de las acciones
 * @param {number} opciones.cuantas
 * @param {boolean} [opciones.sinCorridaLarga] deja fuera las acciones que dependen del tiempo real,
 *   para comparar dos corridas estado a estado
 * @param {(estado: object) => void} [opciones.antesDeEmpezar] para preparar el store (o sabotearlo)
 * @returns {{ faltas: string[], huellas: string[], acciones: string[] }}
 */
export function correrLaPruebaDeEstres({ semilla, cuantas, sinCorridaLarga = false, antesDeEmpezar }) {
  const azar = crearGenerador(semilla)
  const acciones_ = sinCorridaLarga ? ACCIONES.filter((accion) => !DEPENDEN_DEL_TIEMPO_REAL.has(accion.nombre)) : ACCIONES
  const pesoTotal = acciones_.reduce((suma, accion) => suma + accion.peso, 0)
  const faltas = []
  const huellas = []
  const acciones = []

  const tienda = useSimulacion
  tienda.setState({ ...tienda.getInitialState() }, true)
  tienda.getState().reiniciar()
  antesDeEmpezar?.(tienda)

  for (let paso = 0; paso < cuantas; paso += 1) {
    const accion = accionAlAzar(azar, acciones_, pesoTotal)
    const antes = tienda.getState()
    const parametrosAntes = JSON.stringify(antes.parametros)
    const generacionAntes = antes.generacion
    const velocidadAntes = antes.velocidadMinPorSegundo
    let resultado
    try {
      resultado = accion.hacer(tienda.getState(), azar)
    } catch (error) {
      faltas.push(`#${paso} ${accion.nombre}: lanzó ${error?.message ?? error}`)
      acciones.push(accion.nombre)
      continue
    }
    acciones.push(accion.nombre)

    // Un valor que no es válido no se aplica, no reinicia y devuelve `false`.
    if (accion.invalido) {
      const despues = tienda.getState()
      const igual = JSON.stringify(despues.parametros) === parametrosAntes && despues.velocidadMinPorSegundo === velocidadAntes
      if (!igual) faltas.push(`#${paso} ${accion.nombre}: cambió algo con un valor no válido`)
      if (despues.generacion !== generacionAntes) faltas.push(`#${paso} ${accion.nombre}: reinició con un valor no válido`)
      if (resultado !== false) faltas.push(`#${paso} ${accion.nombre}: no devolvió false (${resultado})`)
    }

    for (const falta of faltasDelEstado(tienda.getState())) {
      faltas.push(`#${paso} ${accion.nombre}: ${falta}`)
    }
    huellas.push(huellaDelEstado(tienda.getState()))
    if (faltas.length > 20) break
  }
  return { faltas, huellas, acciones }
}
