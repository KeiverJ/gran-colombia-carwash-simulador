import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it } from 'vitest'

import { COLOR_DE_PLAN, COLOR_DE_RESERVADO } from '../estilos/colores.js'
import { useInterfaz } from '../store/interfaz.js'
import LeyendaDePlanes from './LeyendaDePlanes.jsx'
import { SEGMENTOS_DEL_ARO } from './recursosDeMoto.js'

const html = () => renderToStaticMarkup(<LeyendaDePlanes />)

/** Las muestras de aro de la leyenda, cada una con sus círculos. */
const muestras = () => html().match(/<svg class="muestra-de-aro"[\s\S]*?<\/svg>/g) ?? []

describe('la leyenda de la escena', () => {
  it('tiene una entrada por plan, con su nombre corto y su aro', () => {
    const texto = html()
    for (const plan of [1, 2, 3]) expect(texto).toContain(`Plan ${plan}</span>`)
    expect(muestras()).toHaveLength(3)
  })

  it('ya no habla de formas encima de la moto ni de un aro aparte', () => {
    const texto = html()
    for (const viejo of ['esfera', 'cubo', 'cono', 'Aro en el piso']) expect(texto, viejo).not.toContain(viejo)
  })

  it('el aro de cada plan lleva su color', () => {
    muestras().forEach((muestra, i) => {
      expect(muestra).toContain(`stroke="${COLOR_DE_PLAN[i + 1]}"`)
    })
  })

  it('los tres trazos se distinguen sin color: sólido, en segmentos y doble', () => {
    const [uno, dos, tres] = muestras()
    expect(uno.match(/<circle/g)).toHaveLength(1)
    expect(uno).not.toContain('stroke-dasharray')
    expect(dos.match(/<circle/g)).toHaveLength(1)
    expect(dos).toContain('stroke-dasharray')
    expect(tres.match(/<circle/g)).toHaveLength(2)
    expect(tres).not.toContain('stroke-dasharray')
  })

  it('los segmentos de la muestra del plan 2 repiten la proporción del aro del piso', () => {
    const [, dos] = muestras()
    const [raya, hueco] = dos.match(/stroke-dasharray="([\d. ]+)"/)[1].split(' ').map(Number)
    expect(raya / (raya + hueco)).toBeCloseTo(SEGMENTOS_DEL_ARO.relleno, 5)
  })

  it('explica las tres losas: libre plana, reservada con la moto en camino y ocupada elevada', () => {
    const texto = html()
    expect(texto).toContain('Libre · losa plana')
    expect(texto).toContain('Reservada · moto en camino')
    // la muestra de reservada lleva el tono suave de cada etapa
    expect(texto).toContain(COLOR_DE_RESERVADO.lavado)
    expect(texto).toContain(COLOR_DE_RESERVADO.acabado)
    expect(texto).toContain('Ocupado · losa elevada, color de su etapa')
  })
})

describe('el recuadro de la leyenda recuerda si estaba abierto', () => {
  beforeEach(() => useInterfaz.getState().cambiarLeyenda(false))

  it('empieza cerrado', () => {
    expect(useInterfaz.getState().leyendaAbierta).toBe(false)
  })

  it('se abre y se cierra, y lo que quede se recuerda', () => {
    useInterfaz.getState().cambiarLeyenda(true)
    expect(useInterfaz.getState().leyendaAbierta).toBe(true)
    // otras cosas de la interfaz que pasan (cambiar el ancho, abrir una capa) no lo tocan
    useInterfaz.getState().cambiarAncho(500)
    useInterfaz.getState().cambiarAncho(1400)
    useInterfaz.getState().alternarCapa('ajustes')
    expect(useInterfaz.getState().leyendaAbierta).toBe(true)
    useInterfaz.getState().cambiarLeyenda(false)
    expect(useInterfaz.getState().leyendaAbierta).toBe(false)
  })

  it('Escape no la toca: la cierra el propio recuadro', () => {
    useInterfaz.getState().cambiarLeyenda(true)
    useInterfaz.getState().pulsarEscape()
    expect(useInterfaz.getState().leyendaAbierta).toBe(true)
  })

  it('un valor raro cuenta como cerrado o abierto, sin romper', () => {
    useInterfaz.getState().cambiarLeyenda(undefined)
    expect(useInterfaz.getState().leyendaAbierta).toBe(false)
    useInterfaz.getState().cambiarLeyenda('si')
    expect(useInterfaz.getState().leyendaAbierta).toBe(true)
  })
})
