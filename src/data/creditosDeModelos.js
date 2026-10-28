/**
 * Los créditos de los seis modelos 3D de motos de la escena.
 *
 * Son modelos de Poly Pizza con licencia CC-BY 3.0, que obliga a nombrar al
 * autor. Los datos son los de `modelos-candidatos/enlaces.txt`, en el mismo
 * orden: el número `n` es el del archivo `public/modelos/moto-<n>.glb`.
 * Los modelos se modificaron para la aplicación (se giraron, se escalaron, dos
 * se simplificaron y todos se comprimieron).
 */

export const LICENCIA_DE_LOS_MODELOS = {
  nombre: 'CC-BY 3.0',
  url: 'https://creativecommons.org/licenses/by/3.0/',
}

const ENLACE_BASE = 'https://poly.pizza/m/'

const crear = (n, titulo, autor, id) => ({
  n,
  archivo: `moto-${n}.glb`,
  titulo,
  autor,
  licencia: LICENCIA_DE_LOS_MODELOS.nombre,
  urlDeLaLicencia: LICENCIA_DE_LOS_MODELOS.url,
  url: `${ENLACE_BASE}${id}`,
})

export const CREDITOS_DE_MODELOS = [
  crear(1, 'Vespa', 'Jasmine Roberts', 'blGLclvvdEM'),
  crear(2, 'Motorcycle', 'Poly by Google', 'dse64pqMKAR'),
  crear(3, 'Motorcycle', 'Poly by Google', '5_MTCnqfUTr'),
  crear(4, 'Motorcycle', 'Poly by Google', 'cFvmALDjMKw'),
  crear(5, 'Motorcycle', 'jeremy', '0lBe-ApqJs4'),
  crear(6, 'low poly scooter', 'Thomas Saint Pierre (s1pierro)', 'awXCP7LUcz6'),
]

/** Cuántos modelos distintos hay. */
export const CANTIDAD_DE_MODELOS = CREDITOS_DE_MODELOS.length

/** La línea de crédito tal como la da Poly Pizza (la que va en el README). */
export function lineaDeCredito({ titulo, autor, licencia, urlDeLaLicencia, url }) {
  return `${titulo} by ${autor} [${licencia.replace(' 3.0', '')}] (${urlDeLaLicencia}) via Poly Pizza (${url})`
}
