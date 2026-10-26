import { beforeEach, describe, expect, it } from 'vitest'

import { MODO_ALEATORIO, MODO_VISITA, useSimulacion, VELOCIDAD_MAXIMA } from './simulacion.js'

const estado = () => useSimulacion.getState()
const inicial = useSimulacion.getState()

beforeEach(() => {
  // Cada prueba arranca con un store limpio, como en simulacion.test.js.
  useSimulacion.setState({ ...inicial })
  estado().cambiarSemilla(1)
  estado().pausar()
  estado().cambiarVelocidad(1)
})

/** Avanza cuadros de 100 ms a la velocidad que haya, hasta que se pare o pasen `maximo` cuadros. */
const avanzarHastaElFinal = (maximo = 500) => {
  estado().iniciar()
  for (let i = 0; i < maximo && estado().corriendo; i += 1) {
    estado().avanzarCuadro(100)
  }
}

describe('entrar al modo visita', () => {
  it('parte de las 3:10 con el lavadero real, vacío y en pausa', () => {
    estado().entrarEnLaVisita()

    expect(estado().modo).toBe(MODO_VISITA)
    expect(estado().visita).toEqual({ terminada: false })
    expect(estado().corriendo).toBe(false)
    const { foto, parametros } = estado()
    expect(foto.relojMin).toBe(0)
    expect(foto.placas).toHaveLength(6)
    expect(foto.puestos).toHaveLength(3)
    expect(foto.placas.every((placa) => placa.libre)).toBe(true)
    expect(foto.puestos.every((puesto) => puesto.libre)).toBe(true)
    expect(foto.colaLavado).toHaveLength(0)
    expect(foto.colaAcabado).toHaveLength(0)
    expect(parametros.placas).toBe(6)
    expect(parametros.puestos).toBe(3)
  })

  it('con otras placas elegidas, la visita se ve con las 6 y 3 reales', () => {
    estado().elegirEscenario('siete-placas')
    estado().entrarEnLaVisita()
    expect(estado().foto.placas).toHaveLength(6)
    expect(estado().parametros.placas).toBe(6)
  })

  it('si corría, queda en pausa', () => {
    estado().iniciar()
    estado().entrarEnLaVisita()
    expect(estado().corriendo).toBe(false)
  })

  it('entrar dos veces no pierde los parámetros guardados', () => {
    estado().cambiarParametro('llegadasPorHora', 20)
    estado().entrarEnLaVisita()
    estado().entrarEnLaVisita()
    estado().volverAlModoNormal()
    expect(estado().parametros.llegadasPorHora).toBe(20)
  })

  it('la visita avanza con la velocidad y el reloj de siempre', () => {
    estado().entrarEnLaVisita()
    estado().iniciar()
    estado().avanzarCuadro(100) // 0,1 s a 1 min/s
    expect(estado().foto.relojMin).toBeCloseTo(0.1, 10)

    estado().cambiarVelocidad(10)
    estado().avanzarCuadro(100)
    expect(estado().foto.relojMin).toBeCloseTo(1.1, 10)
    expect(estado().foto.motosLlegadas).toBe(1) // la moto 1, a las 3:11
  })
})

describe('volver al modo normal', () => {
  it('recupera los parámetros de antes, con la semilla y la velocidad', () => {
    estado().cambiarSemilla(7)
    estado().cambiarVelocidad(12)
    estado().cambiarParametro('llegadasPorHora', 20)
    estado().elegirEscenario('siete-placas')
    estado().cambiarParametro('llegadasPorHora', 20)
    const antes = estado().parametros

    estado().entrarEnLaVisita()
    estado().volverAlModoNormal()

    expect(estado().modo).toBe(MODO_ALEATORIO)
    expect(estado().visita).toBeNull()
    expect(estado().antesDeLaVisita).toBeNull()
    expect(estado().parametros).toEqual(antes)
    expect(estado().parametros.llegadasPorHora).toBe(20)
    expect(estado().parametros.placas).toBe(7)
    expect(estado().semilla).toBe(7)
    expect(estado().velocidadMinPorSegundo).toBe(12)
  })

  it('el lavadero aleatorio empieza de cero con los parámetros recuperados', () => {
    estado().cambiarParametro('placas', 7)
    estado().entrarEnLaVisita()
    avanzarHastaElFinal()

    estado().volverAlModoNormal()

    expect(estado().foto.relojMin).toBe(0)
    expect(estado().foto.placas).toHaveLength(7)
    expect(estado().corriendo).toBe(false)
    expect(estado().metricas).toBeNull()
    expect(estado().puntos).toEqual([])
  })

  it('después de volver, la simulación al azar funciona como antes', () => {
    estado().entrarEnLaVisita()
    estado().volverAlModoNormal()
    estado().iniciar()
    for (let i = 0; i < 300; i += 1) {
      estado().avanzarCuadro(100)
    }
    expect(estado().foto.motosLlegadas).toBeGreaterThan(0)
    expect(estado().visita).toBeNull()
  })

  it('volver sin estar en la visita no hace nada', () => {
    estado().cambiarParametro('placas', 7)
    estado().volverAlModoNormal()
    expect(estado().modo).toBe(MODO_ALEATORIO)
    expect(estado().parametros.placas).toBe(7)
  })
})

describe('en la visita no se mueven los parámetros', () => {
  beforeEach(() => {
    estado().entrarEnLaVisita()
  })

  it('los cambios se ignoran: ni parámetros, ni semilla, ni escenario', () => {
    const parametros = estado().parametros
    const foto = estado().foto

    estado().cambiarParametro('placas', 7)
    estado().cambiarParametro('llegadasPorHora', 20)
    estado().cambiarAcabadoDePlan(2, 30)
    estado().cambiarProporcion(2, 0.5)
    estado().cambiarSemilla(99)
    estado().elegirEscenario('cinco-placas')

    expect(estado().parametros).toBe(parametros)
    expect(estado().semilla).toBe(1)
    expect(estado().foto).toBe(foto)
    expect(estado().modo).toBe(MODO_VISITA)
  })

  it('la corrida larga no se puede lanzar', () => {
    estado().empezarCorridaLarga()
    expect(estado().corridaLarga).toBeNull()
    expect(estado().modo).toBe(MODO_VISITA)
  })

  it('la velocidad sí se puede cambiar', () => {
    estado().cambiarVelocidad(5)
    expect(estado().velocidadMinPorSegundo).toBe(5)
  })

  it('reiniciar vuelve a las 3:10 sin salir del modo', () => {
    estado().cambiarVelocidad(10)
    estado().iniciar()
    for (let i = 0; i < 20; i += 1) {
      estado().avanzarCuadro(100)
    }
    expect(estado().foto.relojMin).toBeGreaterThan(0)

    estado().reiniciar(null)

    expect(estado().modo).toBe(MODO_VISITA)
    expect(estado().foto.relojMin).toBe(0)
    expect(estado().foto.placas.every((placa) => placa.libre)).toBe(true)
    expect(estado().visita).toEqual({ terminada: false })
    expect(estado().puntos).toEqual([])
  })

  it('cada reproducción es idéntica: dos visitas dan la misma foto en el mismo minuto', () => {
    const hastaLas4y11 = () => {
      estado().reiniciar(null)
      estado().cambiarVelocidad(1)
      estado().iniciar()
      // 61 minutos a 1 min/s = 610 cuadros de 100 ms.
      for (let i = 0; i < 610; i += 1) {
        estado().avanzarCuadro(100)
      }
      return estado().foto
    }
    const primera = hastaLas4y11()
    const segunda = hastaLas4y11()
    expect(segunda).toEqual(primera)
    expect(primera.relojMin).toBeCloseTo(61, 6)
  })
})

describe('el final de la visita', () => {
  beforeEach(() => {
    estado().entrarEnLaVisita()
    estado().cambiarVelocidad(VELOCIDAD_MAXIMA)
  })

  it('a las 5:30 se detiene, avisa y deja el reloj en 140', () => {
    avanzarHastaElFinal()

    expect(estado().foto.relojMin).toBe(140)
    expect(estado().corriendo).toBe(false)
    expect(estado().visita).toEqual({ terminada: true })
    expect(estado().foto.motosSalidas).toBe(23)
    expect(estado().resumen.relojMin).toBe(140)
  })

  it('guarda las métricas finales sin esperar al freno de las métricas', () => {
    avanzarHastaElFinal()

    const { promedios, porMoto } = estado().metricas
    expect(promedios.placasOcupadas).toBeCloseTo(1.76, 2)
    expect(promedios.enCola1).toBeCloseTo(0.33, 2)
    expect(promedios.enCola2).toBeCloseTo(0.82, 2)
    expect(promedios.puestosOcupados).toBeCloseTo(2.2, 2)
    expect(porMoto.esperaAntesDeLaPlacaMin).toBeCloseTo(2.0, 2)
    expect(porMoto.esperaEnCola2Min).toBeCloseTo(5.0, 2)
    expect(porMoto.tiempoTotalMin).toBeCloseTo(31.13, 2)
  })

  it('la gráfica recibe el último punto, el de las 5:30', () => {
    avanzarHastaElFinal()
    const { puntos } = estado()
    expect(puntos.length).toBeGreaterThan(1)
    expect(puntos.at(-1)).toEqual({ minuto: 140, colaLavado: 0, colaAcabado: 0 })
  })

  it('una visita terminada no se reanuda con iniciar', () => {
    avanzarHastaElFinal()
    estado().iniciar()
    expect(estado().corriendo).toBe(false)
  })

  it('reiniciar la visita terminada la deja lista para verla otra vez', () => {
    avanzarHastaElFinal()
    estado().reiniciar(null)
    expect(estado().visita).toEqual({ terminada: false })
    estado().iniciar()
    expect(estado().corriendo).toBe(true)
    expect(estado().foto.relojMin).toBe(0)
  })

  it('el botón de volver sigue sirviendo con la visita terminada', () => {
    avanzarHastaElFinal()
    estado().volverAlModoNormal()
    expect(estado().modo).toBe(MODO_ALEATORIO)
    expect(estado().visita).toBeNull()
  })
})
