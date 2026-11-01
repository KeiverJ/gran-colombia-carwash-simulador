import { DynamicDrawUsage, InstancedMesh, Matrix4 } from 'three'

const AUXILIAR = new Matrix4()

/**
 * Dibuja un modelo de ambiente **por instancias**: una malla instanciada por
 * cada pieza del modelo (tienen una o dos), de modo que 20 copias cuestan las
 * mismas llamadas de dibujo que una. Las copias se escriben a mano cada cuadro
 * (o una vez, para lo que no se mueve), como las motos.
 *
 * Lo decorativo no recibe clics (`raycast` no hace nada) y proyecta sombra si
 * se pide. Las formas y los materiales son los del modelo cargado, que
 * comparten todas las piezas de la escena: `liberar` suelta solo las matrices
 * de las instancias; las formas, los materiales y las texturas los suelta la
 * carga de modelos (`cargaDeAmbiente().liberar()`).
 *
 * @param {{ piezas: Array<{ geometry: object, material: object, local: object }> }} modelo
 * @param {number} capacidad  Cuántas copias caben como máximo.
 * @param {{ proyectaSombra?: boolean, recibeSombra?: boolean }} [opciones]
 */
export function crearInstanciasDeAmbiente(
  modelo,
  capacidad,
  { proyectaSombra = true, recibeSombra = false } = {},
) {
  const piezas = modelo.piezas.map(({ geometry, material, local }) => {
    const malla = new InstancedMesh(geometry, material, capacidad)
    // El cuerpo de la primera copia está en el origen: sin esto se recortaría.
    malla.frustumCulled = false
    malla.castShadow = proyectaSombra
    malla.receiveShadow = recibeSombra
    malla.raycast = () => {}
    malla.instanceMatrix.setUsage(DynamicDrawUsage)
    malla.count = 0
    return { malla, local }
  })

  return {
    /** Las mallas instanciadas, para montarlas en la escena. */
    mallas: piezas.map(({ malla }) => malla),
    capacidad,
    /** Pone la copia `i` en `matriz` (el sitio del objeto; la pieza se compone con su sitio dentro del modelo). */
    poner(i, matriz) {
      for (const { malla, local } of piezas) {
        malla.setMatrixAt(i, AUXILIAR.multiplyMatrices(matriz, local))
      }
    },
    /** Cuántas copias se dibujan (de la 0 a la `cantidad - 1`). */
    fijar(cantidad) {
      const n = Math.max(0, Math.min(capacidad, cantidad))
      for (const { malla } of piezas) {
        malla.count = n
        malla.instanceMatrix.needsUpdate = true
      }
    },
    /** Muestra u oculta todas las copias (para la calidad adaptable). */
    mostrar(visible) {
      for (const { malla } of piezas) malla.visible = visible
    },
    /** Cuántas llamadas de dibujo cuesta ahora (una por pieza, si hay copias y se ve). */
    llamadasDeDibujo() {
      return piezas.filter(({ malla }) => malla.visible && malla.count > 0).length
    },
    /** Suelta las matrices de las instancias. */
    liberar() {
      for (const { malla } of piezas) malla.dispose()
    },
  }
}
