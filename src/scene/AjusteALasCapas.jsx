import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'

import { duracionDeLaVariable } from '../components/usePresencia.js'
import { categoriaDeAncho, useInterfaz } from '../store/interfaz.js'
import { elevacionDeVista, encuadreParaLasCapas, VISTA_INICIAL } from './camara.js'
import { funcionDeLaCurva } from './curva.js'

/**
 * La capa de Ajustes (a la izquierda) y el panel de Resultados (abajo) flotan
 * encima del lienzo 3D y no lo achican. Este componente, que vive dentro del
 * lienzo y no dibuja nada, hace que la imagen se acomode a lo que dejan libre.
 *
 * En cada cuadro mide con `getBoundingClientRect` cuánto del lienzo tapan. Ese
 * rectángulo incluye el `transform` de la animación CSS, así que el encuadre se
 * mueve con la misma duración y la misma curva que ellos, sin temporizadores
 * propios; y con "reducir movimiento" aparecen de golpe y el encuadre también.
 *
 * Además de lo que tapan las capas se descuentan solo dos cosas: la fila de
 * controles de arriba y el panel de indicadores (que se apoya sobre el panel
 * de Resultados). Con esa medida pide a la cámara un `setViewOffset` (ver
 * `camara.js`): no mueve la cámara ni la gira, solo decide en qué parte del
 * lienzo se dibuja el cuadro. Lo que la persona haya girado o acercado a mano
 * no se toca, y los botones de vista siguen llevando a las mismas posiciones.
 *
 * Cada cuadro se hace en tres pasos: primero todas las lecturas del diseño (lo
 * que tapan las capas, la fila de arriba, los indicadores), después los
 * cálculos y al final las escrituras (las variables de CSS y la cámara). Así el
 * navegador calcula el diseño una sola vez por cuadro.
 *
 * Mientras se arrastra el borde del panel el encuadre se queda quieto (el
 * panel cambia de alto en cada cuadro, pero la cámara no se recalcula); al
 * soltar, o con un doble clic o una flecha del teclado, pasa al nuevo encuadre
 * con una transición de la misma duración y curva que las capas.
 *
 * También escribe `--capa-izquierda` y `--capa-inferior` (los píxeles que cubre
 * cada una en ese instante) en la zona de la escena, para que los botones de
 * cámara, la leyenda, los indicadores y el propio panel se muevan y se centren
 * en el área libre a la vez que la imagen.
 *
 * En celular no hay capas ni panel encima (la hoja inferior no tapa la
 * escena): no se hace nada y se limpia lo que hubiera. A pantalla completa no
 * se ven, así que tampoco cuentan.
 */

const CAPA_DE_AJUSTES = 'capa-de-ajustes'
const PANEL_DE_RESULTADOS = 'panel-de-resultados'

/** Con menos que esto de diferencia (en píxeles) no vale la pena volver a calcular. */
const DIFERENCIA_MINIMA_PX = 0.25

/** Hueco entre el panel de indicadores y lo que tiene debajo, igual que en el CSS. */
const SEPARACION_DE_LOS_INDICADORES_PX = 8
/** Un poco de aire entre los controles flotantes y el local. */
const AIRE_PX = 4

/** Cuántos píxeles del lienzo tapa la capa de Ajustes ahora mismo, con su animación a medias incluida. */
function cuantoTapaLaCapa(lienzo) {
  const capa = document.getElementById(CAPA_DE_AJUSTES)
  if (!capa) {
    return 0
  }
  const caja = capa.getBoundingClientRect()
  if (caja.width === 0) {
    return 0
  }
  return Math.min(Math.max(caja.right - lienzo.left, 0), lienzo.width)
}

/** Cuántos píxeles del lienzo tapa el panel de Resultados por abajo (la barra plegada ya cuenta). */
function cuantoTapaElPanel(lienzo) {
  const panel = document.getElementById(PANEL_DE_RESULTADOS)
  if (!panel) {
    return 0
  }
  const caja = panel.getBoundingClientRect()
  return Math.min(Math.max(lienzo.bottom - caja.top, 0), lienzo.height)
}

const cambio = (anterior, actual) =>
  anterior === null || Math.abs(anterior - actual) >= DIFERENCIA_MINIMA_PX

const CLAVES_DEL_ENCUADRE = ['fullWidth', 'fullHeight', 'offsetX', 'offsetY']

const sonIguales = (a, b) =>
  a !== null &&
  b !== null &&
  CLAVES_DEL_ENCUADRE.every((clave) => !cambio(a[clave], b[clave])) &&
  a.width === b.width &&
  a.height === b.height

/** El punto de un encuadre entre `desde` y `hasta`, con `avance` de 0 a 1. */
const mezclar = (desde, hasta, avance) => {
  const resultado = { ...hasta }
  for (const clave of CLAVES_DEL_ENCUADRE) {
    resultado[clave] = desde[clave] + (hasta[clave] - desde[clave]) * avance
  }
  return resultado
}

/**
 * Lee del diseño todo lo que el cuadro necesita, de una sola vez y sin escribir
 * nada: así el navegador calcula el diseño una vez por cuadro y no una por cada
 * lectura que viene después de una escritura.
 */
function leerElDiseno(lienzo, hayCapas, necesitaElEncuadre) {
  const caja = lienzo.getBoundingClientRect()
  const izquierda = hayCapas ? cuantoTapaLaCapa(caja) : 0
  const panel = hayCapas ? cuantoTapaElPanel(caja) : 0
  const fila = necesitaElEncuadre ? document.querySelector('.flotante-superior') : null
  const indicadores = necesitaElEncuadre ? document.querySelector('.indicadores-panel') : null
  return {
    caja,
    izquierda,
    panel,
    arriba: fila ? Math.max(fila.getBoundingClientRect().bottom - caja.top, 0) + AIRE_PX : 0,
    altoDeLosIndicadores: indicadores ? indicadores.offsetHeight : 0,
  }
}

export function AjusteALasCapas() {
  const aplicado = useRef(null)
  const variables = useRef({ izquierda: null, inferior: null })
  const transicion = useRef(null)
  const versionVista = useRef(useInterfaz.getState().ajustesDelPanel)

  useFrame(({ camera, gl, controls }) => {
    const lienzo = gl.domElement
    const zona = lienzo.closest('.zona-lienzo')
    if (!zona) {
      return
    }

    // ---- 1. Todas las lecturas del diseño y del estilo, antes de escribir nada.
    const interfaz = useInterfaz.getState()
    const enCelular = categoriaDeAncho(interfaz.ancho) === 'celular'
    const aPantallaCompleta = Boolean(document.fullscreenElement) || Boolean(lienzo.closest('.escena--expandida'))
    const hayCapas = !enCelular && !aPantallaCompleta
    const encuadrar = !enCelular && !interfaz.arrastrandoElPanel
    const { caja, izquierda, panel, arriba, altoDeLosIndicadores } = leerElDiseno(lienzo, hayCapas, encuadrar)
    if (caja.width === 0 || caja.height === 0) {
      return
    }
    const cambioElAlto = interfaz.ajustesDelPanel !== versionVista.current
    const duracion = encuadrar && cambioElAlto ? duracionDeLaVariable('--duracion-media') : 0
    const curva =
      duracion > 0 ? getComputedStyle(document.documentElement).getPropertyValue('--curva-entrada') : ''

    // ---- 2. Los cálculos, que no tocan el diseño.
    const abajo = panel + SEPARACION_DE_LOS_INDICADORES_PX + altoDeLosIndicadores + AIRE_PX
    const objetivo = controls?.target?.toArray?.() ?? VISTA_INICIAL.objetivo
    const meta = encuadrar
      ? encuadreParaLasCapas({
          ancho: caja.width,
          alto: caja.height,
          izquierda,
          arriba,
          abajo,
          elevacion: elevacionDeVista({ posicion: camera.position.toArray(), objetivo }),
        })
      : null

    // ---- 3. Todas las escrituras, al final.
    if (cambio(variables.current.izquierda, izquierda)) {
      variables.current.izquierda = izquierda
      zona.style.setProperty('--capa-izquierda', `${izquierda}px`)
    }
    if (cambio(variables.current.inferior, panel)) {
      variables.current.inferior = panel
      zona.style.setProperty('--capa-inferior', `${panel}px`)
    }

    if (enCelular) {
      if (aplicado.current !== null) {
        aplicado.current = null
        transicion.current = null
        camera.clearViewOffset()
      }
      return
    }

    // Mientras se arrastra el borde del panel el encuadre no se toca.
    if (!meta) {
      return
    }

    // Un cambio de alto que no sigue una animación de CSS (soltar el arrastre,
    // doble clic, flechas) pasa al nuevo encuadre con una transición.
    const ahora = performance.now()
    if (cambioElAlto) {
      versionVista.current = interfaz.ajustesDelPanel
      if (aplicado.current !== null && duracion > 0) {
        transicion.current = {
          inicio: ahora,
          duracion,
          desde: aplicado.current,
          curva: funcionDeLaCurva(curva),
        }
      }
    }

    let encuadre = meta
    const en = transicion.current
    if (en) {
      const progreso = (ahora - en.inicio) / en.duracion
      if (progreso >= 1) {
        transicion.current = null
      } else {
        encuadre = mezclar(en.desde, meta, en.curva(progreso))
      }
    }

    if (sonIguales(aplicado.current, encuadre)) {
      return
    }
    aplicado.current = encuadre
    camera.setViewOffset(
      encuadre.fullWidth,
      encuadre.fullHeight,
      encuadre.offsetX,
      encuadre.offsetY,
      encuadre.width,
      encuadre.height,
    )
  })

  return null
}

export default AjusteALasCapas
