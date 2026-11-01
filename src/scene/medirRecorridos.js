/**
 * Corre la aplicación cuadro a cuadro, con el mismo código de siempre (el ciclo de
 * animación `darUnCuadro` y la escena `animarLaEscena`, a 60 cuadros por segundo), y
 * anota cómo se mueve cada moto: cada camino que se le traza, cuánto recorre hasta
 * su placa y cuántas veces cambia su destino en la foto.
 *
 * Solo lee lo que dibuja la escena: no cambia nada. Sirve para las pruebas de los
 * recorridos de la visita y para medir la simulación aleatoria con la misma vara.
 */

import { useSimulacion } from '../store/simulacion.js'
import { darUnCuadro } from '../store/useCicloDeSimulacion.js'
import { entradaDeLaMoto } from './posiciones.js'
import { caminoDeLlegada, largoDelCamino } from './trayectorias.js'
import { animarLaEscena, crearViajes, sitiosDeLasMotos } from './viajes.js'

const CUADRO_EN_SEGUNDOS = 1 / 60

/** Lo que le falta a una moto para llegar a su lugar y se la considera todavía «en ruta». */
const METROS_PARA_CONSIDERARLA_EN_RUTA = 0.3

/** Una clave corta de un sitio, para compararlos y para mostrarlos. */
export const claveDelSitio = (sitio) =>
  sitio.zona === 'salida'
    ? 'salida'
    : sitio.zona === 'fila'
      ? `fila ${sitio.etapa} ${sitio.indice}`
      : `${sitio.zona} ${sitio.indice}/${sitio.total}`

/** Lo que gira un camino en su peor esquina, en grados. */
export function giroMaximoDelCamino(camino) {
  let maximo = 0
  for (let i = 1; i < camino.length - 1; i += 1) {
    const a = [camino[i][0] - camino[i - 1][0], camino[i][2] - camino[i - 1][2]]
    const b = [camino[i + 1][0] - camino[i][0], camino[i + 1][2] - camino[i][2]]
    const largos = Math.hypot(...a) * Math.hypot(...b)
    if (largos < 1e-9) continue
    const coseno = (a[0] * b[0] + a[1] * b[1]) / largos
    maximo = Math.max(maximo, (Math.acos(Math.max(-1, Math.min(1, coseno))) * 180) / Math.PI)
  }
  return maximo
}

/**
 * Corre hasta que termina la visita o el reloj llega a `hastaMin` (lo que ocurra
 * primero). El estado del store debe estar listo y en marcha (`iniciar`).
 *
 * @returns {{
 *   cuadros: number,
 *   viajes: Array,   // cada camino que se traza: quién, cuándo, de dónde a dónde, si fue en ruta
 *   porMoto: Map,    // por moto: caminos trazados, cambios de destino y metros recorridos
 *   aPlaca: Array,   // cada llegada a una placa: metros recorridos desde que llegó y camino directo
 *   cuadrosConMotos: Array<{ reloj: number, motos: Array }>  // solo si `guardarCuadros`
 * }}
 */
export function medirRecorridos({ hastaMin = Infinity, guardarCuadros = false, limiteDeCuadros = 60 * 60 * 300 } = {}) {
  const estado = () => useSimulacion.getState()
  const viajes = crearViajes()
  const registros = []
  const porMoto = new Map()
  const aPlaca = []
  const anterior = new Map() // n → último viaje visto
  const posicionAnterior = new Map()
  const destinoVisto = new Map() // n → clave del último destino de la foto
  const cuadrosGuardados = []

  let instante = 0
  let instanteAnterior = null
  let cuadros = 0

  const datosDe = (n) => {
    let datos = porMoto.get(n)
    if (!datos) {
      datos = { n, trazados: 0, cambios: 0, metros: 0, llegoALaPlaca: false }
      porMoto.set(n, datos)
    }
    return datos
  }

  while (cuadros < limiteDeCuadros && estado().foto.relojMin < hastaMin && !estado().visita?.terminada) {
    instante += CUADRO_EN_SEGUNDOS * 1000
    instanteAnterior = darUnCuadro(estado(), instante, instanteAnterior)
    const motos = animarLaEscena(viajes, estado(), CUADRO_EN_SEGUNDOS) ?? []
    const reloj = estado().foto.relojMin
    cuadros += 1
    if (guardarCuadros) cuadrosGuardados.push({ reloj, motos })

    // Los cambios de destino que ve la foto, moto por moto.
    const destinos = sitiosDeLasMotos(estado().foto)
    for (const [n, { sitio }] of destinos) {
      const clave = claveDelSitio(sitio)
      if (destinoVisto.has(n) && destinoVisto.get(n) !== clave) datosDe(n).cambios += 1
      destinoVisto.set(n, clave)
    }
    for (const [n, clave] of destinoVisto) {
      // Una moto que deja de estar en la foto se va por la salida: es un cambio más.
      if (!destinos.has(n) && clave !== 'salida') {
        datosDe(n).cambios += 1
        destinoVisto.set(n, 'salida')
      }
    }

    // Los caminos nuevos y los metros que recorre cada moto.
    for (const { n, punto } of motos) {
      const datos = datosDe(n)
      const antes = posicionAnterior.get(n)
      if (antes) datos.metros += Math.hypot(punto[0] - antes[0], punto[2] - antes[2])
      posicionAnterior.set(n, punto)
    }
    for (const [n, viaje] of viajes.porMoto) {
      const previo = anterior.get(n)
      if (previo !== viaje) {
        const datos = datosDe(n)
        datos.trazados += 1
        registros.push({
          n,
          reloj,
          desde: previo ? claveDelSitio(previo.sitio) : 'avenida',
          hacia: claveDelSitio(viaje.sitio),
          sitioNuevo: viaje.sitio,
          sitioViejo: previo?.sitio ?? null,
          enRuta: Boolean(previo) && previo.recorrido < previo.largo - METROS_PARA_CONSIDERARLA_EN_RUTA,
          recorridoViejo: previo?.recorrido ?? 0,
          // Salía de un sitio donde estaba quieta (llegó del todo), o es la primera vez que se la ve.
          enReposo: !previo || previo.recorrido >= previo.largo,
          camino: viaje.camino.map((punto) => [...punto]),
          giroMaximo: giroMaximoDelCamino(viaje.camino),
          largo: viaje.largo,
        })
        anterior.set(n, viaje)
      }
      const datos = datosDe(n)
      if (viaje.sitio.zona === 'placa' && viaje.recorrido >= viaje.largo && !datos.llegoALaPlaca) {
        datos.llegoALaPlaca = true
        const enRuta = registros.findLast((r) => r.n === n && r.hacia === claveDelSitio(viaje.sitio))?.enRuta ?? false
        aPlaca.push({
          n,
          reloj,
          enRuta,
          metros: datos.metros,
          directo: largoDelCamino(caminoDeLlegada(entradaDeLaMoto(n).clave, viaje.sitio)),
        })
      }
    }
  }

  return { cuadros, viajes: registros, porMoto, aPlaca, cuadrosConMotos: cuadrosGuardados }
}

/** Resumen de las llegadas a placa que iban en ruta cuando se les cambió el destino. */
export function resumenDeLasLlegadasEnRuta(aPlaca) {
  const enRuta = aPlaca.filter((llegada) => llegada.enRuta)
  const razones = enRuta.map((llegada) => llegada.metros / llegada.directo)
  return {
    total: aPlaca.length,
    enRuta: enRuta.length,
    razonPromedio: razones.length === 0 ? 0 : razones.reduce((suma, razon) => suma + razon, 0) / razones.length,
    razonMaxima: razones.length === 0 ? 0 : Math.max(...razones),
  }
}
