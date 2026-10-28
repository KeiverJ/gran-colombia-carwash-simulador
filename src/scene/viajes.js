/**
 * El viaje de cada moto, cuadro a cuadro: adónde va según la foto del motor,
 * por qué camino y a qué velocidad.
 *
 * Es JavaScript puro, sin React ni Three.js: `Motos.jsx` solo pone en pantalla
 * lo que sale de aquí, y las pruebas lo recorren con una corrida entera del
 * motor. **Solo lee la foto**: nunca le escribe ni toca su generador aleatorio,
 * así que los tiempos y las métricas son los mismos con la escena o sin ella.
 */

import {
  entradaDeLaMoto,
  FILA_DEL_LAVADO,
  LOCAL,
  MOTO,
  motosVisibles,
  posicionEnFila,
  SEPARACION_EN_FILA,
  TOPE_DE_MOTOS_DIBUJADAS,
} from './posiciones.js'
import {
  ATRASO_MAXIMO_EN_MINUTOS,
  caminoDeAjusteEnLaFila,
  caminoDeLlegada,
  caminoDeSalida,
  enLaBandaDeAcceso,
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
  Z_DETRAS_DE_LOS_PUESTOS,
} from './trayectorias.js'

/** Qué parte del giro que le falta hace una moto por segundo real. */
export const VELOCIDAD_DE_GIRO = 6

/**
 * Cuánto de su giro hace una moto por cada metro que avanza: a más velocidad,
 * más rápido gira, para que no vaya de lado en las curvas.
 */
export const GIRO_POR_METRO = 0.8

/**
 * La distancia mínima, de centro a centro, entre dos motos que van a la misma
 * fila: un largo de moto y un poco más. Los lugares de la fila están a
 * `SEPARACION_EN_FILA` (dos metros), así que en su sitio nunca se rozan; esto es
 * para mientras se ponen al día: la que viene detrás espera si se acercaría más.
 */
export const DISTANCIA_MINIMA_EN_FILA = MOTO.largo + 0.1

/** Cada cuántos metros del camino se mira si una moto se montaría sobre otra de su fila. */
const PASO_PARA_VER_SI_SE_MONTA = 0.25

/** Cuánto, como mucho, espera seguida una moto de una fila a que otra se aparte, en segundos de reloj. */
const ESPERA_MAXIMA_EN_FILA_S = 8

/**
 * Hacia dónde va una moto ahora (un vector unitario sobre el piso), o `null` si ya
 * llegó y está quieta. Es la dirección de su tramo, vaya parada o no.
 */
function direccionDelViaje(viaje) {
  if (viaje.recorrido >= viaje.largo) return null
  const { rumbo } = puntoEnElCamino(viaje.camino, viaje.recorrido)
  return rumbo === null ? null : [Math.sin(rumbo), Math.cos(rumbo)]
}

/**
 * ¿Está el punto sobre la línea de su fila (y no en un carril de al lado ni en el
 * corredor)? Las motos que están sobre la línea son las que esperan, y entre
 * ellas es donde se cuida la separación; las que pasan por un carril de al lado
 * (a metro y medio) no se montan sobre ninguna.
 */
export function enLaLineaDeLaFila([x, , z], etapa) {
  return etapa === 'lavado'
    ? Math.abs(x - FILA_DEL_LAVADO.x) < 0.4 && z > Z_DETRAS_DE_LOS_PUESTOS + 1
    : Math.abs(z - LOCAL.zFilaAcabado) < 0.4
}

/** A qué distancia de la boca del corredor una moto que pasa ya estorba a la que va a entrar. */
const DISTANCIA_QUE_ESTORBA_EN_LA_PUERTA = 3.5

function cercaDe(punto, puerta) {
  return puerta !== null && Math.hypot(punto[0] - puerta[0], punto[2] - puerta[2]) < DISTANCIA_QUE_ESTORBA_EN_LA_PUERTA
}

/** Cuánto se separan dos puntos a lo largo de una fila (el eje de la fila: Z en el lavado, X en el acabado). */
function distanciaEnLaFila(a, b, etapa) {
  return Math.abs(etapa === 'lavado' ? a[2] - b[2] : a[0] - b[0])
}

/**
 * ¿Se montarían dos motos que están en estos puntos, vistas desde arriba? Es
 * si se pisan a lo largo de la fila **y** a lo ancho: una moto que pasa por un
 * carril al lado de la fila (a metro y medio) no se monta sobre las que esperan.
 */
function seMontan(a, b, etapa) {
  const lateral = etapa === 'lavado' ? Math.abs(a[0] - b[0]) : Math.abs(a[2] - b[2])
  return lateral < MOTO.ancho + 0.1 && distanciaEnLaFila(a, b, etapa) < DISTANCIA_MINIMA_EN_FILA
}

/**
 * Cuánto antes de llegar al final de la fila una moto oculta deja de dibujarse:
 * se pierde detrás, a dos metros de su lugar, sin llegar a montarse sobre la
 * última moto dibujada.
 */
const METROS_ANTES_DE_OCULTARSE = SEPARACION_EN_FILA + 0.2

/** Hasta dónde llega una moto que espera: unos centímetros antes del corredor, para no contar como dentro. */
const MARGEN_ANTES_DEL_CORREDOR = 1.5

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
  const puntosDentro = []
  // Dónde está cada moto que va a una fila, para que ninguna se le monte encima a otra.
  const enLasFilas = { lavado: new Map(), acabado: new Map() }
  for (const [n, viaje] of porMoto) {
    if (viaje.sitio.zona !== 'fila') continue
    const punto = puntoEnElCamino(viaje.camino, viaje.recorrido).punto
    if (enLaLineaDeLaFila(punto, viaje.sitio.etapa)) enLasFilas[viaje.sitio.etapa].set(n, { punto, direccion: null })
  }
  for (const [n, { sitio, plan }] of destinos) {
    // Una moto que vuelve a dibujarse sale de su fila solo cuando hay sitio por donde sale.
    if (!porMoto.has(n) && ocultas.has(n) && sitio.zona === 'fila') {
      const sale = posicionEnFila(sitio.indice + 1, sitio.etapa)
      const ocupado = [...enLasFilas[sitio.etapa].values()].some(({ punto }) => seMontan(sale, punto, sitio.etapa))
      if (ocupado) {
        destinos.delete(n)
        continue
      }
    }
    const viaje = viajeDeLaMoto(n, sitio, viajes)
    viaje.plan = plan
    const punto = puntoEnElCamino(viaje.camino, viaje.recorrido).punto
    if (viaje.sitio.zona === 'fila' && enLaLineaDeLaFila(punto, viaje.sitio.etapa)) {
      enLasFilas[viaje.sitio.etapa].set(n, { punto, direccion: direccionDelViaje(viaje) })
    }
    viaje.enElCorredor = estaEnElCorredor(punto)
    if (viaje.enElCorredor) {
      dentroDelCorredor[viaje.saliendo ? 'saliendo' : 'entrando'] += 1
      puntosDentro.push({ n, punto })
    }
  }

  const motos = []
  for (const [n, { oculta }] of destinos) {
    const viaje = porMoto.get(n)
    viaje.oculta = oculta ? { sitio: viaje.sitio, plan: viaje.plan } : null

    // Espera en la puerta del corredor si ya viene otra moto de frente. La que ya
    // está dentro no espera nunca: así quien bloquea siempre se está moviendo.
    // Mientras espera no gasta su plazo: ceder el paso no es ir atrasada.
    const esperaPorElCorredor =
      !viaje.enElCorredor &&
      viaje.puertaDelCorredor !== null &&
      viaje.recorrido < viaje.puertaDelCorredor &&
      (debeEsperarParaElCorredor(viaje.saliendo, dentroDelCorredor) ||
        // Aunque vengan en el mismo sentido, no se entra a la boca del corredor
        // mientras otra moto pasa por delante de ella: se espera un poco antes.
        puntosDentro.some(({ n: otra, punto }) => otra !== n && cercaDe(punto, viaje.puntoDeLaPuerta)))
    const antes = viaje.recorrido
    let recorrido = recorridoTrasAvanzar({
      recorrido: viaje.recorrido,
      largo: viaje.largo,
      segundos,
      velocidadDeSimulacion,
      margenEnMinutos: viaje.margenMin,
      limite: esperaPorElCorredor ? viaje.metrosHastaElCorredor : null,
    })

    // Tampoco se acerca a otra moto de su fila más de lo debido: espera a que se aparte.
    // Vale para la que viene detrás de otra y para la que llega tarde a un lugar de más
    // adelante y se encuentra con las que ya esperan. No cuenta con las que vienen de
    // frente (se cruzan por carriles distintos: esperarse una a otra las dejaría
    // trabadas), y nunca espera más de `ESPERA_MAXIMA_EN_FILA_S` seguidos: es el
    // seguro de que ninguna se quede parada para siempre.
    const sitio = viaje.sitio
    const deFila = sitio.zona === 'fila' ? enLasFilas[sitio.etapa] : null
    let esperaPorLaFila = false
    if (deFila && recorrido !== antes && viaje.esperaEnFila < ESPERA_MAXIMA_EN_FILA_S) {
      const actual = puntoEnElCamino(viaje.camino, antes).punto
      const miDireccion = direccionDelViaje(viaje)
      const otras = []
      for (const [otra, { punto, direccion }] of deFila) {
        if (otra === n) continue
        // Las que vienen de frente no cuentan: se cruzan por carriles distintos.
        if (direccion && miDireccion && direccion[0] * miDireccion[0] + direccion[1] * miDireccion[1] < 0) continue
        otras.push(punto)
      }
      // Se avanza por tramos cortos hasta justo antes de montarse sobre otra: a velocidad
      // alta un solo paso podría saltar por encima de ella.
      let seguro = antes
      for (let r = antes; r < recorrido; ) {
        r = Math.min(recorrido, r + PASO_PARA_VER_SI_SE_MONTA)
        const aqui = puntoEnElCamino(viaje.camino, r).punto
        const choca = otras.some(
          (punto) =>
            seMontan(aqui, punto, sitio.etapa) &&
            Math.hypot(aqui[0] - punto[0], aqui[2] - punto[2]) < Math.hypot(actual[0] - punto[0], actual[2] - punto[2]),
        )
        if (choca) break
        seguro = r
      }
      esperaPorLaFila = seguro < recorrido
      recorrido = seguro
    }
    viaje.esperaEnFila = esperaPorLaFila ? viaje.esperaEnFila + segundos : 0
    viaje.recorrido = recorrido
    if (!esperaPorElCorredor && !esperaPorLaFila) {
      viaje.margenMin = margenTrasAvanzar(viaje.margenMin, segundos, velocidadDeSimulacion)
    }
    const { punto, rumbo } = puntoEnElCamino(viaje.camino, viaje.recorrido)
    if (deFila) {
      if (enLaLineaDeLaFila(punto, sitio.etapa)) deFila.set(n, { punto, direccion: direccionDelViaje(viaje) })
      else deFila.delete(n)
    }

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
    if (oculta && viaje.largo - viaje.recorrido < METROS_ANTES_DE_OCULTARSE) {
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
    // Sale un lugar más atrás del suyo (si el motor adelantó a dos a la vez, no salen
    // las dos del mismo punto).
    const atras = (etapa && sitio.zona === 'fila' ? sitio.indice + 1 : TOPE_DE_MOTOS_DIBUJADAS[etapa])
    const camino = etapa
      ? caminoHacia(sitioEnFila(etapa, atras), sitio)
      : caminoDeLlegada(avenida, sitio)
    const viaje = nuevoViaje(camino, sitio, { saliendo })
    porMoto.set(n, viaje)
    return viaje
  }

  if (mismoSitio(anterior.sitio, sitio)) {
    return anterior
  }

  const aqui = puntoEnElCamino(anterior.camino, anterior.recorrido).punto
  const ajusteEnLaFila =
    !saliendo &&
    sitio.zona === 'fila' &&
    anterior.sitio.zona === 'fila' &&
    anterior.sitio.etapa === sitio.etapa &&
    anterior.recorrido < anterior.largo &&
    enLaBandaDeAcceso(aqui, sitio.etapa)
  const desdeSuSitio = saliendo
    ? caminoDeSalida(anterior.sitio, avenida)
    : caminoHacia(anterior.sitio, sitio)
  const camino = ajusteEnLaFila
    ? caminoDeAjusteEnLaFila(aqui, sitio)
    : caminoReplanificado(anterior.camino, anterior.recorrido, desdeSuSitio)
  const viaje = nuevoViaje(camino, sitio, { saliendo, rumbo: anterior.rumbo, plan: anterior.plan })
  porMoto.set(n, viaje)
  return viaje
}


/** El punto del camino donde se entra al corredor, o `null` si no se entra. */
function puntoDeLaPuerta(camino) {
  const metros = distanciaHastaElCorredor(camino)
  return metros === null ? null : puntoEnElCamino(camino, metros).punto
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
    puntoDeLaPuerta: puntoDeLaPuerta(camino),
    metrosHastaElCorredor: esperaAntesDeLaPuerta(camino),
    enElCorredor: false,
    esperaEnFila: 0,
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
 * más larga que su tope): para una que ya se estaba dibujando, el primer lugar
 * que la fila no dibuja (donde va el rótulo de «+N motos más»), que es adonde llega
 * antes de dejar de verse, sin montarse sobre la última moto dibujada.
 */
function sitiosDeLasQueNoSeDibujan(foto) {
  const sinDibujar = new Map()
  for (const [cola, etapa] of [
    [foto.colaLavado, 'lavado'],
    [foto.colaAcabado, 'acabado'],
  ]) {
    const tope = TOPE_DE_MOTOS_DIBUJADAS[etapa]
    cola.slice(tope).forEach((moto) => {
      sinDibujar.set(moto.n, { sitio: sitioEnFila(etapa, tope), plan: moto.plan, oculta: true })
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
