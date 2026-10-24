import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import {
  BoxGeometry,
  ConeGeometry,
  MeshStandardMaterial,
  SphereGeometry,
  Vector3,
} from 'three'

import { COLOR_DE_PLAN } from '../estilos/colores.js'
import { useSimulacion } from '../store/simulacion.js'
import {
  entradaDeLaMoto,
  motosVisibles,
  POSICION_SALIDA,
  posicionDePlaca,
  posicionDePuesto,
  posicionEnFila,
} from './posiciones.js'

/**
 * Cuántas motos pueden estar dibujadas a la vez: las dos filas con su tope,
 * los servidores de las dos etapas y algunas saliendo.
 */
const RANURAS = 40

/** Qué fracción del camino recorre una moto por segundo real. */
const VELOCIDAD_DE_ACERCAMIENTO = 4

/** A qué distancia de la salida se da por ida una moto y se olvida. */
const DISTANCIA_PARA_OLVIDAR = 0.6

const salida = new Vector3(...POSICION_SALIDA)

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
  /** Dónde está ahora cada moto, por su número. Se poda: ver `olvidarIdas`. */
  const posiciones = useRef(new Map())
  /** Qué ranura usa cada moto, para que no salte de figura en figura. */
  const ranuraDeLaMoto = useRef(new Map())

  // Geometrías y materiales compartidos: se crean una vez y se reparten entre
  // todas las ranuras. Como no los crea React Three Fiber de forma
  // declarativa, hay que liberarlos a mano al desmontar.
  const recursos = useMemo(() => {
    const cuerpo = new BoxGeometry(0.8, 0.5, 1.6)
    const marcas = {
      1: new SphereGeometry(0.38, 16, 12),
      2: new BoxGeometry(0.62, 0.62, 0.62),
      3: new ConeGeometry(0.42, 0.8, 16),
    }
    const materiales = {
      1: new MeshStandardMaterial({ color: COLOR_DE_PLAN[1] }),
      2: new MeshStandardMaterial({ color: COLOR_DE_PLAN[2] }),
      3: new MeshStandardMaterial({ color: COLOR_DE_PLAN[3] }),
    }
    return { cuerpo, marcas, materiales }
  }, [])

  useEffect(() => {
    const { cuerpo, marcas, materiales } = recursos
    return () => {
      cuerpo.dispose()
      for (const geometria of Object.values(marcas)) geometria.dispose()
      for (const material of Object.values(materiales)) material.dispose()
    }
  }, [recursos])

  // Al reiniciar la simulación, el reloj vuelve a 0 y los números de moto se
  // reutilizan: si no se olvidara lo anterior, la nueva moto 1 aparecería
  // viniendo de donde estaba la vieja.
  const relojAnterior = useRef(0)

  useFrame((_, delta) => {
    const { foto } = useSimulacion.getState()
    if (!foto) return

    if (foto.relojMin < relojAnterior.current) {
      posiciones.current.clear()
      ranuraDeLaMoto.current.clear()
    }
    relojAnterior.current = foto.relojMin

    const destinos = destinosDeLasMotos(foto)
    const avance = Math.min(1, VELOCIDAD_DE_ACERCAMIENTO * delta)

    // Las que ya no están en la foto se van a la salida.
    for (const [n, posicion] of posiciones.current) {
      if (!destinos.has(n)) {
        destinos.set(n, { destino: salida, plan: posicion.plan, saliendo: true })
      }
    }

    const usadas = new Set()
    for (const [n, { destino, plan, saliendo }] of destinos) {
      let actual = posiciones.current.get(n)
      if (!actual) {
        const entrada = entradaDeLaMoto(n)
        actual = { punto: new Vector3(...entrada.posicion), plan }
        posiciones.current.set(n, actual)
      }
      actual.plan = plan
      actual.punto.lerp(destino, avance)

      if (saliendo && actual.punto.distanceTo(salida) < DISTANCIA_PARA_OLVIDAR) {
        posiciones.current.delete(n)
        ranuraDeLaMoto.current.delete(n)
        continue
      }

      const ranura = tomarRanura(n, ranuraDeLaMoto.current, usadas)
      if (ranura === null) continue
      usadas.add(ranura)

      const grupo = ranuras.current[ranura]
      if (!grupo) continue
      grupo.visible = true
      grupo.position.copy(actual.punto)
      const [cuerpoMesh, marcaMesh] = grupo.children
      cuerpoMesh.material = recursos.materiales[plan]
      marcaMesh.material = recursos.materiales[plan]
      marcaMesh.geometry = recursos.marcas[plan]
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
        <group key={i} ref={(nodo) => { ranuras.current[i] = nodo }} visible={false}>
          <mesh geometry={recursos.cuerpo} material={recursos.materiales[2]} position={[0, 0.25, 0]} />
          <mesh geometry={recursos.marcas[2]} material={recursos.materiales[2]} position={[0, 0.95, 0]} />
        </group>
      ))}
    </group>
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

/** Dónde debería estar cada moto según la foto del motor. */
function destinosDeLasMotos(foto) {
  const destinos = new Map()

  foto.placas.forEach((placa, i) => {
    if (placa.moto) {
      destinos.set(placa.moto.n, {
        destino: new Vector3(...posicionDePlaca(i, foto.placas.length)).setY(0.6),
        plan: placa.moto.plan,
      })
    }
  })
  foto.puestos.forEach((puesto, i) => {
    if (puesto.moto) {
      destinos.set(puesto.moto.n, {
        destino: new Vector3(...posicionDePuesto(i, foto.puestos.length)).setY(0.6),
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
      destinos.set(moto.n, {
        destino: new Vector3(...posicionEnFila(i, etapa)),
        plan: moto.plan,
      })
    })
  }

  return destinos
}

export default Motos
