import { Matrix4, Quaternion, Vector3 } from 'three'

import { COLOR_DE_ESCENA, PALETA_DE_ROPA } from '../estilos/colores.js'

/**
 * Las personas de la escena: un esqueleto de once piezas facetadas con
 * proporciones de adulto (la cabeza mide 1/7,6 de la altura), en tres posturas:
 * **de pie**, **sentada** y **lavando** (un brazo extendido con manguera o con
 * trapo). El movimiento es sutil: un balanceo de unos grados, con el reloj
 * simulado (en pausa, quieto).
 *
 * Es una función pura que devuelve, para cada pieza de una persona, su matriz
 * y su color. La escena (`Personas.jsx`) dibuja **una malla instanciada por tipo
 * de pieza**, con el color por instancia, así que las llamadas de dibujo no
 * crecen con el número de personas. No pide números aleatorios a nadie: la ropa
 * y el balanceo de cada persona salen de su número.
 *
 * Medidas en metros, con los pies en y = 0 y la persona mirando a +Z (`rumbo` 0).
 */

/** La altura de un adulto y de su cabeza (de 1/7 a 1/8 de la altura: sin cabezas de caricatura). */
export const ALTURA_DE_LA_PERSONA = 1.75
export const ALTO_DE_LA_CABEZA = 0.23

/** Los tipos de pieza, en el orden en que se dibujan. */
export const TIPOS_DE_PIEZA = ['torso', 'pelvis', 'muslo', 'pantorrilla', 'bota', 'brazo', 'cabeza', 'gorra', 'accesorio']

/** Las posturas. */
export const POSTURAS = { dePie: 'de pie', sentada: 'sentada', lavando: 'lavando' }

/** Lo que mide cada parte: ancho, alto y fondo (el largo de un miembro es su `alto`). */
const MEDIDAS = {
  pelvis: [0.34, 0.17, 0.2],
  torso: [0.38, 0.5, 0.22],
  cabeza: [0.18, ALTO_DE_LA_CABEZA, 0.2],
  gorra: [0.2, 0.06, 0.26],
  bota: [0.14, 0.12, 0.27],
  grosorDelMuslo: 0.15,
  grosorDeLaPantorrilla: 0.13,
  grosorDelBrazo: 0.09,
}

const ALTO_DE_LA_BOTA = MEDIDAS.bota[1]
const CADERA_DE_PIE = 0.85
const LARGO_DEL_MUSLO = 0.42
const LARGO_DEL_BRAZO = 0.58
const SEPARACION_DE_LAS_PIERNAS = 0.09
const HOMBRO = { x: 0.23, y: 1.48 }
const ALTO_DEL_ASIENTO = 0.46

const VECTOR = new Vector3()
const QUATERNION = new Quaternion()
const ESCALA = new Vector3()
const EJE_X = new Vector3(1, 0, 0)
const EJE_Y = new Vector3(0, 1, 0)
const aRadianes = (grados) => (grados * Math.PI) / 180

/** Una matriz de rotación sobre X por `grados` y trasladada para que el giro sea sobre `pivote`. */
function girarSobre(pivote, grados) {
  const r = new Matrix4().makeRotationX(aRadianes(grados))
  return new Matrix4().makeTranslation(...pivote).multiply(r).multiply(new Matrix4().makeTranslation(-pivote[0], -pivote[1], -pivote[2]))
}

/** La matriz de una pieza con su centro en `centro` y su tamaño `medidas`. */
function pieza(centro, medidas, rotacionX = 0) {
  QUATERNION.setFromAxisAngle(EJE_X, aRadianes(rotacionX))
  return new Matrix4().compose(VECTOR.set(...centro), QUATERNION, ESCALA.set(...medidas))
}

/**
 * Un miembro que cuelga de un `pivote` y gira `grados` sobre X (0 cuelga recto hacia
 * abajo; −90° apunta hacia adelante, a +Z). `largo` y `grosor` son sus medidas.
 */
function miembro(pivote, largo, grosor, grados) {
  const a = aRadianes(grados)
  // El centro está a medio largo del pivote, en la dirección del miembro.
  const centro = [pivote[0], pivote[1] - (largo / 2) * Math.cos(a), pivote[2] - (largo / 2) * Math.sin(a)]
  return pieza(centro, [grosor, largo, grosor], grados)
}

/** Dónde acaba un miembro (la mano o la rodilla). */
const puntaDelMiembro = (pivote, largo, grados) => {
  const a = aRadianes(grados)
  return [pivote[0], pivote[1] - largo * Math.cos(a), pivote[2] - largo * Math.sin(a)]
}

/**
 * Los colores de una persona: `{ ropa, pantalon, piel, pelo, gorra, botas }`.
 * Un trabajador va de negro, con gorra y botas de caucho; un cliente, con ropa de la
 * paleta (sin rojo ni colores con significado) según su número.
 */
export function ropaDeLaPersona({ tipo, numero = 0 }) {
  if (tipo === 'trabajador') {
    return {
      ropa: COLOR_DE_ESCENA.ropaDeTrabajo,
      pantalon: COLOR_DE_ESCENA.ropaDeTrabajo,
      piel: [COLOR_DE_ESCENA.pielMedia, COLOR_DE_ESCENA.pielOscura, COLOR_DE_ESCENA.pielClara][numero % 3],
      pelo: COLOR_DE_ESCENA.peloOscuro,
      gorra: COLOR_DE_ESCENA.ropaDeTrabajo,
      botas: COLOR_DE_ESCENA.botasDeCaucho,
    }
  }
  const n = Math.abs(Math.trunc(numero))
  return {
    ropa: PALETA_DE_ROPA[n % PALETA_DE_ROPA.length],
    pantalon: PALETA_DE_ROPA[(n * 5 + 2) % PALETA_DE_ROPA.length],
    piel: [COLOR_DE_ESCENA.pielClara, COLOR_DE_ESCENA.pielMedia, COLOR_DE_ESCENA.pielOscura][(n * 7 + 1) % 3],
    pelo: [COLOR_DE_ESCENA.peloOscuro, COLOR_DE_ESCENA.peloCastano][n % 2],
    gorra: null,
    botas: COLOR_DE_ESCENA.sillaDeCafeteria,
  }
}

/**
 * Las piezas de una persona en su postura, listas para dibujar.
 *
 * @param {object} persona
 * @param {'de pie'|'sentada'|'lavando'} persona.postura
 * @param {number} persona.x  dónde está, en el mundo
 * @param {number} persona.z
 * @param {number} [persona.y]  la altura del suelo bajo sus pies
 * @param {number} [persona.rumbo]  hacia dónde mira, en radianes (0 mira a +Z)
 * @param {number} [persona.numero]  su número: de él salen la ropa y el desfase del balanceo
 * @param {'trabajador'|'cliente'} [persona.tipo]
 * @param {'manguera'|'trapo'} [persona.herramienta]  lo que sostiene cuando está lavando
 * @param {number} tiempo  segundos de animación (el reloj simulado): 0 o igual al anterior = quieta
 * @returns {Array<{ tipo: string, matriz: Matrix4, color: string }>}
 */
export function piezasDeLaPersona(persona, tiempo = 0) {
  const { postura, x, z, y = 0, rumbo = 0, numero = 0, tipo = 'cliente', herramienta = 'manguera' } = persona
  const colores = ropaDeLaPersona({ tipo, numero })
  const fase = tiempo * 2 * Math.PI * 0.7 + numero * 1.7
  const balanceo = Math.sin(fase)
  const contrabalanceo = Math.sin(fase + Math.PI)

  const piezas = []
  const poner = (tipoDePieza, matriz, color) => piezas.push({ tipo: tipoDePieza, matriz, color })

  // 1. Lo de abajo (pelvis y piernas) y lo de arriba (torso, cabeza, brazos) se calculan de pie, sin inclinar.
  let alturaDeLaCadera = CADERA_DE_PIE
  let inclinacion = 0
  if (postura === POSTURAS.sentada) {
    alturaDeLaCadera = ALTO_DEL_ASIENTO + MEDIDAS.grosorDelMuslo / 2
    inclinacion = 0
  } else if (postura === POSTURAS.lavando) {
    inclinacion = 14 + balanceo * 1.5
  }
  const pivoteDeLaCintura = [0, alturaDeLaCadera + MEDIDAS.pelvis[1] / 2, 0]
  const subir = girarSobre(pivoteDeLaCintura, inclinacion)
  const enElTorso = (matriz) => matriz.premultiply(subir)

  const alturaDeLaPelvis = alturaDeLaCadera + MEDIDAS.pelvis[1] / 2
  poner('pelvis', pieza([0, alturaDeLaPelvis, 0], MEDIDAS.pelvis), colores.pantalon)

  // Las piernas.
  for (const lado of [-1, 1]) {
    const xDeLaPierna = lado * SEPARACION_DE_LAS_PIERNAS
    const cadera = [xDeLaPierna, alturaDeLaCadera, 0]
    if (postura === POSTURAS.sentada) {
      // El muslo va horizontal hacia adelante, la pantorrilla cae a plomo hasta la bota.
      poner('muslo', miembro(cadera, LARGO_DEL_MUSLO, MEDIDAS.grosorDelMuslo, -90), colores.pantalon)
      const rodilla = puntaDelMiembro(cadera, LARGO_DEL_MUSLO, -90)
      const largo = rodilla[1] - ALTO_DE_LA_BOTA
      poner('pantorrilla', miembro(rodilla, largo, MEDIDAS.grosorDeLaPantorrilla, 0), colores.pantalon)
      poner('bota', pieza([xDeLaPierna, ALTO_DE_LA_BOTA / 2, rodilla[2] + MEDIDAS.bota[2] / 2 - 0.06], MEDIDAS.bota), colores.botas)
    } else {
      const abierta = postura === POSTURAS.lavando ? lado * 4 : 0
      poner('muslo', miembro(cadera, LARGO_DEL_MUSLO, MEDIDAS.grosorDelMuslo, 0), colores.pantalon)
      const rodilla = puntaDelMiembro(cadera, LARGO_DEL_MUSLO, 0)
      const largo = rodilla[1] - ALTO_DE_LA_BOTA
      poner('pantorrilla', miembro(rodilla, largo, MEDIDAS.grosorDeLaPantorrilla, 0), colores.pantalon)
      poner(
        'bota',
        pieza([xDeLaPierna + abierta * 0.01, ALTO_DE_LA_BOTA / 2, 0.04 + (postura === POSTURAS.lavando ? lado * 0.08 : 0)], MEDIDAS.bota),
        colores.botas,
      )
    }
  }

  // Lo de arriba: torso, cabeza, gorra o pelo y brazos, inclinados sobre la cintura si se lava.
  const alturaDelTorso = alturaDeLaPelvis + MEDIDAS.pelvis[1] / 2 + MEDIDAS.torso[1] / 2
  const balanceoDelTorso = postura === POSTURAS.dePie ? balanceo * 1.2 : postura === POSTURAS.sentada ? balanceo * 0.8 : 0
  const mecer = girarSobre(pivoteDeLaCintura, balanceoDelTorso)
  const arriba = (matriz) => enElTorso(matriz.premultiply(mecer))

  poner('torso', arriba(pieza([0, alturaDelTorso, 0], MEDIDAS.torso)), colores.ropa)
  const alturaDeLaCabeza = alturaDelTorso + MEDIDAS.torso[1] / 2 + MEDIDAS.cabeza[1] / 2 + 0.005
  poner('cabeza', arriba(pieza([0, alturaDeLaCabeza, 0.01], MEDIDAS.cabeza)), colores.piel)
  // La gorra de un trabajador, o el pelo (un casquete más bajo) de un cliente.
  const conGorra = colores.gorra !== null
  poner(
    'gorra',
    arriba(
      pieza(
        [0, alturaDeLaCabeza + MEDIDAS.cabeza[1] / 2 + (conGorra ? 0.01 : -0.02), conGorra ? 0.04 : 0],
        conGorra ? MEDIDAS.gorra : [0.2, 0.07, 0.22],
      ),
    ),
    conGorra ? colores.gorra : colores.pelo,
  )

  // Los brazos.
  const hombroY = alturaDelTorso + MEDIDAS.torso[1] / 2 - 0.05
  const [anguloIzquierdo, anguloDerecho] =
    postura === POSTURAS.lavando
      ? [-22 + contrabalanceo * 6, -58 + balanceo * 12]
      : postura === POSTURAS.sentada
        ? [-38 + balanceo * 2, -38 - balanceo * 2]
        : [balanceo * 4, contrabalanceo * 4]
  const brazos = [
    { lado: -1, grados: anguloIzquierdo },
    { lado: 1, grados: anguloDerecho },
  ]
  let accesorio = null
  for (const { lado, grados } of brazos) {
    const hombro = [lado * HOMBRO.x, hombroY, 0]
    poner('brazo', arriba(miembro(hombro, LARGO_DEL_BRAZO, MEDIDAS.grosorDelBrazo, grados)), colores.ropa)
    if (lado === 1) {
      // La manguera sigue la dirección del brazo; el trapo es un paño corto en la mano.
      const mano = puntaDelMiembro(hombro, LARGO_DEL_BRAZO, grados)
      const adelante = [0, -Math.cos(aRadianes(grados)), -Math.sin(aRadianes(grados))]
      accesorio =
        herramienta === 'trapo'
          ? pieza([mano[0], mano[1] - 0.03, mano[2] + 0.04], [0.14, 0.05, 0.2])
          : pieza(
              [mano[0], mano[1] + adelante[1] * 0.3, mano[2] + adelante[2] * 0.3],
              [0.035, 0.035, 0.6],
              90 + grados,
            )
    }
  }

  // La manguera o el trapo, en la mano derecha del que lava.
  if (postura === POSTURAS.lavando && accesorio) {
    poner('accesorio', arriba(accesorio), herramienta === 'trapo' ? COLOR_DE_ESCENA.mesaDeCafeteria : COLOR_DE_ESCENA.manguera)
  }

  // Y la persona entera: a su sitio y mirando a su rumbo.
  const colocar = new Matrix4().compose(VECTOR.set(x, y, z), QUATERNION.setFromAxisAngle(EJE_Y, rumbo), ESCALA.set(1, 1, 1))
  return piezas.map((p) => ({ ...p, matriz: new Matrix4().multiplyMatrices(colocar, p.matriz) }))
}

/** Cuántas piezas lleva una persona en cada postura (la que lava lleva una más: la manguera o el trapo). */
export const PIEZAS_POR_PERSONA = { [POSTURAS.dePie]: 12, [POSTURAS.sentada]: 12, [POSTURAS.lavando]: 13 }
