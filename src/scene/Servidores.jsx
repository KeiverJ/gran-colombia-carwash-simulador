import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import { MeshStandardMaterial } from 'three'

import { COLOR_DE_ESCENA, COLOR_DE_ESTADO, COLOR_DE_OCUPADO, COLOR_DE_RESERVADO } from '../estilos/colores.js'
import {
  marcoDeLosa,
  posteConManguera,
  posteSencillo,
  rejillaDeDesague,
  tableroDeHerramientas,
} from './geometriasDelEntorno.js'
import Rotulo from './Rotulo.jsx'
import { useSimulacion } from '../store/simulacion.js'
import { estadoDeLasLosas } from './losasPublicadas.js'
import { avanceDelReloj, crearMemoriaDelReloj, pasoDeLaAnimacion } from './relojDeLaEscena.js'
import {
  posicionDePlaca,
  ANCLA_DEL_ROTULO_DE_SOBRANTES,
  ALTO_DEL_ROTULO_DE_SOBRANTES_EN_PANTALLA,
  posicionDelRotuloDeSobrantes,
  posicionDePuesto,
  POSTE_DE_LOSA,
  SERVIDOR,
} from './posiciones.js'

/** Qué parte del camino que le falta sube una losa por segundo real. */
const VELOCIDAD_DE_LA_LOSA = 9

/** Alto del poste con manguera de una placa y del poste de un puesto. */
const ALTO_DEL_POSTE_DE_PLACA = 1.55
const ALTO_DEL_POSTE_DE_PUESTO = 1.2

/** Alto del rótulo con el número, en metros: se lee desde la vista general. */
const ALTO_DEL_ROTULO = 0.6

/** Las formas que se repiten en todas las placas y todos los puestos, creadas una sola vez. */
function useFormasDeLosas() {
  const formas = useMemo(
    () => ({
      marco: marcoDeLosa({ ancho: SERVIDOR.ancho, fondo: SERVIDOR.fondo }),
      rejilla: rejillaDeDesague({}),
      postePlaca: posteConManguera({ alto: ALTO_DEL_POSTE_DE_PLACA }),
      posteConPuesto: posteSencillo({ alto: ALTO_DEL_POSTE_DE_PUESTO }),
      tablero: tableroDeHerramientas({ ancho: SERVIDOR.ancho - 0.5 }),
    }),
    [],
  )
  useEffect(() => () => Object.values(formas).forEach((forma) => forma.dispose()), [formas])
  return formas
}

/** Los materiales de las losas: libre neutro y ocupada con el color de su etapa. */
function useMaterialesDeLosas() {
  const materiales = useMemo(
    () => ({
      libre: new MeshStandardMaterial({ color: COLOR_DE_ESTADO.libre, roughness: 0.85 }),
      reservadaLavado: new MeshStandardMaterial({ color: COLOR_DE_RESERVADO.lavado, roughness: 0.8 }),
      reservadaAcabado: new MeshStandardMaterial({ color: COLOR_DE_RESERVADO.acabado, roughness: 0.8 }),
      lavado: new MeshStandardMaterial({ color: COLOR_DE_OCUPADO.lavado, roughness: 0.7 }),
      acabado: new MeshStandardMaterial({ color: COLOR_DE_OCUPADO.acabado, roughness: 0.7 }),
      borde: new MeshStandardMaterial({ color: COLOR_DE_ESCENA.bordeDeLosa, roughness: 0.8 }),
      piezas: new MeshStandardMaterial({ vertexColors: true, metalness: 0.3, roughness: 0.55 }),
    }),
    [],
  )
  // Los materiales los creamos nosotros, así que nos toca soltarlos.
  useEffect(() => () => Object.values(materiales).forEach((material) => material.dispose()), [materiales])
  return materiales
}

/**
 * Las placas de lavado y los puestos de acabado.
 *
 * Solo recibe cuántos hay de cada uno: el estado de ocupación lo lee dentro
 * del ciclo de dibujo y lo aplica cambiando a mano el material y la altura de
 * cada losa. Si pasara por React, cada cambio de ocupación provocaría un
 * render, y a velocidad alta son varios por cuadro.
 *
 * Libre y ocupado se distinguen por la altura de la losa y también por el
 * color, pero sin verde ni rojo: libre es un gris azulado neutro y ocupado lleva
 * el color de su etapa (el del lavado en las placas, el del acabado en los
 * puestos). Una placa lleva rejilla de desagüe, un poste con manguera y su
 * número; un puesto es una mesa de acabado con su tablero de herramientas y su
 * rótulo «P1», «P2»…
 */
export function Servidores({ placas, puestos }) {
  const losas = useRef([])
  const encima = useRef([])
  /** El alto al que va cada losa ahora mismo, mientras sube o baja. */
  const altos = useRef([])
  /** Lo último que vio del reloj simulado, para animar solo lo que avanza. */
  const reloj = useRef(crearMemoriaDelReloj())

  const formas = useFormasDeLosas()
  const materiales = useMaterialesDeLosas()

  useFrame((_, delta) => {
    const { foto, generacion, corridaLarga } = useSimulacion.getState()
    if (!foto) return
    // Las losas suben con el reloj simulado: en pausa no se mueven. Y si el motor se
    // reemplazó o el estado saltó (otra generación), toman su alto de golpe.
    const { minutos, recolocar } = avanceDelReloj(reloj.current, {
      relojMin: foto.relojMin,
      generacion,
      segundosReales: delta,
    })
    if (corridaLarga) reloj.current.generacion = null
    // Qué parte del camino que le falta recorre la losa en este cuadro. Se calcula
    // con el tiempo del cuadro para que suba igual a 30 que a 60 cuadros.
    const acercamiento = recolocar ? 1 : 1 - Math.exp(-VELOCIDAD_DE_LA_LOSA * pasoDeLaAnimacion(delta, minutos))
    // Lo que se ve de cada losa sale de dónde están las motos en la escena, no del motor:
    // no se levanta antes de que llegue la moto ni baja antes de que salga.
    const estados = estadoDeLasLosas({ foto, generacion })
    estados.forEach((estadoVisual, i) => {
      const losa = losas.current[i]
      if (!losa) return
      const destino = estadoVisual === 'ocupada' ? SERVIDOR.altoOcupado : SERVIDOR.altoLibre
      // Se levanta poco a poco en vez de dar un salto. El alto de verdad se
      // guarda en la propia losa, no en React: cambiarlo sesenta veces por
      // segundo a través del estado provocaría un render por cuadro.
      const desde = altos.current[i] ?? destino
      const alto = desde + (destino - desde) * acercamiento
      altos.current[i] = alto

      losa.scale.y = alto / SERVIDOR.altoOcupado
      losa.position.y = alto / 2
      const etapa = i < foto.placas.length ? 'lavado' : 'acabado'
      losa.material =
        estadoVisual === 'ocupada'
          ? materiales[etapa]
          : estadoVisual === 'reservada'
            ? materiales[etapa === 'lavado' ? 'reservadaLavado' : 'reservadaAcabado']
            : materiales.libre
      // El marco, la rejilla y el tablero van sobre la cara de arriba: suben y
      // bajan con ella.
      const sobre = encima.current[i]
      if (sobre) sobre.position.y = alto
    })
  })

  const todos = [
    ...Array.from({ length: placas }, (_, i) => ({
      clave: `placa-${i}`,
      tipo: 'placa',
      texto: String(i + 1),
      posicion: posicionDePlaca(i, placas),
    })),
    ...Array.from({ length: puestos }, (_, i) => ({
      clave: `puesto-${i}`,
      tipo: 'puesto',
      texto: `P${i + 1}`,
      posicion: posicionDePuesto(i, puestos),
    })),
  ]

  return (
    <group>
      {todos.map(({ clave, tipo, texto, posicion }, i) => {
        const esPlaca = tipo === 'placa'
        return (
          <group key={clave} position={posicion}>
            <mesh
              ref={(nodo) => {
                losas.current[i] = nodo
              }}
              material={materiales.libre}
              position={[0, SERVIDOR.altoLibre / 2, 0]}
              scale={[1, SERVIDOR.altoLibre / SERVIDOR.altoOcupado, 1]}
            >
              <boxGeometry args={[SERVIDOR.ancho, SERVIDOR.altoOcupado, SERVIDOR.fondo]} />
            </mesh>

            {/* Sobre la losa: el marco del borde y, según el tipo, la rejilla de
                desagüe (al frente, donde la moto no llega) o el tablero de
                herramientas (al fondo, en el borde de atrás). */}
            <group
              ref={(nodo) => {
                encima.current[i] = nodo
              }}
              position={[0, SERVIDOR.altoLibre, 0]}
            >
              <mesh geometry={formas.marco} material={materiales.borde} />
              {esPlaca ? (
                <mesh geometry={formas.rejilla} material={materiales.piezas} position={[0, 0.001, 1.0]} />
              ) : (
                <mesh
                  geometry={formas.tablero}
                  material={materiales.piezas}
                  position={[0, 0.001, -SERVIDOR.fondo / 2 + 0.06]}
                />
              )}
            </group>

            {/* El poste con su rótulo, al costado de la losa. La placa lleva
                además la manguera. */}
            <mesh
              geometry={esPlaca ? formas.postePlaca : formas.posteConPuesto}
              material={materiales.piezas}
              position={[POSTE_DE_LOSA.x, 0, POSTE_DE_LOSA.z]}
            />
            <Rotulo
              position={[
                POSTE_DE_LOSA.x,
                (esPlaca ? ALTO_DEL_POSTE_DE_PLACA : ALTO_DEL_POSTE_DE_PUESTO) + 0.1 + ALTO_DEL_ROTULO / 2,
                POSTE_DE_LOSA.z,
              ]}
              alto={ALTO_DEL_ROTULO}
              relleno={esPlaca ? 6 : 8}
              negrita
            >
              {texto}
            </Rotulo>
          </group>
        )
      })}
    </group>
  )
}

/**
 * El rótulo del final de una fila cuando hay más motos de las que se dibujan.
 *
 * Con la etapa 2 saturada la fila llega a miles: se dibujan las primeras y el
 * resto se cuenta aquí, justo donde se acaba la fila dibujada.
 */
export function Sobrantes({ cuantas, etapa }) {
  if (cuantas <= 0) {
    return null
  }
  return (
    <Rotulo
      position={posicionDelRotuloDeSobrantes(etapa)}
      pixeles={ALTO_DEL_ROTULO_DE_SOBRANTES_EN_PANTALLA}
      encima
      sinSalirse
      ancla={ANCLA_DEL_ROTULO_DE_SOBRANTES[etapa]}
    >
      +{cuantas.toLocaleString('es-CO')} motos más
    </Rotulo>
  )
}

export default Servidores
