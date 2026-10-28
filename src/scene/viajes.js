/**
 * El viaje de cada moto, cuadro a cuadro: adónde va según la foto del motor,
 * por qué camino y a qué velocidad.
 *
 * Es JavaScript puro, sin React ni Three.js: `Motos.jsx` solo pone en pantalla
 * lo que sale de aquí, y las pruebas lo recorren con una corrida entera del
 * motor. **Solo lee la foto**: nunca le escribe ni toca su generador aleatorio,
 * así que los tiempos y las métricas son los mismos con la escena o sin ella.
 */

import { entradaDeLaMoto, motosVisibles, TOPE_DE_MOTOS_DIBUJADAS } from './posiciones.js'
import {
  ATRASO_MAXIMO_EN_MINUTOS,
  caminoDeLlegada,
  caminoDeSalida,
  caminoHacia,
  caminoReplanificado,
  debeEsperarParaElCorredor,
  distanciaHastaElCorredor,
  estaEnElCorredor,
  girarHacia,
  largoDelCamino,
  margenTrasAvanzar,
  puntoEnElCamino,
  recorridoTrasAvanzar,
  SITIO_DE_SALIDA,
  sitioEnFila,
  sitioEnPlaca,
  sitioEnPuesto,
} from './trayectorias.js'

/** Qué parte del giro que le falta hace una moto por segundo real. */
export const VELOCIDAD_DE_GIRO = 6

/**
 * Cuánto de su giro hace una moto por cada metro que avanza: a más velocidad,
 * más rápido gira, para que no vaya de lado en las curvas.
 */
export const GIRO_POR_METRO = 0.8

/** Hasta dónde llega una moto que espera: unos centímetros antes del corredor, para no contar como dentro. */
const MARGEN_ANTES_DEL_CORREDOR = 0.15

/**
 * A qué velocidad de simulación se terminan los viajes con la simulación en
 * pausa: ninguna. En pausa el motor no avanza, pero una moto a medio camino
 * congelada en el aire se vería mal; con esto termina de aparcar a la
 * velocidad de siempre (`V_BASE`) y se queda quieta.
 */
export const VELOCIDAD_DE_SIMULACION_EN_PAUSA = 0

/**
 * Lo que recuerda la escena de las motos entre un cuadro y el siguiente:
 * - `porMoto`: el viaje de cada moto que se ve o que va de camino, por su número;
 * - `ocultas`: las que siguen en el lavadero pero la fila ya no dibuja (llegaron
 *   al final de una fila más larga que su tope), con la etapa de esa fila.
 */
export const crearViajes = () => ({ porMoto: new Map(), ocultas: new Map() })

/**
 * Avanza un cuadro a todas las motos: traza o replanifica el viaje de cada una
 * según la foto, las mueve por su camino y devuelve dónde están.
 *
 * - Las que están en la foto van a su sitio (placa, puesto o su lugar en una fila).
 * - Las que ya no están se van por la avenida por la que entraron, y se
 *   olvidan al llegar a ella.
 * - Las que siguen en el lavadero pero la fila no dibuja (la fila es más larga
 *   que su tope) van hasta el final de la fila y dejan de verse: el rótulo de
 *   «+N motos más» las cuenta. Cuando les toca dibujarse salen de ahí.
 * - El corredor de detrás de los puestos es de un solo carril: la que va a
 *   entrar o a salir espera en su puerta si ya viene otra de frente.
 *
 * @param {object} viajes lo que devuelve `crearViajes`, que se va actualizando
 * @param {object} foto la foto del motor
 * @param {{ segundos: number, velocidadDeSimulacion: number }} cuadro lo que dura
 *   el cuadro en reloj, y los minutos simulados por segundo (0 en pausa)
 * @returns {Array<{ n: number, plan: number, punto: number[], rumbo: number, saliendo: boolean }>}
 */
export function avanzarLasMotos(viajes, foto, { segundos, velocidadDeSimulacion }) {
  const { porMoto, ocultas } = viajes
  const destinos = sitiosDeLasMotos(foto)

  // Las que dejan de estar en la lista de dibujadas: o salieron, o siguen en una fila
  // más larga que su tope. Para saber cuál, hay que mirar el resto de las filas; eso
  // solo se hace el cuadro en que pasa, no en todos.
  let sinDibujar = null
  for (const [n, viaje] of porMoto) {
    if (destinos.has(n)) continue
    if (!viaje.saliendo && !viaje.oculta) {
      sinDibujar ??= sitiosDeLasQueNoSeDibujan(foto)
      const lugar = sinDibujar.get(n)
      if (lugar) {
        viaje.oculta = lugar
      } else {
        destinos.set(n, { sitio: SITIO_DE_SALIDA, plan: viaje.plan })
        continue
      }
    }
    destinos.set(n, viaje.oculta ? { ...viaje.oculta, oculta: true } : { sitio: SITIO_DE_SALIDA, plan: viaje.plan })
  }

  // Primero se traza el viaje de cada una y se mira quién está ya en el corredor.
  const dentroDelCorredor = { entrando: 0, saliendo: 0 }
  for (const [n, { sitio, plan }] of destinos) {
    const viaje = viajeDeLaMoto(n, sitio, viajes)
    viaje.plan = plan
    viaje.enElCorredor = estaEnElCorredor(puntoEnElCamino(viaje.camino, viaje.recorrido).punto)
    if (viaje.enElCorredor) dentroDelCorredor[viaje.saliendo ? 'saliendo' : 'entrando'] += 1
  }

  const motos = []
  for (const [n, { oculta }] of destinos) {
    const viaje = porMoto.get(n)
    viaje.oculta = oculta ? { sitio: viaje.sitio, plan: viaje.plan } : null

    // Espera en la puerta del corredor si ya viene otra moto de frente. La que ya
    // está dentro no espera nunca: así quien bloquea siempre se está moviendo.
    // Mientras espera no gasta su plazo: ceder el paso no es ir atrasada.
    const espera =
      !viaje.enElCorredor &&
      viaje.puertaDelCorredor !== null &&
      viaje.recorrido < viaje.puertaDelCorredor &&
      debeEsperarParaElCorredor(viaje.saliendo, dentroDelCorredor)
    const antes = viaje.recorrido
    viaje.recorrido = recorridoTrasAvanzar({
      recorrido: viaje.recorrido,
      largo: viaje.largo,
      segundos,
      velocidadDeSimulacion,
      margenEnMinutos: viaje.margenMin,
      limite: espera ? viaje.metrosHastaElCorredor : null,
    })
    if (!espera) {
      viaje.margenMin = margenTrasAvanzar(viaje.margenMin, segundos, velocidadDeSimulacion)
    }
    const { punto, rumbo } = puntoEnElCamino(viaje.camino, viaje.recorrido)

    // Si acaba de entrar al corredor, las demás de este cuadro ya lo saben: así dos
    // motos que llegan a la vez a sus puertas no entran las dos.
    if (!viaje.enElCorredor && estaEnElCorredor(punto)) {
      viaje.enElCorredor = true
      dentroDelCorredor[viaje.saliendo ? 'saliendo' : 'entrando'] += 1
    }

    // Gira hacia el rumbo del tramo que recorre. Al llegar, ese rumbo es el del
    // último tramo y deja de cambiar, así que la moto se queda mirando hacia
    // donde entró en vez de quedarse aparcada de lado: el último tramo es corto
    // y el giro no llega a terminarse antes de parar.
    if (rumbo !== null) {
      const cuanto = Math.max(segundos * VELOCIDAD_DE_GIRO, (viaje.recorrido - antes) * GIRO_POR_METRO)
      viaje.rumbo = girarHacia(viaje.rumbo, rumbo, cuanto)
    }

    const llego = viaje.recorrido >= viaje.largo
    if (viaje.saliendo && llego) {
      porMoto.delete(n)
      continue
    }
    if (oculta && llego) {
      // Llegó al final de la fila y ya no se ve: solo se guarda que sigue ahí.
      porMoto.delete(n)
      ocultas.set(n, viaje.oculta.sitio.etapa)
      continue
    }
    motos.push({ n, plan: viaje.plan, punto, rumbo: viaje.rumbo, saliendo: viaje.saliendo })
  }
  return motos
}

/**
 * El viaje que lleva una moto hacia `sitio`, creándolo o replanificándolo.
 *
 * Una moto nueva entra por la avenida que le toca (`entradaDeLaMoto`), por su
 * curva y su boca. Si el motor la manda a otro sitio antes de que llegue, se
 * traza el camino nuevo **desde donde está**, no desde el principio. Las que ya
 * no están en la foto salen por la avenida por la que entraron. Una que estaba
 * oculta al final de su fila y vuelve a dibujarse sale de ese último lugar.
 */
export function viajeDeLaMoto(n, sitio, { porMoto, ocultas }) {
  const anterior = porMoto.get(n)
  const saliendo = sitio.zona === 'salida'
  const avenida = entradaDeLaMoto(n).clave

  if (!anterior) {
    // Una que estaba oculta al final de su fila sale de ese último lugar; las demás, de la avenida.
    const etapa = ocultas.get(n)
    ocultas.delete(n)
    const camino = etapa
      ? caminoHacia(sitioEnFila(etapa, TOPE_DE_MOTOS_DIBUJADAS[etapa] - 1), sitio)
      : caminoDeLlegada(avenida, sitio)
    const viaje = nuevoViaje(camino, sitio, { saliendo })
    porMoto.set(n, viaje)
    return viaje
  }

  if (mismoSitio(anterior.sitio, sitio)) {
    return anterior
  }

  const desdeSuSitio = saliendo
    ? caminoDeSalida(anterior.sitio, avenida)
    : caminoHacia(anterior.sitio, sitio)
  const camino = caminoReplanificado(anterior.camino, anterior.recorrido, desdeSuSitio)
  const viaje = nuevoViaje(camino, sitio, { saliendo, rumbo: anterior.rumbo, plan: anterior.plan })
  porMoto.set(n, viaje)
  return viaje
}


/** Hasta cuántos metros avanza la que espera: unos centímetros antes de la puerta. */
function esperaAntesDeLaPuerta(camino) {
  const puerta = distanciaHastaElCorredor(camino)
  return puerta === null ? null : Math.max(0, puerta - MARGEN_ANTES_DEL_CORREDOR)
}

function nuevoViaje(camino, sitio, { saliendo, rumbo = 0, plan = 2 }) {
  return {
    sitio,
    camino,
    largo: largoDelCamino(camino),
    // Cuántos metros hay hasta la puerta del corredor, si pasa por él; ahí espera
    // si viene otra moto de frente. Se queda un poco antes, fuera de él.
    puertaDelCorredor: distanciaHastaElCorredor(camino),
    metrosHastaElCorredor: esperaAntesDeLaPuerta(camino),
    enElCorredor: false,
    recorrido: 0,
    // El plazo para llegar, en minutos simulados: baja con el reloj de la simulación.
    margenMin: ATRASO_MAXIMO_EN_MINUTOS,
    rumbo,
    plan,
    saliendo,
  }
}

function mismoSitio(a, b) {
  return (
    a.zona === b.zona &&
    a.indice === b.indice &&
    a.total === b.total &&
    a.etapa === b.etapa &&
    a.avenida === b.avenida
  )
}

/**
 * Las motos que siguen en el lavadero pero que la fila no dibuja (la fila es
 * más larga que su tope): para una que ya se estaba dibujando, el último lugar
 * dibujado de su fila, que es adonde llega antes de dejar de verse.
 */
function sitiosDeLasQueNoSeDibujan(foto) {
  const sinDibujar = new Map()
  for (const [cola, etapa] of [
    [foto.colaLavado, 'lavado'],
    [foto.colaAcabado, 'acabado'],
  ]) {
    const tope = TOPE_DE_MOTOS_DIBUJADAS[etapa]
    cola.slice(tope).forEach((moto) => {
      sinDibujar.set(moto.n, { sitio: sitioEnFila(etapa, tope - 1), plan: moto.plan, oculta: true })
    })
  }
  return sinDibujar
}

/** En qué sitio del lavadero está cada moto según la foto del motor. */
export function sitiosDeLasMotos(foto) {
  const destinos = new Map()

  foto.placas.forEach((placa, i) => {
    if (placa.moto) {
      destinos.set(placa.moto.n, {
        sitio: sitioEnPlaca(i, foto.placas.length),
        plan: placa.moto.plan,
      })
    }
  })
  foto.puestos.forEach((puesto, i) => {
    if (puesto.moto) {
      destinos.set(puesto.moto.n, {
        sitio: sitioEnPuesto(i, foto.puestos.length),
        plan: puesto.moto.plan,
      })
    }
  })

  for (const [cola, etapa] of [
    [foto.colaLavado, 'lavado'],
    [foto.colaAcabado, 'acabado'],
  ]) {
    const { visibles } = motosVisibles(cola, TOPE_DE_MOTOS_DIBUJADAS[etapa])
    visibles.forEach((moto, i) => {
      destinos.set(moto.n, { sitio: sitioEnFila(etapa, i), plan: moto.plan })
    })
  }

  return destinos
}
