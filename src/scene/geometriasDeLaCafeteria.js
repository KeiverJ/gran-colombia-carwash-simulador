import { BoxGeometry, CylinderGeometry } from 'three'

import { COLOR_DE_ESCENA } from '../estilos/colores.js'
import {
  CAFETERIA,
  MESAS,
  MOSTRADOR,
  OBJETOS_DEL_MOSTRADOR,
  SILLAS,
} from './cafeteria.js'
import { conColor, juntar } from './geometriasDelEntorno.js'

/**
 * Las formas de la cafetería hechas en código, con formas facetadas y colores
 * planos (el mismo estilo de las motos): el cuerpo con sus ventanas, el techo, el
 * toldo, el tanque de agua negro, el mostrador con la cafetera, las mesas y las
 * sillas. Todo va **junto en una sola geometría de color de vértice**: una sola
 * llamada de dibujo. Medidas en el mundo (los datos salen de `cafeteria.js`).
 *
 * La caja registradora y la nevera son modelos (`POS Machine` y `Can Fridge`); el
 * letrero lleva el logo. Esos no están aquí.
 */

const { x0, x1, zCuerpo, zFondo, zToldo, altoDelCuerpo, altoDelTecho, vueloDelTecho, tanque } = CAFETERIA
const ANCHO = x1 - x0
const CENTRO_X = (x0 + x1) / 2

/** Una caja con su centro en (x, y, z). */
const cajaEn = (ancho, alto, fondo, x, y, z, color) => conColor(new BoxGeometry(ancho, alto, fondo).translate(x, y, z), color)

/** Las ventanas de adelante: dos paños oscuros que sobresalen un dedo de la pared. */
function ventanas() {
  const alto = 1.25
  const ancho = 1.5
  return [-1.7, 1.7].map((dx) =>
    cajaEn(ancho, alto, 0.06, CENTRO_X + dx, 1.55, zCuerpo - 0.02, COLOR_DE_ESCENA.sillaDeCafeteria),
  )
}

/** El cuerpo, su zócalo, el techo y las ventanas. */
function cuerpo() {
  return [
    cajaEn(ANCHO, altoDelCuerpo, zFondo - zCuerpo, CENTRO_X, altoDelCuerpo / 2, (zCuerpo + zFondo) / 2, COLOR_DE_ESCENA.cafeteria),
    // El zócalo: una franja baja y un poco más oscura al pie de la pared de adelante.
    cajaEn(ANCHO + 0.02, 0.4, 0.06, CENTRO_X, 0.2, zCuerpo - 0.02, COLOR_DE_ESCENA.mostrador),
    cajaEn(
      ANCHO + 2 * vueloDelTecho,
      altoDelTecho,
      zFondo - zCuerpo + 2 * vueloDelTecho,
      CENTRO_X,
      altoDelCuerpo + altoDelTecho / 2,
      (zCuerpo + zFondo) / 2,
      COLOR_DE_ESCENA.techo,
    ),
    ...ventanas(),
  ]
}

/**
 * El toldo: una lámina inclinada que sale de la pared de adelante y baja hacia el
 * frente, azul de la marca con una tira amarilla en el borde. No tiene postes
 * delante: se sostiene de la pared con tirantes (así no estorba la vista de quien
 * está sentado debajo).
 */
function toldo() {
  const largo = zCuerpo - zToldo
  const subida = CAFETERIA.altoDelToldoAtras - CAFETERIA.altoDelToldoAdelante
  const angulo = Math.atan2(subida, largo)
  const centroY = (CAFETERIA.altoDelToldoAtras + CAFETERIA.altoDelToldoAdelante) / 2
  const lamina = conColor(
    new BoxGeometry(ANCHO + 2 * vueloDelTecho, CAFETERIA.grosorDelToldo, Math.hypot(largo, subida))
      .rotateX(angulo)
      .translate(CENTRO_X, centroY, (zCuerpo + zToldo) / 2),
    COLOR_DE_ESCENA.paredAzul,
  )
  const tira = conColor(
    new BoxGeometry(ANCHO + 2 * vueloDelTecho, 0.22, 0.05).translate(CENTRO_X, CAFETERIA.altoDelToldoAdelante - 0.1, zToldo + 0.02),
    COLOR_DE_ESCENA.franjaDePared,
  )
  const tirantes = [x0 - 0.05, x1 + 0.05].map((x) =>
    conColor(
      new CylinderGeometry(0.025, 0.025, Math.hypot(largo, 0.9), 6)
        .rotateX(Math.PI / 2 + Math.atan2(0.9, largo))
        .translate(x, CAFETERIA.altoDelToldoAtras - 0.45, (zCuerpo + zToldo) / 2),
      COLOR_DE_ESCENA.metal,
    ),
  )
  return [lamina, tira, ...tirantes]
}

/** El tanque de agua negro sobre el techo, con sus patas y su tapa. */
function tanqueDeAgua() {
  const baseY = altoDelCuerpo + altoDelTecho
  const patas = [-1, 1].flatMap((dx) =>
    [-1, 1].map((dz) =>
      cajaEn(0.08, 0.2, 0.08, tanque.x + dx * (tanque.radio - 0.12), baseY + 0.1, tanque.z + dz * (tanque.radio - 0.12), COLOR_DE_ESCENA.metal),
    ),
  )
  const cuerpoDelTanque = conColor(
    new CylinderGeometry(tanque.radio, tanque.radio, tanque.alto - 0.3, 12).translate(tanque.x, baseY + 0.2 + (tanque.alto - 0.3) / 2, tanque.z),
    COLOR_DE_ESCENA.tanqueDeAgua,
  )
  const tapa = conColor(
    new CylinderGeometry(tanque.radio * 0.55, tanque.radio * 0.9, 0.1, 12).translate(tanque.x, baseY + tanque.alto - 0.05, tanque.z),
    COLOR_DE_ESCENA.tanqueDeAgua,
  )
  return [...patas, cuerpoDelTanque, tapa]
}

/** El mostrador con su tapa y la cafetera encima. */
function mostrador() {
  const largo = MOSTRADOR.x1 - MOSTRADOR.x0
  const fondo = MOSTRADOR.z1 - MOSTRADOR.z0
  const centroX = (MOSTRADOR.x0 + MOSTRADOR.x1) / 2
  const centroZ = (MOSTRADOR.z0 + MOSTRADOR.z1) / 2
  const { cafetera } = OBJETOS_DEL_MOSTRADOR
  return [
    cajaEn(largo, MOSTRADOR.alto, fondo, centroX, MOSTRADOR.alto / 2, centroZ, COLOR_DE_ESCENA.mostrador),
    cajaEn(largo + 0.08, MOSTRADOR.grosorDeLaTapa, fondo + 0.08, centroX, MOSTRADOR.alto + MOSTRADOR.grosorDeLaTapa / 2, centroZ, COLOR_DE_ESCENA.mesaDeCafeteria),
    // La cafetera: un cuerpo oscuro con una jarra encima y una pieza al frente.
    cajaEn(0.34, 0.42, 0.3, cafetera.x, cafetera.y + 0.21, cafetera.z, COLOR_DE_ESCENA.sillaDeCafeteria),
    conColor(new CylinderGeometry(0.1, 0.1, 0.16, 8).translate(cafetera.x, cafetera.y + 0.5, cafetera.z), COLOR_DE_ESCENA.tanqueDeAgua),
    cajaEn(0.2, 0.05, 0.08, cafetera.x, cafetera.y + 0.12, cafetera.z - 0.18, COLOR_DE_ESCENA.metal),
  ]
}

/** Las mesas (un disco facetado sobre un pie) y las sillas (asiento y respaldo) a los dos lados de cada una. */
function mesasYSillas() {
  const piezas = []
  for (const [x, z] of MESAS.centros) {
    piezas.push(
      conColor(new CylinderGeometry(MESAS.radio, MESAS.radio, 0.05, 10).translate(x, MESAS.alto, z), COLOR_DE_ESCENA.mesaDeCafeteria),
      conColor(new CylinderGeometry(0.05, 0.07, MESAS.alto - 0.03, 8).translate(x, (MESAS.alto - 0.03) / 2, z), COLOR_DE_ESCENA.metal),
      conColor(new CylinderGeometry(0.22, 0.24, 0.03, 8).translate(x, 0.015, z), COLOR_DE_ESCENA.metal),
    )
    for (const lado of [-1, 1]) {
      const zSilla = z + lado * SILLAS.separacionDeLaMesa
      piezas.push(
        cajaEn(SILLAS.lado, 0.05, SILLAS.lado, x, SILLAS.alto - 0.025, zSilla, COLOR_DE_ESCENA.sillaDeCafeteria),
        // El respaldo, del lado de afuera de la mesa.
        cajaEn(SILLAS.lado, 0.42, 0.04, x, SILLAS.alto + 0.21, zSilla + lado * (SILLAS.lado / 2 - 0.02), COLOR_DE_ESCENA.sillaDeCafeteria),
        ...[-1, 1].flatMap((dx) =>
          [-1, 1].map((dz) =>
            cajaEn(0.04, SILLAS.alto - 0.05, 0.04, x + (dx * (SILLAS.lado - 0.06)) / 2, (SILLAS.alto - 0.05) / 2, zSilla + (dz * (SILLAS.lado - 0.06)) / 2, COLOR_DE_ESCENA.metal),
          ),
        ),
      )
    }
  }
  return piezas
}

/** El tablero del letrero que va sobre el techo, con sus dos patas. */
function tableroDelLetrero() {
  const { letrero } = CAFETERIA
  const baseY = altoDelCuerpo + altoDelTecho
  const centroY = baseY + letrero.sobreElTecho + letrero.alto / 2
  return [
    cajaEn(letrero.ancho, letrero.alto, 0.1, CENTRO_X, centroY, letrero.z, COLOR_DE_ESCENA.letreroDelLocal),
    ...[-1, 1].map((lado) =>
      cajaEn(0.08, letrero.sobreElTecho + 0.02, 0.08, CENTRO_X + lado * (letrero.ancho / 2 - 0.4), baseY + letrero.sobreElTecho / 2, letrero.z, COLOR_DE_ESCENA.metal),
    ),
  ]
}

/** Todo lo que se hace en código de la cafetería, en una sola geometría de color de vértice. */
export function geometriaDeLaCafeteria() {
  return juntar([...cuerpo(), ...toldo(), ...tanqueDeAgua(), ...mostrador(), ...mesasYSillas(), ...tableroDelLetrero()])
}
