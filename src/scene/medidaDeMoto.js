import { Box3, Vector3 } from 'three'

const PUNTO = new Vector3()

/**
 * Lo que mide una moto dibujada con `piezas` (`{ geometry, local }`), en el
 * sitio que ocupa dentro de la moto:
 * - `centroX` y `centroZ`: el centro de su caja vista desde arriba, que es donde
 *   va el aro del piso (no el origen del modelo, que
 *   puede estar en otro sitio);
 * - `alto`: su punto más alto.
 *
 * Se mide sobre los vértices, ya con la escala y el traslado de cada pieza.
 */
export function medirPiezas(piezas) {
  const caja = new Box3()
  for (const { geometry, local } of piezas) {
    const posiciones = geometry.attributes.position
    for (let i = 0; i < posiciones.count; i += 1) {
      caja.expandByPoint(PUNTO.fromBufferAttribute(posiciones, i).applyMatrix4(local))
    }
  }
  if (caja.isEmpty()) return { centroX: 0, centroZ: 0, alto: 0 }
  return {
    centroX: (caja.min.x + caja.max.x) / 2,
    centroZ: (caja.min.z + caja.max.z) / 2,
    alto: caja.max.y,
  }
}
