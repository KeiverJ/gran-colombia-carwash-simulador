/**
 * La luz del sol de la tarde (de las 3 a las 5 p. m. en Cúcuta) y el recuadro
 * de la escena que su sombra tiene que cubrir. JavaScript puro, sin Three.js.
 *
 * Ejes de la escena: +X a la derecha de la vista general, +Z hacia la cámara,
 * +Y arriba. El sol entra desde la derecha y un poco desde el frente, de modo
 * que las caras que miran a la vista general quedan iluminadas y las sombras
 * caen hacia la izquierda y el fondo.
 */

/** Dónde está el sol: su elevación sobre el horizonte y su azimut (desde +Z hacia +X), en grados. */
export const SOL = { elevacion: 32, azimut: 55 }

/** A qué distancia del centro se pone la luz (solo importa para el recorte de la sombra). */
export const DISTANCIA_DEL_SOL = 70

const aRadianes = (grados) => (grados * Math.PI) / 180

/** El vector unitario que va del suelo hacia el sol. */
export function direccionDelSol({ elevacion, azimut } = SOL) {
  const e = aRadianes(elevacion)
  const a = aRadianes(azimut)
  return [Math.cos(e) * Math.sin(a), Math.sin(e), Math.cos(e) * Math.cos(a)]
}

/**
 * Hacia dónde se alarga la sombra de un objeto vertical sobre el piso (el
 * sentido contrario al sol, en planta): `[x, z]` unitario.
 */
export function direccionDeLaSombra(sol = SOL) {
  const [x, , z] = direccionDelSol(sol)
  const largo = Math.hypot(x, z)
  return [-x / largo, -z / largo]
}

/** El largo de la sombra de algo de `alto` metros: alto / tan(elevación). */
export function largoDeLaSombra(alto, { elevacion } = SOL) {
  return alto / Math.tan(aRadianes(elevacion))
}

/** El recuadro del piso que la sombra tiene que cubrir: el local, la cafetería y las avenidas cercanas. */
export const ZONA_DE_SOMBRA = { x: [-30, 14], z: [-22, 28], alto: 8 }

const producto = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
const cruz = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
const normalizar = (v) => {
  const l = Math.hypot(...v)
  return v.map((c) => c / l)
}

/** Las ocho esquinas de una zona. */
export function esquinasDeLaZona({ x, z, alto } = ZONA_DE_SOMBRA) {
  const esquinas = []
  for (const px of x) for (const pz of z) for (const py of [0, alto]) esquinas.push([px, py, pz])
  return esquinas
}

/**
 * El recorte de la cámara ortográfica de la sombra: la luz está en
 * `direccion * distancia` y mira al origen. Devuelve `{ izquierda, derecha,
 * arriba, abajo, cerca, lejos }` con todos los `puntos` dentro.
 */
export function recorteDeLaSombra(puntos = esquinasDeLaZona(), direccion = direccionDelSol(), distancia = DISTANCIA_DEL_SOL, margen = 2) {
  const haciaAdelante = direccion.map((c) => -c)
  const derecha = normalizar(cruz(haciaAdelante, [0, 1, 0]))
  const arriba = cruz(derecha, haciaAdelante)
  const luz = direccion.map((c) => c * distancia)
  let izquierda = Infinity
  let der = -Infinity
  let abajo = Infinity
  let arr = -Infinity
  let cerca = Infinity
  let lejos = -Infinity
  for (const punto of puntos) {
    const x = producto(punto, derecha)
    const y = producto(punto, arriba)
    const profundidad = producto(punto.map((c, i) => c - luz[i]), haciaAdelante)
    izquierda = Math.min(izquierda, x)
    der = Math.max(der, x)
    abajo = Math.min(abajo, y)
    arr = Math.max(arr, y)
    cerca = Math.min(cerca, profundidad)
    lejos = Math.max(lejos, profundidad)
  }
  return {
    izquierda: izquierda - margen,
    derecha: der + margen,
    abajo: abajo - margen,
    arriba: arr + margen,
    cerca: Math.max(0.5, cerca - margen),
    lejos: lejos + margen,
  }
}
