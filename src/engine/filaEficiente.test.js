import { describe, expect, it } from 'vitest'

import { crearSimulador } from './simulador.js'

/** Fuentes de tiempo fijas, para probar sin azar. */
const fuentesFijas = ({ llegadas, lavado, acabado }) => ({
  tiempoEntreLlegadas: () => llegadas,
  tiempoLavado: () => lavado,
  tiempoAcabado: () => acabado,
  planDeLaMoto: () => 2,
})

describe('una fila enorme sigue siendo FIFO y no se vuelve lenta', () => {
  it('100 000 motos esperando salen del lavado en el orden en que llegaron', () => {
    const motor = crearSimulador({
      placas: 6,
      puestos: 1,
      estadoInicial: { motosEnCola1: 100000 },
      // Llegadas tan espaciadas que no llegan durante la prueba; lavado muy corto;
      // el acabado no termina nunca: las motos se acumulan, en orden, en la fila 2.
      fuentes: fuentesFijas({ llegadas: 1e9, lavado: 0.001, acabado: 1e9 }),
    })

    const empezo = performance.now()
    motor.avanzar(60)
    const tardoMs = performance.now() - empezo

    const foto = motor.estado()
    expect(foto.colaLavado).toHaveLength(0)
    // Una moto ocupa el puesto; las demás esperan en la fila del acabado.
    expect(foto.puestos[0].moto).not.toBeNull()
    expect(foto.colaAcabado).toHaveLength(99999)

    const numeros = foto.colaAcabado.map((moto) => moto.n)
    let enOrden = true
    for (let i = 1; i < numeros.length; i += 1) {
      if (numeros[i] !== numeros[i - 1] + 1) {
        enOrden = false
        break
      }
    }
    expect(enOrden).toBe(true)
    expect(foto.puestos[0].moto.n).toBe(1)
    expect(numeros[0]).toBe(2)

    // Con shift() sobre un arreglo de 100 000 esto tarda varios segundos.
    expect(tardoMs).toBeLessThan(2000)
  })

  it('la cabeza es la que más lleva esperando, también tras vaciar y volver a llenar', () => {
    const motor = crearSimulador({
      placas: 1,
      puestos: 1,
      fuentes: fuentesFijas({ llegadas: 1, lavado: 10, acabado: 1e9 }),
    })
    motor.avanzar(5000)
    const foto = motor.estado()
    const numeros = foto.colaLavado.map((moto) => moto.n)
    expect(numeros.length).toBeGreaterThan(1000)
    expect(numeros[0]).toBe(foto.placas[0].moto.n + 1)
    for (let i = 1; i < numeros.length; i += 1) {
      expect(numeros[i]).toBe(numeros[i - 1] + 1)
    }
  })
})
