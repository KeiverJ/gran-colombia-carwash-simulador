/**
 * El estado de la interfaz: qué capa está abierta, qué pestaña se ve, si la
 * franja de gráficas está plegada, si la ayuda está abierta y a qué altura
 * está la hoja inferior del celular.
 *
 * Está aparte del store de la simulación a propósito: abrir una capa o cambiar
 * de pestaña no puede tocar el reinicio, la velocidad ni los parámetros. Las
 * reglas son funciones puras para poder probarlas con Node, sin navegador.
 */

import { create } from 'zustand'

/** Menos de este ancho (en píxeles) es un celular: no hay capas, hay una hoja inferior. */
export const UMBRAL_DE_CELULAR = 768
/** Con este ancho o más caben las dos capas a la vez; con menos, una sola. */
export const UMBRAL_DE_ESCRITORIO = 1200

export const CAPAS = ['ajustes', 'resultados']
export const ALTURAS_DE_LA_HOJA = ['recogida', 'media', 'alta']

/** 'celular', 'medio' (de 768 a 1199 px) o 'escritorio'. */
export function categoriaDeAncho(ancho) {
  if (ancho < UMBRAL_DE_CELULAR) {
    return 'celular'
  }
  return ancho < UMBRAL_DE_ESCRITORIO ? 'medio' : 'escritorio'
}

/** Las pestañas de la capa de Resultados: la de métricas no existe en la visita. */
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
 * Abre una capa, o la cierra si ya estaba abierta. Entre 768 y 1199 px abrir
 * una cierra la otra, para que las dos no tapen la escena; en un celular no
 * hay capas.
 */
export function alternarCapa(estado, capa) {
  if (!CAPAS.includes(capa)) {
    throw new RangeError(`La capa debe ser "ajustes" o "resultados"; se recibió ${capa}.`)
  }
  const categoria = categoriaDeAncho(estado.ancho)
  if (categoria === 'celular') {
    return {}
  }
  const abierta = estado.capas[capa]
  if (abierta) {
    return { capas: { ...estado.capas, [capa]: false } }
  }
  const capas =
    categoria === 'escritorio'
      ? { ...estado.capas, [capa]: true }
      : { ajustes: false, resultados: false, [capa]: true }
  return { capas, ultimaCapa: capa }
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
 * El ancho de la ventana cambió. Al pasar a una pantalla donde caben menos
 * capas se cierra la que sobra, y en un celular se cierran las dos.
 */
export function cambiarAncho(estado, ancho) {
  const categoria = categoriaDeAncho(ancho)
  let capas = estado.capas
  if (categoria === 'celular') {
    capas = { ajustes: false, resultados: false }
  } else if (categoria === 'medio' && capas.ajustes && capas.resultados) {
    const sobra = estado.ultimaCapa === 'ajustes' ? 'resultados' : 'ajustes'
    capas = { ...capas, [sobra]: false }
  }
  return { ancho, capas }
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

export const useInterfaz = create((set, get) => ({
  ancho: anchoInicial(),
  capas: { ajustes: false, resultados: false },
  ultimaCapa: null,
  pestanaResultados: 'metricas',
  franjaPlegada: true,
  ayudaAbierta: false,
  hoja: 'recogida',
  pestanaHoja: 'ajustes',

  alternarCapa: (capa) => set((estado) => alternarCapa(estado, capa)),
  cerrarCapa: (capa) => set((estado) => cerrarCapa(estado, capa)),
  pulsarEscape: () => set((estado) => pulsarEscape(estado)),
  cambiarAncho: (ancho) => set((estado) => cambiarAncho(estado, ancho)),
  cambiarDeModo: (enLaVisita) => set((estado) => cambiarDeModo(estado, enLaVisita)),

  elegirPestanaDeResultados: (pestana) => set({ pestanaResultados: pestana }),
  alternarFranja: () => set((estado) => ({ franjaPlegada: !estado.franjaPlegada })),
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
