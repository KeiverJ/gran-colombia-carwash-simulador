import { FRANJA_DE_ESPERA, LOCAL } from './posiciones.js'

/**
 * La cafetería del lavadero real (sala de espera VIP y caja), adelante del local,
 * del lado de la Av. Guaimaral y con su frente hacia el lavadero (hacia −Z).
 *
 * **Dónde quedó y por qué:** el punto de partida del diseño era z de 17 a 24, pero
 * a esa distancia el edificio quedaba entre la cámara de la vista general (en
 * z ≈ 28, x ≈ 2) y el tramo de la Av. Guaimaral que está delante del local, y lo
 * tapaba (prueba de visibilidad). Se corrió 6,2 m hacia adelante (z de 23,9 a 30,3,
 * con el toldo): queda al lado de la cámara de la vista general y fuera de lo que
 * esa cámara mira. Sigue del lado de la Guaimaral, sin pisar la calzada. Es
 * solo decoración: no es una etapa del modelo, las motos no pasan por ahí y sus
 * personas no son servidores.
 *
 * Todo aquí es JavaScript puro, en metros y en coordenadas del mundo: la huella,
 * las cajas con las que se comprueba que no tapa nada (`visibilidad.js`), los
 * asientos y los sitios de cada pieza. La escena (`Cafeteria.jsx`) las dibuja.
 *
 * Los números **no son un sitio puesto a ojo**: la prueba de visibilidad
 * (`visibilidad.test.js`) comprueba, con rayos desde las cámaras de las cuatro
 * vistas y desde los asientos, que el edificio no tapa ninguna placa, puesto, fila,
 * camino, boca ni el letrero de la pared. Si se mueve algo, esa prueba lo dice.
 */

/** Lo que mide el edificio y dónde está. `zCuerpo` es la cara de adelante del cuerpo; `zToldo`, el borde de adelante del toldo. */
export const CAFETERIA = {
  x0: -10.2,
  x1: -4.6,
  zCuerpo: 22.9,
  zFondo: 25.7,
  zToldo: 21.3,
  altoDelCuerpo: 3.2,
  altoDelToldoAtras: 3.0,
  altoDelToldoAdelante: 2.55,
  grosorDelToldo: 0.08,
  tanque: { x: -7.4, z: 24.6, radio: 0.6, alto: 0.95 },
  letrero: { ancho: 4.2, alto: 0.85, sobreElTecho: 0.2, z: 23.15 },
  altoDelTecho: 0.12,
  vueloDelTecho: 0.15,
}

/** El alto del tanque de agua sobre el techo (4,27 m desde el piso: el punto más alto del edificio). */
export const ALTO_DEL_TANQUE = CAFETERIA.altoDelCuerpo + CAFETERIA.altoDelTecho + CAFETERIA.tanque.alto

/** El alto de lo más alto de la cafetería: el tanque o el letrero sobre el techo (4,37 m). */
export const ALTO_DE_LA_CAFETERIA = Math.max(
  ALTO_DEL_TANQUE,
  CAFETERIA.altoDelCuerpo + CAFETERIA.altoDelTecho + CAFETERIA.letrero.sobreElTecho + CAFETERIA.letrero.alto,
)

/** Dónde están las dos filas de mesas de la terraza (en Z): la de atrás, bajo el toldo, y la de adelante, hacia el lavadero. */
export const Z_DE_LAS_MESAS = { atras: 20.4, adelante: 16.7 }

/**
 * Dónde están las mesas de cada fila (en X): las de atrás, bajo el toldo, y las de adelante, a cielo abierto y un
 * poco hacia la derecha (con sus sombrillas): las sombrillas no pueden quedar sobre el lado izquierdo, porque
 * taparían desde la vista general el camino de las motos que entran por la Guaimaral.
 */
export const X_DE_LAS_MESAS = { atras: [-9.4, -7.2, -5.0], adelante: [-7.4, -5.2, -3.0] }

/** Lo que ocupa vista desde arriba, con el vuelo del techo y del toldo y las mesas de la terraza: `{ x0, x1, z0, z1 }`. */
export const HUELLA_DE_LA_CAFETERIA = {
  x0: CAFETERIA.x0 - CAFETERIA.vueloDelTecho,
  x1: Math.max(CAFETERIA.x1 + CAFETERIA.vueloDelTecho, Math.max(...X_DE_LAS_MESAS.adelante) + 0.42 + 0.3),
  // Hasta la silla de adelante de las mesas de la terraza, delante del toldo y hacia el lavadero.
  z0: Math.min(CAFETERIA.zToldo - 0.1, Z_DE_LAS_MESAS.adelante - 0.68 - 0.3),
  z1: CAFETERIA.zFondo + CAFETERIA.vueloDelTecho,
}

/** Una caja `{ min: [x, y, z], max: [x, y, z] }` a partir de sus extremos. */
const caja = (x0, y0, z0, x1, y1, z1) => ({ min: [x0, y0, z0], max: [x1, y1, z1] })

/** El mostrador, pegado a la pared del cuerpo, con la caja registradora encima. */
export const MOSTRADOR = { x0: -9.9, x1: -6.9, z0: 22.15, z1: 22.85, alto: 1.0, grosorDeLaTapa: 0.06 }

/** Dónde van la caja registradora, la cafetera y la nevera: los objetos del mostrador. */
export const OBJETOS_DEL_MOSTRADOR = {
  caja: { x: -8.4, y: MOSTRADOR.alto + MOSTRADOR.grosorDeLaTapa, z: 22.5 },
  cafetera: { x: -9.4, y: MOSTRADOR.alto + MOSTRADOR.grosorDeLaTapa, z: 22.5 },
  nevera: { x: -6.2, y: 0, z: 22.65 },
}

/** Las mesas de la terraza (centros) y sus medidas: dos filas de tres, la de atrás bajo el toldo y la de adelante, a cielo abierto y con sombrilla. */
export const MESAS = {
  alto: 0.72,
  radio: 0.42,
  centros: [
    ...X_DE_LAS_MESAS.atras.map((x) => [x, Z_DE_LAS_MESAS.atras]),
    ...X_DE_LAS_MESAS.adelante.map((x) => [x, Z_DE_LAS_MESAS.adelante]),
  ],
}

/** Una silla a cada lado (en Z) de cada mesa, mirando a la mesa. */
export const SILLAS = {
  alto: 0.46,
  lado: 0.42,
  separacionDeLaMesa: 0.68,
}

/**
 * Los asientos: dónde se sientan los clientes. `y` es la altura del asiento y
 * `mira` hacia dónde mira la persona sentada (−1 en Z mira al lavadero).
 */
export const ASIENTOS_DE_LA_CAFETERIA = MESAS.centros.flatMap(([x, z]) => [
  { x, y: SILLAS.alto, z: z + SILLAS.separacionDeLaMesa, mira: -1 },
  { x, y: SILLAS.alto, z: z - SILLAS.separacionDeLaMesa, mira: 1 },
])

/** Donde se sientan los clientes de la escena (de los doce asientos, tres: los de las mesas de atrás que miran al lavadero). */
export const ASIENTOS_OCUPADOS = [ASIENTOS_DE_LA_CAFETERIA[0], ASIENTOS_DE_LA_CAFETERIA[2], ASIENTOS_DE_LA_CAFETERIA[4]]

/** La altura de los ojos de una persona sentada, sobre su asiento. */
export const OJOS_SENTADOS = 0.72

/** Dónde esperan de pie los clientes junto a la caja: del lado del cliente del mostrador. */
export const CLIENTES_DE_LA_CAJA = { x: -8.4, z: 21.55 }

/**
 * Las cajas del edificio con las que se comprueba que no tapa nada: cuerpo, techo,
 * tanque, letrero y toldo (el toldo sale de la pared, sostenido por tirantes: sin postes
 * delante, que estorbarían la vista de quien está sentado). Cada una es la caja que rodea a la pieza.
 */
export const CAJAS_DEL_EDIFICIO = [
  { nombre: 'cuerpo', ...caja(CAFETERIA.x0, 0, CAFETERIA.zCuerpo, CAFETERIA.x1, CAFETERIA.altoDelCuerpo, CAFETERIA.zFondo) },
  {
    nombre: 'techo',
    ...caja(
      HUELLA_DE_LA_CAFETERIA.x0,
      CAFETERIA.altoDelCuerpo,
      CAFETERIA.zCuerpo - CAFETERIA.vueloDelTecho,
      HUELLA_DE_LA_CAFETERIA.x1,
      CAFETERIA.altoDelCuerpo + CAFETERIA.altoDelTecho,
      HUELLA_DE_LA_CAFETERIA.z1,
    ),
  },
  {
    nombre: 'tanque',
    ...caja(
      CAFETERIA.tanque.x - CAFETERIA.tanque.radio,
      CAFETERIA.altoDelCuerpo + CAFETERIA.altoDelTecho,
      CAFETERIA.tanque.z - CAFETERIA.tanque.radio,
      CAFETERIA.tanque.x + CAFETERIA.tanque.radio,
      ALTO_DEL_TANQUE,
      CAFETERIA.tanque.z + CAFETERIA.tanque.radio,
    ),
  },
  {
    nombre: 'letrero',
    ...caja(
      (CAFETERIA.x0 + CAFETERIA.x1) / 2 - CAFETERIA.letrero.ancho / 2,
      CAFETERIA.altoDelCuerpo + CAFETERIA.altoDelTecho,
      CAFETERIA.letrero.z - 0.1,
      (CAFETERIA.x0 + CAFETERIA.x1) / 2 + CAFETERIA.letrero.ancho / 2,
      CAFETERIA.altoDelCuerpo + CAFETERIA.altoDelTecho + CAFETERIA.letrero.sobreElTecho + CAFETERIA.letrero.alto,
      CAFETERIA.letrero.z + 0.1,
    ),
  },
  {
    nombre: 'toldo',
    ...caja(
      HUELLA_DE_LA_CAFETERIA.x0,
      CAFETERIA.altoDelToldoAdelante - CAFETERIA.grosorDelToldo,
      CAFETERIA.zToldo,
      HUELLA_DE_LA_CAFETERIA.x1,
      CAFETERIA.altoDelToldoAtras + CAFETERIA.grosorDelToldo,
      CAFETERIA.zCuerpo,
    ),
  },
]

/** Los muebles y objetos de la cafetería (también se comprueba que no tapan nada). */
export const CAJAS_DE_LOS_MUEBLES = [
  { nombre: 'mostrador', ...caja(MOSTRADOR.x0, 0, MOSTRADOR.z0, MOSTRADOR.x1, MOSTRADOR.alto + MOSTRADOR.grosorDeLaTapa, MOSTRADOR.z1) },
  {
    nombre: 'caja registradora',
    ...caja(
      OBJETOS_DEL_MOSTRADOR.caja.x - 0.2,
      OBJETOS_DEL_MOSTRADOR.caja.y,
      OBJETOS_DEL_MOSTRADOR.caja.z - 0.2,
      OBJETOS_DEL_MOSTRADOR.caja.x + 0.2,
      OBJETOS_DEL_MOSTRADOR.caja.y + 0.35,
      OBJETOS_DEL_MOSTRADOR.caja.z + 0.2,
    ),
  },
  {
    nombre: 'nevera',
    ...caja(
      OBJETOS_DEL_MOSTRADOR.nevera.x - 0.3,
      0,
      OBJETOS_DEL_MOSTRADOR.nevera.z - 0.2,
      OBJETOS_DEL_MOSTRADOR.nevera.x + 0.3,
      1.05,
      OBJETOS_DEL_MOSTRADOR.nevera.z + 0.2,
    ),
  },
  ...MESAS.centros.map(([x, z], i) => ({
    nombre: `mesa ${i + 1}`,
    ...caja(x - MESAS.radio, 0, z - MESAS.radio, x + MESAS.radio, MESAS.alto + 0.04, z + MESAS.radio),
  })),
]

/**
 * ¿Se solapan dos rectángulos vistos desde arriba, `{ x0, x1, z0, z1 }`? Sirve para
 * comprobar que la huella de la cafetería no pisa la calzada, las curvas de entrada
 * ni la franja de espera.
 */
export const seSolapan = (a, b) => a.x0 < b.x1 && a.x1 > b.x0 && a.z0 < b.z1 && a.z1 > b.z0

/** La franja de espera del lavado, vista desde arriba (lo más lejos que llega hacia el frente es el frente del local). */
export const FRANJA_DE_ESPERA_EN_PLANTA = {
  x0: FRANJA_DE_ESPERA.x0,
  x1: FRANJA_DE_ESPERA.x0 + FRANJA_DE_ESPERA.ancho,
  z0: -LOCAL.fondo / 2,
  z1: LOCAL.fondo / 2,
}
