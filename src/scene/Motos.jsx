import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'

import { useSimulacion } from '../store/simulacion.js'
import { Moto } from './Moto.jsx'
import { entradaDeLaMoto, motosVisibles } from './posiciones.js'
import {
  crearRecursosDeMoto,
  liberarRecursosDeMoto,
  pintarMoto,
} from './recursosDeMoto.js'
import {
  caminoHacia,
  conArranqueYFrenado,
  girarHacia,
  largoDelCamino,
  puntoEnElCamino,
  SITIO_DE_SALIDA,
  sitioDeEntrada,
  sitioEnFila,
  sitioEnPlaca,
  sitioEnPuesto,
} from './trayectorias.js'

/**
 * Cuántas motos pueden estar dibujadas a la vez: las dos filas con su tope,
 * los servidores de las dos etapas y algunas saliendo.
 */
const RANURAS = 40

/**
 * Cuántos **minutos simulados** tarda una moto en hacer un recorrido.
 *
 * Es la clave de que la escena no se atrase del motor. Si la velocidad fuera
 * en metros por segundo de reloj, a 60 min/s el motor mandaría la moto de la
 * fila a la placa y de la placa al puesto mucho antes de que llegara, y se
 * vería dar saltos. Midiéndolo en minutos simulados, el retraso queda acotado
 * por construcción: nunca es mayor que esto, pase lo que pase con los cuadros
 * por segundo. A 1 min/s el viaje dura 0,4 s y se ve bien; a 60 min/s dura
 * 7 ms y la moto aparece puesta, que es lo honesto a esa velocidad.
 */
const PRESUPUESTO_DEL_VIAJE_EN_MINUTOS = 0.4

/**
 * A qué velocidad se terminan los viajes con la simulación en pausa.
 *
 * En pausa el motor no avanza, pero una moto a medio camino congelada en el
 * aire se vería mal. Con esto termina de aparcar y se queda quieta.
 */
const MINUTOS_POR_SEGUNDO_EN_PAUSA = 1

/** Qué parte del giro que le falta hace una moto por segundo real. */
const VELOCIDAD_DE_GIRO = 6

/** Si la moto quedó más lejos que esto del inicio de su camino, se coloca. */
const DISTANCIA_PARA_COLOCAR_DE_GOLPE = 1.5

/**
 * Las motos de la escena.
 *
 * No se suscribe al estado: lo lee dentro de `useFrame` y mueve los objetos
 * de Three.js directamente, para no provocar un render de React por cuadro.
 *
 * Trabaja con un número fijo de ranuras que se reparten entre las motos que
 * toca dibujar; así no se crean ni se destruyen figuras mientras la simulación
 * corre.
 */
export function Motos() {
  const ranuras = useRef([])
  /** El viaje de cada moto, por su número. Se poda al salir del local. */
  const viajes = useRef(new Map())
  /** Qué ranura usa cada moto, para que no salte de figura en figura. */
  const ranuraDeLaMoto = useRef(new Map())

  // Geometrías y materiales compartidos: se crean una vez y se reparten entre
  // todas las ranuras. Como no los crea React Three Fiber de forma
  // declarativa, hay que liberarlos a mano al desmontar.
  const recursos = useMemo(() => crearRecursosDeMoto(), [])

  useEffect(() => () => liberarRecursosDeMoto(recursos), [recursos])

  // Al reiniciar la simulación, el reloj vuelve a 0 y los números de moto se
  // reutilizan: si no se olvidara lo anterior, la nueva moto 1 aparecería
  // viniendo de donde estaba la vieja.
  const relojAnterior = useRef(0)

  useFrame((_, delta) => {
    const { foto, corriendo, velocidadMinPorSegundo } = useSimulacion.getState()
    if (!foto) return

    if (foto.relojMin < relojAnterior.current) {
      viajes.current.clear()
      ranuraDeLaMoto.current.clear()
    }
    relojAnterior.current = foto.relojMin

    const minutosDelCuadro =
      delta * (corriendo ? velocidadMinPorSegundo : MINUTOS_POR_SEGUNDO_EN_PAUSA)
    const avanceDelViaje = minutosDelCuadro / PRESUPUESTO_DEL_VIAJE_EN_MINUTOS
    const avanceDelGiro = delta * VELOCIDAD_DE_GIRO

    const destinos = sitiosDeLasMotos(foto)

    // Las que ya no están en la foto se van a la salida.
    for (const [n, viaje] of viajes.current) {
      if (!destinos.has(n)) {
        destinos.set(n, { sitio: SITIO_DE_SALIDA, plan: viaje.plan, saliendo: true })
      }
    }

    const usadas = new Set()
    for (const [n, { sitio, plan, saliendo }] of destinos) {
      const viaje = viajeDeLaMoto(n, sitio, viajes.current)
      viaje.plan = plan

      viaje.recorrido = Math.min(1, viaje.recorrido + avanceDelViaje)
      const { punto, rumbo } = puntoEnElCamino(
        viaje.camino,
        conArranqueYFrenado(viaje.recorrido) * viaje.largo,
      )

      // Gira hacia el rumbo del tramo que recorre. Al llegar, ese rumbo es el
      // del último tramo y deja de cambiar, así que la moto se queda mirando
      // hacia donde entró en vez de quedarse aparcada de lado: el último tramo
      // es corto y el giro no llega a terminarse antes de parar.
      if (rumbo !== null) {
        viaje.rumbo = girarHacia(viaje.rumbo, rumbo, avanceDelGiro)
      }

      if (saliendo && viaje.recorrido >= 1) {
        viajes.current.delete(n)
        ranuraDeLaMoto.current.delete(n)
        continue
      }

      const ranura = tomarRanura(n, ranuraDeLaMoto.current, usadas)
      if (ranura === null) continue
      usadas.add(ranura)

      const grupo = ranuras.current[ranura]
      if (!grupo) continue
      grupo.visible = true
      grupo.position.set(punto[0], punto[1], punto[2])
      grupo.rotation.y = viaje.rumbo
      pintarMoto(grupo, plan, recursos)
    }

    // Las ranuras que no tocó nadie este cuadro se esconden.
    for (let i = 0; i < ranuras.current.length; i += 1) {
      if (!usadas.has(i) && ranuras.current[i]) {
        ranuras.current[i].visible = false
      }
    }
  })

  return (
    <group>
      {Array.from({ length: RANURAS }, (_, i) => (
        <Moto
          key={i}
          recursos={recursos}
          grupoRef={(nodo) => {
            ranuras.current[i] = nodo
          }}
        />
      ))}
    </group>
  )
}

/**
 * El viaje que lleva una moto hacia `sitio`, creándolo o replanificándolo.
 *
 * Si el motor la manda a otro sitio antes de que llegue, se traza el camino
 * nuevo **desde donde está**, no desde el principio; y si quedó muy atrás —a
 * velocidad alta pasa—, se coloca de golpe en vez de arrastrarse.
 */
function viajeDeLaMoto(n, sitio, viajes) {
  const anterior = viajes.get(n)

  if (!anterior) {
    const viaje = nuevoViaje(sitioDeEntrada(entradaDeLaMoto(n).clave), sitio)
    viajes.set(n, viaje)
    return viaje
  }

  if (mismoSitio(anterior.sitio, sitio)) {
    return anterior
  }

  const viaje = nuevoViaje(anterior.sitio, sitio, anterior)
  viajes.set(n, viaje)
  return viaje
}

function nuevoViaje(desde, hasta, anterior) {
  const camino = caminoHacia(desde, hasta)

  // Empezar donde está de verdad, no donde debería haber estado.
  if (anterior) {
    const { punto } = puntoEnElCamino(
      anterior.camino,
      conArranqueYFrenado(anterior.recorrido) * anterior.largo,
    )
    const [x, , z] = camino[0]
    if (Math.hypot(punto[0] - x, punto[2] - z) < DISTANCIA_PARA_COLOCAR_DE_GOLPE) {
      camino[0] = punto
    }
  }

  return {
    sitio: hasta,
    camino,
    largo: largoDelCamino(camino),
    recorrido: 0,
    rumbo: anterior ? anterior.rumbo : 0,
    plan: anterior ? anterior.plan : 2,
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

/** Reutiliza la ranura que ya tenía la moto, o toma una libre. */
function tomarRanura(n, mapa, usadas) {
  const anterior = mapa.get(n)
  if (anterior !== undefined && !usadas.has(anterior)) {
    return anterior
  }
  for (let i = 0; i < RANURAS; i += 1) {
    if (!usadas.has(i) && ![...mapa.values()].includes(i)) {
      mapa.set(n, i)
      return i
    }
  }
  return null
}

/** En qué sitio del lavadero está cada moto según la foto del motor. */
function sitiosDeLasMotos(foto) {
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
    const { visibles } = motosVisibles(cola)
    visibles.forEach((moto, i) => {
      destinos.set(moto.n, { sitio: sitioEnFila(etapa, i), plan: moto.plan })
    })
  }

  return destinos
}

export default Motos
