/**
 * Reproductor de la visita del 17 de octubre de 2026.
 *
 * No es una simulación: es la tarde que se anotó, minuto a minuto. Cada moto
 * llega, entra a la placa que usó de verdad y sale a las horas de la tabla, sin
 * ningún sorteo. Por eso no cabe en el motor aleatorio, que da siempre la placa
 * libre de número menor y despacha en cuanto hay sitio (la moto 1 llega a las
 * 3:11 con todas las placas libres y entra a las 3:13, a la placa 2).
 *
 * Entrega **la misma foto del estado que el motor** —`relojMin`, `placas`,
 * `puestos`, `colaLavado`, `colaAcabado`, `motosLlegadas`, `motosSalidas`— y los
 * mismos tres métodos que usa el store (`avanzar`, `estado`, `metricas`), así que
 * la escena, la gráfica y los mandos funcionan sin saber de cuál de los dos
 * vienen. Si el store llegara a usar otro método del motor, hay que agregarlo aquí.
 *
 * Reglas de la reproducción:
 *  - El lavadero empieza vacío a las 3:10 p. m., y `relojMin` cuenta los minutos
 *    desde ahí (0 a 140). Se ignora el estado inicial observado de `visita.js`:
 *    las motos que ya estaban en fila y la del acabado no se midieron.
 *  - Etapa 1: cada moto llega a su hora, espera en la fila hasta su "Entra placa"
 *    aunque haya placas libres, ocupa la placa registrada y la libera en su
 *    "Sale placa".
 *  - Etapa 2: la tabla no registra el puesto y a veces anota más de 3 motos en
 *    acabado a la vez, así que la asignación es aproximada. Cada moto llega a la
 *    zona de atrás en su "Sale placa", toma el primer puesto libre (1→3) o espera
 *    en la fila 2 en orden FIFO, y sale en su "Fin acabado" aunque no haya tenido
 *    puesto: si su hora llega antes de que se le libere uno, sale de la fila 2 y
 *    no toma un puesto después. "Inicio acabado" no se usa para asignar.
 *  - En un mismo minuto, primero las salidas y luego las llegadas y las
 *    asignaciones; si dos motos llegan a una fila el mismo minuto, va primero la
 *    de número menor.
 *
 * JavaScript puro: no importa React, ni Three.js, ni toca el DOM.
 */

import { PLACAS_LAVADO, PUESTOS_ACABADO } from '../data/parametros.js'
import { INICIO_OBSERVACION_MIN, MOTOS_VISITA } from '../data/visita.js'

/** Los tiempos de `visita.js` cuentan desde las 3:00 p. m.; el reloj, desde las 3:10. */
const aReloj = (minutoDeLaTabla, inicioMin) => minutoDeLaTabla - inicioMin

/**
 * Recorre la tarde minuto a minuto y deja, para cada minuto, qué hay en cada
 * placa, en cada puesto y en cada fila una vez resueltos los sucesos de ese minuto.
 *
 * @returns {{ minutos: Array, detalle: Array }}
 */
function reconstruirLaTarde(motos, inicioMin, placas, puestos) {
  for (const moto of motos) {
    if (moto.placa < 1 || moto.placa > placas) {
      throw new RangeError(`La moto ${moto.n} usó la placa ${moto.placa}, que no existe.`)
    }
    if (moto.finAcabadoMin <= moto.salePlacaMin) {
      throw new RangeError(`La moto ${moto.n} termina el acabado antes de salir de la placa.`)
    }
  }

  const ultimoMinuto = Math.max(...motos.map((moto) => moto.finAcabadoMin))
  const enPlaca = Array.from({ length: placas }, () => null)
  const enPuesto = Array.from({ length: puestos }, () => null)
  const fila1 = []
  const fila2 = []
  let llegadas = 0
  let salidas = 0

  const detalle = new Map(
    motos.map((moto) => [
      moto.n,
      { n: moto.n, puesto: null, tomaPuestoMin: null, saleDeLaFila2Min: null },
    ]),
  )
  const delMinuto = (campo, minuto) =>
    motos.filter((moto) => moto[campo] === minuto).sort((a, b) => a.n - b.n)

  const minutos = []
  for (let minuto = inicioMin; minuto <= ultimoMinuto; minuto += 1) {
    // 1. Salidas: las placas que se liberan, y los puestos y la fila 2 de las
    //    motos que terminan su acabado.
    for (const moto of delMinuto('salePlacaMin', minuto)) {
      enPlaca[moto.placa - 1] = null
    }
    for (let i = 0; i < puestos; i += 1) {
      if (enPuesto[i] && enPuesto[i].finAcabadoMin === minuto) {
        enPuesto[i] = null
        salidas += 1
      }
    }
    for (let i = fila2.length - 1; i >= 0; i -= 1) {
      if (fila2[i].finAcabadoMin === minuto) {
        detalle.get(fila2[i].n).saleDeLaFila2Min = minuto
        fila2.splice(i, 1)
        salidas += 1
      }
    }

    // 2. Llegadas: a la fila del lavado, y a la fila del acabado las que acaban
    //    de salir de su placa.
    for (const moto of delMinuto('llegadaMin', minuto)) {
      fila1.push(moto)
      llegadas += 1
    }
    for (const moto of delMinuto('salePlacaMin', minuto)) {
      fila2.push(moto)
    }

    // 3. Asignaciones: a su placa registrada, y al primer puesto libre en orden.
    for (const moto of delMinuto('entraPlacaMin', minuto)) {
      if (enPlaca[moto.placa - 1] !== null) {
        throw new RangeError(
          `La moto ${moto.n} entra a la placa ${moto.placa} a las ${minuto}, pero sigue ocupada.`,
        )
      }
      fila1.splice(fila1.indexOf(moto), 1)
      enPlaca[moto.placa - 1] = moto
    }
    for (let i = 0; i < puestos && fila2.length > 0; i += 1) {
      if (enPuesto[i] === null) {
        const moto = fila2.shift()
        enPuesto[i] = moto
        const registro = detalle.get(moto.n)
        registro.puesto = i + 1
        registro.tomaPuestoMin = minuto
      }
    }

    minutos.push({
      placas: enPlaca.map((moto) => moto?.n ?? null),
      puestos: enPuesto.map((moto) => moto?.n ?? null),
      fila1: fila1.map((moto) => moto.n),
      fila2: fila2.map((moto) => moto.n),
      llegadas,
      salidas,
    })
  }

  return { minutos, detalle: [...detalle.values()] }
}

/** Suma acumulada: la posición k es lo que suman los k primeros minutos. */
function acumulado(valores) {
  const suma = [0]
  for (const valor of valores) {
    suma.push(suma[suma.length - 1] + valor)
  }
  return suma
}

const promedioDe = (valores) =>
  valores.length === 0 ? null : valores.reduce((total, valor) => total + valor, 0) / valores.length

/**
 * Crea el reproductor de la visita.
 *
 * @param {object} [opciones]
 * @param {Array} [opciones.motos] el registro de la visita (por defecto, las 23 motos)
 * @param {number} [opciones.inicioMin] minuto de la tabla en que empieza el reloj (por defecto, 3:10 p. m.)
 * @param {number} [opciones.placas] placas del lavadero (por defecto, 6)
 * @param {number} [opciones.puestos] puestos del acabado (por defecto, 3)
 */
export function crearReproductor({
  motos = MOTOS_VISITA,
  inicioMin = INICIO_OBSERVACION_MIN,
  placas = PLACAS_LAVADO,
  puestos = PUESTOS_ACABADO,
} = {}) {
  const { minutos, detalle } = reconstruirLaTarde(motos, inicioMin, placas, puestos)
  const duracionMin = minutos.length - 1
  const motoPorNumero = new Map(motos.map((moto) => [moto.n, moto]))
  const fotoDeMoto = (n) =>
    n === null ? null : { n, plan: motoPorNumero.get(n).plan, precargada: false }

  // Áreas bajo cada magnitud, para los promedios en el tiempo. El valor de un
  // minuto rige desde ese minuto hasta el siguiente.
  const areas = {
    placasOcupadas: acumulado(minutos.map((m) => m.placas.filter((n) => n !== null).length)),
    enCola1: acumulado(minutos.map((m) => m.fila1.length)),
    enCola2: acumulado(minutos.map((m) => m.fila2.length)),
    puestosOcupados: acumulado(minutos.map((m) => m.puestos.filter((n) => n !== null).length)),
  }
  const valorActual = {
    placasOcupadas: (m) => m.placas.filter((n) => n !== null).length,
    enCola1: (m) => m.fila1.length,
    enCola2: (m) => m.fila2.length,
    puestosOcupados: (m) => m.puestos.filter((n) => n !== null).length,
  }

  let reloj = 0
  const minutoDe = (relojMin) => Math.min(duracionMin, Math.floor(relojMin))

  return {
    /** Avanza el reloj `minutos` minutos, sin pasar de las 5:30 p. m. */
    avanzar(minutosQueAvanza) {
      if (!Number.isFinite(minutosQueAvanza) || minutosQueAvanza < 0) {
        throw new RangeError(
          `El intervalo debe ser un número de minutos mayor o igual que 0; se recibió ${minutosQueAvanza}.`,
        )
      }
      reloj = Math.min(duracionMin, reloj + minutosQueAvanza)
    },

    /** Foto del lavadero, con la misma forma que la del motor. */
    estado() {
      const foto = minutos[minutoDe(reloj)]
      const servidores = (numeros) =>
        numeros.map((n, i) => ({ numero: i + 1, moto: fotoDeMoto(n), libre: n === null }))
      return {
        relojMin: reloj,
        placas: servidores(foto.placas),
        puestos: servidores(foto.puestos),
        colaLavado: foto.fila1.map(fotoDeMoto),
        colaAcabado: foto.fila2.map(fotoDeMoto),
        motosLlegadas: foto.llegadas,
        motosSalidas: foto.salidas,
      }
    },

    /**
     * Lo que sale de la reproducción hasta la hora del reloj: promedios en el
     * tiempo desde las 3:10, y promedios por moto de las que ya completaron
     * cada etapa. No hay calentamiento: cuentan las 23. Si todavía no hay
     * nada que promediar, el valor es `null` (la tabla muestra "—", no un cero).
     */
    metricas() {
      const k = minutoDe(reloj)
      const hasta = inicioMin + k
      const enElMinuto = minutos[k]
      const promediosEnElTiempo = {}
      for (const clave of Object.keys(areas)) {
        promediosEnElTiempo[clave] =
          reloj > 0 ? (areas[clave][k] + (reloj - k) * valorActual[clave](enElMinuto)) / reloj : null
      }

      const esperaPlaca = motos.filter((m) => m.entraPlacaMin <= hasta).map((m) => m.entraPlacaMin - m.llegadaMin)
      // Una moto sale de la fila 2 cuando toma puesto o, si no llega a tenerlo, cuando termina.
      const atendidaEn = (d) => d.tomaPuestoMin ?? d.saleDeLaFila2Min
      const esperaFila2 = detalle
        .filter((d) => atendidaEn(d) !== null && atendidaEn(d) <= hasta)
        .map((d) => atendidaEn(d) - motoPorNumero.get(d.n).salePlacaMin)
      const totales = motos.filter((m) => m.finAcabadoMin <= hasta).map((m) => m.finAcabadoMin - m.llegadaMin)

      return {
        tiempoObservadoMin: reloj,
        promedios: promediosEnElTiempo,
        porMoto: {
          esperaAntesDeLaPlacaMin: promedioDe(esperaPlaca),
          esperaEnCola2Min: promedioDe(esperaFila2),
          tiempoTotalMin: promedioDe(totales),
        },
        motosContadas: {
          entraronALaPlaca: esperaPlaca.length,
          pasaronPorLaFila2: esperaFila2.length,
          terminaron: totales.length,
        },
      }
    },

    /** ¿Ya salieron las 23 motos? */
    terminada() {
      return reloj >= duracionMin
    },

    /**
     * Qué pasó con cada moto en la etapa 2: el puesto que tomó y cuándo, o la
     * hora en que salió de la fila 2 sin haber tenido puesto. Minutos del reloj
     * (0 = 3:10 p. m.). Para las pruebas y para quien quiera auditar la regla.
     */
    detalleDeLaEtapa2() {
      return detalle.map((d) => {
        const moto = motoPorNumero.get(d.n)
        const llegaMin = aReloj(moto.salePlacaMin, inicioMin)
        const atendidaMin = aReloj(d.tomaPuestoMin ?? d.saleDeLaFila2Min, inicioMin)
        return {
          n: d.n,
          llegaALaFila2Min: llegaMin,
          puesto: d.puesto,
          tomaPuestoMin: d.tomaPuestoMin === null ? null : aReloj(d.tomaPuestoMin, inicioMin),
          saleDeLaFila2Min: d.saleDeLaFila2Min === null ? null : aReloj(d.saleDeLaFila2Min, inicioMin),
          esperaEnFila2Min: atendidaMin - llegaMin,
        }
      })
    },

    /** Para inspeccionar la configuración desde fuera (y desde las pruebas). */
    configuracion() {
      return {
        placas,
        puestos,
        motos: motos.length,
        duracionMin,
        inicioMin,
        usaAzar: false,
      }
    },
  }
}
