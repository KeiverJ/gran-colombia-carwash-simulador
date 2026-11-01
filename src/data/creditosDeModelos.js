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

/**
 * Los 15 modelos 3D de ambiente (carros, árboles, planta, farol, semáforo,
 * señal, cono, balde, caja, nevera y la multitud). Son de Poly Pizza; los
 * de Quaternius y Kay Lousberg son CC0 (dominio público) y el resto CC-BY 3.0.
 * Los datos son los de `modelos-candidatos/enlaces.txt` (a partir de la línea 7), menos
 * «Truck» de sugamo, que se descartó (ver `docs/modelos/ambiente-y-vida.md`). La clave es el nombre del archivo
 * `public/modelos/ambiente/<clave>.glb`. Los modelos se prepararon con
 * `docs/modelos/preparar-ambiente.mjs`.
 */

export const LICENCIA_CC0 = {
  nombre: 'CC0',
  url: 'https://creativecommons.org/publicdomain/zero/1.0/',
}

const crearDeAmbiente = (clave, titulo, autor, id, licencia = LICENCIA_DE_LOS_MODELOS) => ({
  clave,
  archivo: `${clave}.glb`,
  titulo,
  autor,
  licencia: licencia.nombre,
  urlDeLaLicencia: licencia.url,
  url: `${ENLACE_BASE}${id}`,
})

export const CREDITOS_DE_AMBIENTE = [
  crearDeAmbiente('planta', 'Fiddle-leaf Plant', 'Poly by Google', '2ag6_uuqsnb'),
  crearDeAmbiente('cono', 'Traffic Cone', 'Adam Marc Williams', 'eFQ60hneKwL'),
  crearDeAmbiente('mazda', 'Mazda RX-7', 'IvOfficial', 'SnIoWlh7S2'),
  crearDeAmbiente('patrulla', 'Police Car', 'Quaternius', 'BwwnUrWGmV', LICENCIA_CC0),
  crearDeAmbiente('deportivo', 'Sports Car', 'Quaternius', '1mkmFkAz5v', LICENCIA_CC0),
  crearDeAmbiente('banano', 'cartoon banana car', 'Felipe Lujan-Bear', '1RjuCX8gI9w'),
  crearDeAmbiente('arbol1', 'Tree', 'ParfaitUwU', 'MSuchZNT2G'),
  crearDeAmbiente('arbol2', 'Tree', 'Poly by Google', '6pwiq7hSrHr'),
  crearDeAmbiente('multitud', 'crowd', 'apelab', '2-i2ZDps78-'),
  crearDeAmbiente('farol', 'Streetlight', 'Kay Lousberg', 'vPFSLYh6sg', LICENCIA_CC0),
  crearDeAmbiente('semaforo', 'Traffic light', 'Poly by Google', '57rxXzowK8w'),
  crearDeAmbiente('stop', 'Stop sign', 'Poly by Google', '60GyU9CdZ9r'),
  crearDeAmbiente('balde', 'Bucket', 'Poly by Google', '5HPoa3eX0Jb'),
  crearDeAmbiente('caja', 'POS Machine', 'J-Toastie', 'ju1CrAV1UY'),
  crearDeAmbiente('nevera', 'Can Fridge', 'Quaternius', '8OHbykvREu', LICENCIA_CC0),
]

/** La línea de crédito tal como la da Poly Pizza (la que va en el README). */
export function lineaDeCredito({ titulo, autor, licencia, urlDeLaLicencia, url }) {
  return `${titulo} by ${autor} [${licencia.replace(' 3.0', '')}] (${urlDeLaLicencia}) via Poly Pizza (${url})`
}
