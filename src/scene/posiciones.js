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
 * El alto llega hasta arriba del marcador del plan, que es la pieza más alta.
 * Cada marcador va 25 cm sobre su moto: en cinco de los seis modelos queda por
 * debajo de este alto, y en la Vespa (1,24 m) llega a 1,81 m con la esfera o el
 * cono, unos 6 cm más. Se deja en 1,75 m porque la vista inicial de la cámara se
 * calcula con este número; se revisa junto con las cámaras.
 */
export const MOTO = { largo: 1.7, ancho: 0.75, alto: 1.75 }

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
 * Dónde espera la primera moto de la fila del acabado; las demás se van hacia
 * la izquierda, hacia el pasillo.
 *
 * La cabeza va en el extremo contrario al pasillo a propósito: las motos
 * llegan **por** el pasillo y se ponen al final de la cola, así que si la cola
 * creciera al revés cada moto que llega tendría que atravesarla entera para
 * llegar a su sitio.
 */
export const X_CABEZA_DE_FILA = LOCAL.ancho / 2 - MOTO.largo / 2 - 0.6

/**
 * Por dónde corre el corredor de detrás de los puestos, entre ellos y la pared
 * del fondo. Va pegado a la pared, a 80 cm de la línea del borde, para pasar a
 * 70 cm de las columnas de esa esquina.
 */
export const Z_DETRAS_DE_LOS_PUESTOS = LOCAL.zSalida + 0.8

/**
 * La franja de piso que va pegada al lado derecho del local, **fuera** de las
 * columnas del techo: ahí espera la fila del lavado. Es del mismo concreto que
 * el piso y no lleva techo.
 */
export const FRANJA_DE_ESPERA = { x0: LOCAL.ancho / 2, ancho: 3.5 }

/**
 * La fila del lavado (cola 1): las motos que llegan y no encuentran placa libre
 * esperan en fila a lo largo del **lado derecho** del local, por fuera de las
 * columnas. La cabeza está cerca de la esquina del frente y la fila crece hacia
 * el fondo; la moto que sale de la cabeza va a la placa que se libera.
 *
 * El frente del local (el lado de las placas de adelante) no es fila: solo es
 * por donde pasa la moto que llega con una placa libre y va derecha a ella.
 */
export const FILA_DEL_LAVADO = {
  // A dos metros del borde del local: deja un carril libre de metro y medio entre la
  // fila y las columnas, por donde pasa la moto que sale de la cabeza o que viene a
  // ponerse al día, y más de cuatro metros y medio entre la cabeza y la columna de la esquina.
  x: FRANJA_DE_ESPERA.x0 + 2,
  zCabeza: LOCAL.zFrente - MOTO.largo / 2 - 0.65,
}

/**
 * El carril libre de la franja de espera, a un lado de la fila: entre ella y las
 * columnas del techo, a media distancia de cada una. Por aquí sube la moto que
 * llega a ponerse en su lugar de la fila (y entra de costado), y por aquí sale de
 * la cabeza la que va a una placa de atrás, sin pasar por encima de las que
 * esperan.
 */
export const X_DEL_CARRIL_DE_LA_FRANJA =
  (LOCAL.ancho / 2 - 0.5 + 0.16 + MOTO.ancho / 2 + FILA_DEL_LAVADO.x - MOTO.ancho) / 2

/**
 * Cuántas motos de una fila se dibujan como mucho.
 *
 * No es un número puesto a mano: es cuántas caben **sin invadir lo que hay
 * detrás**. La del acabado, sin meterse en el pasillo; la del lavado, sin
 * llegar al corredor de detrás de los puestos, por donde entra la moto que
 * viene a unirse a la fila. Con la etapa 2 saturada las filas crecen sin
 * límite: lo que las corta es este tope y el resto se cuenta en el rótulo de
 * sobrantes.
 */
export const TOPE_DE_MOTOS_DIBUJADAS = {
  lavado: cuantasMotosCabenEnLaFila('lavado'),
  acabado: cuantasMotosCabenEnLaFila('acabado'),
}

/** Hasta dónde puede crecer una fila sin pisar lo que tiene detrás. */
export function cuantasMotosCabenEnLaFila(etapa) {
  exigirEtapa(etapa)
  const sitio =
    etapa === 'lavado'
      ? // La última moto deja, hasta la línea del corredor, el largo de una moto
        // para que la que viene a unirse pueda llegar a su sitio.
        FILA_DEL_LAVADO.zCabeza - (Z_DETRAS_DE_LOS_PUESTOS + MOTO.largo)
      : X_CABEZA_DE_FILA - (PASILLO.centroX + PASILLO.ancho / 2 + MOTO.largo / 2)
  return Math.max(1, Math.floor(sitio / SEPARACION_EN_FILA + 1e-6) + 1)
}

/** Ancho de la calzada de cada avenida. */
export const ANCHO_DE_CALLE = 5

/**
 * El terreno base: un disco que cubre el local y las dos avenidas con un
 * margen muy amplio, para que desde ninguna vista se vea el borde del piso.
 *
 * Las avenidas llegan hasta `alcanceDeLasAvenidas` desde el centro, en sus dos
 * extremos. Desde `desvanecerDesde` un velo del color del fondo va tapando el
 * terreno poco a poco, hasta cubrirlo del todo en `desvanecerHasta`: el terreno
 * (`radio`) y las avenidas se pierden en el fondo sin un solo corte. El velo
 * (`radioDelVelo`) es más grande que el terreno para que su borde quede oculto.
 */
export const TERRENO = {
  centro: [-2, 0, -2],
  radio: 110,
  radioDelVelo: 130,
  alcanceDeLasAvenidas: 100,
  desvanecerDesde: 45,
  desvanecerHasta: 90,
}

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
    // Entra por la pared del fondo, a la derecha de la esquina, donde cae la
    // curva verde del mapa (ver `docs/referencias/correspondencia-mapa-planta.md`).
    posicion: [-3.6, 0, LOCAL.zSalida],
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
    // Entra por el borde izquierdo, a media altura del local, donde cae la
    // curva verde del mapa.
    posicion: [X_BORDE_IZQUIERDO, 0, 0],
    calle: {
      centro: [EJE_DE_GUAIMARAL, 0, -ANCHO_DE_CALLE / 2],
      ancho: ANCHO_DE_CALLE,
      fondo: LOCAL.fondo + 2 * ANCHO_DE_CALLE,
    },
    rotulo: [EJE_DE_GUAIMARAL, 0.02, 2],
  },
}

/**
 * Las curvas de entrada de cada avenida, **según `docs/referencias/mapa-entradas.jpg`**
 * (vista desde arriba, con las curvas en verde).
 *
 * El mapa está girado 180° respecto de la planta de la escena, sin espejo: lo
 * que en el mapa queda a la derecha (la Av. Guaimaral) queda a la izquierda en
 * la escena, y lo que queda abajo (la Av. Gran Colombia) queda al fondo.
 * Girado el mapa, las dos curvas dicen:
 * - **Guaimaral**: la moto sube por la avenida hacia el fondo y hace una curva
 *   cerrada hacia la derecha para meterse por la boca de la izquierda.
 * - **Gran Colombia**: viene por la avenida de izquierda a derecha, se aparta
 *   hacia el fondo en una «U» abierta y vuelve para meterse por la boca.
 * La salida es esta misma curva al revés (ver `trayectorias.js`).
 *
 * Cada lista empieza en la avenida y termina **exactamente en la boca**
 * (`AVENIDAS[...].posicion`). Todos los puntos quedan sobre la calzada o en la
 * boca, nunca sobre una losa.
 */
export const CURVAS_DE_ENTRADA = {
  guaimaral: [
    [-12.25, 0, 16],
    [-12.25, 0, 7],
    [-12.1, 0, 3.4],
    [-11.75, 0, 1.7],
    [-11.3, 0, 0.6],
    [...AVENIDAS.guaimaral.posicion],
  ],
  granColombia: [
    [-19, 0, -13],
    [-15.5, 0, -12.8],
    [-13.25, 0, -12.6],
    [-11.2, 0, -13.6],
    [-9.6, 0, -14.7],
    [-8, 0, -15.1],
    [-7, 0, -15.1],
    [-5.8, 0, -14.8],
    [-4.6, 0, -14],
    [-3.8, 0, -13],
    [...AVENIDAS.granColombia.posicion],
  ],
}

/**
 * Lo que recorre una moto **dentro del lote** si llega y hay una placa libre:
 * de su boca al pasillo (a partir de ahí sube por él hasta el carril de su
 * placa; ver `trayectorias.js`).
 *
 * - **Guaimaral**: la boca está a media altura del borde izquierdo y la curva
 *   del mapa sigue hacia el interior; aquí se cierra en un giro a la derecha
 *   para quedar mirando al frente, en el pasillo.
 * - **Gran Colombia**: la boca cae en la pared del fondo, entre el primer
 *   puesto y la mitad del local; la moto se pega a la pared, por el corredor
 *   que queda detrás de los puestos, hasta el pasillo.
 *
 * Ningún punto pisa una losa con 5 a 7 placas y 3 a 5 puestos, y el corredor
 * deja 70 cm hasta la columna de la esquina.
 */
export const PASO_POR_EL_LOTE = {
  guaimaral: [
    [-10.2, 0, -0.5],
    [-9.3, 0, -0.35],
    [-8.8, 0, 0.4],
    [-9, 0, 1.5],
  ],
  granColombia: [
    [-3.65, 0, -11.4],
    [-4.4, 0, -11.2],
    [-8.2, 0, -11.2],
    [-9, 0, -10.4],
  ],
}

/**
 * Por dónde llegan a la fila del lavado las motos que **tienen que esperar**:
 * de su boca al **corredor de detrás de los puestos**, por fuera de las losas,
 * y por él hasta la franja del lado derecho, donde la fila se junta por detrás.
 * Acaba en un sitio fijo, justo antes del último lugar de la fila
 * (`PUNTO_DE_UNION_A_LA_FILA`); de ahí cada una sube por la franja hasta su
 * lugar en la cola.
 *
 * - **Guaimaral**: la curva del mapa ya viene hacia el fondo; sigue por el
 *   pasillo hasta el corredor, sin dar la vuelta.
 * - **Gran Colombia**: entra al corredor directamente desde su boca.
 *
 * El corredor pasa a 70 cm de las columnas, igual que el recorrido de salida.
 */
const X_DEL_CORREDOR_AL_FINAL = X_DEL_CARRIL_DE_LA_FRANJA - 2.2
const POR_EL_CORREDOR = [
  [X_DEL_CORREDOR_AL_FINAL, 0, Z_DETRAS_DE_LOS_PUESTOS],
  [X_DEL_CARRIL_DE_LA_FRANJA - 0.6, 0, Z_DETRAS_DE_LOS_PUESTOS],
  [X_DEL_CARRIL_DE_LA_FRANJA, 0, Z_DETRAS_DE_LOS_PUESTOS + 0.6],
]

/** Donde las dos entradas se juntan: en el carril de la franja, un poco antes del último lugar dibujado de la fila. */
export const PUNTO_DE_UNION_A_LA_FILA = [X_DEL_CARRIL_DE_LA_FRANJA, 0, Z_DETRAS_DE_LOS_PUESTOS + 1.4]

export const PASO_A_LA_COLA = {
  guaimaral: [
    [-10.3, 0, -0.45],
    [-9.6, 0, -1.3],
    [-9, 0, -2.5],
    [-9, 0, -9.9],
    [-8.3, 0, -10.9],
    [-7.5, 0, Z_DETRAS_DE_LOS_PUESTOS],
    ...POR_EL_CORREDOR,
    [...PUNTO_DE_UNION_A_LA_FILA],
  ],
  granColombia: [
    [-3.65, 0, -11.45],
    [-3.1, 0, Z_DETRAS_DE_LOS_PUESTOS],
    ...POR_EL_CORREDOR,
    [...PUNTO_DE_UNION_A_LA_FILA],
  ],
}

/**
 * Hacia dónde queda el carril de salida respecto del de entrada, de cada
 * avenida (un vector unitario sobre el piso). Se circula por la derecha: la
 * moto entra por un carril y sale por el contrario, en el otro lado del eje de
 * la calle.
 */
export const HACIA_EL_CARRIL_DE_SALIDA = {
  guaimaral: [-1, 0, 0],
  granColombia: [0, 0, -1],
}

/** Separación entre los dos carriles de una avenida, de centro a centro. */
export const SEPARACION_DE_CARRILES = 2.5

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
 * Dónde está el poste con el rótulo de una placa o un puesto, medido desde el
 * centro de su losa: al costado izquierdo, hacia el frente, para que no choque
 * con la moto ni con la losa vecina.
 */
export const POSTE_DE_LOSA = { x: -(SERVIDOR.ancho / 2 + 0.4), z: 0.7 }

/**
 * El techo: una losa fina sobre las columnas que sobresale un poco de ellas.
 * `alto` es donde van las vigas y la cara de abajo de la losa. La escena la
 * vuelve transparente cuando la cámara mira desde arriba (ver `techo.js`).
 */
export const TECHO = { alto: 4.2, grosor: 0.16, vuelo: 0.4 }

/** Ancho de la boca por donde una avenida mete motos al local: hueco de bordillo y de pared. */
export const ANCHO_DE_BOCA = 3.2

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
 *
 * - **Lavado**: a lo largo del lado derecho, por fuera de las columnas. La
 *   cabeza está cerca de la esquina del frente y la fila crece hacia el fondo.
 * - **Acabado**: a lo ancho del local, creciendo hacia la izquierda, hacia el
 *   pasillo por donde llegan las motos: la que acaba de llegar se queda al
 *   final, sin cruzar a las demás.
 *
 * @param {number} indice 0 es la primera en entrar
 * @param {'lavado'|'acabado'} etapa
 */
export function posicionEnFila(indice, etapa) {
  exigirEtapa(etapa)
  if (etapa === 'lavado') {
    return [FILA_DEL_LAVADO.x, 0, FILA_DEL_LAVADO.zCabeza - indice * SEPARACION_EN_FILA]
  }
  return [X_CABEZA_DE_FILA - indice * SEPARACION_EN_FILA, 0, LOCAL.zFilaAcabado]
}

function exigirEtapa(etapa) {
  if (etapa !== 'lavado' && etapa !== 'acabado') {
    throw new RangeError(`La etapa debe ser "lavado" o "acabado"; se recibió ${etapa}.`)
  }
}

/**
 * Alto del rótulo de «+N motos más», en píxeles de la pantalla: siempre el
 * mismo, esté la cámara cerca o lejos.
 */
export const ALTO_DEL_ROTULO_DE_SOBRANTES_EN_PANTALLA = 26

/**
 * Qué punto del rótulo cae sobre el final de su fila (0 = izquierda, 1 = derecha):
 * el rótulo se extiende hacia afuera de la fila, nunca sobre las motos que
 * siguen dibujadas. El del lavado queda a la derecha del final de su fila (fuera
 * del local) y el del acabado a la izquierda del suyo (hacia el pasillo).
 */
export const ANCLA_DEL_ROTULO_DE_SOBRANTES = {
  lavado: [0, 0.5],
  acabado: [1, 0.5],
}

/**
 * Dónde va el rótulo de "+X motos más" de una fila.
 *
 * En el sitio que ocuparía la primera moto que **no** se dibuja: así marca
 * justo donde se corta la fila. Va más alto que las motos para no quedar
 * tapado por ellas.
 */
export function posicionDelRotuloDeSobrantes(etapa) {
  const [x, , z] = posicionEnFila(TOPE_DE_MOTOS_DIBUJADAS[etapa], etapa)
  return [x, MOTO.alto + 0.7, z]
}

/** Por dónde entra una moto. Decorativo: la visita no registró la avenida. */
export function entradaDeLaMoto(n) {
  const avenida = n % 2 === 0 ? AVENIDAS.granColombia : AVENIDAS.guaimaral
  return { ...avenida }
}

/**
 * La pared del fondo, a lo largo del borde del local con la Av. Gran Colombia
 * y por dentro de él. Tiene una sola abertura: la boca de la Av. Gran Colombia,
 * por donde entran y salen las motos de esa avenida (cada moto sale por la
 * avenida por la que entró). Se dibuja a partir de estos datos, así que si
 * cambian las entradas basta con cambiar las aberturas.
 */
export const PARED_DEL_FONDO = {
  z: LOCAL.zSalida + 0.15,
  grosor: 0.3,
  alto: 3,
  altoDeAbertura: 2.4,
  aberturas: [
    { nombre: 'entrada', centroX: AVENIDAS.granColombia.posicion[0], ancho: ANCHO_DE_BOCA },
  ],
}

/**
 * Qué motos de una fila se dibujan y cuántas quedan sin dibujar.
 *
 * Con la etapa 2 saturada la fila llega a miles: dibujarlas una por una sería
 * inútil y lento. El tope y el número de sobrantes salen de aquí, juntos, para
 * que no puedan descuadrarse entre sí.
 *
 * @returns {{ visibles: Array, sobrantes: number }}
 */
export function motosVisibles(cola, tope) {
  const visibles = cola.slice(0, exigirTope(tope))
  return { visibles, sobrantes: sobrantesDe(cola.length, tope) }
}

/**
 * Cuántas motos de una fila quedan sin dibujar, sabiendo solo cuántas hay.
 * Comparte el tope con `motosVisibles` para que el rótulo y lo dibujado no
 * puedan descuadrarse entre sí.
 */
export function sobrantesDe(cuantasEnFila, tope) {
  return Math.max(0, cuantasEnFila - exigirTope(tope))
}

function exigirTope(tope) {
  if (!Number.isInteger(tope) || tope < 0) {
    throw new RangeError('El tope de motos dibujadas debe ser un entero mayor o igual que 0.')
  }
  return tope
}
