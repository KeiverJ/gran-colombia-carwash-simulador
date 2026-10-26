import { describe, expect, it } from 'vitest'

import { OBSERVADO_EN_LA_VISITA } from '../data/censo.js'
import { ESTADO_INICIAL, INICIO_OBSERVACION_MIN, MOTOS_VISITA } from '../data/visita.js'
import { crearSimulador } from '../engine/simulador.js'
import { crearReproductor } from './reproductor.js'

/** Los minutos del reloj (0 = 3:10 p. m.) de una hora de la tarde, por ejemplo hm(4, 11) = 61. */
const hm = (hora, minutos) => (hora - 3) * 60 + minutos - INICIO_OBSERVACION_MIN

/** Los minutos del reloj de un minuto de la tabla, que cuenta desde las 3:00. */
const aReloj = (minutoDeLaTabla) => minutoDeLaTabla - INICIO_OBSERVACION_MIN

const DURACION = hm(5, 30)

/** Las 141 fotos de la tarde, una por minuto, de las 3:10 a las 5:30. */
function recorrerLaTarde() {
  const reproductor = crearReproductor()
  const fotos = [reproductor.estado()]
  for (let minuto = 1; minuto <= DURACION; minuto += 1) {
    reproductor.avanzar(1)
    fotos.push(reproductor.estado())
  }
  return { reproductor, fotos }
}

const { reproductor: unReproductor, fotos } = recorrerLaTarde()

const numerosEn = (lista) => lista.map((moto) => moto.n)
const enPlacas = (foto) => foto.placas.map((placa) => placa.moto?.n ?? null)
const enPuestos = (foto) => foto.puestos.map((puesto) => puesto.moto?.n ?? null)

describe('el estado inicial de la reproducción está vacío', () => {
  it('a las 3:10 no hay nadie: placas, puestos y filas vacíos', () => {
    const foto = fotos[0]
    expect(foto.relojMin).toBe(0)
    expect(foto.placas).toHaveLength(6)
    expect(foto.puestos).toHaveLength(3)
    expect(foto.placas.every((placa) => placa.libre && placa.moto === null)).toBe(true)
    expect(foto.puestos.every((puesto) => puesto.libre && puesto.moto === null)).toBe(true)
    expect(foto.colaLavado).toEqual([])
    expect(foto.colaAcabado).toEqual([])
    expect(foto.motosLlegadas).toBe(0)
    expect(foto.motosSalidas).toBe(0)
  })

  it('ignora el estado inicial observado, que sigue diciendo 2 motos en fila y 1 puesto', () => {
    expect(ESTADO_INICIAL).toEqual({ placasOcupadas: 0, motosEnCola1: 2, puestosAcabadoOcupados: 1 })
    expect(fotos[0].colaLavado).toHaveLength(0)
    expect(enPuestos(fotos[0]).every((n) => n === null)).toBe(true)
  })

  it('el reproductor recién creado ya está vacío y sin terminar', () => {
    const reproductor = crearReproductor()
    expect(reproductor.estado().relojMin).toBe(0)
    expect(reproductor.terminada()).toBe(false)
  })
})

describe('el reloj', () => {
  it('va de las 3:10 a las 5:30 p. m.: 140 minutos', () => {
    expect(unReproductor.configuracion()).toMatchObject({
      placas: 6,
      puestos: 3,
      motos: 23,
      duracionMin: 140,
      usaAzar: false,
    })
    expect(fotos).toHaveLength(141)
    expect(fotos.at(-1).relojMin).toBe(140)
  })

  it('no pasa de las 5:30 p. m. por mucho que se avance', () => {
    const reproductor = crearReproductor()
    reproductor.avanzar(10_000)
    expect(reproductor.estado().relojMin).toBe(140)
    expect(reproductor.terminada()).toBe(true)
    reproductor.avanzar(5)
    expect(reproductor.estado().relojMin).toBe(140)
  })

  it('avanza por fracciones de minuto y la foto es la del último minuto cumplido', () => {
    const reproductor = crearReproductor()
    reproductor.avanzar(0.4)
    reproductor.avanzar(0.4)
    expect(reproductor.estado().relojMin).toBeCloseTo(0.8, 10)
    expect(reproductor.estado().motosLlegadas).toBe(0)

    reproductor.avanzar(0.3) // 1,1 minutos: ya son las 3:11 y llegó la moto 1
    expect(reproductor.estado().motosLlegadas).toBe(1)
  })

  it('no acepta un intervalo negativo ni que no es un número', () => {
    const reproductor = crearReproductor()
    expect(() => reproductor.avanzar(-1)).toThrow(RangeError)
    expect(() => reproductor.avanzar(Number.NaN)).toThrow(RangeError)
  })

  it('termina solo al llegar a las 5:30 p. m., cuando salió la moto 23', () => {
    expect(fotos[DURACION - 1].motosSalidas).toBe(22)
    expect(unReproductor.terminada()).toBe(true)
    expect(fotos[DURACION].motosSalidas).toBe(23)
    expect(fotos[DURACION].placas.every((placa) => placa.libre)).toBe(true)
    expect(fotos[DURACION].puestos.every((puesto) => puesto.libre)).toBe(true)
    expect(fotos[DURACION].colaLavado).toEqual([])
    expect(fotos[DURACION].colaAcabado).toEqual([])
  })
})

describe('etapa 1: cada moto en su placa y a sus horas', () => {
  it('cada moto espera en la fila 1 de su llegada a su entrada, y no antes ni después', () => {
    for (const moto of MOTOS_VISITA) {
      fotos.forEach((foto, k) => {
        const enLaFila = numerosEn(foto.colaLavado).includes(moto.n)
        const debeEstar = aReloj(moto.llegadaMin) <= k && k < aReloj(moto.entraPlacaMin)
        expect(enLaFila, `moto ${moto.n} en la fila 1 a las ${k}`).toBe(debeEstar)
      })
    }
  })

  it('cada moto ocupa exactamente la placa registrada de su entrada a su salida', () => {
    for (const moto of MOTOS_VISITA) {
      fotos.forEach((foto, k) => {
        const debeEstar = aReloj(moto.entraPlacaMin) <= k && k < aReloj(moto.salePlacaMin)
        enPlacas(foto).forEach((n, i) => {
          const esEllaEnEstaPlaca = n === moto.n
          expect(esEllaEnEstaPlaca, `moto ${moto.n}, placa ${i + 1}, minuto ${k}`).toBe(
            debeEstar && i + 1 === moto.placa,
          )
        })
      })
    }
  })

  it('las horas de llegada, entrada y salida de placa de las 23 motos son las de la tabla', () => {
    for (const moto of MOTOS_VISITA) {
      const primeraEnFila = fotos.findIndex((foto) => numerosEn(foto.colaLavado).includes(moto.n))
      const primeraEnPlaca = fotos.findIndex((foto) => enPlacas(foto).includes(moto.n))
      const primeraSinPlaca = fotos.findIndex(
        (foto, k) => k > primeraEnPlaca && !enPlacas(foto).includes(moto.n),
      )
      const llegada = fotos.findIndex((foto) => foto.motosLlegadas >= moto.n)

      // Las que entran a la placa en el mismo minuto en que llegan no pasan por la fila.
      if (moto.llegadaMin < moto.entraPlacaMin) {
        expect(primeraEnFila, `llegada de la moto ${moto.n}`).toBe(aReloj(moto.llegadaMin))
      } else {
        expect(primeraEnFila).toBe(-1)
        expect(llegada, `llegada de la moto ${moto.n}`).toBe(aReloj(moto.llegadaMin))
      }
      expect(primeraEnPlaca, `entrada de la moto ${moto.n}`).toBe(aReloj(moto.entraPlacaMin))
      expect(primeraSinPlaca, `salida de la moto ${moto.n}`).toBe(aReloj(moto.salePlacaMin))
    }
  })

  it('la cuenta de motos llegadas sigue a las llegadas de la tabla', () => {
    fotos.forEach((foto, k) => {
      const llegadas = MOTOS_VISITA.filter((moto) => aReloj(moto.llegadaMin) <= k).length
      expect(foto.motosLlegadas, `minuto ${k}`).toBe(llegadas)
    })
  })

  it('la moto 1 llega a las 3:11 y entra a la placa 2 a las 3:13 con las otras cinco libres', () => {
    expect(numerosEn(fotos[hm(3, 11)].colaLavado)).toEqual([1])
    const a_las_313 = enPlacas(fotos[hm(3, 13)])
    expect(a_las_313).toEqual([null, 1, null, null, null, null])
    expect(fotos[hm(3, 13)].colaLavado).toEqual([])
  })

  it('las motos 2 y 3 llegan a las 3:18; la 2 entra a la placa 5 y la 3 espera hasta las 3:23', () => {
    expect(fotos[hm(3, 18)].motosLlegadas).toBe(3)
    expect(enPlacas(fotos[hm(3, 18)])[4]).toBe(2)
    expect(numerosEn(fotos[hm(3, 20)].colaLavado)).toEqual([3])
    expect(enPlacas(fotos[hm(3, 23)])[3]).toBe(3)
  })

  it('la fila 1 va en orden de llegada', () => {
    for (const foto of fotos) {
      const llegadas = numerosEn(foto.colaLavado).map(
        (n) => MOTOS_VISITA.find((moto) => moto.n === n).llegadaMin,
      )
      expect(llegadas).toEqual([...llegadas].sort((a, b) => a - b))
    }
  })

  it('la moto 13 sale de la placa a las 4:11, la hora en que la tabla anota que empieza su acabado', () => {
    const moto13 = MOTOS_VISITA.find((moto) => moto.n === 13)
    expect(moto13.salePlacaMin).toBe(71)
    expect(moto13.inicioAcabadoMin).toBe(71)
    expect(enPlacas(fotos[hm(4, 10)])[1]).toBe(13)
    expect(enPlacas(fotos[hm(4, 11)])[1]).toBeNull()
  })

  it('nunca hay dos motos en la misma placa ni la misma moto en dos sitios', () => {
    for (const foto of fotos) {
      const todas = [
        ...enPlacas(foto),
        ...enPuestos(foto),
        ...numerosEn(foto.colaLavado),
        ...numerosEn(foto.colaAcabado),
      ].filter((n) => n !== null)
      expect(new Set(todas).size).toBe(todas.length)
    }
  })

  it('nunca hay más de 5 placas ocupadas: el lavado no se llena del todo', () => {
    const mayor = Math.max(...fotos.map((foto) => foto.placas.filter((placa) => !placa.libre).length))
    expect(mayor).toBe(5)
  })
})

describe('la foto es la misma que entrega el motor', () => {
  const motor = crearSimulador({ estadoInicial: { placasOcupadas: 1, puestosAcabadoOcupados: 1 } })
  motor.avanzar(0)
  const fotoDelMotor = motor.estado()
  const fotoMediaTarde = fotos[hm(4, 12)]
  // A las 3:15 la moto 1 está en la placa 2.
  const fotoConMoto = fotos[hm(3, 15)]

  it('tiene las mismas claves', () => {
    expect(Object.keys(fotoMediaTarde).sort()).toEqual(Object.keys(fotoDelMotor).sort())
  })

  it('placas, puestos y motos tienen las mismas claves', () => {
    expect(Object.keys(fotoConMoto.placas[1]).sort()).toEqual(Object.keys(fotoDelMotor.placas[0]).sort())
    expect(Object.keys(fotoMediaTarde.puestos[0]).sort()).toEqual(Object.keys(fotoDelMotor.puestos[0]).sort())
    expect(Object.keys(fotoConMoto.placas[1].moto).sort()).toEqual(
      Object.keys(fotoDelMotor.placas[0].moto).sort(),
    )
  })

  it('las motos de las filas también tienen las mismas claves', () => {
    expect(fotoMediaTarde.colaAcabado.length).toBeGreaterThan(0)
    expect(Object.keys(fotoMediaTarde.colaAcabado[0]).sort()).toEqual(
      Object.keys(fotoDelMotor.placas[0].moto).sort(),
    )
  })

  it('cada moto lleva su número de la tabla y su plan, y ninguna es precargada', () => {
    const moto4 = fotos[hm(3, 30)].placas.find((placa) => placa.moto?.n === 4)
    expect(moto4.moto).toEqual({ n: 4, plan: 3, precargada: false })
  })

  it('tiene las mismas claves en todo momento de la tarde', () => {
    for (const foto of fotos) {
      expect(Object.keys(foto).sort()).toEqual(Object.keys(fotoDelMotor).sort())
      expect(foto.placas).toHaveLength(6)
      expect(foto.puestos).toHaveLength(3)
    }
  })
})

describe('la reproducción es determinista', () => {
  it('dos reproducciones dan exactamente las mismas fotos y las mismas métricas', () => {
    const otra = recorrerLaTarde()
    expect(otra.fotos).toEqual(fotos)
    expect(otra.reproductor.metricas()).toEqual(unReproductor.metricas())
  })

  it('el reloj nunca sube de 140', () => {
    for (const foto of fotos) {
      expect(foto.relojMin).toBeLessThanOrEqual(140)
    }
  })
})

describe('etapa 2: puestos y fila 2 con la regla aprobada', () => {
  const detalle = (n) => unReproductor.detalleDeLaEtapa2().find((d) => d.n === n)

  it('en ningún minuto hay más de 3 motos en puesto', () => {
    for (const foto of fotos) {
      expect(foto.puestos.filter((puesto) => puesto.moto !== null).length).toBeLessThanOrEqual(3)
    }
  })

  it('una moto llega a la zona de atrás en su hora de salida de placa', () => {
    for (const moto of MOTOS_VISITA) {
      const llegaAlAcabado = fotos.findIndex(
        (foto) =>
          numerosEn(foto.colaAcabado).includes(moto.n) || enPuestos(foto).includes(moto.n),
      )
      expect(llegaAlAcabado, `moto ${moto.n}`).toBe(aReloj(moto.salePlacaMin))
    }
  })

  it('las 23 salen del acabado a su hora de fin de acabado', () => {
    for (const moto of MOTOS_VISITA) {
      const ultimaVez = fotos.findLastIndex(
        (foto) =>
          numerosEn(foto.colaAcabado).includes(moto.n) || enPuestos(foto).includes(moto.n),
      )
      expect(ultimaVez + 1, `moto ${moto.n}`).toBe(aReloj(moto.finAcabadoMin))
    }
  })

  it('"Inicio acabado" no se usa para asignar: la moto 13 espera aunque la tabla diga 4:11', () => {
    expect(detalle(13).tomaPuestoMin).toBe(hm(4, 27))
    expect(detalle(13).esperaEnFila2Min).toBe(16)
  })

  describe('las motos que no tienen puesto al llegar', () => {
    // moto: [llega a la fila 2, puesto y hora en que lo toma o null si sale sin puesto, minutos de espera]
    const esperas = {
      4: [hm(3, 40), 1, hm(3, 45), 5],
      5: [hm(3, 40), null, hm(3, 46), 6],
      7: [hm(3, 38), 2, hm(3, 44), 6],
      8: [hm(3, 49), 2, hm(3, 51), 2],
      11: [hm(4, 10), 1, hm(4, 18), 8],
      13: [hm(4, 11), 2, hm(4, 27), 16],
      14: [hm(4, 15), 2, hm(4, 33), 18],
      15: [hm(4, 13), 3, hm(4, 30), 17],
      16: [hm(4, 21), null, hm(4, 30), 9],
      17: [hm(4, 23), 1, hm(4, 38), 15],
      18: [hm(4, 32), 2, hm(4, 38), 6],
      22: [hm(4, 58), 3, hm(5, 5), 7],
    }

    it('son 12, con las llegadas, los puestos y las esperas de la tabla del diseño', () => {
      const conEspera = unReproductor
        .detalleDeLaEtapa2()
        .filter((d) => d.esperaEnFila2Min > 0)
        .map((d) => d.n)
      expect(conEspera).toEqual(Object.keys(esperas).map(Number))

      for (const [n, [llega, puesto, atendida, espera]] of Object.entries(esperas)) {
        const d = detalle(Number(n))
        expect(d.llegaALaFila2Min, `llegada de la moto ${n}`).toBe(llega)
        expect(d.puesto, `puesto de la moto ${n}`).toBe(puesto)
        expect(d.tomaPuestoMin ?? d.saleDeLaFila2Min, `atención de la moto ${n}`).toBe(atendida)
        expect(d.esperaEnFila2Min, `espera de la moto ${n}`).toBe(espera)
      }
    })

    it('las otras 11 toman puesto en cuanto llegan', () => {
      for (const n of [1, 2, 3, 6, 9, 10, 12, 19, 20, 21, 23]) {
        expect(detalle(n).esperaEnFila2Min, `moto ${n}`).toBe(0)
        expect(detalle(n).puesto, `moto ${n}`).not.toBeNull()
      }
    })

    it('las esperas suman 115 minutos', () => {
      const total = unReproductor
        .detalleDeLaEtapa2()
        .reduce((suma, d) => suma + d.esperaEnFila2Min, 0)
      expect(total).toBe(115)
    })
  })

  it('la fila 2 llega como máximo a 5 motos, entre las 4:23 y las 4:26', () => {
    const mayor = Math.max(...fotos.map((foto) => foto.colaAcabado.length))
    expect(mayor).toBe(5)
    const cuando = fotos.flatMap((foto, k) => (foto.colaAcabado.length === 5 ? [k] : []))
    expect(cuando).toEqual([hm(4, 23), hm(4, 24), hm(4, 25), hm(4, 26)])
  })

  it('las motos de la fila 2 toman puesto en orden de llegada a esa fila (FIFO)', () => {
    const conPuesto = unReproductor.detalleDeLaEtapa2().filter((d) => d.puesto !== null)
    for (const a of conPuesto) {
      for (const b of conPuesto) {
        if (a.llegaALaFila2Min < b.llegaALaFila2Min || (a.llegaALaFila2Min === b.llegaALaFila2Min && a.n < b.n)) {
          expect(a.tomaPuestoMin, `moto ${a.n} antes que la ${b.n}`).toBeLessThanOrEqual(b.tomaPuestoMin)
        }
      }
    }
  })

  it('en cada foto, la fila 2 está en orden de llegada a la zona de atrás', () => {
    const llegada = (n) => aReloj(MOTOS_VISITA.find((moto) => moto.n === n).salePlacaMin)
    for (const foto of fotos) {
      const llegadas = numerosEn(foto.colaAcabado).map((n) => [llegada(n), n])
      expect(llegadas).toEqual([...llegadas].sort((a, b) => a[0] - b[0] || a[1] - b[1]))
    }
  })

  it('si dos motos llegan a la fila 2 el mismo minuto, va primero la de número menor', () => {
    // Las motos 4 y 5 salen de su placa a las 3:40 con la moto 7 esperando delante.
    expect(numerosEn(fotos[hm(3, 40)].colaAcabado)).toEqual([7, 4, 5])
  })

  it('en un mismo minuto primero salen y luego llegan: el puesto liberado queda para el que llega', () => {
    // La moto 4 termina a las 3:59 y la moto 9 sale de su placa a las 3:59.
    expect(enPuestos(fotos[hm(3, 58)])[0]).toBe(4)
    expect(enPuestos(fotos[hm(3, 59)])[0]).toBe(9)
    expect(fotos[hm(3, 59)].colaAcabado).toEqual([])

    // La moto 18 termina a las 4:55 y la moto 21 sale de su placa a las 4:55.
    expect(enPuestos(fotos[hm(4, 54)])[1]).toBe(18)
    expect(enPuestos(fotos[hm(4, 55)])[1]).toBe(21)
  })

  describe('las motos que terminan antes de que se les libere un puesto', () => {
    it('(a) la moto 5 llega a la fila 2 a las 3:40, nunca ocupa puesto y sale a las 3:46', () => {
      expect(numerosEn(fotos[hm(3, 39)].colaAcabado)).not.toContain(5)
      for (let k = hm(3, 40); k < hm(3, 46); k += 1) {
        expect(numerosEn(fotos[k].colaAcabado), `fila 2 a las ${k}`).toContain(5)
      }
      expect(fotos.some((foto) => enPuestos(foto).includes(5))).toBe(false)
      expect(numerosEn(fotos[hm(3, 46)].colaAcabado)).not.toContain(5)
      expect(detalle(5)).toMatchObject({ puesto: null, tomaPuestoMin: null, saleDeLaFila2Min: hm(3, 46) })
    })

    it('(b) la moto 16 sale de la fila 2 a las 4:30 sin ocupar el puesto 3 que libera la moto 10', () => {
      expect(enPuestos(fotos[hm(4, 29)])[2]).toBe(10)
      expect(numerosEn(fotos[hm(4, 29)].colaAcabado)).toEqual(expect.arrayContaining([15, 16]))

      // A las 4:30 la moto 10 libera el puesto 3, la 16 sale de la fila y la 15 toma el puesto.
      expect(enPuestos(fotos[hm(4, 30)])[2]).toBe(15)
      expect(numerosEn(fotos[hm(4, 30)].colaAcabado)).not.toContain(16)
      expect(fotos.some((foto) => enPuestos(foto).includes(16))).toBe(false)
      expect(detalle(16)).toMatchObject({ puesto: null, tomaPuestoMin: null, saleDeLaFila2Min: hm(4, 30) })
    })

    it('las motos 5 y 16 son las únicas que salen sin haber tenido puesto', () => {
      const sinPuesto = unReproductor
        .detalleDeLaEtapa2()
        .filter((d) => d.puesto === null)
        .map((d) => d.n)
      expect(sinPuesto).toEqual([5, 16])
    })
  })
})

describe('métricas de la reproducción', () => {
  const alFinal = () => {
    const reproductor = crearReproductor()
    reproductor.avanzar(1000)
    return reproductor.metricas()
  }

  it('al terminar dan los valores de la tabla del diseño', () => {
    const { promedios, porMoto, tiempoObservadoMin } = alFinal()
    expect(tiempoObservadoMin).toBe(140)
    expect(promedios.placasOcupadas).toBeCloseTo(1.76, 2)
    expect(promedios.enCola1).toBeCloseTo(0.33, 2)
    expect(promedios.enCola2).toBeCloseTo(0.82, 2)
    expect(promedios.puestosOcupados).toBeCloseTo(2.2, 2)
    expect(porMoto.esperaAntesDeLaPlacaMin).toBeCloseTo(2.0, 2)
    expect(porMoto.esperaEnCola2Min).toBeCloseTo(5.0, 2)
    expect(porMoto.tiempoTotalMin).toBeCloseTo(31.13, 2)
  })

  it('la espera antes de la placa y el tiempo total promedian las 23 motos con las horas anotadas', () => {
    const esperas = MOTOS_VISITA.map((moto) => moto.entraPlacaMin - moto.llegadaMin)
    const totales = MOTOS_VISITA.map((moto) => moto.finAcabadoMin - moto.llegadaMin)
    const media = (valores) => valores.reduce((a, b) => a + b, 0) / valores.length

    const { porMoto, motosContadas } = alFinal()
    expect(porMoto.esperaAntesDeLaPlacaMin).toBeCloseTo(media(esperas), 10)
    expect(porMoto.tiempoTotalMin).toBeCloseTo(media(totales), 10)
    expect(motosContadas).toEqual({ entraronALaPlaca: 23, pasaronPorLaFila2: 23, terminaron: 23 })
  })

  it('espera y tiempo total coinciden con lo observado; las cuatro ocupaciones no', () => {
    const { promedios, porMoto } = alFinal()
    expect(porMoto.esperaAntesDeLaPlacaMin).toBeCloseTo(OBSERVADO_EN_LA_VISITA.esperaAntesDeLaPlacaMin, 1)
    expect(porMoto.tiempoTotalMin).toBeCloseTo(OBSERVADO_EN_LA_VISITA.tiempoTotalMin, 1)

    for (const [clave, observado] of [
      ['placasOcupadas', OBSERVADO_EN_LA_VISITA.placasOcupadas],
      ['enCola1', OBSERVADO_EN_LA_VISITA.enCola1],
      ['enCola2', OBSERVADO_EN_LA_VISITA.enCola2],
      ['puestosOcupados', OBSERVADO_EN_LA_VISITA.puestosOcupados],
    ]) {
      expect(Math.abs(promedios[clave] - observado), clave).toBeGreaterThan(0.2)
    }
  })

  it('antes de que pase un minuto no hay nada que promediar: nada de ceros engañosos', () => {
    const { promedios, porMoto, motosContadas } = crearReproductor().metricas()
    expect(promedios).toEqual({
      placasOcupadas: null,
      enCola1: null,
      enCola2: null,
      puestosOcupados: null,
    })
    expect(porMoto).toEqual({
      esperaAntesDeLaPlacaMin: null,
      esperaEnCola2Min: null,
      tiempoTotalMin: null,
    })
    expect(motosContadas).toEqual({ entraronALaPlaca: 0, pasaronPorLaFila2: 0, terminaron: 0 })
  })

  it('a mitad de la visita son promedios "hasta ahora", calculados a mano', () => {
    // Hasta las 3:20 p. m. (10 minutos de reloj) solo habían llegado las motos 1, 2 y 3.
    const reproductor = crearReproductor()
    reproductor.avanzar(hm(3, 20))
    const { promedios, porMoto, motosContadas } = reproductor.metricas()

    // Placas ocupadas por minuto, desde las 3:10: la moto 1 en la placa 2 de 3:13 a 3:20 (7 minutos),
    // la moto 2 en la placa 5 desde 3:18 (2 minutos hasta las 3:20) y la 3 en la placa 4 desde 3:23.
    expect(promedios.placasOcupadas).toBeCloseTo((7 + 2) / 10, 10)
    // En la fila 1: la moto 1 de 3:11 a 3:13 (2 minutos) y la 3 de 3:18 a 3:20 (2 minutos).
    expect(promedios.enCola1).toBeCloseTo((2 + 2) / 10, 10)
    // Entraron a la placa las motos 1 (espera 2) y 2 (espera 0): promedio 1.
    expect(porMoto.esperaAntesDeLaPlacaMin).toBe(1)
    expect(motosContadas.entraronALaPlaca).toBe(2)
    // Todavía no ha salido ninguna del acabado.
    expect(porMoto.tiempoTotalMin).toBeNull()
  })
})
