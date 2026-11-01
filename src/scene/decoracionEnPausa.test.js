import { describe, expect, it } from 'vitest'

import { avanzarLaEspuma, COBERTURA_AL_RECOLOCAR, crearEspuma, tauDeLaEspuma } from './espuma.js'
import { piezasDeLaPersona, POSTURAS } from './personas.js'
import { avanceDelReloj, crearMemoriaDelReloj, pasoDeLaAnimacion } from './relojDeLaEscena.js'
import { trabajadoresDeLasLosas } from './trabajadores.js'

/**
 * Lo decorativo (espuma, personas, trabajadores) sigue el mismo reloj simulado que las
 * motos: se congela cuando la simulación se pausa y se recoloca con la escena. Aquí
 * se recorre, cuadro a cuadro, lo que hacen las piezas con `avanceDelReloj` (que es
 * lo que usa cada componente), sin navegador.
 */

const TAU = tauDeLaEspuma(10.7391)

/** Un pequeño «cuadro»: el reloj simulado de la foto, la generación y los segundos reales. */
const cuadro = (relojMin, generacion = 1, segundosReales = 1 / 60) => ({ relojMin, generacion, segundosReales })

/** Reproduce una lista de cuadros con una espuma y un tiempo de animación; devuelve lo que se ve en cada uno. */
function reproducir(cuadros, { conMoto = true } = {}) {
  const memoria = crearMemoriaDelReloj()
  const espuma = crearEspuma()
  let tiempo = 0
  return cuadros.map((c) => {
    const { minutos, recolocar } = avanceDelReloj(memoria, c)
    tiempo += pasoDeLaAnimacion(c.segundosReales, minutos)
    const cobertura = avanzarLaEspuma(espuma, { conMoto, minutos, recolocar, tau: TAU })
    const persona = piezasDeLaPersona({ postura: POSTURAS.lavando, x: 0, z: 0, numero: 2 }, tiempo)
    return { cobertura, tiempo, brazo: persona.find((p) => p.tipo === 'brazo').matriz.toArray() }
  })
}

describe('lo decorativo se congela con la simulación en pausa', () => {
  // 30 cuadros corriendo (el reloj avanza 0,05 min por cuadro) y 30 en pausa (el reloj se queda quieto).
  const corriendo = Array.from({ length: 30 }, (_, i) => cuadro(10 + i * 0.05))
  const enPausa = Array.from({ length: 30 }, () => cuadro(10 + 29 * 0.05))
  const cuadros = reproducir([...corriendo, ...enPausa])

  it('mientras corre, la espuma crece y las personas se mueven', () => {
    expect(cuadros[29].cobertura).toBeGreaterThan(cuadros[1].cobertura)
    expect(cuadros[29].tiempo).toBeGreaterThan(cuadros[1].tiempo)
    expect(cuadros[29].brazo).not.toEqual(cuadros[1].brazo)
  })

  it('en pausa, todo se queda exactamente como estaba', () => {
    const justoAntes = cuadros[30]
    for (const c of cuadros.slice(30)) {
      expect(c.cobertura).toBe(justoAntes.cobertura)
      expect(c.tiempo).toBe(justoAntes.tiempo)
      expect(c.brazo).toEqual(justoAntes.brazo)
    }
  })

  it('al reanudar, vuelven a avanzar donde se quedaron, sin saltos', () => {
    const reanudado = reproducir([...corriendo, ...enPausa, ...Array.from({ length: 10 }, (_, i) => cuadro(10 + 29 * 0.05 + (i + 1) * 0.05))])
    const alPausar = reanudado[59]
    const despues = reanudado[69]
    expect(despues.cobertura).toBeGreaterThan(alPausar.cobertura)
    expect(reanudado[60].cobertura - alPausar.cobertura).toBeLessThan(0.01)
    expect(reanudado[60].tiempo - alPausar.tiempo).toBeLessThan(0.1)
  })
})

describe('lo decorativo se recoloca con la escena', () => {
  it('al reiniciar (otra generación) con la moto ya en la placa, la espuma arranca en la mitad y no salta nada más', () => {
    // El primer cuadro ya es una recolocación (la escena acaba de montarse con la moto en la placa).
    const cuadros = reproducir([cuadro(0), cuadro(0.05), cuadro(0.1), cuadro(0, 2), cuadro(0.05, 2)])
    expect(cuadros[0].cobertura).toBeCloseTo(COBERTURA_AL_RECOLOCAR, 6)
    expect(cuadros[2].cobertura - cuadros[0].cobertura).toBeLessThan(0.01)
    expect(cuadros[3].cobertura).toBeCloseTo(COBERTURA_AL_RECOLOCAR, 6)
    expect(cuadros[4].cobertura).toBeGreaterThan(cuadros[3].cobertura)
    expect(cuadros[4].cobertura - cuadros[3].cobertura).toBeLessThan(0.01)
  })

  it('al reiniciar sin moto en la placa no queda nada de espuma', () => {
    const cuadros = reproducir([cuadro(0), cuadro(5), cuadro(0, 2)], { conMoto: false })
    expect(cuadros.every((c) => c.cobertura === 0)).toBe(true)
  })

  it('los trabajadores se rehacen con lo que se ve: otro escenario con más placas, otros sitios y sin errores', () => {
    const ocupadas = (n) => Array.from({ length: n }, () => 'ocupada')
    const seis = trabajadoresDeLasLosas({ placas: 6, puestos: 3, estados: [...ocupadas(6), 'libre', 'libre', 'libre'] })
    const catorce = trabajadoresDeLasLosas({ placas: 14, puestos: 7, estados: [...ocupadas(14), 'libre', 'libre', 'libre', 'libre', 'libre', 'libre', 'libre'] })
    expect(seis.map((t) => t.indice)).toEqual([0, 1])
    // con 14 placas (7 por fila) el hueco entre losas es de 27 cm: los de adelante taparían el número de
    // su vecina y no se dibujan; ninguno queda sobre una losa ni lanza error
    expect(catorce.filter((t) => t.etapa === 'lavado')).toEqual([])
    // con 8 placas (4 por fila) las losas cambian de sitio y los trabajadores con ellas
    const ocho = trabajadoresDeLasLosas({ placas: 8, puestos: 4, estados: [...ocupadas(8), 'libre', 'libre', 'libre', 'libre'] })
    expect(ocho.map((t) => t.indice)).toEqual([0, 1])
    expect(ocho[1].x).not.toBe(seis[1].x)
  })

  it('un salto grande del reloj (la corrida larga, una pestaña oculta) también recoloca', () => {
    const cuadros = reproducir([cuadro(0), cuadro(0.05), cuadro(500)])
    expect(cuadros[2].cobertura).toBeCloseTo(COBERTURA_AL_RECOLOCAR, 6)
  })
})
