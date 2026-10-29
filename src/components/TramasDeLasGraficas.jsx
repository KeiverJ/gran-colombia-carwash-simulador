import { COLOR_DE_OCUPADO, COLOR_DE_RESERVADO } from '../estilos/colores.js'

/**
 * Las tramas de rayas que distinguen las barras sin depender del color: la
 * espera de cada etapa (tono suave del color de la etapa con rayas del color
 * pleno) y las motos de la visita que salieron sin puesto.
 *
 * Se definen una sola vez, en un SVG que no ocupa sitio, y las barras de
 * Recharts y las muestras de las leyendas las usan por su id.
 */
export const TRAMA_DE_ESPERA = {
  lavado: 'trama-de-espera-lavado',
  acabado: 'trama-de-espera-acabado',
}
export const TRAMA_SIN_PUESTO = 'trama-sin-puesto'

function Trama({ id, fondo, raya }) {
  return (
    <pattern id={id} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
      <rect width="6" height="6" fill={fondo} />
      <rect width="2.5" height="6" fill={raya} />
    </pattern>
  )
}

export function TramasDeLasGraficas() {
  return (
    <svg className="grafica-tramas" aria-hidden="true" focusable="false">
      <defs>
        <Trama id={TRAMA_DE_ESPERA.lavado} fondo={COLOR_DE_RESERVADO.lavado} raya={COLOR_DE_OCUPADO.lavado} />
        <Trama id={TRAMA_DE_ESPERA.acabado} fondo={COLOR_DE_RESERVADO.acabado} raya={COLOR_DE_OCUPADO.acabado} />
        <Trama id={TRAMA_SIN_PUESTO} fondo={COLOR_DE_RESERVADO.acabado} raya={COLOR_DE_OCUPADO.acabado} />
      </defs>
    </svg>
  )
}

/** Una muestra de la leyenda: `relleno` es un color o `url(#trama)`. */
export function MuestraDeLaLeyenda({ relleno }) {
  return (
    <svg className="grafica-muestra" viewBox="0 0 16 12" aria-hidden="true" focusable="false">
      <rect width="16" height="12" fill={relleno} />
    </svg>
  )
}
