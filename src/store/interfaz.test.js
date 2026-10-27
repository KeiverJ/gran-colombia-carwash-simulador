import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { beforeEach, describe, expect, it } from 'vitest'

import {
  ALTO_COMPACTO_DEL_PANEL,
  ALTO_MINIMO_DEL_PANEL,
  altoEfectivoDelPanel,
  altoInicialDelPanel,
  altoMaximoDelPanel,
  altoTrasDobleClic,
  alternarCapa,
  alturaTrasArrastrar,
  ARRASTRE_MINIMO_PX,
  cambiarAncho,
  cambiarDeModo,
  categoriaDeAncho,
  limitarAltoDelPanel,
  pestanasDeLaHoja,
  pestanasDeResultados,
  pulsarEscape,
  siguienteAlturaDeLaHoja,
  UMBRAL_DE_CELULAR,
  UMBRAL_DE_ESCRITORIO,
  useInterfaz,
} from './interfaz.js'

const base = (cambios = {}) => ({
  ancho: 1440,
  capas: { ajustes: false, resultados: false },
  ultimaCapa: null,
  pestanaResultados: 'metricas',
  pestanaHoja: 'ajustes',
  ayudaAbierta: false,
  ...cambios,
})

describe('las categorías de ancho', () => {
  it('menos de 768 px es celular, de 768 a 1199 medio y de 1200 en adelante escritorio', () => {
    expect(categoriaDeAncho(390)).toBe('celular')
    expect(categoriaDeAncho(767)).toBe('celular')
    expect(categoriaDeAncho(768)).toBe('medio')
    expect(categoriaDeAncho(1199)).toBe('medio')
    expect(categoriaDeAncho(1200)).toBe('escritorio')
    expect(categoriaDeAncho(1440)).toBe('escritorio')
  })
})

describe('abrir y cerrar capas', () => {
  it('en escritorio se pueden abrir las dos a la vez', () => {
    let estado = base()
    estado = { ...estado, ...alternarCapa(estado, 'ajustes') }
    estado = { ...estado, ...alternarCapa(estado, 'resultados') }
    expect(estado.capas).toEqual({ ajustes: true, resultados: true })
  })

  it('pulsar el botón de una capa abierta la cierra', () => {
    let estado = base()
    estado = { ...estado, ...alternarCapa(estado, 'ajustes') }
    estado = { ...estado, ...alternarCapa(estado, 'ajustes') }
    expect(estado.capas.ajustes).toBe(false)
  })

  it('entre 768 y 1199 px también se pueden abrir las dos a la vez', () => {
    let estado = base({ ancho: 1000 })
    estado = { ...estado, ...alternarCapa(estado, 'ajustes') }
    expect(estado.capas).toEqual({ ajustes: true, resultados: false })
    estado = { ...estado, ...alternarCapa(estado, 'resultados') }
    expect(estado.capas).toEqual({ ajustes: true, resultados: true })
  })

  it('en un celular no hay capas', () => {
    const estado = base({ ancho: 390 })
    expect(alternarCapa(estado, 'ajustes')).toEqual({})
  })

  it('no acepta una capa que no existe', () => {
    expect(() => alternarCapa(base(), 'otra')).toThrow(RangeError)
  })
})

describe('Escape', () => {
  it('cierra la ayuda si está abierta, antes que cualquier capa', () => {
    const estado = base({
      ayudaAbierta: true,
      capas: { ajustes: true, resultados: false },
      ultimaCapa: 'ajustes',
    })
    expect(pulsarEscape(estado)).toEqual({ ayudaAbierta: false })
  })

  it('cierra la capa que se abrió última', () => {
    let estado = base()
    estado = { ...estado, ...alternarCapa(estado, 'ajustes') }
    estado = { ...estado, ...alternarCapa(estado, 'resultados') }
    estado = { ...estado, ...pulsarEscape(estado) }
    expect(estado.capas).toEqual({ ajustes: true, resultados: false })
    estado = { ...estado, ...pulsarEscape(estado) }
    expect(estado.capas).toEqual({ ajustes: false, resultados: false })
  })

  it('no hace nada si no hay nada abierto', () => {
    expect(pulsarEscape(base())).toEqual({})
  })
})

describe('cuando cambia el ancho de la ventana', () => {
  it('al pasar a medio con las dos abiertas no se cierra ninguna', () => {
    const estado = base({
      capas: { ajustes: true, resultados: true },
      ultimaCapa: 'resultados',
    })
    expect(cambiarAncho(estado, 1000).capas).toBeUndefined()
    expect(cambiarAncho(estado, 1000).ancho).toBe(1000)
  })

  it('al pasar a celular se cierran las dos', () => {
    const estado = base({ capas: { ajustes: true, resultados: true } })
    expect(cambiarAncho(estado, 390).capas).toEqual({ ajustes: false, resultados: false })
  })

  it('en escritorio no se cierra nada', () => {
    const estado = base({ capas: { ajustes: true, resultados: true } })
    expect(cambiarAncho(estado, 1440).capas).toBeUndefined()
  })
})

describe('el modo visita y las pestañas', () => {
  it('las pestañas de Resultados: sin Métricas en la visita', () => {
    expect(pestanasDeResultados(false)).toEqual(['metricas', 'graficas'])
    expect(pestanasDeResultados(true)).toEqual(['visita', 'graficas'])
  })

  it('las pestañas de la hoja: Visita en lugar de Métricas', () => {
    expect(pestanasDeLaHoja(false)).toEqual(['ajustes', 'graficas', 'metricas'])
    expect(pestanasDeLaHoja(true)).toEqual(['ajustes', 'graficas', 'visita'])
  })

  it('pasar a la visita lleva Resultados a "Visita"; volver, a "Métricas"', () => {
    expect(cambiarDeModo(base(), true).pestanaResultados).toBe('visita')
    expect(cambiarDeModo(base({ pestanaResultados: 'visita' }), false).pestanaResultados).toBe(
      'metricas',
    )
  })

  it('la hoja cambia de Métricas a Visita y no se queda en una pestaña que no existe', () => {
    expect(cambiarDeModo(base({ pestanaHoja: 'metricas' }), true).pestanaHoja).toBe('visita')
    expect(cambiarDeModo(base({ pestanaHoja: 'visita' }), false).pestanaHoja).toBe('ajustes')
    expect(cambiarDeModo(base({ pestanaHoja: 'graficas' }), true).pestanaHoja).toBe('graficas')
  })
})

describe('la hoja inferior', () => {
  it('pasa de recogida a media, a alta y otra vez a recogida', () => {
    expect(siguienteAlturaDeLaHoja('recogida')).toBe('media')
    expect(siguienteAlturaDeLaHoja('media')).toBe('alta')
    expect(siguienteAlturaDeLaHoja('alta')).toBe('recogida')
  })
})

describe('arrastrar el asa de la hoja', () => {
  it('un arrastre corto no cambia la altura', () => {
    expect(alturaTrasArrastrar('media', -(ARRASTRE_MINIMO_PX - 1))).toBe('media')
    expect(alturaTrasArrastrar('media', 10)).toBe('media')
  })

  it('arrastrar hacia arriba la sube un escalón; hacia abajo, la baja', () => {
    expect(alturaTrasArrastrar('recogida', -ARRASTRE_MINIMO_PX)).toBe('media')
    expect(alturaTrasArrastrar('media', -200)).toBe('alta')
    expect(alturaTrasArrastrar('alta', ARRASTRE_MINIMO_PX)).toBe('media')
    expect(alturaTrasArrastrar('media', 300)).toBe('recogida')
  })

  it('no se pasa de los extremos', () => {
    expect(alturaTrasArrastrar('alta', -500)).toBe('alta')
    expect(alturaTrasArrastrar('recogida', 500)).toBe('recogida')
  })

  it('ignora lo que no es una altura o un número', () => {
    expect(alturaTrasArrastrar('gigante', -100)).toBe('gigante')
    expect(alturaTrasArrastrar('media', Number.NaN)).toBe('media')
  })
})

describe('el store de la interfaz', () => {
  const inicial = useInterfaz.getState()
  beforeEach(() => {
    useInterfaz.setState({ ...inicial, ancho: 1440 })
  })

  it('arranca con las capas cerradas y el panel de Resultados con su alto inicial', () => {
    const { capas, altoDelPanel, ayudaAbierta, hoja } = useInterfaz.getState()
    expect(capas).toEqual({ ajustes: false, resultados: false })
    expect(altoDelPanel).toBeNull()
    expect(ayudaAbierta).toBe(false)
    expect(hoja).toBe('recogida')
  })

  it('abrir y cerrar la ayuda no toca las capas', () => {
    const { abrirAyuda, cerrarAyuda, alternarCapa: abrir } = useInterfaz.getState()
    abrir('ajustes')
    abrir('resultados')
    abrirAyuda()
    expect(useInterfaz.getState().ayudaAbierta).toBe(true)
    expect(useInterfaz.getState().capas).toEqual({ ajustes: true, resultados: true })
    cerrarAyuda()
    expect(useInterfaz.getState().ayudaAbierta).toBe(false)
  })

  it('el alto del panel se recuerda al plegarlo y desplegarlo', () => {
    const e = () => useInterfaz.getState()
    e().alternarCapa('resultados')
    e().fijarAltoDelPanel(333)
    expect(e().altoActualDelPanel()).toBe(333)
    e().alternarCapa('resultados')
    e().alternarCapa('resultados')
    expect(e().altoActualDelPanel()).toBe(333)
  })

  it('terminar de arrastrar guarda el alto, dentro de los límites, y avisa a la cámara', () => {
    const e = () => useInterfaz.getState()
    useInterfaz.setState({ alto: 768 })
    const antes = e().ajustesDelPanel
    e().empezarAArrastrarElPanel()
    expect(e().arrastrandoElPanel).toBe(true)
    e().terminarDeArrastrarElPanel(5000)
    expect(e().arrastrandoElPanel).toBe(false)
    expect(e().altoDelPanel).toBe(altoMaximoDelPanel(768))
    expect(e().ajustesDelPanel).toBe(antes + 1)
  })

  it('el doble clic alterna entre 260 px y el último alto elegido', () => {
    const e = () => useInterfaz.getState()
    useInterfaz.setState({ alto: 864 })
    e().fijarAltoDelPanel(340)
    e().alternarAltoDelPanel()
    expect(e().altoActualDelPanel()).toBe(ALTO_COMPACTO_DEL_PANEL)
    e().alternarAltoDelPanel()
    expect(e().altoActualDelPanel()).toBe(340)
    e().alternarAltoDelPanel()
    expect(e().altoActualDelPanel()).toBe(ALTO_COMPACTO_DEL_PANEL)
    e().alternarAltoDelPanel()
    expect(e().altoActualDelPanel()).toBe(340)
  })

  it('la hoja solo acepta alturas que existen', () => {
    useInterfaz.getState().elegirAlturaDeLaHoja('alta')
    expect(useInterfaz.getState().hoja).toBe('alta')
    useInterfaz.getState().elegirAlturaDeLaHoja('gigante')
    expect(useInterfaz.getState().hoja).toBe('alta')
  })
})

describe('los umbrales coinciden con las hojas de estilo', () => {
  const css = ['../components/interfaz.css']
    .map((ruta) => readFileSync(fileURLToPath(new URL(ruta, import.meta.url)), 'utf8'))
    .join('\n')

  it('el CSS usa los mismos anchos que la constante de JavaScript', () => {
    expect(css).toContain(`(max-width: ${UMBRAL_DE_CELULAR - 1}px)`)
    expect(css).toContain(`(min-width: ${UMBRAL_DE_ESCRITORIO}px)`)
    expect(css).toContain(`(min-width: ${UMBRAL_DE_CELULAR}px)`)
    expect(css).toContain(`(max-width: ${UMBRAL_DE_ESCRITORIO - 1}px)`)
  })

  it('el CSS no usa ningún otro ancho en sus consultas de pantalla', () => {
    const permitidos = new Set([
      UMBRAL_DE_CELULAR - 1,
      UMBRAL_DE_CELULAR,
      UMBRAL_DE_ESCRITORIO - 1,
      UMBRAL_DE_ESCRITORIO,
    ])
    const anchos = [...css.matchAll(/\((?:min|max)-width:\s*(\d+)px\)/g)].map((m) => Number(m[1]))
    expect(anchos.length).toBeGreaterThan(0)
    for (const ancho of anchos) {
      expect(permitidos.has(ancho), `ancho ${ancho}px en una consulta de pantalla`).toBe(true)
    }
  })
})

describe('el alto del panel de Resultados', () => {
  it('el alto inicial es el 40 % de la ventana, entre 260 y 380 px', () => {
    expect(altoInicialDelPanel(600)).toBe(260)
    expect(altoInicialDelPanel(768)).toBe(307)
    expect(altoInicialDelPanel(864)).toBe(346)
    expect(altoInicialDelPanel(1080)).toBe(380)
    expect(altoInicialDelPanel(1440)).toBe(380)
    expect(altoInicialDelPanel(Number.NaN)).toBe(260)
  })

  it('se puede ajustar de 200 px al 60 % del alto de la ventana', () => {
    expect(limitarAltoDelPanel(50, 864)).toBe(ALTO_MINIMO_DEL_PANEL)
    expect(limitarAltoDelPanel(200, 864)).toBe(200)
    expect(limitarAltoDelPanel(400, 864)).toBe(400)
    expect(limitarAltoDelPanel(900, 864)).toBe(518)
    expect(altoMaximoDelPanel(864)).toBe(518)
    expect(altoMaximoDelPanel(768)).toBe(460)
  })

  it('con una ventana muy baja el máximo nunca baja del mínimo', () => {
    expect(altoMaximoDelPanel(300)).toBe(ALTO_MINIMO_DEL_PANEL)
    expect(limitarAltoDelPanel(500, 300)).toBe(ALTO_MINIMO_DEL_PANEL)
  })

  it('si la ventana se achica, el alto elegido se acomoda al nuevo máximo', () => {
    expect(altoEfectivoDelPanel(500, 864)).toBe(500)
    expect(altoEfectivoDelPanel(500, 600)).toBe(360)
    expect(altoEfectivoDelPanel(null, 768)).toBe(307)
  })

  it('el doble clic alterna entre 260 px y el último alto, una y otra vez', () => {
    let estado = { actual: 340, ultimo: 340, altoDeVentana: 864 }
    for (let i = 0; i < 6; i += 1) {
      const { alto, ultimo } = altoTrasDobleClic(estado)
      expect(alto).toBe(i % 2 === 0 ? 260 : 340)
      estado = { ...estado, actual: alto, ultimo }
    }
  })

  it('si nunca se eligió otro alto, el doble clic desde 260 lleva al alto inicial', () => {
    expect(altoTrasDobleClic({ actual: 260, ultimo: 260, altoDeVentana: 864 }).alto).toBe(346)
  })
})
