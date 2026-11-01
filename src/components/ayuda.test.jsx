import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import {
  CREDITOS_DE_AMBIENTE,
  CREDITOS_DE_MODELOS,
  LICENCIA_CC0,
  LICENCIA_DE_LOS_MODELOS,
} from '../data/creditosDeModelos.js'
import { BOTONES_DE_VISTA } from '../scene/camara.js'
import { useInterfaz } from '../store/interfaz.js'
import { useSimulacion } from '../store/simulacion.js'
import { ContenidoDeLaAyuda, EncabezadoDeLaAyuda } from './RecuadroDeAyuda.jsx'

const texto = () => renderToStaticMarkup(<ContenidoDeLaAyuda />)

describe('la sección «Créditos» de la Ayuda', () => {
  it('trae el título y la licencia con su enlace', () => {
    const html = texto()
    expect(html).toContain('Créditos')
    expect(html).toContain(LICENCIA_DE_LOS_MODELOS.nombre)
    expect(html).toContain(`href="${LICENCIA_DE_LOS_MODELOS.url}"`)
  })

  it('nombra a los seis modelos: título, autor y enlace de cada uno', () => {
    const html = texto()
    expect(CREDITOS_DE_MODELOS).toHaveLength(6)
    for (const { titulo, autor, url } of CREDITOS_DE_MODELOS) {
      expect(html, `${titulo} de ${autor}`).toContain(titulo)
      expect(html).toContain(autor.replace(/&/g, '&amp;'))
      expect(html).toContain(`href="${url}"`)
    }
  })

  it('nombra a los 15 modelos de ambiente: título, autor, licencia y enlace de cada uno', () => {
    const html = texto()
    expect(CREDITOS_DE_AMBIENTE).toHaveLength(15)
    for (const { titulo, autor, licencia, url } of CREDITOS_DE_AMBIENTE) {
      expect(html, `${titulo} de ${autor}`).toContain(titulo)
      expect(html).toContain(autor)
      expect(html).toContain(`href="${url}"`)
      expect(html).toContain(`${autor} (${licencia})`)
    }
    expect(html).toContain(`href="${LICENCIA_CC0.url}"`)
  })

  it('los de Quaternius y Kay Lousberg figuran como CC0 y ya no dicen «por confirmar»', () => {
    const html = texto()
    for (const titulo of ['Police Car', 'Sports Car', 'Can Fridge', 'Streetlight']) {
      const credito = CREDITOS_DE_AMBIENTE.find((c) => c.titulo === titulo)
      expect(html).toContain(`${credito.autor} (CC0)`)
    }
    expect(html).not.toContain('por confirmar')
  })

  it('los enlaces se abren en otra pestaña sin pasar el origen', () => {
    const html = texto()
    const enlaces = html.match(/<a [^>]*>/g) ?? []
    expect(enlaces.length).toBeGreaterThanOrEqual(7 + CREDITOS_DE_AMBIENTE.length)
    for (const enlace of enlaces) {
      expect(enlace).toContain('target="_blank"')
      expect(enlace).toContain('rel="noopener noreferrer"')
    }
  })
})

describe('los trabajadores y la cafetería en la Ayuda', () => {
  it('dice que los trabajadores son ilustrativos: hasta 2 en el lavado y 3 en el acabado, junto a lo ocupado', () => {
    const html = texto()
    expect(html).toContain('Los trabajadores.')
    expect(html).toContain('hasta 2 en el lavado')
    expect(html).toContain('hasta 3 en el acabado')
    expect(html).toContain('junto a las placas y los puestos que')
    expect(html).toContain('El modelo no los toma como')
    expect(html).toContain('no cambian ninguna cifra')
  })

  it('dice que la cafetería es de adorno y no es una etapa', () => {
    const html = texto()
    expect(html).toContain('la cafetería de')
    expect(html).toContain('el pago no')
  })
})

describe('el foco de la Ayuda', () => {
  it('lo primero enfocable sigue siendo el botón «Cerrar», antes de los enlaces de créditos', () => {
    const html = renderToStaticMarkup(
      <>
        <EncabezadoDeLaAyuda onCerrar={() => {}} />
        <ContenidoDeLaAyuda />
      </>,
    )
    const primero = html.search(/<button|<a /)
    expect(html.slice(primero, primero + 7)).toBe('<button')
    expect(html.slice(primero, html.indexOf('</button>', primero))).toContain('Cerrar')
  })
})

describe('los planes en la Ayuda', () => {
  it('dice que cada moto lleva en el piso un aro con el color y el trazo de su plan', () => {
    expect(texto()).toContain('Cada moto lleva en el piso un aro con el color y el trazo de su plan.')
  })

  it('describe el trazo de cada plan y ya no habla de esfera, cubo ni cono', () => {
    const html = texto()
    expect(html).toContain('aro sólido')
    expect(html).toContain('aro en segmentos')
    expect(html).toContain('aro doble')
    for (const figura of ['esfera', 'cubo', 'cono', 'sobre la moto']) {
      expect(html, figura).not.toContain(figura)
    }
  })
})

describe('las losas en la Ayuda', () => {
  it('explica libre, reservada (moto en camino) y ocupada', () => {
    const html = texto()
    expect(html).toContain('reservada')
    expect(html).toContain('moto en camino')
    expect(html).toContain('ocupada')
  })
})

describe('el resto de la Ayuda', () => {
  it('dice que la avenida de entrada es ilustrativa', () => {
    expect(texto()).toMatch(/ilustrativo/)
    expect(texto()).toContain('la visita no registró')
  })

  it('nombra los cuatro botones de cámara con sus nombres nuevos y ningún nombre viejo', () => {
    const html = texto()
    for (const { nombre } of BOTONES_DE_VISTA) {
      expect(html, nombre).toContain(`«${nombre}»`)
    }
    for (const viejo of ['Como en la foto', 'Desde arriba (plano)', 'Recentrar']) {
      expect(html).not.toContain(viejo)
    }
  })

  it('explica la fila de espera del lado derecho, no la del frente', () => {
    expect(texto()).toContain('lado derecho del local')
  })
})

describe('abrir y cerrar la Ayuda no toca la simulación', () => {
  it('la simulación sigue corriendo, con su reloj, su velocidad y su motor', () => {
    useSimulacion.getState().iniciar()
    const antes = useSimulacion.getState()
    useInterfaz.getState().abrirAyuda()
    expect(useInterfaz.getState().ayudaAbierta).toBe(true)
    useInterfaz.getState().cerrarAyuda()
    const despues = useSimulacion.getState()
    expect(useInterfaz.getState().ayudaAbierta).toBe(false)
    expect(despues.corriendo).toBe(true)
    expect(despues.motor).toBe(antes.motor)
    expect(despues.velocidadMinPorSegundo).toBe(antes.velocidadMinPorSegundo)
    expect(despues.foto).toBe(antes.foto)
    useSimulacion.getState().pausar()
  })
})

describe('la línea de la Ayuda sobre las gráficas', () => {
  it('dice qué muestra cada gráfica y que los puestos de la visita son aproximados', () => {
    const html = texto()
    expect(html).toContain('Las gráficas.')
    expect(html).toContain('Las dos filas a lo largo del tiempo')
    expect(html).toContain('cada placa y cada puesto')
    expect(html).toContain('los puestos son aproximados')
    expect(html).toContain('como tabla')
  })
})

describe('cerrar y abrir placas y puestos en la Ayuda', () => {
  const html = texto()

  it('tiene su sección y explica las dos maneras de hacerlo', () => {
    expect(html).toContain('Cerrar y abrir placas y puestos')
    expect(html).toContain('fila de botones')
    expect(html).toContain('Ajustes')
    expect(html).toContain('Cerrar placa 3')
    expect(html).toContain('Abrir placa 3')
  })

  it('explica cerrándose, la regla del último servidor abierto y que no reinicia', () => {
    expect(html).toContain('cerrándose')
    expect(html).toContain('termina de atender')
    expect(html).toMatch(/al menos un servidor abierto/)
    expect(html).toContain('el último no se')
    expect(html).toContain('no se reinicia')
  })

  it('explica cómo se ve un servidor cerrado sin depender del color', () => {
    expect(html).toContain('barrera')
    expect(html).toContain('señal de aviso')
    expect(html).toContain('más bajo')
  })

  it('dice que en la visita y en la corrida larga no se puede', () => {
    expect(html).toContain('En la visita y durante la corrida larga no se puede abrir ni cerrar nada')
  })

  it('dice que las fórmulas usan los servidores abiertos y qué lo devuelve todo a abierto', () => {
    expect(html).toContain('usan los servidores que están abiertos')
    expect(html).toContain('vuelve a abrirlo')
  })
})
