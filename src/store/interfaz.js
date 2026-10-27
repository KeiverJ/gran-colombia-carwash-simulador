/**
 * El estado de la interfaz: si Ajustes y Resultados están abiertos, qué
 * pestaña se ve, qué alto tiene el panel de Resultados, si la ayuda está
 * abierta y a qué altura está la hoja inferior del celular.
 *
 * Está aparte del store de la simulación a propósito: abrir una capa o cambiar
 * de pestaña no puede tocar el reinicio, la velocidad ni los parámetros. Las
 * reglas son funciones puras para poder probarlas con Node, sin navegador.
 */

import { create } from 'zustand'

/** Menos de este ancho (en píxeles) es un celular: no hay capas, hay una hoja inferior. */
export const UMBRAL_DE_CELULAR = 768
/** Con este ancho o más es una pantalla de escritorio (el subtítulo de la barra se ve completo). */
export const UMBRAL_DE_ESCRITORIO = 1200

/**
 * Lo que se abre y se cierra desde la barra lateral: Ajustes es la capa de la
 * izquierda y Resultados, el panel de abajo. Pueden estar abiertos a la vez.
 */
export const CAPAS = ['ajustes', 'resultados']
export const ALTURAS_DE_LA_HOJA = ['recogida', 'media', 'alta']

/** 'celular', 'medio' (de 768 a 1199 px) o 'escritorio'. */
export function categoriaDeAncho(ancho) {
  if (ancho < UMBRAL_DE_CELULAR) {
    return 'celular'
  }
  return ancho < UMBRAL_DE_ESCRITORIO ? 'medio' : 'escritorio'
}

/** Las pestañas del panel de Resultados: la de métricas no existe en la visita. */
export function pestanasDeResultados(enLaVisita) {
  return enLaVisita ? ['visita', 'graficas'] : ['metricas', 'graficas']
}

/** Las pestañas de la hoja inferior del celular. */
export function pestanasDeLaHoja(enLaVisita) {
  return enLaVisita
    ? ['ajustes', 'graficas', 'visita']
    : ['ajustes', 'graficas', 'metricas']
}

/** La pestaña que corresponde si la actual no existe en el modo. */
function pestanaValida(pestana, validas) {
  return validas.includes(pestana) ? pestana : validas[0]
}

/**
 * Abre una capa, o la cierra si ya estaba abierta. Ajustes y Resultados no se
 * tapan entre sí, así que pueden estar abiertos a la vez; en un celular no hay
 * capas.
 */
export function alternarCapa(estado, capa) {
  if (!CAPAS.includes(capa)) {
    throw new RangeError(`La capa debe ser "ajustes" o "resultados"; se recibió ${capa}.`)
  }
  if (categoriaDeAncho(estado.ancho) === 'celular') {
    return {}
  }
  if (estado.capas[capa]) {
    return { capas: { ...estado.capas, [capa]: false } }
  }
  return { capas: { ...estado.capas, [capa]: true }, ultimaCapa: capa }
}

/** Cierra una capa, si estaba abierta. */
export function cerrarCapa(estado, capa) {
  return estado.capas[capa] ? { capas: { ...estado.capas, [capa]: false } } : {}
}

/**
 * Escape: cierra la ayuda si está abierta y, si no, la capa que se abrió
 * última. No hace nada si no hay nada abierto.
 */
export function pulsarEscape(estado) {
  if (estado.ayudaAbierta) {
    return { ayudaAbierta: false }
  }
  if (estado.ultimaCapa && estado.capas[estado.ultimaCapa]) {
    return { capas: { ...estado.capas, [estado.ultimaCapa]: false } }
  }
  const abierta = CAPAS.find((capa) => estado.capas[capa])
  return abierta ? { capas: { ...estado.capas, [abierta]: false } } : {}
}

/**
 * El ancho de la ventana cambió. En un celular no hay capas ni panel: se
 * cierran las dos.
 */
export function cambiarAncho(estado, ancho) {
  if (categoriaDeAncho(ancho) === 'celular') {
    return { ancho, capas: { ajustes: false, resultados: false } }
  }
  return { ancho }
}

/** Se pasó al modo visita o se volvió al modo normal: las pestañas se acomodan. */
export function cambiarDeModo(estado, enLaVisita) {
  return {
    pestanaResultados: enLaVisita ? 'visita' : 'metricas',
    pestanaHoja: pestanaValida(
      estado.pestanaHoja === 'metricas' && enLaVisita ? 'visita' : estado.pestanaHoja,
      pestanasDeLaHoja(enLaVisita),
    ),
  }
}

/* ------------------------------------------------- el alto del panel de Resultados -- */

/** Alto de la barra del panel de Resultados cuando está plegado. */
export const ALTO_DE_LA_BARRA_PLEGADA = 40
/** El alto mínimo del panel desplegado. */
export const ALTO_MINIMO_DEL_PANEL = 200
/** El alto al que lleva el doble clic en el borde, la primera vez. */
export const ALTO_COMPACTO_DEL_PANEL = 260
/** El panel inicial mide el 34 % de la ventana, entre 240 y 380 px. */
export const PROPORCION_INICIAL_DEL_PANEL = 0.34
export const ALTO_INICIAL_MINIMO = 240
export const ALTO_INICIAL_MAXIMO = 380
/** Como mucho, el 60 % del alto de la ventana. */
export const PROPORCION_MAXIMA_DEL_PANEL = 0.6

const aEntero = (valor) => Math.round(Number.isFinite(valor) ? valor : 0)

/** El alto con el que se despliega el panel la primera vez, según el alto de la ventana. */
export function altoInicialDelPanel(altoDeVentana) {
  const deseado = aEntero(altoDeVentana * PROPORCION_INICIAL_DEL_PANEL)
  return Math.min(ALTO_INICIAL_MAXIMO, Math.max(ALTO_INICIAL_MINIMO, deseado))
}

/** El mayor alto que puede tener el panel con esta ventana (nunca menos que el mínimo). */
export function altoMaximoDelPanel(altoDeVentana) {
  return Math.max(ALTO_MINIMO_DEL_PANEL, Math.floor(altoDeVentana * PROPORCION_MAXIMA_DEL_PANEL))
}

/** Un alto del panel dentro de lo permitido: de 200 px al 60 % del alto de la ventana. */
export function limitarAltoDelPanel(alto, altoDeVentana) {
  const entero = aEntero(alto)
  return Math.min(altoMaximoDelPanel(altoDeVentana), Math.max(ALTO_MINIMO_DEL_PANEL, entero))
}

/**
 * Lo que pasa con un doble clic en el borde del panel: alterna entre 260 px y
 * el último alto elegido. `ultimo` es el último alto que la persona dejó
 * (por arrastre o con el teclado); si nunca eligió otro distinto de 260, el
 * doble clic lleva al alto inicial.
 *
 * @returns {{ alto: number, ultimo: number }}
 */
export function altoTrasDobleClic({ actual, ultimo, altoDeVentana }) {
  const compacto = limitarAltoDelPanel(ALTO_COMPACTO_DEL_PANEL, altoDeVentana)
  if (actual !== compacto) {
    return { alto: compacto, ultimo: actual }
  }
  const elegido = limitarAltoDelPanel(ultimo, altoDeVentana)
  const vuelta =
    elegido === compacto ? limitarAltoDelPanel(altoInicialDelPanel(altoDeVentana), altoDeVentana) : elegido
  return { alto: vuelta, ultimo: vuelta }
}

/** El alto que se usa ahora: el que la persona eligió o, si no eligió, el inicial; siempre dentro de los límites. */
export function altoEfectivoDelPanel(altoElegido, altoDeVentana) {
  return limitarAltoDelPanel(altoElegido ?? altoInicialDelPanel(altoDeVentana), altoDeVentana)
}

/** Cuánto cambia el alto con cada pulsación de una flecha del teclado. */
export const PASO_DE_TECLADO_DEL_PANEL = 20

/* ------------------------------------------------------------ la hoja del celular -- */

/** La hoja inferior pasa a la altura siguiente: recogida, media, alta y otra vez recogida. */
export function siguienteAlturaDeLaHoja(altura) {
  const i = ALTURAS_DE_LA_HOJA.indexOf(altura)
  return ALTURAS_DE_LA_HOJA[(i + 1) % ALTURAS_DE_LA_HOJA.length]
}

/** Cuántos píxeles hay que arrastrar el asa para que cuente como cambio de altura. */
export const ARRASTRE_MINIMO_PX = 40

/**
 * La altura de la hoja tras arrastrar su asa `desplazamientoY` píxeles
 * (negativo es hacia arriba). Un arrastre corto no la cambia; uno largo la
 * sube o la baja un solo escalón, y no se pasa de los extremos.
 */
export function alturaTrasArrastrar(altura, desplazamientoY, minimo = ARRASTRE_MINIMO_PX) {
  const i = ALTURAS_DE_LA_HOJA.indexOf(altura)
  if (i < 0 || !Number.isFinite(desplazamientoY)) {
    return altura
  }
  if (desplazamientoY <= -minimo) {
    return ALTURAS_DE_LA_HOJA[Math.min(i + 1, ALTURAS_DE_LA_HOJA.length - 1)]
  }
  if (desplazamientoY >= minimo) {
    return ALTURAS_DE_LA_HOJA[Math.max(i - 1, 0)]
  }
  return altura
}

const anchoInicial = () =>
  typeof window !== 'undefined' && Number.isFinite(window.innerWidth)
    ? window.innerWidth
    : UMBRAL_DE_ESCRITORIO

const altoInicialDeLaVentana = () =>
  typeof window !== 'undefined' && Number.isFinite(window.innerHeight) ? window.innerHeight : 768

export const useInterfaz = create((set, get) => ({
  ancho: anchoInicial(),
  alto: altoInicialDeLaVentana(),
  capas: { ajustes: false, resultados: false },
  ultimaCapa: null,
  pestanaResultados: 'metricas',
  // El alto del panel de Resultados que eligió la persona (null: el inicial) y
  // el anterior a un doble clic, para poder volver. Duran lo que la sesión.
  altoDelPanel: null,
  ultimoAltoDelPanel: null,
  // Mientras se arrastra el borde del panel, la cámara no se recalcula; cada
  // cambio de alto que no sigue una animación de CSS sube esta cuenta para que
  // la cámara pase al nuevo encuadre con una transición.
  arrastrandoElPanel: false,
  ajustesDelPanel: 0,
  ayudaAbierta: false,
  hoja: 'recogida',
  pestanaHoja: 'ajustes',

  alternarCapa: (capa) => set((estado) => alternarCapa(estado, capa)),
  cerrarCapa: (capa) => set((estado) => cerrarCapa(estado, capa)),
  pulsarEscape: () => set((estado) => pulsarEscape(estado)),
  cambiarAncho: (ancho) => set((estado) => cambiarAncho(estado, ancho)),
  cambiarAlto: (alto) => set({ alto }),
  cambiarDeModo: (enLaVisita) => set((estado) => cambiarDeModo(estado, enLaVisita)),

  elegirPestanaDeResultados: (pestana) => set({ pestanaResultados: pestana }),

  /** El alto del panel que se está usando ahora, con los límites de esta ventana. */
  altoActualDelPanel: () => altoEfectivoDelPanel(get().altoDelPanel, get().alto),
  /** Fija el alto del panel (al soltar el arrastre, con el teclado). */
  fijarAltoDelPanel: (alto) =>
    set((estado) => ({
      altoDelPanel: limitarAltoDelPanel(alto, estado.alto),
      ajustesDelPanel: estado.ajustesDelPanel + 1,
    })),
  alternarAltoDelPanel: () =>
    set((estado) => {
      const actual = altoEfectivoDelPanel(estado.altoDelPanel, estado.alto)
      const { alto, ultimo } = altoTrasDobleClic({
        actual,
        ultimo: estado.ultimoAltoDelPanel ?? altoInicialDelPanel(estado.alto),
        altoDeVentana: estado.alto,
      })
      return { altoDelPanel: alto, ultimoAltoDelPanel: ultimo, ajustesDelPanel: estado.ajustesDelPanel + 1 }
    }),
  empezarAArrastrarElPanel: () => set({ arrastrandoElPanel: true }),
  terminarDeArrastrarElPanel: (alto) =>
    set((estado) => ({
      arrastrandoElPanel: false,
      altoDelPanel: limitarAltoDelPanel(alto, estado.alto),
      ajustesDelPanel: estado.ajustesDelPanel + 1,
    })),

  abrirAyuda: () => set({ ayudaAbierta: true }),
  cerrarAyuda: () => set({ ayudaAbierta: false }),

  elegirPestanaDeLaHoja: (pestana) => set({ pestanaHoja: pestana }),
  elegirAlturaDeLaHoja: (altura) => {
    if (ALTURAS_DE_LA_HOJA.includes(altura)) {
      set({ hoja: altura })
    }
  },
  siguienteAlturaDeLaHoja: () =>
    set({ hoja: siguienteAlturaDeLaHoja(get().hoja) }),
}))
