/**
 * Por dónde pasa una moto para ir de un sitio del lavadero a otro.
 *
 * En línea recta no sirve: una moto que va de la fila a una placa de la fila
 * de atrás cruzaría por encima de las de adelante, y una que sale de la fila
 * hacia su placa atravesaría a las que siguen esperando. Aquí se devuelven los
 * puntos por los que hay que pasar para que eso no ocurra.
 *
 * Es JavaScript puro, como `posiciones.js`: se puede comprobar con pruebas que
 * ningún tramo pasa por encima de una losa, que es justo lo que se escapa al
 * mirar la escena.
 */

import {
  AVENIDAS,
  COLUMNAS_DEL_TECHO,
  CURVAS_DE_ENTRADA,
  FILA_DEL_LAVADO,
  HACIA_EL_CARRIL_DE_SALIDA,
  LOCAL,
  MOTO,
  PASILLO,
  PASO_A_LA_COLA,
  PASO_POR_EL_LOTE,
  posadaEnLaLosa,
  posicionDePlaca,
  posicionDePuesto,
  posicionEnFila,
  repartoDePlacas,
  SEPARACION_DE_CARRILES,
  SERVIDOR,
  X_DEL_CARRIL_DE_LA_FRANJA,
  Z_DETRAS_DE_LOS_PUESTOS,
} from './posiciones.js'

export { Z_DETRAS_DE_LOS_PUESTOS }

/** El carril de circulación, pegado al borde izquierdo y libre de losas. */
export const X_DEL_PASILLO = PASILLO.centroX

/**
 * Carril por el que se entra y se sale de las placas de adelante: por delante
 * de las columnas del techo (que están en el borde de la zona cubierta) y de la
 * rejilla de desagüe, a metro y medio de ellas. Desde aquí cada moto baja recta
 * a su placa, y es por donde pasa la que llega con una placa libre.
 */
export const Z_DE_ACCESO_A_PLACAS = COLUMNAS_DEL_TECHO[0][2] + 1.5

/** El hueco entre las dos filas de placas, por donde se llega a la de atrás. */
export const Z_ENTRE_LAS_FILAS = (LOCAL.zPlacasAdelante + LOCAL.zPlacasAtras) / 2

/**
 * Carril por el que se llega a la fila del acabado desde las placas de atrás:
 * a medio camino entre su borde y la fila, a metro y medio de las dos.
 */
export const Z_CARRIL_A_LA_FILA_DEL_ACABADO =
  (LOCAL.zPlacasAtras - SERVIDOR.fondo / 2 + LOCAL.zFilaAcabado) / 2

/** Carril de acceso a los puestos, entre la fila del acabado y las losas. */
export const Z_DE_ACCESO_A_PUESTOS =
  (LOCAL.zFilaAcabado + LOCAL.zPuestos + SERVIDOR.fondo / 2) / 2

/* ---------------------------------------------------------------- sitios -- */

export const sitioDeEntrada = (avenida) => ({ zona: 'entrada', avenida })
export const sitioEnFila = (etapa, indice) => ({ zona: 'fila', etapa, indice })
export const sitioEnPlaca = (indice, total) => ({ zona: 'placa', indice, total })
export const sitioEnPuesto = (indice, total) => ({ zona: 'puesto', indice, total })
/**
 * Marca de «ya no está en el lavadero»: la moto con este destino sale por la
 * avenida por la que entró (`caminoDeSalida`). No es un lugar del local, así que
 * no tiene punto ni camino propios.
 */
export const SITIO_DE_SALIDA = { zona: 'salida' }

/** Dónde está un sitio, en coordenadas del mundo. */
export function puntoDe(sitio) {
  switch (sitio.zona) {
    case 'entrada':
      return [...AVENIDAS[sitio.avenida].posicion]
    case 'fila':
      return posicionEnFila(sitio.indice, sitio.etapa)
    case 'placa':
      return sobreLaLosa(posicionDePlaca(sitio.indice, sitio.total))
    case 'puesto':
      return sobreLaLosa(posicionDePuesto(sitio.indice, sitio.total))
    default:
      throw new RangeError(`No existe el sitio "${sitio.zona}".`)
  }
}

/** La moto se posa encima de la losa, que al ocuparse se levanta. */
function sobreLaLosa(posicion) {
  const [x, , z] = posadaEnLaLosa(posicion)
  return [x, SERVIDOR.altoOcupado, z]
}

/** ¿La placa `indice` está en la fila de atrás? */
export function esDeLaFilaDeAtras(indice, total) {
  return indice >= repartoDePlacas(total).adelante
}

/* --------------------------------------------------------------- caminos -- */

/**
 * Los puntos por los que pasa una moto para ir de un sitio a otro, empezando
 * en el primero y terminando en el segundo.
 *
 * Nunca devuelve una lista vacía: como mínimo trae el punto de destino.
 */
export function caminoHacia(desde, hasta) {
  const inicio = puntoDe(desde)
  const fin = puntoDe(hasta)
  const camino = [inicio, ...pasosIntermedios(desde, hasta), fin]
  return sinRepetidos(camino)
}

function pasosIntermedios(desde, hasta) {
  switch (hasta.zona) {
    case 'fila':
      return hasta.etapa === 'lavado' ? haciaLaFilaDelLavado(desde, hasta) : haciaLaFilaDelAcabado(desde, hasta)
    case 'placa':
      return haciaUnaPlaca(desde, hasta)
    case 'puesto':
      return haciaUnPuesto(desde, hasta)
    case 'entrada':
      return []
    default:
      throw new RangeError(`No existe el sitio "${hasta.zona}".`)
  }
}

/**
 * Llegar a hacer cola para el lavado: por fuera de las losas, por el corredor
 * de detrás de los puestos, hasta la franja del lado derecho, y por ella hasta
 * el sitio que le toca en la fila.
 */
function haciaLaFilaDelLavado(desde, hasta) {
  if (desde.zona === 'fila' && desde.etapa === 'lavado') {
    return [] // avanzar un puesto en la misma fila es ir de frente
  }
  const alaUnion =
    desde.zona === 'entrada'
      ? pasoALaCola(desde.avenida)
      : [
          [X_DEL_PASILLO, 0, alturaZDe(desde)],
          [X_DEL_PASILLO, 0, Z_DETRAS_DE_LOS_PUESTOS],
          ...pasoALaCola('granColombia').slice(1),
        ]
  // De la unión al lugar se sube por el carril libre de al lado de la fila y se entra
  // de costado: así la que llega tarde a un lugar de más adelante no pasa por encima
  // de las que ya esperan.
  const [, , zDelLugar] = puntoDe(hasta)
  return [
    ...alaUnion,
    [X_DEL_CARRIL_DE_LA_FRANJA, 0, zDelLugar],
  ]
}

/**
 * Entrar a una placa.
 *
 * - **Desde la avenida** (hay placa libre): de la boca al pasillo y por él
 *   hasta el carril de su placa.
 * - **Desde la cabeza de la fila**, que está en el lado derecho, se entra
 *   directo por ese mismo lado, sin rodear el local: a las de adelante, de
 *   frente por el carril de acceso, delante de las columnas; a las de atrás, por
 *   el carril libre de la franja (a un lado de la fila) hasta el hueco entre las
 *   dos filas y por él hasta su placa, porque la de atrás comparte la X con una
 *   de adelante y entrar recto sería pasarle por encima.
 */
function haciaUnaPlaca(desde, hasta) {
  const [xPlaca] = puntoDe(hasta)
  const deAtras = esDeLaFilaDeAtras(hasta.indice, hasta.total)
  const alCarril = deAtras
    ? [[X_DEL_PASILLO, 0, Z_ENTRE_LAS_FILAS], [xPlaca, 0, Z_ENTRE_LAS_FILAS]]
    : [[X_DEL_PASILLO, 0, Z_DE_ACCESO_A_PLACAS], [xPlaca, 0, Z_DE_ACCESO_A_PLACAS]]

  if (desde.zona === 'entrada') {
    return [...pasoPorElLote(desde.avenida), ...alCarril]
  }
  if (desde.zona === 'fila') {
    return [...saliendoDeLaFila(desde), ...(deAtras ? porLaFranjaAlHueco(xPlaca) : [alCarril[1]])]
  }
  return alCarril
}

export { X_DEL_CARRIL_DE_LA_FRANJA }

/** De la cabeza al hueco entre las filas por el carril de la franja, y por el hueco hasta su placa. */
function porLaFranjaAlHueco(xPlaca) {
  return [
    [X_DEL_CARRIL_DE_LA_FRANJA, 0, FILA_DEL_LAVADO.zCabeza - 0.8],
    [X_DEL_CARRIL_DE_LA_FRANJA, 0, Z_ENTRE_LAS_FILAS],
    [xPlaca, 0, Z_ENTRE_LAS_FILAS],
  ]
}

/** Salir de la fila: subir hasta la cabeza, que es de donde se sale, y torcer hacia el local. */
function saliendoDeLaFila(desde) {
  return desde.indice > 0 ? [[FILA_DEL_LAVADO.x, 0, FILA_DEL_LAVADO.zCabeza]] : []
}

/**
 * Salir hacia la fila del acabado.
 *
 * Desde la fila de atrás se sale recto hacia el fondo. Desde la de adelante
 * hay que rodear otra vez, que si no se pasaría por encima de la de atrás.
 */
function haciaLaFilaDelAcabado(desde, hasta = null) {
  if (desde.zona === 'fila' && desde.etapa === 'acabado') {
    return []
  }
  // A una fila se llega por un carril al lado de ella y se entra a su lugar de
  // costado: seguir por la fila misma sería pasar por en medio de las motos que
  // esperan, y la moto que llega tarde a un lugar de más adelante las atravesaría.
  const alLugar = hasta?.zona === 'fila' ? [[puntoDe(hasta)[0], 0, Z_CARRIL_A_LA_FILA_DEL_ACABADO]] : []
  const alCarril = (x) => (hasta?.zona === 'fila' ? [[x, 0, Z_CARRIL_A_LA_FILA_DEL_ACABADO]] : [[x, 0, LOCAL.zFilaAcabado]])

  if (desde.zona !== 'placa') {
    return [[X_DEL_PASILLO, 0, alturaZDe(desde)], ...alCarril(X_DEL_PASILLO), ...alLugar]
  }
  const [xPlaca] = puntoDe(desde)
  if (esDeLaFilaDeAtras(desde.indice, desde.total)) {
    return [...alCarril(xPlaca), ...alLugar]
  }
  return [
    [xPlaca, 0, Z_ENTRE_LAS_FILAS],
    [X_DEL_PASILLO, 0, Z_ENTRE_LAS_FILAS],
    ...alCarril(X_DEL_PASILLO),
    ...alLugar,
  ]
}

/**
 * ¿Está el punto en la franja de acceso a una fila: en el carril de al lado de
 * ella, o entre el carril y la fila (entrando a su lugar de costado)? Una moto
 * que ya está sobre la fila, aunque se esté moviendo en ella, no cuenta: avanza
 * por la fila misma.
 */
export function enLaBandaDeAcceso([x, , z], etapa) {
  const sobreLaFila = 0.45
  if (etapa === 'lavado') {
    return x >= X_DEL_CARRIL_DE_LA_FRANJA - 0.05 && x <= FILA_DEL_LAVADO.x - sobreLaFila && z > Z_DETRAS_DE_LOS_PUESTOS
  }
  return z <= Z_CARRIL_A_LA_FILA_DEL_ACABADO + 0.05 && z >= LOCAL.zFilaAcabado + sobreLaFila
}

/**
 * El camino de una moto que ya va entrando a su fila por el carril de al lado y
 * a la que el motor cambia de lugar: vuelve al carril, avanza por él hasta el
 * lugar nuevo y entra de costado. Seguir hasta el lugar que llevaba y deslizarse
 * por la fila sería pasar por encima de las motos que ya esperan ahí.
 */
export function caminoDeAjusteEnLaFila(punto, hasta) {
  const lugar = puntoDe(hasta)
  const alCarril =
    hasta.etapa === 'lavado'
      ? [X_DEL_CARRIL_DE_LA_FRANJA, 0, punto[2]]
      : [punto[0], 0, Z_CARRIL_A_LA_FILA_DEL_ACABADO]
  const alLugarPorElCarril =
    hasta.etapa === 'lavado'
      ? [X_DEL_CARRIL_DE_LA_FRANJA, 0, lugar[2]]
      : [lugar[0], 0, Z_CARRIL_A_LA_FILA_DEL_ACABADO]
  return sinRepetidos([[...punto], alCarril, alLugarPorElCarril, lugar])
}

/** Entrar a un puesto: desde su carril de acceso, de frente. */
function haciaUnPuesto(desde, hasta) {
  const [xPuesto] = puntoDe(hasta)
  const llegarAlCarril =
    desde.zona === 'fila' && desde.etapa === 'acabado'
      ? [[puntoDe(desde)[0], 0, Z_DE_ACCESO_A_PUESTOS]]
      : [...haciaLaFilaDelAcabado(desde), [X_DEL_PASILLO, 0, Z_DE_ACCESO_A_PUESTOS]]
  return [...llegarAlCarril, [xPuesto, 0, Z_DE_ACCESO_A_PUESTOS]]
}

function alturaZDe(sitio) {
  return puntoDe(sitio)[2]
}

/** Quita los puntos repetidos seguidos, que no aportan tramo. */
function sinRepetidos(puntos) {
  return puntos.filter((punto, i) => i === 0 || !mismoSitio(punto, puntos[i - 1]))
}

function mismoSitio(a, b) {
  return Math.abs(a[0] - b[0]) < 1e-9 && Math.abs(a[2] - b[2]) < 1e-9
}

/** Lo que mide un camino, sumando sus tramos. */
export function largoDelCamino(camino) {
  let total = 0
  for (let i = 1; i < camino.length; i += 1) {
    total += Math.hypot(camino[i][0] - camino[i - 1][0], camino[i][2] - camino[i - 1][2])
  }
  return total
}

/* ---------------------------------------- caminos de entrada y de salida -- */

/**
 * Cuántos metros de la curva se recorren, saliendo de la boca, antes de estar
 * ya del todo en el carril contrario.
 */
export const DISTANCIA_PARA_CAMBIAR_DE_CARRIL = 5

/**
 * Cuánto se deja de margen al borde de la calzada: el carril de salida se
 * pega al borde de afuera como mucho hasta aquí, aunque la curva de entrada
 * (la «U» de la Gran Colombia) deje poco sitio.
 */
export const MARGEN_EN_LA_CALZADA = 0.4

/**
 * Por qué línea del pasillo sale el que entró por la Guaimaral: a un metro de
 * la de entrada, para no cruzarse de frente con quien baja. El que entró por la
 * Gran Colombia no usa el pasillo: sale por el corredor de detrás de los
 * puestos, que lo lleva directo a su boca.
 */
export const X_DE_SALIDA_POR_EL_PASILLO = X_DEL_PASILLO - 1

function curvaDe(clave) {
  const curva = CURVAS_DE_ENTRADA[clave]
  if (!curva) {
    throw new RangeError(`No existe la avenida "${clave}".`)
  }
  return curva
}

/**
 * El camino de entrada de una avenida: por la avenida, la curva del mapa, la
 * boca y, dentro del lote, el recorrido por fuera de las losas hasta el punto
 * donde las dos avenidas se juntan al final de la fila del lavado
 * (`PUNTO_DE_UNION_A_LA_FILA`). Empieza en la avenida y acaba en ese punto; de
 * ahí la moto sube por la fila hasta su lugar.
 *
 * @param {'granColombia'|'guaimaral'} clave
 */
export function caminoDeEntrada(clave) {
  return sinRepetidos([...curvaDe(clave).map((punto) => [...punto]), ...pasoALaCola(clave)])
}

/** De la boca a la unión con la fila: lo que se recorre dentro del lote al venir a esperar. */
function pasoALaCola(clave) {
  const paso = PASO_A_LA_COLA[clave]
  if (!paso) {
    throw new RangeError(`No existe la avenida "${clave}".`)
  }
  return paso.map((punto) => [...punto])
}

/** De la boca al pasillo: lo que se recorre dentro del lote al venir a una placa libre. */
function pasoPorElLote(clave) {
  const paso = PASO_POR_EL_LOTE[clave]
  if (!paso) {
    throw new RangeError(`No existe la avenida "${clave}".`)
  }
  return paso.map((punto) => [...punto])
}

/**
 * La curva de salida de una avenida: la de entrada **al revés** (de la boca a
 * la avenida) y por el **carril contrario**.
 *
 * Sale por la boca por la que entró, siguiendo la misma curva, y se va pasando
 * poco a poco al otro lado del eje de la calle —a la derecha, circulando como
 * en Colombia— hasta quedar, ya en la avenida, justo `SEPARACION_DE_CARRILES`
 * al lado del punto por el que entró.
 */
export function curvaDeSalida(clave) {
  const [nx, , nz] = HACIA_EL_CARRIL_DE_SALIDA[clave]
  const alReves = curvaDe(clave).slice().reverse()
  let recorrido = 0
  return alReves.map((punto, i) => {
    if (i > 0) {
      recorrido += Math.hypot(punto[0] - alReves[i - 1][0], punto[2] - alReves[i - 1][2])
    }
    const deseado = Math.min(1, recorrido / DISTANCIA_PARA_CAMBIAR_DE_CARRIL) * SEPARACION_DE_CARRILES
    const cuanto = Math.max(0, Math.min(deseado, cuantoSePuedeCorrer(clave, punto)))
    return [punto[0] + nx * cuanto, punto[1], punto[2] + nz * cuanto]
  })
}

/** Cuánto puede correrse un punto hacia el borde de afuera de la calzada sin salirse de ella. */
function cuantoSePuedeCorrer(clave, punto) {
  const { calle } = AVENIDAS[clave]
  return clave === 'guaimaral'
    ? punto[0] - (calle.centro[0] - calle.ancho / 2 + MARGEN_EN_LA_CALZADA)
    : punto[2] - (calle.centro[2] - calle.fondo / 2 + MARGEN_EN_LA_CALZADA)
}

/**
 * El camino de salida de una moto que está en `desde` (un puesto de acabado,
 * normalmente): por el corredor de detrás de los puestos hasta la boca de **la
 * avenida por la que entró**, y por su curva de salida. Acaba en la avenida, en
 * el carril contrario al de entrada.
 *
 * La Gran Colombia queda justo detrás de los puestos: el corredor llega a su
 * boca. La Guaimaral queda en el borde izquierdo, a media altura: hay que ir
 * hasta el pasillo y bajar por él hasta su boca.
 *
 * @param {object} desde un sitio
 * @param {'granColombia'|'guaimaral'} clave la avenida por la que entró
 */
export function caminoDeSalida(desde, clave) {
  const inicio = puntoDe(desde)
  const curva = curvaDeSalida(clave)
  const [xBoca, , zBoca] = curva[0]
  const alCorredor =
    desde.zona === 'puesto'
      ? [[inicio[0], 0, Z_DETRAS_DE_LOS_PUESTOS]]
      : [[X_DEL_PASILLO, 0, alturaZDe(desde)], [X_DEL_PASILLO, 0, Z_DETRAS_DE_LOS_PUESTOS]]
  const alaBoca =
    clave === 'guaimaral'
      ? [[X_DE_SALIDA_POR_EL_PASILLO, 0, Z_DETRAS_DE_LOS_PUESTOS], [X_DE_SALIDA_POR_EL_PASILLO, 0, zBoca]]
      : [[xBoca, 0, Z_DETRAS_DE_LOS_PUESTOS]]
  return sinRepetidos([inicio, ...alCorredor, ...alaBoca, ...curva])
}

/** Lo que ocupa una moto a lo ancho de su marcha, para comprobar roces. */
export const MEDIO_ANCHO_DE_MOTO = MOTO.ancho / 2

/**
 * Dónde está una moto que lleva recorrida `distancia` de su camino, y hacia
 * dónde mira ahí.
 *
 * El rumbo es el del tramo que está recorriendo, en radianes y listo para
 * `rotation.y`: 0 mira hacia el frente del local. Si el camino es de un solo
 * punto no hay rumbo que dar y se devuelve `null`, para que quien lo use
 * conserve el que traía en vez de girar hacia ninguna parte.
 *
 * @returns {{ punto: [number, number, number], rumbo: number|null }}
 */
export function puntoEnElCamino(camino, distancia) {
  if (camino.length === 1) {
    return { punto: [...camino[0]], rumbo: null }
  }
  let recorrido = Math.max(0, distancia)
  for (let i = 1; i < camino.length; i += 1) {
    const anterior = camino[i - 1]
    const siguiente = camino[i]
    const dx = siguiente[0] - anterior[0]
    const dz = siguiente[2] - anterior[2]
    const largo = Math.hypot(dx, dz)
    const rumbo = Math.atan2(dx, dz)
    const esElUltimo = i === camino.length - 1
    if (recorrido <= largo || esElUltimo) {
      const t = largo === 0 ? 1 : Math.min(1, recorrido / largo)
      return {
        punto: [
          anterior[0] + dx * t,
          anterior[1] + (siguiente[1] - anterior[1]) * t,
          anterior[2] + dz * t,
        ],
        rumbo,
      }
    }
    recorrido -= largo
  }
  const fin = camino.at(-1)
  return { punto: [...fin], rumbo: null }
}

/* ------------------------------------------------------ velocidad y tiempo -- */

/**
 * Cuánto se mueve una moto: **solo depende del reloj simulado**, nunca del reloj
 * real ni de los cuadros por segundo.
 *
 * Cada viaje tiene el minuto simulado en que el motor mandó a la moto a su sitio
 * y una duración (en minutos simulados). Dónde está la moto en un instante es
 * una función de «cuántos minutos simulados pasaron desde que salió»: con la
 * simulación en pausa el reloj no avanza y nada se mueve; si se cambia la
 * velocidad, el reloj avanza más o menos por cuadro y el movimiento cambia de
 * ritmo en el cuadro siguiente; y si un viaje dura menos que un cuadro, la moto
 * aparece directamente en su sitio.
 */

/**
 * La velocidad de una moto, en **metros por minuto simulado**.
 *
 * Se eligió para que a 1 min/s (1 minuto simulado por segundo real) se vea
 * natural: 6 m por minuto son 6 m/s en pantalla, unos 22 km/h, lo que anda una
 * moto dentro de un lote. A 10 min/s la misma moto se ve a 60 m/s en pantalla,
 * pero es el mismo movimiento visto con el tiempo diez veces más rápido.
 */
export const V_BASE = 6

/**
 * Lo más que puede durar un viaje, en minutos simulados: es el límite del
 * atraso respecto del motor. Un camino largo (de la avenida a la fila: unos 50
 * m, ocho minutos a `V_BASE`) se hace más deprisa, en este tiempo, para que la
 * moto no llegue a su sitio mucho después de que el motor la puso allí: cuatro
 * minutos son menos de la mitad de un lavado medio (10,7 min).
 */
export const ATRASO_MAXIMO_EN_MINUTOS = 4

/** Metros de arranque y de frenado, al principio y al final de cada camino. */
export const LARGO_DE_LA_RAMPA = 0.6

/** Cuánto dura, en minutos simulados, un viaje de `largo` metros: a `V_BASE`, sin pasar del atraso máximo. */
export function duracionDelViaje(largo) {
  if (!(largo > 0)) return 0
  return Math.min(largo / V_BASE, ATRASO_MAXIMO_EN_MINUTOS)
}

/** Qué parte de su duración dedica un viaje de `largo` metros a arrancar y a frenar (cada una). */
function fraccionDeLaRampa(largo) {
  return Math.min(0.4, LARGO_DE_LA_RAMPA / largo)
}

/**
 * Qué parte del camino (de 0 a 1) lleva recorrida una moto cuando ha pasado la
 * fracción `u` (de 0 a 1) de la duración de su viaje: arranca poco a poco,
 * va a velocidad constante y frena poco a poco. Es creciente y no se queda
 * quieta a mitad de camino.
 */
export function avanceNormalizado(u, rampa) {
  const t = Math.min(1, Math.max(0, u))
  if (rampa <= 0) return t
  const crucero = 1 / (1 - rampa)
  if (t < rampa) return (crucero * t * t) / (2 * rampa)
  if (t > 1 - rampa) return 1 - (crucero * (1 - t) * (1 - t)) / (2 * rampa)
  return crucero * (rampa / 2 + (t - rampa))
}

/**
 * Los metros que lleva recorridos una moto en un viaje de `largo` metros que
 * dura `duracion` minutos simulados, cuando han pasado `minutos` desde que salió.
 */
export function recorridoEnElTiempo({ largo, duracion, minutos }) {
  if (!(largo > 0)) return 0
  if (!(duracion > 0) || minutos >= duracion) return largo
  if (!(minutos > 0)) return 0
  return largo * avanceNormalizado(minutos / duracion, fraccionDeLaRampa(largo))
}

/**
 * Lo contrario: cuántos minutos simulados tiene que haber andado una moto para
 * llevar `recorrido` metros. Sirve para detener una moto en un punto (la que
 * espera su turno): se atrasa su hora de salida lo justo para que, desde ahora,
 * siga justo ahí.
 */
export function minutosParaRecorrer({ largo, duracion, recorrido }) {
  if (!(largo > 0) || !(duracion > 0)) return 0
  if (recorrido >= largo) return duracion
  if (!(recorrido > 0)) return 0
  const objetivo = recorrido / largo
  const rampa = fraccionDeLaRampa(largo)
  let bajo = 0
  let alto = 1
  for (let i = 0; i < 40; i += 1) {
    const medio = (bajo + alto) / 2
    if (avanceNormalizado(medio, rampa) < objetivo) bajo = medio
    else alto = medio
  }
  return ((bajo + alto) / 2) * duracion
}

/* ------------------------------------------------------------ replanificar -- */

/**
 * El camino nuevo de una moto a la que el motor cambió de destino cuando iba a
 * medio camino del anterior: **desde donde está** (no desde donde empezó),
 * termina lo que le quedaba del camino viejo y sigue por el nuevo.
 *
 * Quita los retrocesos: si el nuevo camino vuelve por donde ya iba (la moto que
 * avanza un lugar en la fila cuando le falta poco para llegar al suyo), se corta
 * por el atajo en vez de pasarse y volver.
 *
 * @param {Array} viejo el camino que llevaba
 * @param {number} recorrido metros que lleva recorridos de él
 * @param {Array} nuevo el camino desde el sitio al que iba hasta el nuevo destino
 */
export function caminoReplanificado(viejo, recorrido, nuevo) {
  const { punto } = puntoEnElCamino(viejo, recorrido)
  let acumulado = 0
  const restantes = []
  for (let i = 1; i < viejo.length; i += 1) {
    acumulado += Math.hypot(viejo[i][0] - viejo[i - 1][0], viejo[i][2] - viejo[i - 1][2])
    if (acumulado > recorrido + 1e-9) restantes.push(viejo[i])
  }
  return sinRetrocesos(sinRepetidos([punto, ...restantes, ...nuevo].map((p) => [...p])))
}

/** ¿El punto `p` está sobre el tramo de `a` a `b`, con una tolerancia de unos centímetros? */
function estaSobreElTramo(p, a, b, tolerancia = 0.05) {
  const dx = b[0] - a[0]
  const dz = b[2] - a[2]
  const largo2 = dx * dx + dz * dz
  const t = largo2 === 0 ? 0 : Math.min(1, Math.max(0, ((p[0] - a[0]) * dx + (p[2] - a[2]) * dz) / largo2))
  return Math.hypot(p[0] - (a[0] + dx * t), p[2] - (a[2] + dz * t)) <= tolerancia
}

/** Quita los puntos que sobran: los que están de paso en línea recta y los que se pasan y obligan a volver. */
export function sinRetrocesos(camino) {
  const resultado = [...camino]
  let cambio = true
  while (cambio) {
    cambio = false
    for (let i = 1; i < resultado.length - 1; i += 1) {
      const [anterior, actual, siguiente] = [resultado[i - 1], resultado[i], resultado[i + 1]]
      const deSobra = estaSobreElTramo(actual, anterior, siguiente) || estaSobreElTramo(siguiente, anterior, actual)
      if (deSobra) {
        resultado.splice(i, 1)
        cambio = true
        break
      }
    }
  }
  return resultado
}

/* ---------------------------------------------------------------- corredor -- */

/**
 * El corredor de detrás de los puestos es de un solo carril: la moto que viene
 * a esperar y la que sale lo comparten, en sentidos contrarios. Es la franja de
 * piso del local que queda entre la pared del fondo y los puestos.
 */
export const CORREDOR = {
  desdeZ: LOCAL.zSalida,
  hastaZ: Z_DETRAS_DE_LOS_PUESTOS + 0.9,
  // Termina donde empieza la franja de espera: lo que está más a la derecha (la
  // fila del lavado, y las motos que salen del final de ella) no usa el corredor.
  hastaX: X_DEL_CARRIL_DE_LA_FRANJA + 0.2,
}

/** ¿Este punto está dentro del corredor? */
export function estaEnElCorredor([x, , z]) {
  return z >= CORREDOR.desdeZ - 1e-9 && z <= CORREDOR.hastaZ + 1e-9 && x <= CORREDOR.hastaX
}

/** Cada cuántos metros se mira por dónde va un camino al buscar el corredor. */
const PASO_DE_BUSQUEDA = 0.05

/**
 * A cuántos metros del principio del camino se entra al corredor, o `null` si
 * no se entra nunca. Si el camino ya empieza dentro, es 0.
 */
export function distanciaHastaElCorredor(camino) {
  const largo = largoDelCamino(camino)
  for (let d = 0; d <= largo + 1e-9; d += PASO_DE_BUSQUEDA) {
    if (estaEnElCorredor(puntoEnElCamino(camino, d).punto)) return d
  }
  return null
}

/**
 * ¿Debe esperar una moto antes de entrar al corredor? Sí si viene otra en
 * sentido contrario ya dentro: la que entra a esperar cede el paso a la que
 * sale, y la que sale cede a la que ya está entrando, así nunca se cruzan de
 * frente. Dos motos que van en el mismo sentido sí pueden compartirlo.
 *
 * @param {boolean} saliendo si la moto que pregunta es una que sale
 * @param {{ entrando: number, saliendo: number }} dentro cuántas motos de cada sentido hay ya dentro
 */
export function debeEsperarParaElCorredor(saliendo, dentro) {
  return saliendo ? dentro.entrando > 0 : dentro.saliendo > 0
}

/* ------------------------------------------------- llegada por la avenida -- */

/**
 * El camino completo de una moto que llega por una avenida hacia un sitio:
 * desde el borde de la calzada, por la curva del mapa, hasta la boca, y de ahí
 * al sitio (a su lugar en la fila o a su placa libre).
 *
 * @param {'granColombia'|'guaimaral'} clave
 */
export function caminoDeLlegada(clave, hasta) {
  const curva = curvaDe(clave).map((punto) => [...punto])
  return sinRepetidos([...curva, ...caminoHacia(sitioDeEntrada(clave), hasta)])
}

/**
 * Cuánto se acerca una moto a su rumbo, girando **por el lado corto**.
 *
 * Sin esto, al pasar de mirar al fondo a mirar al frente una moto gira por
 * donde no es y se ve dar la vuelta entera.
 */
export function girarHacia(rumbo, destino, cuanto) {
  let diferencia = (destino - rumbo) % (Math.PI * 2)
  if (diferencia > Math.PI) diferencia -= Math.PI * 2
  if (diferencia < -Math.PI) diferencia += Math.PI * 2
  return rumbo + diferencia * Math.min(1, Math.max(0, cuanto))
}
