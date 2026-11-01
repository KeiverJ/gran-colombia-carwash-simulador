import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it } from 'vitest'

import { ContenidoDeAjustes } from '../components/CapaDeAjustes.jsx'
import { useSimulacion } from '../store/simulacion.js'
import { alHacerClicEnUnServidor, textoDelRotulo } from './interaccionConServidores.js'
import { estadoDeLasLosas, publicarLasLosas } from './losasPublicadas.js'

/**
 * La escena y Ajustes leen el mismo estado del store: la escena la foto del motor
 * (a través de `estadoDeLasLosas`), Ajustes el resumen que sale de esa foto.
 * Estas pruebas cierran y abren por un lado y comprueban lo que se ve por el otro.
 */
const estado = () => useSimulacion.getState()
const inicial = useSimulacion.getState()
const copiaDelInicial = { ...useSimulacion.getInitialState() }

function pintar(elemento) {
  const prestado = useSimulacion.getInitialState()
  Object.assign(prestado, estado())
  try {
    return renderToStaticMarkup(elemento)
  } finally {
    Object.assign(prestado, copiaDelInicial)
  }
}

beforeEach(() => {
  useSimulacion.setState({ ...inicial })
  estado().cambiarSemilla(1)
  estado().pausar()
  estado().cambiarVelocidad(1)
  publicarLasLosas(null)
})

/** Lo que muestra el botón de Ajustes de una placa o un puesto: «3 cerrada», «2 abierta»… */
function botonDeAjustes(titulo, numero) {
  const html = pintar(<ContenidoDeAjustes />)
  const fila = html.slice(html.indexOf(`>${titulo}</span>`))
  const botones = [...fila.matchAll(/<button\b[^>]*class="servidor [^"]*"[^>]*>(.*?)<\/button>/g)]
  return botones[numero - 1][1].replace(/<span class="solo-lectores">[^<]*<\/span>/, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

/** Lo que dibuja la escena en cada losa (placas y luego puestos). */
const enLaEscena = () => estadoDeLasLosas({ foto: estado().foto, generacion: estado().generacion })

function avanzarUnRato(cuadros) {
  estado().cambiarVelocidad(30)
  estado().iniciar()
  for (let i = 0; i < cuadros; i += 1) {
    estado().avanzarCuadro(100)
  }
}

describe('cerrar desde Ajustes se ve en la escena', () => {
  it('una placa libre cerrada con el botón se dibuja cerrada y se vuelve a abrir igual', () => {
    estado().alternarServidor('lavado', 2)
    expect(botonDeAjustes('Abrir y cerrar placas', 3)).toBe('3 cerrada')
    expect(enLaEscena()[2]).toBe('cerrada')
    expect(enLaEscena().filter((e) => e === 'cerrada')).toHaveLength(1)

    estado().alternarServidor('lavado', 2)
    expect(botonDeAjustes('Abrir y cerrar placas', 3)).toBe('3 abierta')
    expect(enLaEscena()[2]).toBe('libre')
  })

  it('un puesto va después de las placas en la escena', () => {
    estado().alternarServidor('acabado', 1)
    expect(botonDeAjustes('Abrir y cerrar puestos', 2)).toBe('2 cerrado')
    expect(enLaEscena()[6 + 1]).toBe('cerrada')
  })
})

describe('cerrar desde la escena se ve en Ajustes', () => {
  it('un clic sobre la placa pide el cambio al store y el botón de Ajustes cambia', () => {
    const { alternarServidor } = estado()
    expect(alHacerClicEnUnServidor({ delta: 0, etapa: 'lavado', indice: 4, alternarServidor })).toBe(true)
    expect(botonDeAjustes('Abrir y cerrar placas', 5)).toBe('5 cerrada')
    expect(pintar(<ContenidoDeAjustes />)).toContain('5 placas activas de 6')
  })

  it('un arrastre no cambia nada en ninguno de los dos lados', () => {
    const { alternarServidor } = estado()
    alHacerClicEnUnServidor({ delta: 30, etapa: 'lavado', indice: 4, alternarServidor })
    expect(botonDeAjustes('Abrir y cerrar placas', 5)).toBe('5 abierta')
    expect(enLaEscena()[4]).toBe('libre')
  })

  it('el rótulo de la escena y el botón de Ajustes ofrecen lo mismo', () => {
    const rotulo = () =>
      textoDelRotulo({
        etapa: 'lavado',
        indice: 0,
        estados: estado().resumen.estadosDePlacas,
        enLaVisita: false,
        enCorridaLarga: false,
      })
    expect(rotulo()).toBe('Cerrar placa 1')
    estado().alternarServidor('lavado', 0)
    expect(rotulo()).toBe('Abrir placa 1')
    expect(botonDeAjustes('Abrir y cerrar placas', 1)).toBe('1 cerrada')
  })
})

describe('«cerrándose» y su paso a «cerrado» se ven igual en los dos lados', () => {
  it('una placa con moto: cerrándose en la foto y en Ajustes, y cerrada cuando termina', () => {
    avanzarUnRato(300)
    estado().pausar()
    const ocupada = estado().foto.placas.findIndex((placa) => !placa.libre)
    expect(ocupada).toBeGreaterThanOrEqual(0)

    estado().alternarServidor('lavado', ocupada)
    expect(estado().foto.placas[ocupada].estado).toBe('cerrandose')
    expect(botonDeAjustes('Abrir y cerrar placas', ocupada + 1)).toBe(`${ocupada + 1} cerrándose`)
    // Sin lo que anima la escena (las motos), lo que ve es lo que dice el motor.
    expect(enLaEscena()[ocupada]).toBe('cerrandose')

    // Se deja correr hasta que la moto termina: la placa pasa sola a cerrada.
    estado().iniciar()
    for (let i = 0; i < 2000 && estado().foto.placas[ocupada].estado === 'cerrandose'; i += 1) {
      estado().avanzarCuadro(100)
    }
    estado().pausar()
    expect(estado().foto.placas[ocupada].estado).toBe('cerrado')
    expect(botonDeAjustes('Abrir y cerrar placas', ocupada + 1)).toBe(`${ocupada + 1} cerrada`)
    expect(enLaEscena()[ocupada]).toBe('cerrada')
  })

  it('reiniciar reabre todo, y los dos lados lo muestran', () => {
    estado().alternarServidor('lavado', 1)
    estado().alternarServidor('acabado', 0)
    estado().reiniciar()
    expect(enLaEscena().every((e) => e === 'libre')).toBe(true)
    expect(pintar(<ContenidoDeAjustes />)).toContain('6 placas activas de 6')
    expect(pintar(<ContenidoDeAjustes />)).toContain('3 puestos activos de 3')
  })
})
