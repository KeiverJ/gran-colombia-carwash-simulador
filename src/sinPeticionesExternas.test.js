import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * La página publicada no debe pedir nada a internet: ni fuentes, ni hojas de estilo, ni
 * programas, ni imágenes, ni modelos. Todo sale del mismo sitio (GitHub Pages bajo
 * `/gran-colombia-carwash-simulador/`) y la aplicación se ve igual sin conexión.
 *
 * Sin navegador no se puede mirar la red, así que esta prueba busca direcciones
 * `http://` o `https://` en los lugares desde donde algo se carga solo:
 *   · `index.html`: etiquetas `<link>`, `<script>`, `<img>`, `<iframe>` y similares. Las
 *     etiquetas `<meta>` de Open Graph y de Twitter llevan direcciones absolutas a propósito
 *     (las redes no resuelven rutas relativas) pero no cargan nada al abrir la página.
 *   · Las hojas de estilo: `url(...)` y `@import`.
 *   · El código: peticiones (`fetch`, `import()`, cargadores de modelos y de texturas,
 *     `new Image`, `.src =`) con una dirección a la vista.
 *   · Los SVG de `public/`: imágenes o enlaces que apunten fuera.
 *
 * Los enlaces `<a href>` de los créditos (Poly Pizza, licencias) son direcciones para que
 * la persona las visite y no se cargan solas, así que no cuentan. La medida real, con el
 * registro de red del navegador, se hizo a mano y quedó anotada en el cambio `publicar`.
 */
const EXTERNA = /(?:https?:)?\/\/[\w-]+(?:\.[\w-]+)+/u
const CON_PROTOCOLO = /https?:\/\//u

/** Todos los archivos de una carpeta con alguna de las extensiones dadas. */
function archivos(carpeta, extensiones) {
  return readdirSync(carpeta).flatMap((nombre) => {
    const ruta = join(carpeta, nombre)
    if (statSync(ruta).isDirectory()) return archivos(ruta, extensiones)
    return extensiones.some((e) => nombre.endsWith(e)) ? [ruta] : []
  })
}

const sinComentariosDeCss = (css) => css.replace(/\/\*[\s\S]*?\*\//gu, '')
const sinComentariosDeJs = (js) => js.replace(/\/\*[\s\S]*?\*\//gu, '').replace(/(^|[^:])\/\/.*$/gmu, '$1')

/** Etiquetas de `index.html` que cargan algo de otro dominio: cualquiera menos `<meta>` y `<a>`. */
export function cargasExternasDelHtml(html) {
  const sinComentarios = html.replace(/<!--[\s\S]*?-->/gu, '')
  const etiquetas = sinComentarios.match(/<(?!meta\b|a\b|\/|!)[^>]*>/giu) ?? []
  return etiquetas.filter((etiqueta) => CON_PROTOCOLO.test(etiqueta) || /\s(?:src|href)="\/\//u.test(etiqueta))
}

/** Direcciones externas que una hoja de estilo carga con `url()` o `@import`. */
export function cargasExternasDelCss(css) {
  const limpio = sinComentariosDeCss(css)
  return [...limpio.matchAll(/(?:url\(\s*|@import\s+(?:url\(\s*)?)['"]?([^'")\s]+)/giu)]
    .map(([, direccion]) => direccion)
    .filter((direccion) => EXTERNA.test(direccion))
}

const VERBOS_DE_CARGA =
  /\b(?:fetch|import|useGLTF|useTexture|useLoader|useFont|load|loadAsync|Image|Audio|Worker)\s*\(|\.src\s*=|\bsrc\s*[:=]|\bhref\s*=\s*['"]http|new URL\(/u

/** Líneas del código que cargan algo desde una dirección externa. */
export function cargasExternasDelCodigo(js) {
  return sinComentariosDeJs(js)
    .split(/\r?\n/u)
    .map((linea, i) => ({ linea: linea.trim(), numero: i + 1 }))
    .filter(({ linea }) => CON_PROTOCOLO.test(linea) && VERBOS_DE_CARGA.test(linea))
    .map(({ linea, numero }) => `línea ${numero}: ${linea}`)
}

describe('index.html', () => {
  const html = readFileSync('index.html', 'utf8')

  it('no carga nada de otros dominios (ni Google Fonts ni precargas)', () => {
    expect(cargasExternasDelHtml(html)).toEqual([])
    expect(html).not.toMatch(/fonts\.(?:googleapis|gstatic)\.com/u)
    expect(html).not.toMatch(/rel="(?:preconnect|dns-prefetch|preload|stylesheet)"[^>]*https?:/u)
  })

  it('las direcciones absolutas de compartir parten de la dirección publicada', () => {
    const publicada = 'https://keiverj.github.io/gran-colombia-carwash-simulador/'
    const metas = html.match(/<meta[^>]*(?:og:url|og:image"|twitter:image")[^>]*>/gu) ?? []
    expect(metas.length).toBeGreaterThanOrEqual(3)
    for (const meta of metas) expect(meta, meta).toContain(publicada)
  })
})

describe('las hojas de estilo', () => {
  const hojas = archivos('src', ['.css'])

  it('hay hojas que revisar', () => {
    expect(hojas.length).toBeGreaterThan(5)
  })

  it('ninguna carga una fuente, una imagen o una hoja de otro dominio', () => {
    const problemas = hojas.flatMap((ruta) => cargasExternasDelCss(readFileSync(ruta, 'utf8')).map((d) => `${ruta}: ${d}`))
    expect(problemas, `Cargas externas en hojas de estilo:\n${problemas.join('\n')}`).toEqual([])
  })

  it('las fuentes se piden al propio sitio', () => {
    const css = readFileSync('src/estilos/fuentes.css', 'utf8')
    const rutas = [...sinComentariosDeCss(css).matchAll(/url\(\s*['"]?([^'")]+)/gu)].map(([, r]) => r)
    expect(rutas.length).toBeGreaterThan(0)
    for (const ruta of rutas) expect(ruta, ruta).toMatch(/^\/fuentes\//u)
  })
})

describe('el código de la aplicación', () => {
  const fuentes = archivos('src', ['.js', '.jsx']).filter((ruta) => !/\.test\.jsx?$/u.test(ruta))

  it('hay código que revisar', () => {
    expect(fuentes.length).toBeGreaterThan(100)
  })

  it('ninguna petición, cargador de modelos o imagen apunta a una dirección externa', () => {
    const problemas = fuentes.flatMap((ruta) =>
      cargasExternasDelCodigo(readFileSync(ruta, 'utf8')).map((cual) => `${ruta} (${cual})`),
    )
    expect(problemas, `Cargas externas en el código:\n${problemas.join('\n')}`).toEqual([])
  })

  it('el texto de la escena no usa la fuente por defecto de Drei (se baja de un CDN)', () => {
    const conTexto = fuentes.filter((ruta) =>
      /import[^;]*\bText\b[^;]*from '@react-three\/drei'/u.test(readFileSync(ruta, 'utf8')),
    )
    expect(conTexto, 'Drei <Text> pide una fuente a internet si no se le da `font`').toEqual([])
  })

  it('los entornos de Drei no usan `preset` (descarga un HDRI de internet)', () => {
    const conPreset = fuentes.filter((ruta) => /<Environment[^>]*\bpreset=/u.test(readFileSync(ruta, 'utf8')))
    expect(conPreset).toEqual([])
  })
})

describe('los SVG de public/', () => {
  const svgs = archivos('public', ['.svg'])

  it('no traen imágenes ni enlaces a otros sitios (el xmlns de SVG no se carga)', () => {
    expect(svgs.length).toBeGreaterThanOrEqual(3)
    for (const ruta of svgs) {
      const texto = readFileSync(ruta, 'utf8').replace(/xmlns(?::\w+)?="[^"]*"/gu, '')
      expect(texto, ruta).not.toMatch(/<image\b/u)
      expect(texto, ruta).not.toMatch(/href="(?:https?:)?\/\//u)
      expect(texto, ruta).not.toMatch(/url\(\s*['"]?https?:/u)
    }
  })
})

describe('los detectores de esta prueba', () => {
  it('encuentran una fuente de Google Fonts en el HTML', () => {
    const malo = '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter" />'
    expect(cargasExternasDelHtml(malo)).toHaveLength(1)
  })

  it('aceptan las etiquetas meta de compartir y los enlaces a otros sitios', () => {
    const bueno = '<meta property="og:image" content="https://a.github.io/x.jpg" /><a href="https://poly.pizza/m/x">x</a>'
    expect(cargasExternasDelHtml(bueno)).toEqual([])
  })

  it('encuentran un url() externo en una hoja y aceptan uno propio', () => {
    expect(cargasExternasDelCss("@font-face { src: url('https://x.com/a.woff2') }")).toEqual(['https://x.com/a.woff2'])
    expect(cargasExternasDelCss("@font-face { src: url('/fuentes/a.woff2') }")).toEqual([])
    expect(cargasExternasDelCss("@import 'https://x.com/a.css';")).toEqual(['https://x.com/a.css'])
  })

  it('encuentran un fetch o un cargador con una dirección y aceptan un enlace de créditos', () => {
    expect(cargasExternasDelCodigo("fetch('https://x.com/a.json')")).toHaveLength(1)
    expect(cargasExternasDelCodigo("useGLTF('https://x.com/a.glb')")).toHaveLength(1)
    expect(cargasExternasDelCodigo("const url = 'https://poly.pizza/m/abc'")).toEqual([])
    expect(cargasExternasDelCodigo("// fetch('https://x.com/a.json')")).toEqual([])
  })
})
