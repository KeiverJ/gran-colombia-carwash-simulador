/**
 * El viaje de cada moto, cuadro a cuadro: adónde va según la foto del motor,
 * por qué camino y dónde está en cada instante.
 *
 * Es JavaScript puro, sin React ni Three.js: `Motos.jsx` solo pone en pantalla
 * lo que sale de aquí, y las pruebas lo recorren con una corrida entera del
 * motor. **Solo lee la foto**: nunca le escribe ni toca su generador aleatorio,
 * así que los tiempos y las métricas son los mismos con la escena o sin ella.
 *
 * **Todo se mueve con el reloj simulado** (ver `relojDeLaEscena.js` y
 * `trayectorias.js`): la posición de una moto es una función de los minutos
 * simulados que pasaron desde que el motor la mandó a su sitio. En pausa no pasa
 * ninguno y no se mueve nada; al cambiar la velocidad, el ritmo cambia en el
 * cuadro siguiente. Y cuando el motor se reemplaza o el estado salta (reiniciar,
 * terminar la corrida larga, entrar o salir de la visita…), no se anima: se
 * descarta lo que se recordaba y cada moto se coloca en su lugar según la foto.
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
import { avanceDelReloj, crearMemoriaDelReloj } from './relojDeLaEscena.js'
import {
  caminoDeAjusteEnLaFila,
  caminoDeLlegada,
  caminoDeSalida,
  caminoHacia,
  caminoReplanificado,
  debeEsperarParaElCorredor,
  distanciaHastaElCorredor,
  duracionDelViaje,
  enLaBandaDeAcceso,
  estaEnElCorredor,
  girarHacia,
  largoDelCamino,
  minutosParaRecorrer,
  puntoDe,
  puntoEnElCamino,
  recorridoEnElTiempo,
  SITIO_DE_SALIDA,
  sitioEnFila,
  sitioEnPlaca,
  sitioEnPuesto,
} from './trayectorias.js'

/**
 * Cuánto de su giro hace una moto por cada metro que avanza: a más velocidad,
 * más rápido gira, para que no vaya de lado en las curvas. Solo gira si avanza:
 * una moto quieta (en pausa, o esperando su turno) no se mueve ni gira.
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

/**
 * Cuánto, como mucho, espera seguida una moto de una fila a que otra se aparte,
 * en minutos simulados: es el seguro de que ninguna se quede parada para siempre.
 */
const ESPERA_MAXIMA_EN_FILA_MIN = 30

/**
 * Cuántos viajes puede haber a la vez como mucho. Se dibujan unas 40 motos y
 * algunas más van de camino; si hay muchas más, la escena perdió el hilo y es
 * mejor recolocar que seguir arrastrándolas.
 */
const LIMITE_DE_VIAJES = 150

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
    ? Math.abs(x - FILA_DEL_LAVADO.x) < 0.4 && z > LOCAL.zSalida
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

/** Hasta dónde llega una moto que espera: antes de la boca del corredor, para dejar libre su carril. */
const MARGEN_ANTES_DEL_CORREDOR = 1.5

/**
 * Lo que recuerda la escena de las motos entre un cuadro y el siguiente:
 * - `porMoto`: el viaje de cada moto que se ve o que va de camino, por su número;
 * - `ocultas`: las que siguen en el lavadero pero la fila ya no dibuja (la fila es
 *   más larga que su tope), con la etapa de esa fila: se cuentan en «+N motos más»
 *   y nunca se dibujan apiladas en una avenida ni en una boca;
 * - `memoria`: el último reloj simulado y la última generación que vio (ver
 *   `relojDeLaEscena.js`).
 */
export const crearViajes = () => ({ porMoto: new Map(), ocultas: new Map(), memoria: crearMemoriaDelReloj() })

/**
 * Lo que hace la escena en cada cuadro con el estado del store: nada mientras
 * corre la corrida larga (el motor es de ella, y la escena no anima ni dibuja
 * hasta que termine), y si no, avanza las motos.
 *
 * @param {object} viajes lo que devuelve `crearViajes`
 * @param {{ foto: object, corridaLarga: object|null, generacion: number }} estado el del store
 * @param {number} segundosReales tiempo real desde el cuadro anterior
 * @returns {Array|null} las motos a dibujar, o `null` si no hay que dibujar ninguna
 */
export function animarLaEscena(viajes, { foto, corridaLarga, generacion }, segundosReales = 0) {
  if (!foto || corridaLarga) {
    // Lo que se recordaba ya no vale: al terminar se recoloca con el estado final.
    viajes.memoria.generacion = null
    return null
  }
  return avanzarLasMotos(viajes, foto, { generacion, segundosReales })
}

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
 * - Si el motor se reemplazó (cambió la `generacion`), el reloj retrocedió o saltó, o
 *   pasó mucho tiempo real, no se anima: se descarta lo recordado y cada moto se
 *   coloca en su lugar.
 *
 * @param {object} viajes lo que devuelve `crearViajes`, que se va actualizando
 * @param {object} foto la foto del motor
 * @param {{ generacion?: number, segundosReales?: number }} cuadro el número de
 *   generación del store y el tiempo real desde el cuadro anterior
 * @returns {Array<{ n: number, plan: number, punto: number[], rumbo: number, saliendo: boolean }>}
 */
export function avanzarLasMotos(viajes, foto, { generacion = 0, segundosReales = 0 } = {}) {
  const { porMoto, ocultas, memoria } = viajes
  const { minutos, recolocar } = avanceDelReloj(memoria, { relojMin: foto.relojMin, generacion, segundosReales })
  if (recolocar || porMoto.size > LIMITE_DE_VIAJES) {
    return recolocarLasMotos(viajes, foto)
  }

  const reloj = foto.relojMin
  const contexto = {
    reloj,
    largoDeLaFila: { lavado: foto.colaLavado.length, acabado: foto.colaAcabado.length },
  }
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
    if (!porMoto.has(n) && saleDeLaFilaOculta(n, sitio, ocultas, contexto.largoDeLaFila)) {
      const sale = posicionEnFila(sitio.indice + 1, sitio.etapa)
      const ocupado = [...enLasFilas[sitio.etapa].values()].some(({ punto }) => seMontan(sale, punto, sitio.etapa))
      if (ocupado) {
        destinos.delete(n)
        continue
      }
    }
    const viaje = viajeDeLaMoto(n, sitio, viajes, contexto)
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

    // Cuánto le tocaría haber recorrido ya, por el reloj simulado. Con la simulación
    // en pausa (0 minutos) no se toca nada: la moto se queda exactamente donde está.
    const antes = viaje.recorrido
    let recorrido = antes
    const deseado =
      minutos > 0
        ? Math.max(
            antes,
            recorridoEnElTiempo({ largo: viaje.largo, duracion: viaje.duracion, minutos: reloj - viaje.salioEnMin }),
          )
        : antes

    if (deseado > antes) {
      recorrido = deseado

      // Espera en la puerta del corredor si ya viene otra moto de frente. La que ya
      // está dentro no espera nunca: así quien bloquea siempre se está moviendo.
      const esperaPorElCorredor =
        !viaje.enElCorredor &&
        viaje.puertaDelCorredor !== null &&
        viaje.recorrido < viaje.puertaDelCorredor &&
        (debeEsperarParaElCorredor(viaje.saliendo, dentroDelCorredor) ||
          // Aunque vengan en el mismo sentido, no se entra a la boca del corredor
          // mientras otra moto pasa por delante de ella: se espera un poco antes.
          puntosDentro.some(({ n: otra, punto }) => otra !== n && cercaDe(punto, viaje.puntoDeLaPuerta)))
      if (esperaPorElCorredor) recorrido = Math.min(recorrido, Math.max(antes, viaje.metrosHastaElCorredor))

      // Tampoco se acerca a otra moto de su fila más de lo debido: espera a que se aparte.
      // Vale para la que viene detrás de otra y para la que llega tarde a un lugar de más
      // adelante y se encuentra con las que ya esperan. No cuenta con las que vienen de
      // frente (se cruzan por carriles distintos: esperarse una a otra las dejaría
      // trabadas), y nunca espera más de `ESPERA_MAXIMA_EN_FILA_MIN` seguidos.
      const sitio = viaje.sitio
      const deFila = sitio.zona === 'fila' ? enLasFilas[sitio.etapa] : null
      let esperaPorLaFila = false
      if (deFila && recorrido > antes && viaje.esperaEnFila < ESPERA_MAXIMA_EN_FILA_MIN) {
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
      viaje.esperaEnFila = esperaPorLaFila ? viaje.esperaEnFila + minutos : 0

      // Si se quedó corta por esperar, su hora de salida se atrasa lo justo para que,
      // desde ahora, siga justo ahí: esperar no gasta su tiempo de viaje.
      if (recorrido < deseado) {
        viaje.salioEnMin = reloj - minutosParaRecorrer({ largo: viaje.largo, duracion: viaje.duracion, recorrido })
      }
    }

    viaje.recorrido = recorrido
    const { punto, rumbo } = puntoEnElCamino(viaje.camino, viaje.recorrido)
    const sitioActual = viaje.sitio
    if (sitioActual.zona === 'fila') {
      const deFila = enLasFilas[sitioActual.etapa]
      if (enLaLineaDeLaFila(punto, sitioActual.etapa)) {
        deFila.set(n, { punto, direccion: direccionDelViaje(viaje) })
      } else {
        deFila.delete(n)
      }
    }

    // Si acaba de entrar al corredor, las demás de este cuadro ya lo saben: así dos
    // motos que llegan a la vez a sus puertas no entran las dos.
    if (!viaje.enElCorredor && estaEnElCorredor(punto)) {
      viaje.enElCorredor = true
      dentroDelCorredor[viaje.saliendo ? 'saliendo' : 'entrando'] += 1
    }

    // Gira hacia el rumbo del tramo que recorre. Al llegar, ese rumbo es el del
    // último tramo y deja de cambiar. Solo gira lo que avanza: sin avance, ni gira.
    if (rumbo !== null && recorrido > antes) {
      viaje.rumbo = girarHacia(viaje.rumbo, rumbo, (recorrido - antes) * GIRO_POR_METRO)
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
 * Descarta todo lo que se recordaba y coloca cada moto de la foto en su lugar,
 * quieta: no hay viaje que animar. Las motos de las filas que no se dibujan (más
 * allá del tope) quedan anotadas como ocultas, de modo que cuando les toque
 * dibujarse salgan del final de su fila y no de una avenida.
 */
function recolocarLasMotos(viajes, foto) {
  const { porMoto, ocultas } = viajes
  porMoto.clear()
  ocultas.clear()
  const motos = []
  for (const [n, { sitio, plan }] of sitiosDeLasMotos(foto)) {
    const llegada = caminoDeLlegada(entradaDeLaMoto(n).clave, sitio)
    const rumbo = puntoEnElCamino(llegada, largoDelCamino(llegada)).rumbo ?? 0
    const punto = puntoDe(sitio)
    porMoto.set(n, viajeNuevo({ camino: [punto], sitio, reloj: foto.relojMin, saliendo: false, rumbo, plan }))
    motos.push({ n, plan, punto, rumbo, saliendo: false })
  }
  for (const [cola, etapa] of [
    [foto.colaLavado, 'lavado'],
    [foto.colaAcabado, 'acabado'],
  ]) {
    for (let i = TOPE_DE_MOTOS_DIBUJADAS[etapa]; i < cola.length; i += 1) ocultas.set(cola[i].n, etapa)
  }
  return motos
}

/**
 * El viaje que lleva una moto hacia `sitio`, creándolo o replanificándolo.
 *
 * Una moto nueva entra por la avenida que le toca (`entradaDeLaMoto`), por su
 * curva y su boca; pero si lleva tiempo esperando (estaba más allá de lo que la
 * fila dibuja), sale del final de su fila y no de la avenida. Si el motor la manda
 * a otro sitio antes de que llegue, se traza el camino nuevo **desde donde está**,
 * no desde el principio. Las que ya no están en la foto salen por la avenida por
 * la que entraron.
 */
export function viajeDeLaMoto(n, sitio, { porMoto, ocultas }, { reloj, largoDeLaFila }) {
  const anterior = porMoto.get(n)
  const saliendo = sitio.zona === 'salida'
  const avenida = entradaDeLaMoto(n).clave

  if (!anterior) {
    // Una que estaba oculta al final de su fila (o que llega a la fila del lavado cuando
    // ya es más larga que lo que se dibuja) sale de ese último lugar; las demás, de la avenida.
    const etapa = saleDeLaFilaOculta(n, sitio, ocultas, largoDeLaFila) ? sitio.etapa : ocultas.get(n)
    ocultas.delete(n)
    // Sale un lugar más atrás del suyo (si el motor adelantó a dos a la vez, no salen
    // las dos del mismo punto).
    const atras = etapa && sitio.zona === 'fila' ? sitio.indice + 1 : TOPE_DE_MOTOS_DIBUJADAS[etapa]
    const camino = etapa ? caminoHacia(sitioEnFila(etapa, atras), sitio) : caminoDeLlegada(avenida, sitio)
    const viaje = viajeNuevo({ camino, sitio, reloj, saliendo, rumbo: rumboDelPrimerTramo(camino) })
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
  const desdeSuSitio = saliendo ? caminoDeSalida(anterior.sitio, avenida) : caminoHacia(anterior.sitio, sitio)
  const camino = ajusteEnLaFila
    ? caminoDeAjusteEnLaFila(aqui, sitio)
    : caminoReplanificado(anterior.camino, anterior.recorrido, desdeSuSitio)
  const viaje = viajeNuevo({ camino, sitio, reloj, saliendo, rumbo: anterior.rumbo, plan: anterior.plan })
  porMoto.set(n, viaje)
  return viaje
}

/**
 * ¿Sale esta moto, que no tiene viaje, del final de su fila y no de una avenida?
 * Sí si estaba anotada como oculta, o si va a una fila del lavado que ya es más
 * larga que lo que se dibuja: las que llegan a una fila así esperaban fuera de lo
 * que se ve, no vienen de la avenida.
 */
function saleDeLaFilaOculta(n, sitio, ocultas, largoDeLaFila) {
  if (sitio.zona !== 'fila') return false
  return (
    ocultas.has(n) ||
    (sitio.etapa === 'lavado' && largoDeLaFila.lavado >= TOPE_DE_MOTOS_DIBUJADAS.lavado)
  )
}

/** Hacia dónde mira una moto al empezar un camino: el rumbo de su primer tramo. */
function rumboDelPrimerTramo(camino) {
  return puntoEnElCamino(camino, 0).rumbo ?? 0
}

/** El punto del camino donde se entra al corredor, o `null` si no se entra. */
function puntoDeLaPuerta(camino) {
  const metros = distanciaHastaElCorredor(camino)
  return metros === null ? null : puntoEnElCamino(camino, metros).punto
}

/** Hasta cuántos metros avanza la que espera: antes de la puerta, para dejar libre el carril. */
function esperaAntesDeLaPuerta(camino) {
  const puerta = distanciaHastaElCorredor(camino)
  return puerta === null ? null : Math.max(0, puerta - MARGEN_ANTES_DEL_CORREDOR)
}

/**
 * Un viaje que sale ahora (`reloj`, en minutos simulados) por `camino`: dura lo
 * que dice `duracionDelViaje` y su plazo cuenta desde este momento.
 */
function viajeNuevo({ camino, sitio, reloj, saliendo, rumbo = 0, plan = 2 }) {
  const largo = largoDelCamino(camino)
  return {
    sitio,
    camino,
    largo,
    // El minuto simulado en que el motor la mandó allí (no cambia), y aquel en que salió y
    // cuánto dura: de ahí sale dónde está en cada instante (si espera, la salida se atrasa).
    ordenadoEnMin: reloj,
    salioEnMin: reloj,
    duracion: duracionDelViaje(largo),
    // Cuántos metros hay hasta la puerta del corredor, si pasa por él; ahí espera
    // si viene otra moto de frente. Se queda un poco antes, fuera de él.
    puertaDelCorredor: distanciaHastaElCorredor(camino),
    puntoDeLaPuerta: puntoDeLaPuerta(camino),
    metrosHastaElCorredor: esperaAntesDeLaPuerta(camino),
    enElCorredor: false,
    esperaEnFila: 0,
    recorrido: 0,
    oculta: null,
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
