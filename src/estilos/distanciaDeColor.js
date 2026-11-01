/**
 * Distancia entre dos colores, en el espacio Lab (CIE 1976, iluminante D65).
 *
 * Sirve para comprobar que el paisaje de la escena (cielo, ropa, vegetación,
 * objetos hechos en código) no se parece a un color con significado: las
 * etapas, los planes, el ámbar de las advertencias y el rojo de los errores.
 * Una distancia de 2,3 es la mínima que se nota a simple vista; entre colores
 * claramente distintos pasa de 20. JavaScript puro, sin acceso al DOM.
 */

/** Pasa un color `#rrggbb` a sus componentes lineales de 0 a 1. */
function aLineal(hex) {
  return [1, 3, 5].map((i) => {
    const v = Number.parseInt(hex.slice(i, i + 2), 16) / 255
    return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
  })
}

const BLANCO_D65 = [0.95047, 1, 1.08883]

/** Un color `#rrggbb` en Lab: `[L, a, b]`, con L de 0 a 100. */
export function hexALab(hex) {
  const [r, g, b] = aLineal(hex)
  const xyz = [
    0.4124564 * r + 0.3575761 * g + 0.1804375 * b,
    0.2126729 * r + 0.7151522 * g + 0.072175 * b,
    0.0193339 * r + 0.119192 * g + 0.9503041 * b,
  ]
  const [fx, fy, fz] = xyz.map((valor, i) => {
    const t = valor / BLANCO_D65[i]
    return t > 216 / 24389 ? Math.cbrt(t) : (24389 / 27 * t + 16) / 116
  })
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)]
}

/** La distancia entre dos colores `#rrggbb`. */
export function distanciaDeColor(a, b) {
  const [l1, a1, b1] = hexALab(a)
  const [l2, a2, b2] = hexALab(b)
  return Math.hypot(l1 - l2, a1 - a2, b1 - b2)
}

/**
 * Los colores de `paisaje` (`{ nombre: '#rrggbb' }`) que se parecen demasiado a
 * alguno de `reservados`, es decir, a menos de `minimo` de distancia. Devuelve
 * `[{ nombre, reservado, distancia }]`, uno por cada pareja que falla.
 */
export function coloresQueUsurpan(paisaje, reservados, minimo) {
  const fallos = []
  for (const [nombre, color] of Object.entries(paisaje)) {
    for (const [reservado, colorReservado] of Object.entries(reservados)) {
      const distancia = distanciaDeColor(color, colorReservado)
      if (distancia < minimo) fallos.push({ nombre, reservado, distancia })
    }
  }
  return fallos
}
