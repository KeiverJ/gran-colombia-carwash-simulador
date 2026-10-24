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
  LOCAL,
  MOTO,
  PASILLO,
  posadaEnLaLosa,
  POSICION_ENCUENTRO,
  POSICION_SALIDA,
  posicionDePlaca,
  posicionDePuesto,
  posicionEnFila,
  repartoDePlacas,
  SERVIDOR,
} from './posiciones.js'

/** El carril de circulación, pegado al borde izquierdo y libre de losas. */
export const X_DEL_PASILLO = PASILLO.centroX

/**
 * Carril por el que se entra y se sale de las placas, entre la fila de espera
 * y el borde de delante de las losas. Va por el medio del hueco para no rozar
 * ni a las motos que esperan ni a las losas.
 */
export const Z_DE_ACCESO_A_PLACAS =
  (LOCAL.zFilaLavado + LOCAL.zPlacasAdelante + SERVIDOR.fondo / 2) / 2

/** El hueco entre las dos filas de placas, por donde se llega a la de atrás. */
export const Z_ENTRE_LAS_FILAS = (LOCAL.zPlacasAdelante + LOCAL.zPlacasAtras) / 2

/** Carril de acceso a los puestos, entre la fila del acabado y las losas. */
export const Z_DE_ACCESO_A_PUESTOS =
  (LOCAL.zFilaAcabado + LOCAL.zPuestos + SERVIDOR.fondo / 2) / 2

/** Carril de salida, por detrás de los puestos. */
export const Z_DETRAS_DE_LOS_PUESTOS =
  (LOCAL.zPuestos - SERVIDOR.fondo / 2 + LOCAL.zSalida) / 2

/* ---------------------------------------------------------------- sitios -- */

export const sitioDeEntrada = (avenida) => ({ zona: 'entrada', avenida })
export const sitioEnFila = (etapa, indice) => ({ zona: 'fila', etapa, indice })
export const sitioEnPlaca = (indice, total) => ({ zona: 'placa', indice, total })
export const sitioEnPuesto = (indice, total) => ({ zona: 'puesto', indice, total })
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
    case 'salida':
      return [...POSICION_SALIDA]
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
      return hasta.etapa === 'lavado' ? haciaLaFilaDelLavado(desde) : haciaLaFilaDelAcabado(desde)
    case 'placa':
      return haciaUnaPlaca(desde, hasta)
    case 'puesto':
      return haciaUnPuesto(desde, hasta)
    case 'salida':
      return haciaLaSalida(desde)
    case 'entrada':
      return []
    default:
      throw new RangeError(`No existe el sitio "${hasta.zona}".`)
  }
}

/** Llegar a hacer cola para el lavado: se entra siempre por el pasillo. */
function haciaLaFilaDelLavado(desde) {
  if (desde.zona === 'fila' && desde.etapa === 'lavado') {
    return [] // avanzar un puesto en la misma fila es ir de frente
  }
  if (desde.zona === 'entrada') {
    return [[...POSICION_ENCUENTRO]]
  }
  return [[X_DEL_PASILLO, 0, alturaZDe(desde)], [X_DEL_PASILLO, 0, LOCAL.zFilaLavado]]
}

/**
 * Entrar a una placa.
 *
 * A las de adelante se entra de frente desde el carril de acceso. A las de
 * atrás hay que rodear: por el pasillo de la izquierda y luego por el hueco
 * entre las dos filas, porque la placa de atrás comparte la X con una de
 * adelante y entrar recto sería pasarle por encima.
 */
function haciaUnaPlaca(desde, hasta) {
  const [xPlaca] = puntoDe(hasta)
  const entrada = desde.zona === 'entrada' ? [[...POSICION_ENCUENTRO]] : []
  const acceso = [...entrada, [xPlaca, 0, Z_DE_ACCESO_A_PLACAS]]

  if (!esDeLaFilaDeAtras(hasta.indice, hasta.total)) {
    return desde.zona === 'fila' || desde.zona === 'entrada'
      ? [...entrada, [puntoDe(desde)[0], 0, Z_DE_ACCESO_A_PLACAS], [xPlaca, 0, Z_DE_ACCESO_A_PLACAS]]
      : acceso
  }

  return [
    ...entrada,
    [puntoDe(desde)[0], 0, Z_DE_ACCESO_A_PLACAS],
    [X_DEL_PASILLO, 0, Z_DE_ACCESO_A_PLACAS],
    [X_DEL_PASILLO, 0, Z_ENTRE_LAS_FILAS],
    [xPlaca, 0, Z_ENTRE_LAS_FILAS],
  ]
}

/**
 * Salir hacia la fila del acabado.
 *
 * Desde la fila de atrás se sale recto hacia el fondo. Desde la de adelante
 * hay que rodear otra vez, que si no se pasaría por encima de la de atrás.
 */
function haciaLaFilaDelAcabado(desde) {
  if (desde.zona === 'fila' && desde.etapa === 'acabado') {
    return []
  }
  if (desde.zona !== 'placa') {
    return [[X_DEL_PASILLO, 0, alturaZDe(desde)], [X_DEL_PASILLO, 0, LOCAL.zFilaAcabado]]
  }
  const [xPlaca] = puntoDe(desde)
  if (esDeLaFilaDeAtras(desde.indice, desde.total)) {
    return [[xPlaca, 0, LOCAL.zFilaAcabado]]
  }
  return [
    [xPlaca, 0, Z_ENTRE_LAS_FILAS],
    [X_DEL_PASILLO, 0, Z_ENTRE_LAS_FILAS],
    [X_DEL_PASILLO, 0, LOCAL.zFilaAcabado],
  ]
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

/** Salir del local por detrás de los puestos, hacia la Av. Gran Colombia. */
function haciaLaSalida(desde) {
  const [x] = puntoDe(desde)
  if (desde.zona === 'puesto') {
    return [[x, 0, Z_DETRAS_DE_LOS_PUESTOS], [POSICION_SALIDA[0], 0, Z_DETRAS_DE_LOS_PUESTOS]]
  }
  return [
    [X_DEL_PASILLO, 0, alturaZDe(desde)],
    [X_DEL_PASILLO, 0, Z_DETRAS_DE_LOS_PUESTOS],
    [POSICION_SALIDA[0], 0, Z_DETRAS_DE_LOS_PUESTOS],
  ]
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

/**
 * Suaviza el avance: arranca despacio, coge velocidad y frena al llegar.
 *
 * Es lo que hace que se vea una moto que arranca y frena en vez de una
 * interpolación. Se aplica sobre la fracción de camino recorrida, así que no
 * puede desincronizarse de nada.
 */
export function conArranqueYFrenado(fraccion) {
  const p = Math.min(1, Math.max(0, fraccion))
  return p * p * (3 - 2 * p)
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
