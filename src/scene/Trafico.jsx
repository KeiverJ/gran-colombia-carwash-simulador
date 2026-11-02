import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import { Matrix4, Quaternion, Vector3 } from 'three'

import { MODO_VISITA, useSimulacion } from '../store/simulacion.js'
import { crearInstanciasDeAmbiente } from './instanciasDeAmbiente.js'
import { motosEnLaCalle } from './motosEnLaCalle.js'
import { avanceDelReloj, crearMemoriaDelReloj, pasoDeLaAnimacion } from './relojDeLaEscena.js'
import { avanzarElTrafico, crearTrafico, escalaDelCarro, MODELOS_DEL_TRAFICO, posicionDelCarro } from './trafico.js'
import { useModelosDeAmbiente } from './useModelosDeAmbiente.js'

/** Cuántas copias de cada modelo caben (cuatro carriles con cinco carros, más las apariciones). */
const CAPACIDAD_POR_MODELO = 24

/** A qué altura sobre el piso van las ruedas: sobre el asfalto. */
const ALTURA_DEL_ASFALTO = 0.02

const EJE_Y = new Vector3(0, 1, 0)
const POSICION = new Vector3()
const ESCALA = new Vector3()
const GIRO = new Quaternion()
const MATRIZ = new Matrix4()

/**
 * El tráfico de ambiente (ver `trafico.js`): los carros que pasan por las dos
 * avenidas, dibujados **por instancias** con los modelos de ambiente (una malla
 * instanciada por pieza de cada modelo, así que dibujar 20 carros cuesta lo mismo
 * que dibujar los pocos modelos distintos). Un modelo que no carga se omite sin
 * error y sin hueco.
 *
 * Se mueve con el reloj simulado: en pausa, quieto. Es solo decoración: no recibe
 * clics y no le pide nada al motor. Con `visible` apagado (la calidad adaptable) no se
 * dibuja ni se mueve, y al volver a encenderse se recoloca desde cero.
 */
export function Trafico({ visible = true }) {
  const { modelos } = useModelosDeAmbiente(MODELOS_DEL_TRAFICO)
  const reloj = useRef(crearMemoriaDelReloj())
  const trafico = useRef(null)

  const instancias = useMemo(() => {
    const porModelo = {}
    for (const clave of MODELOS_DEL_TRAFICO) {
      if (modelos[clave]) porModelo[clave] = crearInstanciasDeAmbiente(modelos[clave], CAPACIDAD_POR_MODELO)
    }
    return porModelo
  }, [modelos])
  useEffect(
    () => () => {
      for (const grupo of Object.values(instancias)) grupo.liberar()
    },
    [instancias],
  )

  useFrame((_, delta) => {
    const { foto, generacion, corridaLarga, semilla, modo } = useSimulacion.getState()
    if (!foto) return
    if (!visible || corridaLarga) {
      // Apagado o con la corrida larga: no se mueve ni se dibuja, y al volver se recoloca.
      reloj.current.generacion = null
      for (const grupo of Object.values(instancias)) grupo.fijar(0)
      return
    }
    const { minutos, recolocar } = avanceDelReloj(reloj.current, {
      relojMin: foto.relojMin,
      generacion,
      segundosReales: delta,
    })
    if (recolocar || trafico.current === null) {
      trafico.current = crearTrafico({ semilla, enLaVisita: modo === MODO_VISITA })
    }
    avanzarElTrafico(trafico.current, {
      segundos: pasoDeLaAnimacion(delta, minutos),
      minutos,
      motos: motosEnLaCalle(),
    })

    const cuenta = {}
    for (const carro of trafico.current.carros) {
      const grupo = instancias[carro.modelo]
      const escala = escalaDelCarro(carro)
      if (!grupo || carro.oculto || escala < 0.02) continue
      const { x, z, rumbo } = posicionDelCarro(carro)
      const lugar = cuenta[carro.modelo] ?? 0
      cuenta[carro.modelo] = lugar + 1
      if (lugar >= CAPACIDAD_POR_MODELO) continue
      MATRIZ.compose(POSICION.set(x, ALTURA_DEL_ASFALTO, z), GIRO.setFromAxisAngle(EJE_Y, rumbo), ESCALA.setScalar(escala))
      grupo.poner(lugar, MATRIZ)
    }
    for (const [clave, grupo] of Object.entries(instancias)) grupo.fijar(Math.min(cuenta[clave] ?? 0, CAPACIDAD_POR_MODELO))
  })

  return (
    <group>
      {Object.entries(instancias).map(([clave, grupo]) =>
        grupo.mallas.map((malla, i) => <primitive key={`${clave}-${i}`} object={malla} />),
      )}
    </group>
  )
}

export default Trafico
