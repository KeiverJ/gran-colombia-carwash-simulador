import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import { BoxGeometry, Color, CylinderGeometry, DynamicDrawUsage, Matrix4, MeshStandardMaterial } from 'three'

import { useSimulacion } from '../store/simulacion.js'
import { clientesDePieDeRespaldo, clientesSentados, LUGAR_DE_LA_MULTITUD } from './clientes.js'
import { ESTADO_DEL_MODELO } from './cargaDeModelos.js'
import { crearInstanciasDeAmbiente } from './instanciasDeAmbiente.js'
import { estadoDeLasLosas } from './losasPublicadas.js'
import { piezasDeLaPersona, POSTURAS, TIPOS_DE_PIEZA } from './personas.js'
import { avanceDelReloj, crearMemoriaDelReloj, pasoDeLaAnimacion } from './relojDeLaEscena.js'
import { trabajadoresDeLasLosas } from './trabajadores.js'
import { useModelosDeAmbiente } from './useModelosDeAmbiente.js'

/** Cuántas personas dibujadas a la vez como máximo: 5 trabajadores, 3 sentados y unos de pie, con holgura. */
const PERSONAS_COMO_MAXIMO = 16

const COLOR = new Color()
const GIRO = new Matrix4()

/**
 * Las personas de la escena: los trabajadores junto a lo ocupado (ver
 * `trabajadores.js`), los clientes sentados en la sala de espera de la cafetería y,
 * junto a la caja, los clientes de pie (el modelo «crowd», o un par hecho en código
 * si no carga).
 *
 * Se dibuja **una malla instanciada por tipo de pieza** (nueve en total), con el
 * color por instancia: las llamadas de dibujo no crecen con el número de personas.
 * Las matrices salen de `piezasDeLaPersona` y se escriben en `useFrame`, sin pasar
 * por React, con el reloj simulado (en pausa, quietas). Con la corrida larga en
 * marcha no se dibuja ninguna. Son decorativas: no reciben clics.
 *
 * @param {object} props
 * @param {number} props.placas
 * @param {number} props.puestos
 * @param {boolean} [props.visible] la calidad adaptable las oculta (nivel 4) sin desmontarlas
 */
export function Personas({ placas, puestos, visible = true }) {
  const grupo = useRef(null)
  const mallas = useRef({})
  const tiempo = useRef(0)
  const reloj = useRef(crearMemoriaDelReloj())
  const { estados, modelos } = useModelosDeAmbiente(['multitud'])
  const hayMultitud = estados.multitud === ESTADO_DEL_MODELO.listo
  const multitudFallo = estados.multitud === ESTADO_DEL_MODELO.fallo
  const clientes = useMemo(() => [...clientesSentados(), ...(multitudFallo ? clientesDePieDeRespaldo() : [])], [multitudFallo])

  const recursos = useMemo(() => {
    const cuadrada = new BoxGeometry(1, 1, 1)
    const cabeza = new CylinderGeometry(0.5, 0.5, 1, 8)
    return {
      geometrias: { cuadrada, cabeza },
      material: new MeshStandardMaterial({ roughness: 0.85, flatShading: true }),
    }
  }, [])
  useEffect(
    () => () => {
      recursos.geometrias.cuadrada.dispose()
      recursos.geometrias.cabeza.dispose()
      recursos.material.dispose()
    },
    [recursos],
  )

  useFrame((_, delta) => {
    const { foto, generacion, corridaLarga } = useSimulacion.getState()
    if (!foto) return
    const { minutos } = avanceDelReloj(reloj.current, { relojMin: foto.relojMin, generacion, segundosReales: delta })
    tiempo.current += pasoDeLaAnimacion(delta, minutos)
    const cuenta = Object.fromEntries(TIPOS_DE_PIEZA.map((tipo) => [tipo, 0]))
    if (!corridaLarga && visible) {
      const losas = estadoDeLasLosas({ foto, generacion })
      const personas = [
        ...trabajadoresDeLasLosas({ placas, puestos, estados: losas }).map((t) => ({
          tipo: 'trabajador',
          postura: POSTURAS.lavando,
          herramienta: t.herramienta,
          numero: t.numero,
          x: t.x,
          z: t.z,
          rumbo: t.rumbo,
        })),
        ...clientes,
      ].slice(0, PERSONAS_COMO_MAXIMO)
      for (const persona of personas) {
        for (const { tipo, matriz, color } of piezasDeLaPersona(persona, tiempo.current)) {
          const malla = mallas.current[tipo]
          if (!malla || cuenta[tipo] >= PERSONAS_COMO_MAXIMO) continue
          malla.setMatrixAt(cuenta[tipo], matriz)
          malla.setColorAt(cuenta[tipo], COLOR.set(color))
          cuenta[tipo] += 1
        }
      }
    }
    for (const tipo of TIPOS_DE_PIEZA) {
      const malla = mallas.current[tipo]
      if (!malla) continue
      malla.count = cuenta[tipo]
      malla.instanceMatrix.needsUpdate = true
      if (malla.instanceColor) malla.instanceColor.needsUpdate = true
    }
  })

  return (
    <group ref={grupo} visible={visible}>
      {TIPOS_DE_PIEZA.map((tipo) => (
        <instancedMesh
          key={tipo}
          ref={(nodo) => {
            mallas.current[tipo] = nodo
            if (nodo) {
              nodo.instanceMatrix.setUsage(DynamicDrawUsage)
              nodo.count = 0
              // El color por instancia hay que crearlo antes del primer dibujo.
              nodo.setColorAt(0, COLOR.setRGB(1, 1, 1))
            }
          }}
          args={[tipo === 'cabeza' ? recursos.geometrias.cabeza : recursos.geometrias.cuadrada, recursos.material, PERSONAS_COMO_MAXIMO]}
          frustumCulled={false}
          castShadow
          raycast={() => null}
        />
      ))}
      {hayMultitud && <MultitudDeLaCaja modelo={modelos.multitud} />}
    </group>
  )
}

/** Los clientes de pie junto a la caja: el modelo «crowd» preparado, una sola vez y sin clics. */
function MultitudDeLaCaja({ modelo }) {
  const instancias = useMemo(() => crearInstanciasDeAmbiente(modelo, 1), [modelo])
  useEffect(() => {
    instancias.poner(
      0,
      GIRO.makeRotationY(LUGAR_DE_LA_MULTITUD.rumbo).setPosition(LUGAR_DE_LA_MULTITUD.x, 0, LUGAR_DE_LA_MULTITUD.z),
    )
    instancias.fijar(1)
    return () => instancias.liberar()
  }, [instancias])
  return (
    <group>
      {instancias.mallas.map((malla, i) => (
        <primitive key={i} object={malla} />
      ))}
    </group>
  )
}

export default Personas
