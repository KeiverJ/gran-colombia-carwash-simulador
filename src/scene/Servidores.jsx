import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import { MeshBasicMaterial, MeshStandardMaterial } from 'three'

import { COLOR_DE_ESCENA, COLOR_DE_ESTADO, COLOR_DE_OCUPADO, COLOR_DE_RESERVADO } from '../estilos/colores.js'
import {
  barreraDeCierre,
  conoDeCierre,
  marcoDeLosa,
  posteConManguera,
  posteSencillo,
  rejillaDeDesague,
  tableroDeHerramientas,
} from './geometriasDelEntorno.js'
import Rotulo from './Rotulo.jsx'
import { useServidorSenalado } from '../store/servidorSenalado.js'
import { MODO_VISITA, useSimulacion } from '../store/simulacion.js'
import { alHacerClicEnUnServidor, fijarElCursor, textoDelRotulo, tipoDeLaPulsacion } from './interaccionConServidores.js'
import { estadoDeLasLosas } from './losasPublicadas.js'
import { estaLevantada } from './losasVisuales.js'
import { avanceDelReloj, crearMemoriaDelReloj, pasoDeLaAnimacion } from './relojDeLaEscena.js'
import {
  posicionDePlaca,
  ANCLA_DEL_ROTULO_DE_SOBRANTES,
  ALTO_DEL_ROTULO_DE_SOBRANTES_EN_PANTALLA,
  posicionDelRotuloDeSobrantes,
  posicionDePuesto,
  posteDeLaPlaca,
  posteDelPuesto,
  SERVIDOR,
} from './posiciones.js'

/** Qué parte del camino que le falta sube una losa por segundo real. */
const VELOCIDAD_DE_LA_LOSA = 9

/** Alto del poste con manguera de una placa y del poste de un puesto. */
const ALTO_DEL_POSTE_DE_PLACA = 1.55
const ALTO_DEL_POSTE_DE_PUESTO = 1.2

/** La losa de un servidor cerrado queda más baja que la de uno libre: se distingue por la altura. */
const ALTO_DE_LA_LOSA_CERRADA = 0.04

/** Dónde va el cono de aviso sobre la losa: la esquina de delante, junto a la rejilla o al tablero. */
const POSICION_DEL_CONO = [0.85, 0, 1.1]

/** Dónde cruza la barrera de un servidor cerrado: a lo ancho, hacia el centro de la losa. */
const POSICION_DE_LA_BARRERA = [0, 0, -0.2]

/** Cuánto sobresale del borde de la losa el contorno que la resalta al señalarla. */
const VUELO_DEL_RESALTADO = 0.18

/** A qué altura sobre el piso va el rótulo de «Cerrar placa 3», sobre las motos y los postes. */
const ALTO_DEL_ROTULO_DE_ACCION = 2.3

/** Alto del rótulo de acción en la pantalla, en píxeles: legible desde cualquier vista. */
const PIXELES_DEL_ROTULO_DE_ACCION = 30

/** Alto del rótulo con el número, en metros: se lee desde la vista general. */
const ALTO_DEL_ROTULO = 0.6

/** El material de una losa según su estado visual y la etapa a la que pertenece. */
function materialDe(estadoVisual, etapa, materiales) {
  if (estadoVisual === 'ocupada' || estadoVisual === 'cerrandose') return materiales[etapa]
  if (estadoVisual === 'reservada') return materiales[etapa === 'lavado' ? 'reservadaLavado' : 'reservadaAcabado']
  if (estadoVisual === 'cerrada') return materiales.cerrada
  return materiales.libre
}

/** Las formas que se repiten en todas las placas y todos los puestos, creadas una sola vez. */
function useFormasDeLosas() {
  const formas = useMemo(
    () => ({
      marco: marcoDeLosa({ ancho: SERVIDOR.ancho, fondo: SERVIDOR.fondo }),
      resaltado: marcoDeLosa({
        ancho: SERVIDOR.ancho + 2 * VUELO_DEL_RESALTADO,
        fondo: SERVIDOR.fondo + 2 * VUELO_DEL_RESALTADO,
        tira: 0.09,
        alto: 0.07,
      }),
      rejilla: rejillaDeDesague({}),
      postePlaca: posteConManguera({ alto: ALTO_DEL_POSTE_DE_PLACA }),
      posteConPuesto: posteSencillo({ alto: ALTO_DEL_POSTE_DE_PUESTO }),
      tablero: tableroDeHerramientas({ ancho: SERVIDOR.ancho - 0.5 }),
      barrera: barreraDeCierre({ ancho: SERVIDOR.ancho }),
      cono: conoDeCierre({}),
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
      resaltadoLavado: new MeshBasicMaterial({ color: COLOR_DE_OCUPADO.lavado }),
      resaltadoAcabado: new MeshBasicMaterial({ color: COLOR_DE_OCUPADO.acabado }),
      cerrada: new MeshStandardMaterial({ color: COLOR_DE_ESCENA.losaCerrada, roughness: 0.9 }),
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
 * Un servidor cerrado se ve más bajo que uno libre, gris, con una barrera a lo ancho y
 * un cono de aviso; uno que se está cerrando sigue levantado con su moto y lleva solo
 * el cono. La altura y la barrera lo distinguen sin depender del color.
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
  /** Si la losa estaba cerrada o todavía está subiendo desde ahí: su transición va en tiempo real. */
  const eraCerrada = useRef([])
  /** La barrera y el cono de cada losa, y cuánto se ven ahora (0 a 1) mientras aparecen o se van. */
  const barreras = useRef([])
  const conos = useRef([])
  const escalas = useRef({ barrera: [], cono: [] })
  /** El contorno que resalta la losa señalada. */
  const resaltados = useRef([])
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
    // Cerrar o abrir un servidor lo pide la persona, aunque la simulación esté en pausa: esa
    // transición va con el tiempo real del cuadro (acotado, para que un salto no la ahogue).
    const acercamientoReal = recolocar ? 1 : 1 - Math.exp(-VELOCIDAD_DE_LA_LOSA * Math.min(delta, 0.1))
    // Lo que se ve de cada losa sale de dónde están las motos en la escena, no del motor:
    // no se levanta antes de que llegue la moto ni baja antes de que salga.
    const estados = estadoDeLasLosas({ foto, generacion })
    const servidoresDelMotor = [...foto.placas, ...foto.puestos]
    const { senalado } = useServidorSenalado.getState()
    const senaladoEn = senalado ? (senalado.etapa === 'lavado' ? senalado.indice : foto.placas.length + senalado.indice) : -1
    estados.forEach((estadoVisual, i) => {
      const losa = losas.current[i]
      if (!losa) return
      const destino =
        estadoVisual === 'cerrada'
          ? ALTO_DE_LA_LOSA_CERRADA
          : estaLevantada(estadoVisual)
            ? SERVIDOR.altoOcupado
            : SERVIDOR.altoLibre
      // Se levanta poco a poco en vez de dar un salto. El alto de verdad se
      // guarda en la propia losa, no en React: cambiarlo sesenta veces por
      // segundo a través del estado provocaría un render por cuadro.
      const desde = altos.current[i] ?? destino
      // La losa que se cierra, o que sale de estar cerrada, se mueve en tiempo real.
      const pasoDeLaLosa = estadoVisual === 'cerrada' || eraCerrada.current[i] ? acercamientoReal : acercamiento
      const alto = desde + (destino - desde) * pasoDeLaLosa
      altos.current[i] = alto
      eraCerrada.current[i] = estadoVisual === 'cerrada' || (eraCerrada.current[i] && Math.abs(alto - destino) > 0.002)

      losa.scale.y = alto / SERVIDOR.altoOcupado
      losa.position.y = alto / 2
      const etapa = i < foto.placas.length ? 'lavado' : 'acabado'
      losa.material = materialDe(estadoVisual, etapa, materiales)
      // El marco, la rejilla y el tablero van sobre la cara de arriba: suben y
      // bajan con ella.
      const sobre = encima.current[i]
      if (sobre) sobre.position.y = alto

      // La barrera solo en un servidor cerrado; el cono también en uno que se está cerrando
      // (el estado del motor, para que el aviso salga en cuanto se pide el cierre). Aparecen
      // y se van creciendo y encogiéndose, no de golpe.
      const delMotor = servidoresDelMotor[i]?.estado
      const crece = (clave, lista, objetivo) => {
        const nodo = lista.current[i]
        if (!nodo) return
        const desdeEscala = escalas.current[clave][i] ?? objetivo
        const escala = desdeEscala + (objetivo - desdeEscala) * acercamientoReal
        escalas.current[clave][i] = escala
        nodo.visible = escala > 0.01
        nodo.scale.setScalar(Math.max(escala, 0.0001))
      }
      const resaltado = resaltados.current[i]
      if (resaltado) resaltado.visible = i === senaladoEn
      crece('barrera', barreras, estadoVisual === 'cerrada' ? 1 : 0)
      crece('cono', conos, delMotor === 'cerrado' || delMotor === 'cerrandose' ? 1 : 0)
    })
  })

  const senalar = useServidorSenalado((estado) => estado.senalar)
  const soltar = useServidorSenalado((estado) => estado.soltar)
  const alternarServidor = useSimulacion((estado) => estado.alternarServidor)

  // En la visita y en la corrida larga no se puede abrir ni cerrar: ni se señala ni se
  // cambia el cursor, para no ofrecer lo que no se puede hacer.
  const sePuedeCambiar = () => {
    const { modo, corridaLarga } = useSimulacion.getState()
    return modo !== MODO_VISITA && corridaLarga === null
  }
  const alSenalar = (evento, etapa, indice) => {
    evento.stopPropagation()
    if (!sePuedeCambiar()) return
    senalar(etapa, indice)
    fijarElCursor(true)
  }
  const alSoltar = (etapa, indice) => {
    soltar(etapa, indice)
    fijarElCursor(false)
  }
  const alPulsar = (evento, etapa, indice) => {
    evento.stopPropagation()
    // El toque se resuelve al levantar el dedo (ver `alLevantar`), no con el clic.
    if (tipoDeLaPulsacion(evento) === 'touch' || !sePuedeCambiar()) return
    alHacerClicEnUnServidor({ delta: evento.delta, etapa, indice, alternarServidor })
  }
  // En pantalla táctil se mide el movimiento entre bajar y levantar el dedo: más de 2 px es
  // un arrastre de la cámara y no cierra nada. Con el dedo tampoco hay «salir» del servidor.
  const toqueEn = useRef(null)
  const alBajar = (evento, etapa, indice) => {
    if (tipoDeLaPulsacion(evento) !== 'touch') return
    toqueEn.current = { etapa, indice, x: evento.clientX, y: evento.clientY }
  }
  const alLevantar = (evento, etapa, indice) => {
    const toque = toqueEn.current
    if (tipoDeLaPulsacion(evento) !== 'touch' || !toque) return
    toqueEn.current = null
    evento.stopPropagation()
    if (toque.etapa !== etapa || toque.indice !== indice || !sePuedeCambiar()) return
    alHacerClicEnUnServidor({
      delta: Math.hypot(evento.clientX - toque.x, evento.clientY - toque.y),
      etapa,
      indice,
      alternarServidor,
    })
    soltar(etapa, indice)
  }

  const todos = [
    ...Array.from({ length: placas }, (_, i) => ({
      clave: `placa-${i}`,
      tipo: 'placa',
      etapa: 'lavado',
      indice: i,
      texto: String(i + 1),
      posicion: posicionDePlaca(i, placas),
      poste: posteDeLaPlaca(i, placas),
    })),
    ...Array.from({ length: puestos }, (_, i) => ({
      clave: `puesto-${i}`,
      tipo: 'puesto',
      etapa: 'acabado',
      indice: i,
      texto: `P${i + 1}`,
      posicion: posicionDePuesto(i, puestos),
      poste: posteDelPuesto(i, puestos),
    })),
  ]

  return (
    <group>
      <RotuloDeAccion placas={placas} puestos={puestos} />
      {todos.map(({ clave, tipo, etapa, indice, texto, posicion, poste }, i) => {
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
              onPointerOver={(evento) => alSenalar(evento, etapa, indice)}
              onPointerOut={() => alSoltar(etapa, indice)}
              onClick={(evento) => alPulsar(evento, etapa, indice)}
              onPointerDown={(evento) => alBajar(evento, etapa, indice)}
              onPointerUp={(evento) => alLevantar(evento, etapa, indice)}
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
              <mesh
                ref={(nodo) => {
                  resaltados.current[i] = nodo
                }}
                geometry={formas.resaltado}
                material={esPlaca ? materiales.resaltadoLavado : materiales.resaltadoAcabado}
                position={[0, 0.002, 0]}
                visible={false}
              />
              <mesh
                ref={(nodo) => {
                  barreras.current[i] = nodo
                }}
                geometry={formas.barrera}
                material={materiales.piezas}
                position={POSICION_DE_LA_BARRERA}
                visible={false}
              />
              <mesh
                ref={(nodo) => {
                  conos.current[i] = nodo
                }}
                geometry={formas.cono}
                material={materiales.piezas}
                position={POSICION_DEL_CONO}
                visible={false}
              />
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
              position={[poste.x, 0, poste.z]}
              scale={[poste.escala, 1, poste.escala]}
            />
            <Rotulo
              position={[
                poste.x,
                (esPlaca ? ALTO_DEL_POSTE_DE_PLACA : ALTO_DEL_POSTE_DE_PUESTO) + 0.1 + ALTO_DEL_ROTULO / 2,
                poste.z,
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
 * El rótulo «Cerrar placa 3» / «Abrir placa 3» sobre el servidor señalado. Solo se
 * vuelve a pintar cuando cambia el servidor señalado o lo que se puede hacer con él.
 */
function RotuloDeAccion({ placas, puestos }) {
  const senalado = useServidorSenalado((estado) => estado.senalado)
  const texto = useSimulacion((estado) =>
    senalado
      ? textoDelRotulo({
          etapa: senalado.etapa,
          indice: senalado.indice,
          estados: senalado.etapa === 'lavado' ? estado.resumen.estadosDePlacas : estado.resumen.estadosDePuestos,
          enLaVisita: estado.modo === MODO_VISITA,
          enCorridaLarga: estado.corridaLarga !== null,
        })
      : null,
  )
  if (!senalado || !texto) {
    return null
  }
  const [x, , z] =
    senalado.etapa === 'lavado'
      ? posicionDePlaca(senalado.indice, placas)
      : posicionDePuesto(senalado.indice, puestos)
  return (
    <Rotulo
      position={[x, ALTO_DEL_ROTULO_DE_ACCION, z]}
      pixeles={PIXELES_DEL_ROTULO_DE_ACCION}
      encima
      sinSalirse
      ancla={[0.5, 0]}
    >
      {texto}
    </Rotulo>
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
