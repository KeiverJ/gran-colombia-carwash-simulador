import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it } from 'vitest'

import { useSimulacion } from '../store/simulacion.js'
import { ContenidoDeAjustes } from './CapaDeAjustes.jsx'

const estado = () => useSimulacion.getState()
const inicial = useSimulacion.getState()
const copiaDelInicial = { ...useSimulacion.getInitialState() }

/**
 * Pinta con el estado de ahora. `renderToStaticMarkup` lee el estado *inicial*
 * del store (el de servidor), así que se le presta el actual solo mientras se pinta.
 */
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
})

const ajustes = () => pintar(<ContenidoDeAjustes />)

/** Los botones de servidor de una fila, en orden: { etiqueta, texto, desactivado, ... }. */
function botonesDe(html, titulo) {
  const grupo = html.match(
    new RegExp(`role="group"[^>]*aria-labelledby="([^"]+)"[^>]*><span id="\\1"[^>]*>${titulo}</span>(.*?)</div>`),
  )
  expect(grupo, `no hay la fila «${titulo}»`).not.toBeNull()
  return [...grupo[2].matchAll(/<button\b([^>]*)>(.*?)<\/button>/g)].map(([, atributos, dentro]) => ({
    atributos,
    clase: atributos.match(/class="([^"]*)"/)?.[1] ?? '',
    presionado: atributos.match(/aria-pressed="(\w+)"/)?.[1],
    desactivado: /\bdisabled(=|\s|$)/.test(atributos),
    describedby: atributos.match(/aria-describedby="([^"]+)"/)?.[1],
    // El nombre accesible: todo el texto, con el que solo leen las ayudas técnicas.
    nombre: dentro.replace(/<[^>]+>/g, '').trim(),
    visible: dentro.replace(/<span class="solo-lectores">[^<]*<\/span>/, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(),
  }))
}

const placas = () => botonesDe(ajustes(), 'Abrir y cerrar placas')
const puestos = () => botonesDe(ajustes(), 'Abrir y cerrar puestos')

describe('la fila de botones por servidor en Ajustes', () => {
  it('con 6 placas y 3 puestos hay un botón por servidor, todos abiertos', () => {
    expect(placas()).toHaveLength(6)
    expect(puestos()).toHaveLength(3)
    for (const boton of [...placas(), ...puestos()]) {
      expect(boton.presionado).toBe('true')
      expect(boton.visible).toMatch(/^\d+ abiert[ao]$/)
    }
    expect(placas()[2].nombre).toBe('Placa 3abierta')
    expect(puestos()[0].nombre).toBe('Puesto 1abierto')
  })

  it('la fila cambia sola con el número de placas y de puestos', () => {
    estado().cambiarParametro('placas', 8)
    estado().cambiarParametro('puestos', 7)
    expect(placas()).toHaveLength(8)
    expect(puestos()).toHaveLength(7)
    estado().cambiarParametro('placas', 14)
    expect(placas()).toHaveLength(14)
    estado().cambiarParametro('placas', 1)
    expect(placas()).toHaveLength(1)
  })

  it('una placa cerrada se lee cerrada, distinta de las demás sin depender del color', () => {
    estado().alternarServidor('lavado', 2)
    const botones = placas()
    expect(botones[2].visible).toBe('3 cerrada')
    expect(botones[2].presionado).toBe('false')
    expect(botones[2].clase).toContain('servidor--cerrado')
    expect(botones[2].visible).not.toBe(botones[1].visible)
    expect(botones[1].visible).toBe('2 abierta')
    expect(ajustes()).toContain('5 placas activas de 6')
  })

  it('un puesto cerrado habla en masculino', () => {
    estado().alternarServidor('acabado', 1)
    expect(puestos()[1].visible).toBe('2 cerrado')
    expect(ajustes()).toContain('2 puestos activos de 3')
  })

  it('un servidor que se está cerrando se muestra como cerrándose', () => {
    estado().cambiarVelocidad(30)
    estado().iniciar()
    for (let i = 0; i < 300; i += 1) {
      estado().avanzarCuadro(100)
    }
    const ocupada = estado().foto.placas.findIndex((placa) => !placa.libre)
    expect(ocupada).toBeGreaterThanOrEqual(0)
    estado().cerrarServidor('lavado', ocupada)
    const boton = placas()[ocupada]
    expect(boton.visible).toBe(`${ocupada + 1} cerrándose`)
    expect(boton.clase).toContain('servidor--cerrandose')
    // Cuenta como no activo: el aviso de la etapa habla de los que reciben motos.
    expect(ajustes()).toContain('5 placas activas de 6')
  })

  it('con dos de cinco puestos cerrados dice 3 activos de 5 y que el ρ usa esos 3', () => {
    estado().cambiarParametro('puestos', 5)
    estado().cerrarServidor('acabado', 0)
    estado().cerrarServidor('acabado', 4)
    const html = ajustes()
    expect(html).toContain('3 puestos activos de 5')
    expect(html).toContain('el ρ calculado de esta etapa usa los 3 activos')
  })

  it('con todos abiertos no dice nada del ρ de los activos', () => {
    expect(ajustes()).not.toContain('usa los')
  })

  it('el último servidor activo va desactivado y apunta a su motivo', () => {
    for (const indice of [0, 1, 2, 3, 4]) {
      estado().cerrarServidor('lavado', indice)
    }
    const html = ajustes()
    const botones = botonesDe(html, 'Abrir y cerrar placas')
    expect(botones[5].desactivado).toBe(true)
    expect(botones[5].describedby).toBeTruthy()
    expect(html).toContain(`id="${botones[5].describedby}"`)
    expect(html).toContain('la única abierta')
    // Los cerrados sí se pueden volver a abrir.
    expect(botones.slice(0, 5).every((boton) => !boton.desactivado)).toBe(true)
  })

  it('con una sola placa, esa placa no se puede cerrar', () => {
    estado().cambiarParametro('placas', 1)
    const [unica] = placas()
    expect(unica.desactivado).toBe(true)
    expect(ajustes()).toContain('1 placa activa de 1')
  })

  it('un servidor cerrándose no cuenta como activo para proteger al último', () => {
    estado().cambiarVelocidad(30)
    estado().iniciar()
    for (let i = 0; i < 300; i += 1) {
      estado().avanzarCuadro(100)
    }
    const ocupada = estado().foto.placas.findIndex((placa) => !placa.libre)
    estado().cerrarServidor('lavado', ocupada)
    // Se cierran todas las demás menos una: la que queda activa es la última.
    const demas = [0, 1, 2, 3, 4, 5].filter((i) => i !== ocupada)
    for (const indice of demas.slice(0, -1)) {
      estado().cerrarServidor('lavado', indice)
    }
    const ultima = demas.at(-1)
    const botones = placas()
    expect(botones[ultima].desactivado).toBe(true)
    expect(botones[ocupada].desactivado).toBe(false)
  })

  it('son botones de verdad: se recorren con Tab y se activan con Enter o espacio', () => {
    for (const boton of [...placas(), ...puestos()]) {
      expect(boton.atributos).toContain('type="button"')
      expect(boton.atributos).not.toContain('tabindex')
      expect(boton.atributos).not.toContain('role=')
    }
  })
})

describe('la fila en la visita y durante la corrida larga', () => {
  it('en la visita está desactivada y lo dice', () => {
    estado().entrarEnLaVisita()
    const html = ajustes()
    expect(html).toContain('En la visita no se pueden abrir ni cerrar')
    expect(html).toMatch(/<fieldset class="parametros" disabled/)
    expect(botonesDe(html, 'Abrir y cerrar placas')).toHaveLength(6)
  })

  it('durante la corrida larga está desactivada y lo dice', () => {
    estado().empezarCorridaLarga(100, { camaraRapida: false })
    const html = ajustes()
    expect(html).toContain('Durante la corrida larga no se pueden abrir ni cerrar')
    expect(html).toMatch(/<fieldset class="parametros" disabled/)
  })

  it('en uso normal no aparece ningún motivo de bloqueo', () => {
    const html = ajustes()
    expect(html).not.toContain('no se pueden abrir ni cerrar')
  })
})
