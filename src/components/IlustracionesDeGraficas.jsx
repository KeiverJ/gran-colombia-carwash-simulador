/**
 * Las ilustraciones sencillas de las gráficas vacías: unas líneas, unas barras y una moto.
 *
 * Son dibujos decorativos (`aria-hidden`): el mensaje que va al lado dice qué falta. Los
 * colores salen de las clases de `graficas.css` (que toman las variables del tema), no
 * están escritos aquí, y no llevan degradados.
 */

const propiedades = {
  className: 'ilustracion',
  viewBox: '0 0 120 64',
  fill: 'none',
  strokeWidth: 2.5,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': 'true',
  focusable: 'false',
}

/** Dos líneas que suben y bajan sobre unos ejes: las dos filas en el tiempo. */
export function IlustracionDeLineas() {
  return (
    <svg {...propiedades}>
      <polyline className="ilustracion-eje" points="10,6 10,56 112,56" />
      <polyline className="ilustracion-serie-1" points="14,44 32,30 50,38 68,18 88,26 108,12" />
      <polyline className="ilustracion-serie-2" points="14,50 32,46 50,48 68,38 88,42 108,34" />
    </svg>
  )
}

/** Cuatro barras de distinta altura sobre una base: la ocupación y el tiempo promedio. */
export function IlustracionDeBarras() {
  return (
    <svg {...propiedades}>
      <line className="ilustracion-eje" x1="10" y1="56" x2="112" y2="56" />
      <rect className="ilustracion-relleno-1" x="18" y="30" width="16" height="26" rx="2" />
      <rect className="ilustracion-relleno-2" x="42" y="14" width="16" height="42" rx="2" />
      <rect className="ilustracion-relleno-1" x="66" y="38" width="16" height="18" rx="2" />
      <rect className="ilustracion-relleno-2" x="90" y="22" width="16" height="34" rx="2" />
    </svg>
  )
}

/** Una moto de perfil: el tiempo de cada moto en el lavadero. */
export function IlustracionDeMoto() {
  return (
    <svg {...propiedades}>
      <line className="ilustracion-eje" x1="6" y1="56" x2="114" y2="56" />
      <circle className="ilustracion-moto" cx="30" cy="44" r="10" />
      <circle className="ilustracion-moto" cx="90" cy="44" r="10" />
      <path className="ilustracion-moto" d="M30 44 L46 30 H68 L90 44" />
      <path className="ilustracion-moto" d="M68 30 L80 18 H90" />
      <path className="ilustracion-moto" d="M44 28 H58" />
      <path className="ilustracion-serie-1" d="M46 30 L56 44 H76" />
    </svg>
  )
}

/** Las ilustraciones por nombre, para pedirlas desde el marco con `ilustracion="lineas"`. */
export const ILUSTRACIONES = {
  lineas: IlustracionDeLineas,
  barras: IlustracionDeBarras,
  moto: IlustracionDeMoto,
}
