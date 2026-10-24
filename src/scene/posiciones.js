/**
 * Dónde va cada cosa dentro del local, en metros.
 *
 * Son funciones puras a propósito: es lo único de la escena que se puede
 * probar sin navegador, y es donde se cuelan los errores silenciosos —placas
 * que se solapan al pasar de 6 a 7, una fila que se sale del local, un rótulo
 * de sobrantes que cuenta mal—.
 *
 * El local está en una esquina, con la Av. Gran Colombia a lo largo del borde
 * del fondo —enfrente de los puestos de acabado— y la Av. Guaimaral a lo largo
 * de todo el borde izquierdo. Las dos se juntan en la esquina del fondo a la
 * izquierda, que es donde está el local.
 *
 * Ejes: Y hacia arriba; **Z crece hacia el frente**, el borde abierto desde
 * donde mira la cámara, y decrece hacia el fondo, donde están el acabado, la
 * salida y la Av. Gran Colombia.
 *
 * El sentido de la Z no es un capricho. Mirando el local de frente, la derecha
 * de la pantalla es la X positiva solo si la cámara está en la Z positiva; con
 * la Z al revés todo saldría espejado, y la Av. Guaimaral, que va por el borde
 * izquierdo, aparecería a la derecha.
 */

/** Medidas del local. */
export const LOCAL = {
  ancho: 22,
  fondo: 24,
  // Dónde está cada zona a lo largo del eje Z, del frente hacia el fondo.
  zFrente: 12,
  zFilaLavado: 7.5,
  zPlacasAdelante: 4,
  zPlacasAtras: 0,
  zFilaAcabado: -4.5,
  zPuestos: -8.5,
  zSalida: -12,
}

/** Tamaño de una placa de lavado o de un puesto de acabado. */
export const SERVIDOR = { ancho: 2.2, fondo: 3, altoLibre: 0.12, altoOcupado: 0.5 }

/**
 * Franja a lo ancho donde se reparten placas y puestos.
 *
 * No ocupa todo el local: deja libre el pasillo de la izquierda, que es por
 * donde entran las motos de las dos avenidas —ambas quedan de ese lado— y por
 * donde se rodea la fila de adelante para llegar a la de atrás.
 */
export const ZONA_DE_SERVIDORES = { centroX: 2, ancho: 17 }

/** El pasillo de circulación, entre el borde izquierdo y las losas. */
export const PASILLO = {
  centroX: -9,
  ancho: 4,
}

/**
 * Lo que ocupa una moto dibujada. No es decorativo: con esto se comprueba que
 * no se monta sobre otra en la fila, que no se sale del local, que al posarse
 * no tapa el número de su losa y a qué altura tiene que ir la cámara para que
 * la fila de adelante no tape la de atrás.
 *
 * El alto llega hasta arriba del indicador del plan, que es la pieza más alta.
 */
export const MOTO = { largo: 1.7, ancho: 0.75, alto: 1.55 }

/** Dónde se pinta el número dentro de la losa, medido desde su centro. */
export const NUMERO_EN_LA_LOSA = { z: SERVIDOR.fondo / 2 - 0.5, lado: 0.9 }

/**
 * Cuánto se echa atrás la moto al posarse en una losa.
 *
 * Centrada taparía el número, que va pegado al borde de delante. Retranqueada
 * medio metro, el morro se queda corto y el número se sigue leyendo.
 */
export const RETRANQUEO_EN_LA_LOSA = 0.5

/** Dónde se posa una moto sobre una losa, sin tapar su número. */
export function posadaEnLaLosa([x, y, z]) {
  return [x, y, z - RETRANQUEO_EN_LA_LOSA]
}

/**
 * Separación entre motos que esperan en fila, de centro a centro.
 *
 * Tiene que ser mayor que el largo de la moto o se montarían unas sobre otras,
 * que es lo que pasaba cuando la fila se dibujaba con cajas más cortas.
 */
export const SEPARACION_EN_FILA = MOTO.largo + 0.3

/**
 * Dónde espera la primera moto de una fila; las demás se van hacia la
 * izquierda, hacia el pasillo.
 *
 * La cabeza va en el extremo contrario al pasillo a propósito: las motos
 * llegan **por** el pasillo y se ponen al final de la cola, así que si la cola
 * creciera al revés cada moto que llega tendría que atravesarla entera para
 * llegar a su sitio.
 */
export const X_CABEZA_DE_FILA = LOCAL.ancho / 2 - MOTO.largo / 2 - 0.6

/**
 * Cuántas motos de una fila se dibujan como mucho.
 *
 * No es un número puesto a mano: es cuántas caben **sin meterse en el
 * pasillo**. Con la etapa 2 saturada la fila crece sin límite, y lo que la
 * corta antes de invadir el pasillo es este tope; el resto se cuenta en el
 * rótulo de sobrantes.
 */
export const TOPE_DE_MOTOS_DIBUJADAS = cuantasMotosCabenEnLaFila()

/** Hasta dónde puede crecer una fila sin pisar el pasillo. */
export function cuantasMotosCabenEnLaFila() {
  const topeIzquierdo = PASILLO.centroX + PASILLO.ancho / 2 + MOTO.largo / 2
  const sitio = X_CABEZA_DE_FILA - topeIzquierdo
  return Math.max(1, Math.floor(sitio / SEPARACION_EN_FILA) + 1)
}

/** Ancho de la calzada de cada avenida. */
export const ANCHO_DE_CALLE = 5

const X_BORDE_IZQUIERDO = -LOCAL.ancho / 2
const EJE_DE_GUAIMARAL = X_BORDE_IZQUIERDO - ANCHO_DE_CALLE / 2
const EJE_DE_GRAN_COLOMBIA = LOCAL.zSalida - ANCHO_DE_CALLE / 2

/**
 * Las dos avenidas que rodean el local, cada una con su calzada, su rótulo y
 * la entrada por la que meten las motos.
 *
 * Los nombres van **pintados en la calzada**, como los de una calle de
 * verdad, y por eso a ras de suelo: un letrero de pie mira a la cámara y crece
 * al acercarse, hasta tapar media escena. Pintados forman parte del suelo, así
 * que no pueden meterse nunca entre la cámara y el lavadero.
 */
export const AVENIDAS = {
  granColombia: {
    clave: 'granColombia',
    nombre: 'Av. Gran Colombia',
    lado: 'fondo',
    // Entra por el extremo izquierdo del fondo, al lado de la esquina.
    posicion: [PASILLO.centroX, 0, LOCAL.zSalida],
    calle: {
      centro: [-1.5, 0, EJE_DE_GRAN_COLOMBIA],
      ancho: LOCAL.ancho + 2 * ANCHO_DE_CALLE,
      fondo: ANCHO_DE_CALLE,
    },
    // Corrido a la derecha para no pisar el rótulo de la salida, que está
    // en el centro del borde del fondo.
    rotulo: [2, 0.02, EJE_DE_GRAN_COLOMBIA],
  },
  guaimaral: {
    clave: 'guaimaral',
    nombre: 'Av. Guaimaral',
    lado: 'izquierda',
    // Entra cerca del frente, que es donde está la fila del lavado.
    posicion: [X_BORDE_IZQUIERDO, 0, 8],
    calle: {
      centro: [EJE_DE_GUAIMARAL, 0, -ANCHO_DE_CALLE / 2],
      ancho: ANCHO_DE_CALLE,
      fondo: LOCAL.fondo + 2 * ANCHO_DE_CALLE,
    },
    rotulo: [EJE_DE_GUAIMARAL, 0.02, 2],
  },
}

/**
 * Donde las motos de las dos avenidas confluyen antes de la fila del lavado.
 * Está en el pasillo, a la altura de la cabeza de la fila.
 */
export const POSICION_ENCUENTRO = [PASILLO.centroX, 0, 8]

/** La rejilla de desagüe, al frente de las placas y a lo ancho de su zona. */
export const REJILLA_DE_DESAGUE = {
  centroX: ZONA_DE_SERVIDORES.centroX,
  z: 6.2,
  ancho: ZONA_DE_SERVIDORES.ancho,
  fondo: 0.7,
}

/**
 * Las cuatro columnas del techo, en las esquinas de la zona cubierta.
 * Solo columnas: un techo macizo taparía justo lo que hay que ver.
 *
 * Van **en el orden del perímetro**, no agrupadas por lado: así, al unir cada
 * una con la siguiente, las vigas recorren el contorno en vez de cruzarse en
 * aspa por el medio de la escena.
 */
export const COLUMNAS_DEL_TECHO = [
  [ZONA_DE_SERVIDORES.centroX - ZONA_DE_SERVIDORES.ancho / 2, 0, 6.5],
  [ZONA_DE_SERVIDORES.centroX + ZONA_DE_SERVIDORES.ancho / 2, 0, 6.5],
  [ZONA_DE_SERVIDORES.centroX + ZONA_DE_SERVIDORES.ancho / 2, 0, -10.5],
  [ZONA_DE_SERVIDORES.centroX - ZONA_DE_SERVIDORES.ancho / 2, 0, -10.5],
]

/**
 * Reparte `total` cosas de ancho fijo a lo ancho de la zona, centradas.
 * El paso se calcula con el ancho disponible, así que al pasar de 3 a 4 se
 * acercan pero nunca se solapan.
 */
function repartirALoAncho(indice, total, z) {
  const anchoUtil = ZONA_DE_SERVIDORES.ancho - SERVIDOR.ancho
  const paso = total > 1 ? anchoUtil / (total - 1) : 0
  const x = ZONA_DE_SERVIDORES.centroX + (total > 1 ? -anchoUtil / 2 + indice * paso : 0)
  return [x, 0, z]
}

/**
 * Cómo se reparten las placas entre las dos filas.
 *
 * La de adelante lleva la mitad redondeada hacia arriba, así que con un
 * número impar es la de adelante la que tiene una más.
 *
 * @returns {{ adelante: number, atras: number }}
 */
export function repartoDePlacas(total) {
  exigirTotal(total, 'placa')
  return { adelante: Math.ceil(total / 2), atras: Math.floor(total / 2) }
}

/**
 * Posición de la placa de lavado número `indice` (empezando en 0).
 *
 * Las primeras van en la fila de adelante y las demás detrás, cada una en la
 * misma X que la que le toca por orden: con 6 placas la 4 queda detrás de la
 * 1, la 5 detrás de la 2 y la 6 detrás de la 3.
 *
 * @returns {[number, number, number]}
 */
export function posicionDePlaca(indice, total) {
  exigirIndice(indice, total, 'placa')
  const { adelante } = repartoDePlacas(total)
  const esDeAtras = indice >= adelante
  // Las de atrás se reparten con el paso de la fila de adelante, no con el
  // suyo: es lo que hace que compartan la X con la que les corresponde.
  const columna = esDeAtras ? indice - adelante : indice
  const z = esDeAtras ? LOCAL.zPlacasAtras : LOCAL.zPlacasAdelante
  return repartirALoAncho(columna, adelante, z)
}

/** Posición del puesto de acabado número `indice` (empezando en 0). */
export function posicionDePuesto(indice, total) {
  exigirIndice(indice, total, 'puesto')
  return repartirALoAncho(indice, total, LOCAL.zPuestos)
}

function exigirTotal(total, que) {
  if (!Number.isInteger(total) || total < 1) {
    throw new RangeError(`El número de ${que}s debe ser un entero mayor o igual que 1.`)
  }
}

function exigirIndice(indice, total, que) {
  exigirTotal(total, que)
  if (!Number.isInteger(indice) || indice < 0 || indice >= total) {
    throw new RangeError(`El índice de ${que} ${indice} está fuera de 0..${total - 1}.`)
  }
}

/**
 * Dónde espera la moto que ocupa el lugar `indice` de una fila.
 * La fila crece hacia la izquierda, hacia el pasillo por donde llegan las
 * motos: la que acaba de llegar se queda al final, sin cruzar a las demás.
 *
 * @param {number} indice 0 es la primera en entrar
 * @param {'lavado'|'acabado'} etapa
 */
export function posicionEnFila(indice, etapa) {
  if (etapa !== 'lavado' && etapa !== 'acabado') {
    throw new RangeError(`La etapa debe ser "lavado" o "acabado"; se recibió ${etapa}.`)
  }
  const z = etapa === 'lavado' ? LOCAL.zFilaLavado : LOCAL.zFilaAcabado
  const x = X_CABEZA_DE_FILA - indice * SEPARACION_EN_FILA
  return [x, 0, z]
}

/**
 * Dónde va el rótulo de "+X motos más" de una fila.
 *
 * En el sitio que ocuparía la primera moto que **no** se dibuja: así marca
 * justo donde se corta la fila. Va más alto que las motos para no quedar
 * tapado por ellas.
 */
export function posicionDelRotuloDeSobrantes(etapa) {
  const [x, , z] = posicionEnFila(TOPE_DE_MOTOS_DIBUJADAS, etapa)
  return [x, MOTO.alto + 0.7, z]
}

/** Por dónde entra una moto. Decorativo: la visita no registró la avenida. */
export function entradaDeLaMoto(n) {
  const avenida = n % 2 === 0 ? AVENIDAS.granColombia : AVENIDAS.guaimaral
  return { ...avenida }
}

/** Por dónde salen todas. */
export const POSICION_SALIDA = [0, 0, LOCAL.zSalida]

/**
 * Qué motos de una fila se dibujan y cuántas quedan sin dibujar.
 *
 * Con la etapa 2 saturada la fila llega a miles: dibujarlas una por una sería
 * inútil y lento. El tope y el número de sobrantes salen de aquí, juntos, para
 * que no puedan descuadrarse entre sí.
 *
 * @returns {{ visibles: Array, sobrantes: number }}
 */
export function motosVisibles(cola, tope = TOPE_DE_MOTOS_DIBUJADAS) {
  const visibles = cola.slice(0, exigirTope(tope))
  return { visibles, sobrantes: sobrantesDe(cola.length, tope) }
}

/**
 * Cuántas motos de una fila quedan sin dibujar, sabiendo solo cuántas hay.
 * Comparte el tope con `motosVisibles` para que el rótulo y lo dibujado no
 * puedan descuadrarse entre sí.
 */
export function sobrantesDe(cuantasEnFila, tope = TOPE_DE_MOTOS_DIBUJADAS) {
  return Math.max(0, cuantasEnFila - exigirTope(tope))
}

function exigirTope(tope) {
  if (!Number.isInteger(tope) || tope < 0) {
    throw new RangeError('El tope de motos dibujadas debe ser un entero mayor o igual que 0.')
  }
  return tope
}
