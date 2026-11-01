/**
 * Los créditos de las dos fuentes con las que se dibujó el texto del logo.
 *
 * La aplicación no carga ninguna de las dos: el texto del logo ya está
 * convertido en trazos dentro de `public/logo-gran-colombia.svg`. Se acreditan
 * igual porque el dibujo sale de ellas y su licencia lo pide.
 *
 * Los autores y la licencia son los que dice el archivo OFL.txt de cada fuente
 * en el repositorio de Google Fonts (google/fonts, carpetas `ofl/anton` y
 * `ofl/pacifico`), consultado el 1 de noviembre de 2026.
 */

export const LICENCIA_DE_LAS_FUENTES = {
  nombre: 'SIL Open Font License 1.1',
  url: 'https://openfontlicense.org',
}

export const CREDITOS_DE_FUENTES = [
  {
    nombre: 'Anton',
    autor: 'The Anton Project Authors',
    url: 'https://fonts.google.com/specimen/Anton',
    licencia: LICENCIA_DE_LAS_FUENTES.nombre,
    urlDeLaLicencia: LICENCIA_DE_LAS_FUENTES.url,
  },
  {
    nombre: 'Pacifico',
    autor: 'The Pacifico Project Authors',
    url: 'https://fonts.google.com/specimen/Pacifico',
    licencia: LICENCIA_DE_LAS_FUENTES.nombre,
    urlDeLaLicencia: LICENCIA_DE_LAS_FUENTES.url,
  },
]
