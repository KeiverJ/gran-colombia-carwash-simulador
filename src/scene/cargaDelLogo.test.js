import { ShapePath } from 'three'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  RUTA_DEL_LETRERO,
  RUTA_DEL_LOGO,
  cargarLetreroUnaVez,
  cargarLogoUnaVez,
  leerLetrero,
  leerLogo,
  olvidarElLogo,
} from './cargaDelLogo.js'

/** Un cargador de mentira: entrega lo que se le diga o falla con lo que se le diga. */
const cargadorQue = (respuesta) => ({
  loadAsync: () => (respuesta instanceof Error ? Promise.reject(respuesta) : Promise.resolve(respuesta)),
})

function rectangulo(estilo) {
  const trazado = new ShapePath()
  trazado.userData = { style: { fill: 'none', strokeWidth: 1, strokeLineJoin: 'miter', strokeLineCap: 'butt', strokeMiterLimit: 4, ...estilo } }
  trazado.moveTo(0, 0).lineTo(100, 0).lineTo(100, 50).lineTo(0, 50)
  trazado.currentPath.autoClose = true
  return trazado
}

const CAPAS = [{ papel: 'base', desde: 0, hasta: 8 }]
const OPCIONES = { capas: CAPAS, medida: { ancho: 600, alto: 400 } }

describe('la ruta del logo', () => {
  it('es local y parte de la base de Vite, para que sirva también en GitHub Pages', () => {
    expect(RUTA_DEL_LOGO.startsWith(import.meta.env.BASE_URL)).toBe(true)
    expect(RUTA_DEL_LOGO.endsWith('logo-gran-colombia.svg')).toBe(true)
    expect(RUTA_DEL_LOGO).not.toMatch(/^https?:/)
  })
})

describe('leerLogo', () => {
  beforeEach(() => vi.spyOn(console, 'warn').mockImplementation(() => {}))
  afterEach(() => vi.restoreAllMocks())

  it('construye el logo de 1 m de ancho con lo que entrega el cargador', async () => {
    const logo = await leerLogo('x.svg', cargadorQue({ paths: [rectangulo({ fill: '#1F3FA6' })] }), OPCIONES)
    expect(logo.ancho).toBe(1)
    expect(logo.piezas).toHaveLength(1)
  })

  it('devuelve null, sin lanzar, si la petición falla', async () => {
    await expect(leerLogo('x.svg', cargadorQue(new Error('404')), OPCIONES)).resolves.toBeNull()
  })

  it('devuelve null, sin lanzar, si el texto está dañado y no trae trazados', async () => {
    await expect(leerLogo('x.svg', cargadorQue({ paths: [] }), OPCIONES)).resolves.toBeNull()
  })

  it('devuelve null si el cargador entrega algo que no es un resultado', async () => {
    await expect(leerLogo('x.svg', cargadorQue(undefined), OPCIONES)).resolves.toBeNull()
  })

  it('devuelve null si trae otra cantidad de trazados que de capas', async () => {
    const dos = { paths: [rectangulo({ fill: '#fff' }), rectangulo({ fill: '#000' })] }
    await expect(leerLogo('x.svg', cargadorQue(dos), OPCIONES)).resolves.toBeNull()
  })

  it('devuelve null si pasa del tope de triángulos', async () => {
    const uno = { paths: [rectangulo({ fill: '#1F3FA6' })] }
    await expect(leerLogo('x.svg', cargadorQue(uno), { ...OPCIONES, tope: 3 })).resolves.toBeNull()
  })
})

describe('cargarLogoUnaVez', () => {
  beforeEach(olvidarElLogo)
  afterEach(olvidarElLogo)

  it('pide el archivo una sola vez aunque se llame varias', async () => {
    const leer = vi.fn(() => Promise.resolve({ listo: true }))
    const [a, b] = await Promise.all([cargarLogoUnaVez(leer), cargarLogoUnaVez(leer)])
    await cargarLogoUnaVez(leer)
    expect(leer).toHaveBeenCalledTimes(1)
    expect(a).toBe(b)
  })

  it('un fallo da null y no se reintenta en cada llamada', async () => {
    const leer = vi.fn(() => Promise.resolve(null))
    expect(await cargarLogoUnaVez(leer)).toBeNull()
    expect(await cargarLogoUnaVez(leer)).toBeNull()
    expect(leer).toHaveBeenCalledTimes(1)
  })

  it('si el lector lanza, también da null', async () => {
    const leer = vi.fn(() => {
      throw new Error('boom')
    })
    expect(await cargarLogoUnaVez(leer)).toBeNull()
  })
})

describe('el letrero horizontal de la pared', () => {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    olvidarElLogo()
  })
  afterEach(() => {
    vi.restoreAllMocks()
    olvidarElLogo()
  })

  it('su ruta es local, con la base de Vite, y no es la del logo del techo', () => {
    expect(RUTA_DEL_LETRERO.startsWith(import.meta.env.BASE_URL)).toBe(true)
    expect(RUTA_DEL_LETRERO.endsWith('logo-gran-colombia-horizontal.svg')).toBe(true)
    expect(RUTA_DEL_LETRERO).not.toMatch(/^https?:/)
    expect(RUTA_DEL_LETRERO).not.toBe(RUTA_DEL_LOGO)
  })

  it('devuelve null, sin lanzar, si la petición falla o el archivo no trae lo esperado', async () => {
    await expect(leerLetrero('x.svg', cargadorQue(new Error('404')))).resolves.toBeNull()
    await expect(leerLetrero('x.svg', cargadorQue({ paths: [] }))).resolves.toBeNull()
  })

  it('se pide aparte del logo y una sola vez', async () => {
    const leerElLogo = vi.fn(() => Promise.resolve('logo'))
    const leerElLetrero = vi.fn(() => Promise.resolve(null))
    expect(await cargarLogoUnaVez(leerElLogo)).toBe('logo')
    expect(await cargarLetreroUnaVez(leerElLetrero)).toBeNull()
    expect(await cargarLetreroUnaVez(leerElLetrero)).toBeNull()
    expect(leerElLogo).toHaveBeenCalledTimes(1)
    expect(leerElLetrero).toHaveBeenCalledTimes(1)
  })

  it('un letrero caído no tumba al logo del techo', async () => {
    expect(await cargarLetreroUnaVez(() => Promise.resolve(null))).toBeNull()
    expect(await cargarLogoUnaVez(() => Promise.resolve('logo'))).toBe('logo')
  })
})
