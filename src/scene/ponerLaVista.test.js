import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { PerspectiveCamera } from 'three'
import { describe, expect, it } from 'vitest'

import { BOTONES_DE_VISTA, vistaDeLaClave } from './camara.js'
import { ponerLaVista, soltarElImpulso } from './ponerLaVista.js'

/**
 * Después de mover la cámara con el ratón o con los dedos, cada botón de vista tiene que
 * devolverla exactamente a su sitio, y quedarse ahí: el amortiguado de `OrbitControls` no
 * puede seguir corriéndola con lo que quedó del arrastre.
 *
 * Se usa el `OrbitControls` de verdad, con un elemento y un documento de mentira que solo
 * guardan los oyentes para poder mandarles los eventos del puntero.
 */

const PANTALLAS = [
  ['1366 × 768', 1366, 768],
  ['390 × 844', 390, 844],
]

function elementoFalso(ancho, alto) {
  const oyentes = new Map()
  const guardar = {
    addEventListener: (tipo, f) => oyentes.set(tipo, [...(oyentes.get(tipo) ?? []), f]),
    removeEventListener: (tipo, f) => oyentes.set(tipo, (oyentes.get(tipo) ?? []).filter((g) => g !== f)),
    emitir: (tipo, evento) => (oyentes.get(tipo) ?? []).forEach((f) => f({ preventDefault() {}, stopPropagation() {}, ...evento })),
  }
  const documento = { ...guardar }
  const elemento = {
    ...guardar,
    clientWidth: ancho,
    clientHeight: alto,
    style: {},
    ownerDocument: documento,
    getRootNode: () => documento,
    setPointerCapture() {},
    releasePointerCapture() {},
    hasPointerCapture: () => true,
    getBoundingClientRect: () => ({ left: 0, top: 0, width: ancho, height: alto }),
  }
  return { elemento, documento }
}

function montar(ancho, alto) {
  const camara = new PerspectiveCamera(48, ancho / alto, 0.1, 1000)
  const { elemento, documento } = elementoFalso(ancho, alto)
  const control = new OrbitControls(camara, elemento)
  control.enableDamping = true
  control.screenSpacePanning = true
  return { camara, control, elemento, documento }
}

/** Arrastra con el clic derecho (desplaza) y suelta, como lo hace el ratón. */
function desplazarConElClicDerecho({ control, elemento, documento }, dx, dy) {
  const base = { pointerId: 1, pointerType: 'mouse', button: 2, buttons: 2, ctrlKey: false, metaKey: false, shiftKey: false }
  elemento.emitir('pointerdown', { ...base, clientX: 600, clientY: 400 })
  for (let paso = 1; paso <= 6; paso += 1) {
    documento.emitir('pointermove', { ...base, clientX: 600 + (dx * paso) / 6, clientY: 400 + (dy * paso) / 6 })
    control.update()
  }
  documento.emitir('pointerup', { ...base, buttons: 0 })
}

/** Arrastra con dos dedos juntos (desplaza) y suelta, como en el celular. */
function desplazarConDosDedos({ control, elemento, documento }, dx, dy) {
  const dedo = (id, x, y) => ({ pointerId: id, pointerType: 'touch', button: 0, buttons: 1, clientX: x, clientY: y })
  elemento.emitir('pointerdown', dedo(1, 150, 400))
  elemento.emitir('pointerdown', dedo(2, 230, 400))
  for (let paso = 1; paso <= 6; paso += 1) {
    const corrido = (valor) => (valor * paso) / 6
    documento.emitir('pointermove', dedo(1, 150 + corrido(dx), 400 + corrido(dy)))
    documento.emitir('pointermove', dedo(2, 230 + corrido(dx), 400 + corrido(dy)))
    control.update()
  }
  documento.emitir('pointerup', { ...dedo(1, 150 + dx, 400 + dy), buttons: 0 })
  documento.emitir('pointerup', { ...dedo(2, 230 + dx, 400 + dy), buttons: 0 })
}

const redondeado = (v) => v.map((c) => Math.round(c * 1e6) / 1e6)

describe.each(PANTALLAS)('al volver a una vista tras desplazar la cámara, a %s', (_nombre, ancho, alto) => {
  const aspecto = ancho / alto
  const gestos = [
    ['con el clic derecho', desplazarConElClicDerecho],
    ['con dos dedos', desplazarConDosDedos],
  ]

  it.each(gestos)('el desplazamiento %s de verdad mueve la cámara (la prueba no es vacía)', (_n, gesto) => {
    const montaje = montar(ancho, alto)
    ponerLaVista(montaje.control, vistaDeLaClave('general', aspecto))
    const antes = montaje.control.target.toArray()
    gesto(montaje, 120, -80)
    for (let i = 0; i < 3; i += 1) montaje.control.update()
    expect(redondeado(montaje.control.target.toArray())).not.toEqual(redondeado(antes))
  })

  describe.each(gestos)('después de desplazar %s', (_n, gesto) => {
    it.each(BOTONES_DE_VISTA.map(({ clave, nombre }) => [nombre, clave]))(
      '«%s» deja la cámara exactamente en su vista y no se corre después',
      (_nombre, clave) => {
        const montaje = montar(ancho, alto)
        const { control, camara } = montaje
        ponerLaVista(control, vistaDeLaClave('planta', aspecto))
        gesto(montaje, 160, -110)
        // La persona suelta el ratón y el amortiguado todavía tiene resto: se pide la vista en pleno impulso.
        control.update()

        const vista = vistaDeLaClave(clave, aspecto)
        soltarElImpulso(control)
        ponerLaVista(control, vista)

        expect(redondeado(camara.position.toArray())).toEqual(redondeado(vista.posicion))
        expect(redondeado(control.target.toArray())).toEqual(redondeado(vista.objetivo))
        // Pasan varios cuadros más y la cámara sigue en el mismo sitio.
        for (let i = 0; i < 30; i += 1) control.update()
        expect(redondeado(camara.position.toArray())).toEqual(redondeado(vista.posicion))
        expect(redondeado(control.target.toArray())).toEqual(redondeado(vista.objetivo))
      },
    )
  })

  it('sin soltar el impulso, el resto del arrastre sí correría la cámara (por eso existe soltarElImpulso)', () => {
    const montaje = montar(ancho, alto)
    const { control } = montaje
    ponerLaVista(control, vistaDeLaClave('planta', aspecto))
    desplazarConElClicDerecho(montaje, 160, -110)
    const vista = vistaDeLaClave('general', aspecto)
    // Colocar la vista a mano, sin descargar el impulso, y dejar correr los cuadros.
    control.object.position.set(...vista.posicion)
    control.target.set(...vista.objetivo)
    for (let i = 0; i < 30; i += 1) control.update()
    expect(redondeado(control.target.toArray())).not.toEqual(redondeado(vista.objetivo))
  })
})

describe('soltarElImpulso', () => {
  it('deja el amortiguado como estaba', () => {
    const { control } = montar(1366, 768)
    control.enableDamping = true
    soltarElImpulso(control)
    expect(control.enableDamping).toBe(true)
    control.enableDamping = false
    soltarElImpulso(control)
    expect(control.enableDamping).toBe(false)
  })
})
