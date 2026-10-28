/**
 * Las vistas de la cámara y sus límites.
 *
 * Están aparte y sin nada de Three.js para poder comprobarlas con pruebas: la
 * altura de la vista inicial no es un número puesto a ojo, sino uno que supera
 * la altura mínima que hace falta para ver la fila de atrás por encima de la
 * de adelante, y eso se calcula aquí.
 */

import {
  COLUMNAS_DEL_TECHO,
  FRANJA_DE_ESPERA,
  LOCAL,
  MOTO,
  RETRANQUEO_EN_LA_LOSA,
  SERVIDOR,
  TECHO,
} from './posiciones.js'

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

/**
 * Hasta dónde deja moverse el control.
 *
 * El ángulo polar se mide desde arriba: 90° sería a ras de suelo, así que algo
 * menos impide meterse por debajo del piso. Las distancias acotan el
 * acercamiento por los dos lados.
 */
export const LIMITES_DE_CAMARA = {
  distanciaMinima: 10,
  // Un celular en vertical necesita alejarse más de 60 m para que el local entre a lo ancho.
  distanciaMaxima: 110,
  anguloPolarMaximo: 1.45,
}

/** La diagonal del local, para saber si una distancia lo deja ver entero. */
export const DIAGONAL_DEL_LOCAL = Math.hypot(LOCAL.ancho, LOCAL.fondo)

/* ------------------------------------------------------------------------- *
 * Encuadre con las capas abiertas
 *
 * Las capas laterales flotan encima del lienzo y no lo achican. Para que el
 * local se vea completo y centrado en lo que queda libre, la cámara dibuja
 * en un "cuadro virtual" más chico que el lienzo y lo coloca en el centro del
 * área libre (`camera.setViewOffset`). No cambia la posición ni la
 * orientación de la cámara: solo qué parte del cuadro cae en el lienzo.
 * ------------------------------------------------------------------------- */

/** El alto del techo del local: el de las columnas y las vigas (`TECHO` en `posiciones.js`). */
export const ALTO_DEL_TECHO = TECHO.alto

/**
 * Lo que se llama «el local completo»: de la Guaimaral, por el borde izquierdo,
 * a la franja de espera del lado derecho, y del fondo al frente, del suelo al
 * techo.
 */
export const CAJA_DEL_LOCAL = {
  minX: -LOCAL.ancho / 2,
  maxX: FRANJA_DE_ESPERA.x0 + FRANJA_DE_ESPERA.ancho,
  minZ: -LOCAL.fondo / 2,
  maxZ: LOCAL.fondo / 2,
  alto: ALTO_DEL_TECHO,
}

/** Las ocho esquinas de una caja `{ minX, maxX, minZ, maxZ, alto }`. */
export function esquinasDeLaCaja({ minX, maxX, minZ, maxZ, alto }) {
  const esquinas = []
  for (const x of [minX, maxX]) {
    for (const z of [minZ, maxZ]) {
      for (const y of [0, alto]) {
        esquinas.push([x, y, z])
      }
    }
  }
  return esquinas
}

/**
 * Los puntos que tienen que verse para decir que se ve el local completo:
 * - el techo y las columnas (con el vuelo del techo);
 * - la pared del fondo, de punta a punta;
 * - el borde izquierdo, por donde llega la Guaimaral, del fondo hasta el frente de las placas;
 * - la franja de espera entera, de punta a punta, que es donde está la fila del lavado.
 *
 * No incluye la esquina delantera izquierda: ahí solo hay piso vacío, y pedirla
 * aleja la cámara y achica lo que importa.
 */
export const ESQUINAS_DEL_LOCAL = [
  ...esquinasDeLaCaja({
    minX: Math.min(...COLUMNAS_DEL_TECHO.map(([x]) => x)) - TECHO.vuelo,
    maxX: Math.max(...COLUMNAS_DEL_TECHO.map(([x]) => x)) + TECHO.vuelo,
    minZ: Math.min(...COLUMNAS_DEL_TECHO.map(([, , z]) => z)) - TECHO.vuelo,
    maxZ: Math.max(...COLUMNAS_DEL_TECHO.map(([, , z]) => z)) + TECHO.vuelo,
    alto: ALTO_DEL_TECHO + TECHO.grosor,
  }),
  [CAJA_DEL_LOCAL.minX, 0, CAJA_DEL_LOCAL.minZ],
  [CAJA_DEL_LOCAL.minX, 0, LOCAL.zPlacasAdelante],
  [CAJA_DEL_LOCAL.maxX, 0, CAJA_DEL_LOCAL.minZ],
  [CAJA_DEL_LOCAL.maxX, 0, CAJA_DEL_LOCAL.maxZ],
  [FRANJA_DE_ESPERA.x0, 0, CAJA_DEL_LOCAL.minZ],
  [FRANJA_DE_ESPERA.x0, 0, CAJA_DEL_LOCAL.maxZ],
]

/** Qué parte del área libre se deja vacía a lo ancho (total, repartida a los dos lados). */
const MARGEN_A_LO_ANCHO = 0.06

/**
 * Y a lo alto: mínimo, porque ya se descuentan la fila de controles de arriba
 * y los indicadores y el panel de abajo.
 */
const MARGEN_A_LO_ALTO = 0.04

/**
 * Dónde cae un punto del mundo en la imagen de una cámara, en coordenadas
 * normalizadas: de -1 a 1 en los dos ejes, con (0, 0) en el centro y la x
 * hacia la derecha y la y hacia arriba. Devuelve `null` si el punto queda
 * detrás de la cámara.
 *
 * @param {number[]} punto
 * @param {{ posicion: number[], objetivo: number[] }} vista
 * @param {number} aspecto ancho / alto de la imagen
 */
export function proyectarPunto(punto, { posicion, objetivo }, aspecto) {
  const resta = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
  const producto = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
  const cruz = (a, b) => [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ]
  const unitario = (a) => {
    const largo = Math.hypot(...a)
    return a.map((componente) => componente / largo)
  }

  const adelante = unitario(resta(objetivo, posicion))
  const derecha = unitario(cruz(adelante, [0, 1, 0]))
  const arriba = cruz(derecha, adelante)
  const v = resta(punto, posicion)
  const profundidad = producto(v, adelante)
  if (profundidad <= 1e-6) {
    return null
  }
  const medioAlto = Math.tan((CAMPO_DE_VISION / 2) * (Math.PI / 180))
  return [
    producto(v, derecha) / (profundidad * medioAlto * aspecto),
    producto(v, arriba) / (profundidad * medioAlto),
  ]
}

/**
 * El rectángulo que ocupa el local en la imagen de una vista, en coordenadas
 * normalizadas (ver `proyectarPunto`).
 */
export function cajaDelLocalEnPantalla(vista, aspecto, esquinas = ESQUINAS_DEL_LOCAL) {
  const puntos = esquinas.map((esquina) => proyectarPunto(esquina, vista, aspecto)).filter(Boolean)
  const xs = puntos.map(([x]) => x)
  const ys = puntos.map(([, y]) => y)
  return { minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) }
}

/* ------------------------------------------------------------------------- *
 * Las cuatro vistas
 *
 * Ninguna tiene una distancia puesta a ojo: cada una se calcula con la
 * proporción del lienzo, buscando la distancia más corta a la que lo que tiene
 * que verse cabe entero (`vistaQueEncuadra`). Por eso el local completo se ve
 * igual de completo en una pantalla ancha que en un celular en vertical.
 * ------------------------------------------------------------------------- */

/**
 * Cuánto aire se deja en el borde del lienzo, a cada lado (de 0 a 1 de medio
 * lienzo). Es un poco más que el margen del encuadre de las capas, para que
 * con el panel plegado la vista general no tenga que achicarse.
 */
const MARGEN_DE_LA_VISTA = 0.07

/** A qué altura se mira: un poco por encima del piso, a la altura de las motos. */
const ALTO_DEL_OBJETIVO = 0.8

/**
 * La vista que pone la cámara en la dirección dada (grados sobre el suelo y
 * grados hacia la derecha del frente) a la distancia más corta a la que la caja
 * cabe entera, con el margen, en un lienzo de la proporción dada. Mira al centro
 * de la caja.
 *
 * @param {{ minX: number, maxX: number, minZ: number, maxZ: number, alto: number } | number[][]} que
 *   la caja a encuadrar, o la lista de puntos que tienen que verse
 * @param {object} medidas
 * @param {number} medidas.aspecto ancho / alto del lienzo
 * @param {number} medidas.elevacion grados sobre el suelo (90 es desde arriba)
 * @param {number} [medidas.azimut] grados hacia la derecha: 0 mira de frente
 */
export function vistaQueEncuadra(que, { aspecto, elevacion, azimut = 0, margen = MARGEN_DE_LA_VISTA }) {
  const esquinas = Array.isArray(que) ? que : esquinasDeLaCaja(que)
  const el = (elevacion * Math.PI) / 180
  const az = (azimut * Math.PI) / 180
  const hacia = [Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el)]
  const xs = esquinas.map(([x]) => x)
  const zs = esquinas.map(([, , z]) => z)
  const objetivo = [
    (Math.min(...xs) + Math.max(...xs)) / 2,
    ALTO_DEL_OBJETIVO,
    (Math.min(...zs) + Math.max(...zs)) / 2,
  ]
  const enLaVista = (distancia) => {
    const vista = { posicion: objetivo.map((c, i) => c + hacia[i] * distancia), objetivo }
    return esquinas.every((esquina) => {
      const punto = proyectarPunto(esquina, vista, aspecto)
      return punto && Math.abs(punto[0]) <= 1 - margen && Math.abs(punto[1]) <= 1 - margen
    })
  }
  let corta = 1
  let larga = 600
  for (let i = 0; i < 48; i += 1) {
    const media = (corta + larga) / 2
    if (enLaVista(media)) larga = media
    else corta = media
  }
  return { posicion: objetivo.map((c, i) => c + hacia[i] * larga), objetivo }
}

/**
 * La vista general: baja y de frente, como se ve el lavadero desde la acera,
 * pero no a ras de suelo: a 12° la fila de adelante no tapa la de atrás. Muestra
 * el local completo, con la franja de espera del lado derecho.
 */
export const ELEVACION_DE_LA_VISTA_GENERAL = 12

/**
 * En una pantalla estrecha (un celular en vertical) la vista de frente deja el
 * local pequeño y lejos, con mucho cielo: el ancho del lienzo lo manda la esquina
 * más cercana a la cámara y el alto sobra. Por eso, a medida que el lienzo se
 * hace más alto que ancho, la cámara sube —hasta `ELEVACION_EN_VERTICAL`— y se
 * acerca: desde más arriba hay menos diferencia entre lo cercano y lo lejano, y
 * el local y la franja de espera llenan el ancho.
 */
export const ELEVACION_EN_VERTICAL = 55

/** A partir de qué proporción (ancho / alto) la vista general empieza a subir, y en cuál llega al máximo. */
const ASPECTO_DONDE_EMPIEZA_A_SUBIR = 0.9
const ASPECTO_DONDE_LLEGA_AL_MAXIMO = 0.5

/** Cuánto aire se deja en los bordes en una pantalla estrecha: ahí cada píxel de ancho cuenta. */
const MARGEN_EN_VERTICAL = 0.03

function pesoEnVertical(aspecto) {
  const peso = (ASPECTO_DONDE_EMPIEZA_A_SUBIR - aspecto) / (ASPECTO_DONDE_EMPIEZA_A_SUBIR - ASPECTO_DONDE_LLEGA_AL_MAXIMO)
  return Math.min(1, Math.max(0, peso))
}

/** La elevación de la vista general para un lienzo de la proporción dada. */
export function elevacionDeLaVistaGeneral(aspecto) {
  return ELEVACION_DE_LA_VISTA_GENERAL + (ELEVACION_EN_VERTICAL - ELEVACION_DE_LA_VISTA_GENERAL) * pesoEnVertical(aspecto)
}

export function vistaGeneral(aspecto) {
  const peso = pesoEnVertical(aspecto)
  return {
    nombre: 'Vista general',
    ...vistaQueEncuadra(ESQUINAS_DEL_LOCAL, {
      aspecto,
      elevacion: elevacionDeLaVistaGeneral(aspecto),
      margen: MARGEN_DE_LA_VISTA + (MARGEN_EN_VERTICAL - MARGEN_DE_LA_VISTA) * peso,
    }),
  }
}

/**
 * Lo que enseña «Lavado»: las dos filas de placas, el carril de acceso del
 * frente y la fila de espera del lado derecho (de su cabeza hasta más de la
 * mitad), vistas desde arriba y un poco desde la derecha para que la fila se lea
 * a lo largo. El resto del local queda fuera o en el borde del encuadre.
 */
export const ZONA_DEL_LAVADO = { minX: -8.5, maxX: CAJA_DEL_LOCAL.maxX, minZ: -3, maxZ: LOCAL.zFrente, alto: 2.5 }

/** Lo que enseña «Acabado»: los puestos, su fila, el corredor de detrás y el fondo de la franja. */
export const ZONA_DEL_ACABADO = { minX: -10, maxX: CAJA_DEL_LOCAL.maxX, minZ: -LOCAL.fondo / 2, maxZ: -2, alto: 2.5 }

/**
 * Cuánto se inclinan «Lavado» y «Acabado»: lo bastante para que el techo se aparte
 * del todo (ver `techo.js`) y no tape ni las placas ni los puestos.
 */
export const ELEVACION_DE_LAS_VISTAS_CERCANAS = 40

export function vistaLavado(aspecto) {
  return {
    nombre: 'Lavado',
    ...vistaQueEncuadra(ZONA_DEL_LAVADO, { aspecto, elevacion: ELEVACION_DE_LAS_VISTAS_CERCANAS, azimut: 20 }),
  }
}

export function vistaAcabado(aspecto) {
  return {
    nombre: 'Acabado',
    ...vistaQueEncuadra(ZONA_DEL_ACABADO, { aspecto, elevacion: ELEVACION_DE_LAS_VISTAS_CERCANAS }),
  }
}

/** La planta: desde arriba, como un plano, con el local completo. */
export function vistaPlanta(aspecto) {
  return {
    nombre: 'Planta',
    ...vistaQueEncuadra(
      ESQUINAS_DEL_LOCAL.map(([x, , z]) => [x, 0, z]),
      { aspecto, elevacion: 88.9 },
    ),
  }
}

/**
 * Los cuatro botones de vista, en el orden en que se muestran: `clave` es lo que
 * se pide a la cámara y `nombre`, lo que dice el botón.
 */
export const BOTONES_DE_VISTA = [
  { clave: 'general', nombre: 'Vista general', calcular: vistaGeneral },
  { clave: 'lavado', nombre: 'Lavado', calcular: vistaLavado },
  { clave: 'acabado', nombre: 'Acabado', calcular: vistaAcabado },
  { clave: 'planta', nombre: 'Planta', calcular: vistaPlanta },
]

/** La vista de una clave de `BOTONES_DE_VISTA`, para la proporción dada. */
export function vistaDeLaClave(clave, aspecto) {
  const boton = BOTONES_DE_VISTA.find((b) => b.clave === clave)
  if (!boton) {
    throw new RangeError(`No existe la vista "${clave}".`)
  }
  return boton.calcular(aspecto)
}

/** La proporción con la que arranca el lienzo, antes de saber la de verdad. */
export const ASPECTO_INICIAL = 16 / 9

/** La vista con la que arranca la escena (se rehace con la proporción real en el primer cuadro). */
export const VISTA_INICIAL = vistaGeneral(ASPECTO_INICIAL)

/** A qué distancia de su objetivo está la cámara en una vista. */
export function distanciaDe({ posicion, objetivo }) {
  return Math.hypot(
    posicion[0] - objetivo[0],
    posicion[1] - objetivo[1],
    posicion[2] - objetivo[2],
  )
}

/**
 * Cuánto se inclina una vista sobre el suelo, en grados: 0° es mirar de
 * frente a ras de suelo y 90°, desde arriba.
 */
export function elevacionDeVista({ posicion, objetivo }) {
  const horizontal = Math.hypot(posicion[0] - objetivo[0], posicion[2] - objetivo[2])
  return (Math.atan2(posicion[1] - objetivo[1], horizontal) * 180) / Math.PI
}

/**
 * La caja que ocupa el local completo en la imagen para una cámara con la
 * inclinación dada: la de la vista general, la de la planta o, entre las dos,
 * una mezcla. No depende de cuánto se haya acercado o alejado la persona, así
 * que acercarse a mano no se contrarresta.
 */
export function cajaDelLocalSegunLaElevacion(elevacion, aspecto) {
  const general = vistaGeneral(aspecto)
  const planta = vistaPlanta(aspecto)
  const deLaGeneral = elevacionDeVista(general)
  const deLaPlanta = elevacionDeVista(planta)
  const foto = cajaDelLocalEnPantalla(general, aspecto)
  const plano = cajaDelLocalEnPantalla(planta, aspecto)
  const dado = Number.isFinite(elevacion) ? elevacion : deLaGeneral
  const peso = Math.min(1, Math.max(0, (dado - deLaGeneral) / (deLaPlanta - deLaGeneral)))
  const mezcla = (a, b) => a + (b - a) * peso
  return {
    minX: mezcla(foto.minX, plano.minX),
    maxX: mezcla(foto.maxX, plano.maxX),
    minY: mezcla(foto.minY, plano.minY),
    maxY: mezcla(foto.maxY, plano.maxY),
  }
}

/**
 * Cómo colocar el cuadro virtual de la cámara para que el local entero quepa,
 * centrado, en el área que dejan libre las capas, el panel de Resultados y los
 * controles que flotan.
 *
 * Se descuentan solo lo que tapa de verdad: la capa de Ajustes (`izquierda`),
 * la fila de controles de arriba (`arriba`) y, abajo, el panel de Resultados
 * junto con el panel de indicadores (`abajo`). El margen que se deja alrededor
 * del local es mínimo. La escala nunca pasa de 1 (no agranda). El resultado se
 * entrega en los términos de `PerspectiveCamera.setViewOffset`.
 *
 * @param {object} medidas
 * @param {number} medidas.ancho ancho del lienzo en píxeles
 * @param {number} medidas.alto alto del lienzo en píxeles
 * @param {number} [medidas.izquierda] píxeles que tapa algo por la izquierda
 * @param {number} [medidas.derecha] por la derecha
 * @param {number} [medidas.arriba] por arriba
 * @param {number} [medidas.abajo] por abajo
 * @param {number} [medidas.elevacion] la inclinación de la cámara sobre el suelo, en grados
 *   (por defecto, la de la vista general)
 * @returns {{ escala: number, fullWidth: number, fullHeight: number, offsetX: number,
 *   offsetY: number, width: number, height: number } | null} `null` si el lienzo no tiene tamaño
 */
export function encuadreParaLasCapas({
  ancho,
  alto,
  izquierda = 0,
  derecha = 0,
  arriba = 0,
  abajo = 0,
  elevacion,
}) {
  if (!(ancho > 0) || !(alto > 0)) {
    return null
  }
  const tapa = (valor, tope) => (Number.isFinite(valor) ? Math.min(Math.max(valor, 0), tope) : 0)
  const izq = tapa(izquierda, ancho)
  const der = tapa(derecha, ancho)
  const arr = tapa(arriba, alto)
  const aba = tapa(abajo, alto)
  // Si algo tapa casi todo se deja al menos un píxel: sin NaN ni escalas de cero.
  const libreAncho = Math.max(ancho - izq - der, 1)
  const libreAlto = Math.max(alto - arr - aba, 1)

  const caja = cajaDelLocalSegunLaElevacion(elevacion, ancho / alto)
  const fraccionAncha = (caja.maxX - caja.minX) / 2
  const fraccionAlta = (caja.maxY - caja.minY) / 2
  const escala = Math.min(
    1,
    (libreAncho * (1 - MARGEN_A_LO_ANCHO)) / (ancho * fraccionAncha),
    (libreAlto * (1 - MARGEN_A_LO_ALTO)) / (alto * fraccionAlta),
  )

  const fullWidth = ancho * escala
  const fullHeight = alto * escala
  // El centro del local en el cuadro virtual (de -1 a 1) tiene que caer en el
  // centro del área libre.
  const centroDelLocalX = (caja.minX + caja.maxX) / 2
  const centroDelLocalY = (caja.minY + caja.maxY) / 2
  const centroLibreX = izq + libreAncho / 2
  const centroLibreY = arr + libreAlto / 2
  const centroDelCuadroX = centroLibreX - centroDelLocalX * (fullWidth / 2)
  const centroDelCuadroY = centroLibreY + centroDelLocalY * (fullHeight / 2)

  return {
    escala,
    fullWidth,
    fullHeight,
    offsetX: fullWidth / 2 - centroDelCuadroX,
    offsetY: fullHeight / 2 - centroDelCuadroY,
    width: ancho,
    height: alto,
  }
}
