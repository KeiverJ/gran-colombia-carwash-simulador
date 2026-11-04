import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { acumuladoVacio, acumularEvento, ejecutarLote } from '../experimentos/lote.js'
import { MODO_BARRIDO, MODO_ESCENARIOS, MODO_LOTES, MODO_REPLICAS } from '../experimentos/plan.js'
import {
  __ponerFabricaDeTrabajadores,
  reiniciarElStoreDeExperimentos,
  useExperimentos,
} from '../store/experimentos.js'
import { useInterfaz } from '../store/interfaz.js'
import { useSimulacion } from '../store/simulacion.js'
import ComparacionDeEscenarios from './ComparacionDeEscenarios.jsx'
import { FormularioDeExperimentos } from './FormularioDeExperimentos.jsx'
import { GraficaDelBarrido, GraficaDeLaMediaAcumulada } from './GraficasDeExperimentos.jsx'
import { ContenidoDeExperimentos } from './ContenidoDeExperimentos.jsx'
import { useResultadosDeExperimentos } from '../store/useResultadosDeExperimentos.js'
import { ProgresoDeExperimentos } from './ProgresoDeExperimentos.jsx'

const estado = () => useExperimentos.getState()
const copiaDeExperimentos = { ...useExperimentos.getInitialState() }
const copiaDeSimulacion = { ...useSimulacion.getInitialState() }

/**
 * Pinta con el estado de ahora. `renderToStaticMarkup` lee el estado *inicial* de los
 * stores (el de servidor), así que se le presta el actual solo mientras se pinta.
 */
function pintar(elemento) {
  const prestadoExperimentos = useExperimentos.getInitialState()
  const prestadoSimulacion = useSimulacion.getInitialState()
  Object.assign(prestadoExperimentos, estado())
  Object.assign(prestadoSimulacion, useSimulacion.getState())
  try {
    return renderToStaticMarkup(elemento)
  } finally {
    Object.assign(prestadoExperimentos, copiaDeExperimentos)
    Object.assign(prestadoSimulacion, copiaDeSimulacion)
  }
}

class TrabajadorFalso {
  constructor() {
    this.terminado = false
    TrabajadorFalso.ultimo = this
  }

  postMessage() {}

  terminate() {
    this.terminado = true
  }
}

beforeEach(() => {
  reiniciarElStoreDeExperimentos()
  __ponerFabricaDeTrabajadores(() => new TrabajadorFalso())
  useSimulacion.getState().restablecerValores()
  useSimulacion.getState().cambiarSemilla(1)
  useSimulacion.getState().cambiarParametro('puestos', 3)
})

afterEach(() => reiniciarElStoreDeExperimentos())

/** Corre un lote de verdad y lo deja en el store como si hubiera terminado. */
function dejarResultados(cambios = {}) {
  const solicitud = {
    modo: MODO_REPLICAS,
    parametros: structuredClone(useSimulacion.getState().parametros),
    semillaBase: 1,
    horas: 100,
    calentamientoPct: 10,
    replicas: 5,
    lotes: 10,
    mediaAcumulada: false,
    barrido: { parametro: 'puestos', inicio: 3, fin: 5, paso: 1 },
    ...cambios,
  }
  let acumulado = acumuladoVacio()
  ejecutarLote(solicitud, { alAvanzar: (e) => { acumulado = acumularEvento(acumulado, e) } })
  useExperimentos.setState({
    modo: solicitud.modo,
    solicitudDelLote: solicitud,
    acumulado,
    estado: 'terminado',
    avance: { hechas: acumulado.hechas, pedidas: acumulado.hechas, horasHechas: 1, horasPedidas: 1, tiempoRestanteMs: null },
  })
}

const etiquetaDe = (html, patron) => (html.match(/<[a-z]+\b[^>]*>/g) ?? []).find((e) => patron.test(e))

describe('el formulario', () => {
  it('ofrece los cuatro modos como un grupo de opciones, con Réplicas elegido', () => {
    const html = pintar(<FormularioDeExperimentos />)
    expect(html).toContain('role="radiogroup"')
    expect(html).toContain('aria-label="Modo de experimento"')
    for (const modo of ['Réplicas', 'Barrido', 'Comparar escenarios', 'Medias por lotes']) {
      expect(html).toContain(modo)
    }
    expect(etiquetaDe(html, /aria-checked="true"[^>]*>|>/)).toBeDefined()
    expect(html.match(/role="radio"/g)).toHaveLength(4 + 3) // modos y horas
    expect(html).toMatch(/aria-checked="true"[^>]*tabindex="0"|tabindex="0"[^>]*aria-checked="true"/)
  })

  it('explica el intervalo de confianza en el propio módulo', () => {
    const html = pintar(<FormularioDeExperimentos />)
    expect(html).toContain('¿Qué es un intervalo de confianza?')
    expect(html).toContain('95 de cada 100')
  })

  it('parte de los valores de Ajustes (la semilla)', () => {
    useSimulacion.getState().cambiarSemilla(77)
    expect(pintar(<FormularioDeExperimentos />)).toContain('value="77"')
  })

  it('muestra el total de horas y deja iniciar', () => {
    const html = pintar(<FormularioDeExperimentos />)
    expect(html).toContain('Total: 30.000 horas simuladas')
    expect(etiquetaDe(html, /class="boton-principal"/)).not.toMatch(/disabled/)
  })

  it('con menos de 5 réplicas avisa el rango y no deja iniciar', () => {
    estado().cambiarConfiguracion({ replicas: 4 })
    const html = pintar(<FormularioDeExperimentos />)
    expect(html).toContain('Las réplicas son de 5 a 100')
    expect(etiquetaDe(html, /class="boton-principal"/)).toMatch(/disabled/)
  })

  it('con más horas que el tope no deja iniciar y lo explica', () => {
    estado().cambiarConfiguracion({ replicas: 100, horas: 5000 })
    const html = pintar(<FormularioDeExperimentos />)
    expect(html).toContain('el tope es 200.000')
    expect(html).toContain('500.000')
    expect(etiquetaDe(html, /class="boton-principal"/)).toMatch(/disabled/)
  })

  it('el barrido pide el parámetro, desde, hasta y paso, y avisa si son más de 30 valores', () => {
    estado().elegirModo(MODO_BARRIDO)
    estado().cambiarBarrido({ parametro: 'llegadasPorHora', inicio: 1, fin: 16, paso: 0.5 })
    const html = pintar(<FormularioDeExperimentos />)
    expect(html).toContain('aria-label="Parámetro que se barre"')
    for (const rotulo of ['Desde', 'Hasta', 'Paso', 'Réplicas por valor']) expect(html).toContain(rotulo)
    expect(html).toContain('31 valores y el máximo es 30')
  })

  it('Medias por lotes pide los lotes, dice en una línea la diferencia con Réplicas y no ofrece lo de las réplicas', () => {
    estado().elegirModo(MODO_LOTES)
    const html = pintar(<FormularioDeExperimentos />)
    expect(html).toContain('Réplicas corre varias simulaciones independientes')
    expect(html).toContain('>Lotes<')
    expect(html).not.toContain('Réplicas por valor')
    expect(html).toContain('Horas de la corrida')
  })

  it('la otra explicación solo sale en Medias por lotes', () => {
    expect(pintar(<FormularioDeExperimentos />)).not.toContain('Réplicas corre varias simulaciones independientes')
  })

  it('la media acumulada se ofrece en Réplicas y Medias por lotes, no en Barrido ni Comparar', () => {
    expect(pintar(<FormularioDeExperimentos />)).toContain('Ver media acumulada')
    estado().elegirModo(MODO_LOTES)
    expect(pintar(<FormularioDeExperimentos />)).toContain('Ver media acumulada')
    estado().elegirModo(MODO_BARRIDO)
    expect(pintar(<FormularioDeExperimentos />)).not.toContain('Ver media acumulada')
    estado().elegirModo(MODO_ESCENARIOS)
    expect(pintar(<FormularioDeExperimentos />)).not.toContain('Ver media acumulada')
  })

  it('con la media acumulada pedida suma sus horas al total', () => {
    estado().cambiarConfiguracion({ mediaAcumulada: true, replicas: 100 })
    expect(pintar(<FormularioDeExperimentos />)).toContain('Total: 101.000 horas simuladas')
  })

  it('el calentamiento va de 0 a 50 % y dice cuántas horas son', () => {
    expect(pintar(<FormularioDeExperimentos />)).toContain('las 100 horas iniciales')
    estado().cambiarConfiguracion({ calentamientoPct: 20 })
    expect(pintar(<FormularioDeExperimentos />)).toContain('las 200 horas iniciales')
  })

  it('con un lote en marcha, Iniciar queda desactivado y aparece Cancelar', () => {
    estado().iniciar()
    const html = pintar(<FormularioDeExperimentos />)
    expect(etiquetaDe(html, /class="boton-principal"/)).toMatch(/disabled/)
    expect(html).toContain('Cancelar')
  })

  it('sin lote en marcha no hay botón Cancelar', () => {
    expect(pintar(<FormularioDeExperimentos />)).not.toContain('>Cancelar<')
  })

  it('los controles son botones, campos y listas nativas: se manejan con el teclado', () => {
    estado().iniciar()
    const html = pintar(<FormularioDeExperimentos />)
    expect(html).not.toMatch(/<div[^>]*onclick/i)
    expect(html.match(/<label/g).length).toBeGreaterThanOrEqual(3)
  })
})

describe('el avance', () => {
  it('es una barra de progreso con porcentaje, piezas y una región que se anuncia', () => {
    estado().iniciar()
    useExperimentos.setState({
      avance: { hechas: 12, pedidas: 30, horasHechas: 1200, horasPedidas: 3000, tiempoRestanteMs: 18000 },
    })
    const html = pintar(<ProgresoDeExperimentos />)
    expect(html).toContain('role="progressbar"')
    expect(html).toContain('aria-valuenow="40"')
    expect(html).toContain('aria-label="Avance del experimento"')
    expect(html).toContain('40 % · 12 de 30 réplicas · faltan unos 18 s')
    expect(html).toContain('role="status"')
    expect(html).toContain('aria-live="polite"')
    expect(html).toContain('Avance: 40 %')
  })

  it('se anuncia por decenas: 43 % se anuncia como 40 %', () => {
    estado().iniciar()
    useExperimentos.setState({ avance: { hechas: 13, pedidas: 30, horasHechas: 1300, horasPedidas: 3000, tiempoRestanteMs: null } })
    const html = pintar(<ProgresoDeExperimentos />)
    expect(html).toContain('43 % · 13 de 30')
    expect(html).toContain('Avance: 40 %')
  })

  it('cancelado dice cuántas se hicieron de las pedidas', () => {
    estado().cambiarConfiguracion({ replicas: 50 })
    estado().iniciar()
    useExperimentos.setState({ avance: { hechas: 20, pedidas: 50, horasHechas: 2000, horasPedidas: 5000, tiempoRestanteMs: null } })
    estado().cancelar()
    expect(pintar(<ProgresoDeExperimentos />)).toContain('Cancelado: 20 de 50 réplicas')
  })

  it('con una sola corrida terminada avisa que no hay intervalo', () => {
    estado().iniciar()
    useExperimentos.setState({ avance: { hechas: 1, pedidas: 30, horasHechas: 100, horasPedidas: 3000, tiempoRestanteMs: null } })
    estado().cancelar()
    expect(pintar(<ProgresoDeExperimentos />)).toContain('hacen falta al menos dos')
  })

  it('un fallo se anuncia como alerta', () => {
    estado().iniciar()
    useExperimentos.setState({ estado: 'fallido', aviso: 'Se cayó.' })
    const html = pintar(<ProgresoDeExperimentos />)
    expect(html).toContain('role="alert"')
    expect(html).toContain('Se cayó.')
  })

  it('no se ve nada antes del primer lote', () => {
    expect(pintar(<ProgresoDeExperimentos />)).toBe('')
  })
})

describe('los resultados de Réplicas', () => {
  it('antes de correr, la pestaña invita a iniciar y exportar está desactivado', () => {
    const html = pintar(<ContenidoDeExperimentos />)
    expect(html).toContain('pulsa «Iniciar experimento»')
  })

  it('traen las tres tablas con encabezados, intervalo y fórmulas, y la etapa inestable explicada', () => {
    dejarResultados()
    const html = pintar(<ContenidoDeExperimentos />)
    expect(html).toContain('scope="col"')
    expect(html).toContain('Intervalo del 95 %')
    expect(html).toContain('Etapa 1 · Lavado')
    expect(html).toContain('Etapa 2 · Acabado')
    expect(html).toContain('Tiempo total en el lavadero')
    expect(html).toContain('Etapa inestable')
    expect(html).toContain('la fila crece sin límite')
    expect(html).toContain('Crece con el tiempo')
    expect(html).toContain('<caption')
    // Con la etapa estable hay palabras «dentro» o «fuera», no solo color.
    expect(html).toMatch(/estado-(dentro|fuera)[^>]*>(dentro|fuera)</)
  })

  it('el encabezado dice con qué parámetros se obtuvo', () => {
    dejarResultados()
    const html = pintar(<ContenidoDeExperimentos />)
    expect(html).toContain('semilla base 1')
    expect(html).toContain('100 h por réplica')
    expect(html).toContain('5 réplicas')
  })

  it('«por plan» avisa que las fórmulas son aproximadas en la etapa 2', () => {
    useSimulacion.getState().cambiarParametro('puestos', 5)
    dejarResultados()
    expect(pintar(<ContenidoDeExperimentos />)).toContain('las fórmulas son una aproximación')
  })

  it('el bloque de réplicas necesarias aparece con resultados y calcula n*', () => {
    useSimulacion.getState().cambiarParametro('puestos', 5)
    dejarResultados({ replicas: 10, horas: 1000 })
    const html = pintar(<ContenidoDeExperimentos />)
    expect(html).toContain('¿Cuántas réplicas hacen falta?')
    expect(html).toContain('Semiancho deseado (h*)')
    expect(html).toMatch(/Harían falta <span class="cifra">\d+<\/span> réplicas/)
    expect(html).toContain('Correr')
  })

  it('el bloque de réplicas necesarias no se ofrece para una etapa inestable', () => {
    dejarResultados()
    estado().cambiarPrecision({ etapa: 'acabado', clave: 'rho', deseado: null })
    expect(pintar(<ContenidoDeExperimentos />)).toContain('No se puede calcular: esa etapa es inestable')
  })

  it('la media acumulada aparece solo si se pidió', () => {
    useSimulacion.getState().cambiarParametro('puestos', 5)
    dejarResultados()
    expect(pintar(<ContenidoDeExperimentos />)).not.toContain('Media acumulada de')
    dejarResultados({ mediaAcumulada: true })
    const html = pintar(<ContenidoDeExperimentos />)
    expect(html).toContain('Media acumulada de Lq')
    expect(html).toContain('Gráfica de líneas con la media acumulada')
    expect(html).toContain('aria-label="Métrica de la media acumulada"')
  })

  it('exportar a CSV se activa cuando hay resultados', () => {
    expect(etiquetaDe(pintar(<ContenidoDeExperimentos />), /Exportar a CSV/)).toBeUndefined()
    dejarResultados()
    const html = pintar(<ContenidoDeExperimentos />)
    expect(html).toContain('Exportar a CSV')
    const boton = html.match(/<button[^>]*>Exportar a CSV<\/button>/)[0]
    expect(boton).not.toMatch(/disabled/)
  })
})

describe('Medias por lotes en pantalla', () => {
  it('muestra las tablas con las mismas columnas y dice «primer lote» y «último lote» en la fila 2', () => {
    dejarResultados({ modo: MODO_LOTES })
    const html = pintar(<ContenidoDeExperimentos />)
    expect(html).toContain('Intervalo del 95 %')
    expect(html).toContain('al final del primer lote')
    expect(html).toContain('al final del último lote')
    expect(html).toContain('10 lotes')
  })
})

describe('el barrido en pantalla', () => {
  it('muestra la gráfica con descripción, su selector, la nota de saturación y la tabla de valores', () => {
    dejarResultados({
      modo: MODO_BARRIDO,
      barrido: { parametro: 'llegadasPorHora', inicio: 8, fin: 16, paso: 0.5 },
    })
    const html = pintar(<ContenidoDeExperimentos />)
    expect(html).toContain('Gráfica de líneas de Wq (min) de la Etapa 2 · Acabado contra λ (llegadas)')
    expect(html).toContain('aria-label="Métrica de la gráfica del barrido"')
    expect(html).toContain('La etapa se satura (ρ = 1) en 11,3')
    expect(html).toContain('<caption')
    expect(html).toContain('Valores del barrido')
    expect(html).toContain('inestable')
  })

  it('la gráfica sola no revienta sin datos', () => {
    dejarResultados({ modo: MODO_BARRIDO, barrido: { parametro: 'puestos', inicio: 3, fin: 5, paso: 1 } })
    const resultados = pintar(<GraficaDelBarrido resultados={{ ...fakeResultados() }} />)
    expect(resultados).toContain('Todavía no hay valores terminados')
  })

  function fakeResultados() {
    const solicitud = estado().solicitudDelLote
    return {
      modo: MODO_BARRIDO,
      solicitud,
      puntos: [3, 4, 5].map((valor) => ({
        valor,
        parametros: { ...solicitud.parametros, puestos: valor },
        pedidas: 5,
        hechas: 0,
        replicas: [],
        resumen: null,
      })),
    }
  }

  it('la media acumulada sola no pinta nada sin observación', () => {
    dejarResultados()
    expect(pintar(<GraficaDeLaMediaAcumulada resultados={{ solicitud: estado().solicitudDelLote, observacion: null }} />)).toBe('')
  })
})

describe('Comparar escenarios en pantalla', () => {
  it('con 3 puestos las diferencias de 4 y 5 puestos contra la situación actual no se calculan', () => {
    dejarResultados({ modo: MODO_ESCENARIOS })
    const html = pintar(<ContenidoDeExperimentos />)
    expect(html).toContain('Situación actual (6 placas, 3 puestos)')
    expect(html).toContain('5 placas')
    expect(html).toContain('7 placas')
    expect(html).toContain('Diferencias contra un escenario')
    expect(html).toContain('La etapa es inestable en Situación actual (6 placas, 3 puestos)')
    expect(html).toContain('No se calcula la diferencia de un escenario inestable ni contra una referencia inestable.')
    expect(html).toContain('Comparar contra')
    expect(html).toContain('Diferencia = escenario − Situación actual')
  })

  it('con otra referencia se calcula entre 4 y 5 puestos y se dice «significativa»', () => {
    dejarResultados({ modo: MODO_ESCENARIOS, replicas: 10, horas: 1000 })
    estado().cambiarConfiguracion({ referencia: 'cuatro-puestos' })
    const html = pintar(<ContenidoDeExperimentos />)
    expect(html).toContain('Diferencia = escenario − 4 puestos de acabado')
    expect(html).toMatch(/estado-dentro[^>]*>significativa</)
  }, 60000)

  it('no pinta nada si todavía no hay escenarios terminados', () => {
    expect(pintar(<ComparacionDeEscenarios escenarios={[{ id: 'actual', nombre: 'x', replicas: [], resumen: null }]} />)).toBe('')
  })
})

describe('los resultados siguen al cerrar la vista', () => {
  it('un lote en marcha no se detiene al abrir y cerrar la vista', () => {
    estado().iniciar()
    const trabajador = TrabajadorFalso.ultimo
    useInterfaz.getState().alternarExperimentos()
    useInterfaz.getState().cerrarExperimentos()
    expect(estado().estado).toBe('corriendo')
    expect(trabajador.terminado).toBe(false)
    useInterfaz.getState().alternarExperimentos()
    expect(pintar(<ProgresoDeExperimentos />)).toContain('role="progressbar"')
    useInterfaz.getState().cerrarExperimentos()
  })

  it('los resultados se conservan al pasar al modo visita y volver', () => {
    dejarResultados()
    useInterfaz.getState().cambiarDeModo(true)
    useInterfaz.getState().cambiarDeModo(false)
    expect(estado().solicitudDelLote).not.toBeNull()
    expect(useResultadosDeExperimentos).toBeTypeOf('function')
  })
})
