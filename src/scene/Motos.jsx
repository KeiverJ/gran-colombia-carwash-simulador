import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import {
  DynamicDrawUsage,
  Matrix4,
  MeshBasicMaterial,
  PlaneGeometry,
  Quaternion,
  Vector3,
} from 'three'

import { COLOR_DE_ESCENA } from '../estilos/colores.js'

import { useSimulacion } from '../store/simulacion.js'
import { modeloDeLaMoto } from './modelosDeMoto.js'
import { MOTO } from './posiciones.js'
import {
  ALTO_DEL_ARO,
  crearRecursosDeMoto,
  liberarRecursosDeMoto,
} from './recursosDeMoto.js'
import { calidadActual } from './calidad.js'
import { avanzarLasMotos, crearViajes, VELOCIDAD_DE_SIMULACION_EN_PAUSA } from './viajes.js'
import { crearTexturaDeSombra } from './texturaDeSombra.js'
import { useModelosDeMoto } from './useModelosDeMoto.js'

/**
 * Cuántas motos pueden estar dibujadas a la vez: las dos filas con su tope,
 * los servidores de las dos etapas y algunas saliendo. Es también la capacidad
 * de cada malla instanciada.
 */
const MOTOS_DIBUJADAS_COMO_MAXIMO = 40

const PLANES = [1, 2, 3]

/**
 * Objetos que se reutilizan en cada cuadro para no crear ninguno nuevo: se
 * escriben dentro de `useFrame` y no se leen en ningún otro sitio.
 */
const AUXILIARES = {
  posicion: new Vector3(),
  centro: new Vector3(),
  giro: new Quaternion(),
  moto: new Matrix4(),
  pieza: new Matrix4(),
  cuentaDeModelo: [],
  cuentaDePlan: { 1: 0, 2: 0, 3: 0 },
}

/** Cuánto sobresale la sombra de una moto de su caja: un poco más ancha y larga que ella. */
const HOLGURA_DE_LA_SOMBRA = { ancho: 1.9, largo: 1.25 }
/** A qué altura sobre la superficie va la sombra: sobre las juntas y las rejillas, bajo el aro. */
const ALTO_DE_LA_SOMBRA = 0.03

const EJE_Y = new Vector3(0, 1, 0)
const SIN_GIRO = new Quaternion()
const ESCALA_UNO = new Vector3(1, 1, 1)
const tamanoDeSombra = new Vector3()

/**
 * Prepara una malla instanciada para que se escriba cada cuadro: sin
 * recortarse por el cuerpo de la primera instancia (que está en el origen) y
 * sin dibujar nada hasta que se le diga cuántas instancias hay.
 */
function prepararMalla(nodo) {
  if (!nodo) return
  nodo.frustumCulled = false
  nodo.instanceMatrix.setUsage(DynamicDrawUsage)
  nodo.count = 0
}

/**
 * Las motos de la escena.
 *
 * No se suscribe al estado: lo lee dentro de `useFrame` y escribe las matrices
 * de las instancias directamente, para no provocar un render de React por
 * cuadro.
 *
 * Se dibuja **por instancias**: una malla instanciada por cada pieza de cada
 * modelo (los seis modelos tienen una sola) y una por cada aro de plan. Dibujar 40 motos cuesta lo mismo que dibujar 6:
 * las llamadas de dibujo dependen de cuántos modelos hay, no de cuántas motos.
 *
 * El modelo de cada moto sale de su número (`modeloDeLaMoto`); si ese modelo
 * no cargó, se dibuja la figura de respaldo.
 */
export function Motos() {
  /** El viaje de cada moto, por su número. Se poda al salir del local. */
  const viajes = useRef(crearViajes())

  // Aros y figura de respaldo: se crean una vez y se reparten
  // entre todas las motos. Como no los crea React Three Fiber de forma
  // declarativa, hay que liberarlos a mano al desmontar.
  const recursos = useMemo(() => crearRecursosDeMoto(), [])
  useEffect(() => () => liberarRecursosDeMoto(recursos), [recursos])

  const { listo, modelos } = useModelosDeMoto()

  // Las mallas instanciadas, para escribirlas cada cuadro.
  const mallasDeModelo = useRef([]) // [modelo][pieza]
  const mallasDeAro = useRef({}) // [plan]
  const mallaDeSombras = useRef(null)

  // La sombra suave de cada moto: un óvalo acostado, una sola malla instanciada.
  const sombra = useMemo(() => {
    const textura = crearTexturaDeSombra()
    return {
      geometria: new PlaneGeometry(1, 1).rotateX(-Math.PI / 2),
      textura,
      material: new MeshBasicMaterial({
        map: textura,
        color: COLOR_DE_ESCENA.letreroDelLocal,
        transparent: true,
        opacity: 0.5,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1,
      }),
    }
  }, [])
  useEffect(
    () => () => {
      sombra.geometria.dispose()
      sombra.textura.dispose()
      sombra.material.dispose()
    },
    [sombra],
  )

  // Al reiniciar la simulación, el reloj vuelve a 0 y los números de moto se
  // reutilizan: si no se olvidara lo anterior, la nueva moto 1 aparecería
  // viniendo de donde estaba la vieja.
  const relojAnterior = useRef(0)

  // Las piezas de un modelo: las suyas si cargó, la figura de respaldo si no.
  const piezasDe = (modelo) => modelos[modelo]?.piezas ?? recursos.respaldo
  // Su centro visto desde arriba y su punto más alto: donde va el aro.
  const medidaDe = (modelo) => modelos[modelo]?.medida ?? recursos.medidaDelRespaldo

  useFrame((_, delta) => {
    const { foto, corriendo, velocidadMinPorSegundo } = useSimulacion.getState()
    if (!foto) return

    if (foto.relojMin < relojAnterior.current) {
      viajes.current.clear()
    }
    relojAnterior.current = foto.relojMin

    const velocidadDeSimulacion = corriendo ? velocidadMinPorSegundo : VELOCIDAD_DE_SIMULACION_EN_PAUSA
    const motosDelCuadro = avanzarLasMotos(viajes.current, foto, { segundos: delta, velocidadDeSimulacion })

    const { posicion, centro, giro, moto, pieza, cuentaDeModelo, cuentaDePlan } = AUXILIARES
    cuentaDeModelo.fill(0)
    for (const plan of PLANES) cuentaDePlan[plan] = 0
    let dibujadas = 0

    for (const { n, plan, punto, rumbo } of motosDelCuadro) {
      if (!listo || dibujadas >= MOTOS_DIBUJADAS_COMO_MAXIMO) continue
      dibujadas += 1

      giro.setFromAxisAngle(EJE_Y, rumbo)
      const modelo = modeloDeLaMoto(n)
      const indice = cuentaDeModelo[modelo] ?? 0
      cuentaDeModelo[modelo] = indice + 1

      // La moto: cada pieza del modelo, con su sitio dentro de la moto.
      moto.compose(posicion.set(punto[0], punto[1], punto[2]), giro, ESCALA_UNO)
      piezasDe(modelo).forEach((parte, i) => {
        mallasDeModelo.current[modelo]?.[i]?.setMatrixAt(
          indice,
          pieza.multiplyMatrices(moto, parte.local),
        )
      })

      // El aro del piso, con el color y el trazo del plan. Va sobre el centro de la
      // caja de **esta** moto (que se gira con ella).
      const { centroX, centroZ } = medidaDe(modelo)
      centro.set(centroX, 0, centroZ).applyQuaternion(giro)
      const x = punto[0] + centro.x
      const z = punto[2] + centro.z
      const lugar = cuentaDePlan[plan]
      cuentaDePlan[plan] = lugar + 1
      mallasDeAro.current[plan]?.setMatrixAt(
        lugar,
        moto.compose(posicion.set(x, punto[1] + ALTO_DEL_ARO, z), SIN_GIRO, ESCALA_UNO),
      )
      // La sombra va bajo la moto, a la altura de lo que pisa (el piso o la losa).
      mallaDeSombras.current?.setMatrixAt(
        dibujadas - 1,
        moto.compose(
          posicion.set(x, punto[1] + ALTO_DE_LA_SOMBRA, z),
          giro,
          tamanoDeSombra.set(MOTO.ancho * HOLGURA_DE_LA_SOMBRA.ancho, 1, MOTO.largo * HOLGURA_DE_LA_SOMBRA.largo),
        ),
      )
    }

    // Cuántas instancias hay en cada malla este cuadro.
    mallasDeModelo.current.forEach((piezas, modelo) => {
      for (const malla of piezas ?? []) {
        if (!malla) continue
        malla.count = cuentaDeModelo[modelo] ?? 0
        malla.instanceMatrix.needsUpdate = true
      }
    })
    if (mallaDeSombras.current) {
      // Con la escena lenta no se dibujan las sombras de las motos.
      mallaDeSombras.current.count = calidadActual().sombras ? dibujadas : 0
      mallaDeSombras.current.instanceMatrix.needsUpdate = true
    }
    for (const plan of PLANES) {
      const malla = mallasDeAro.current[plan]
      if (!malla) continue
      malla.count = cuentaDePlan[plan]
      malla.instanceMatrix.needsUpdate = true
    }
  })

  if (!listo) return null

  return (
    <group>
      {Array.from({ length: modelos.length }, (_, modelo) =>
        piezasDe(modelo).map((parte, i) => (
          <instancedMesh
            key={`modelo-${modelo}-${i}`}
            ref={(nodo) => {
              prepararMalla(nodo)
              if (nodo) (mallasDeModelo.current[modelo] ??= [])[i] = nodo
            }}
            args={[parte.geometry, parte.material, MOTOS_DIBUJADAS_COMO_MAXIMO]}
          />
        )),
      )}
      <instancedMesh
        ref={(nodo) => {
          prepararMalla(nodo)
          mallaDeSombras.current = nodo
        }}
        args={[sombra.geometria, sombra.material, MOTOS_DIBUJADAS_COMO_MAXIMO]}
        renderOrder={-1}
      />
      {PLANES.map((plan) => (
        <instancedMesh
          key={`aro-${plan}`}
          ref={(nodo) => {
            prepararMalla(nodo)
            if (nodo) mallasDeAro.current[plan] = nodo
          }}
          args={[recursos.aros[plan], recursos.materialesDeAro[plan], MOTOS_DIBUJADAS_COMO_MAXIMO]}
        />
      ))}
    </group>
  )
}

export default Motos
