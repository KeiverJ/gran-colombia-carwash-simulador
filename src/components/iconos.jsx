/**
 * Los íconos de la interfaz, como SVG propios: ninguna dependencia nueva.
 * Son decorativos (`aria-hidden`): el nombre accesible lo lleva el botón que
 * los contiene.
 */

const propiedades = {
  width: 20,
  height: 20,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': 'true',
  focusable: 'false',
}

export function IconoDeAjustes() {
  return (
    <svg {...propiedades}>
      <line x1="4" y1="6" x2="20" y2="6" />
      <line x1="4" y1="12" x2="20" y2="12" />
      <line x1="4" y1="18" x2="20" y2="18" />
      <circle cx="9" cy="6" r="2" fill="currentColor" />
      <circle cx="15" cy="12" r="2" fill="currentColor" />
      <circle cx="8" cy="18" r="2" fill="currentColor" />
    </svg>
  )
}

export function IconoDeResultados() {
  return (
    <svg {...propiedades}>
      <line x1="4" y1="20" x2="20" y2="20" />
      <rect x="5" y="11" width="3" height="9" fill="currentColor" />
      <rect x="10.5" y="5" width="3" height="15" fill="currentColor" />
      <rect x="16" y="9" width="3" height="11" fill="currentColor" />
    </svg>
  )
}

export function IconoDeAyuda() {
  return (
    <svg {...propiedades}>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9.5a2.5 2.5 0 1 1 3.6 2.2c-.7.4-1.1.9-1.1 1.8" />
      <circle cx="12" cy="17" r="0.8" fill="currentColor" />
    </svg>
  )
}

export function IconoDeReiniciar() {
  return (
    <svg {...propiedades}>
      <path d="M4 12a8 8 0 1 0 2.4-5.7" />
      <polyline points="4 4 4 9 9 9" />
    </svg>
  )
}

export function IconoDeCerrar() {
  return (
    <svg {...propiedades}>
      <line x1="6" y1="6" x2="18" y2="18" />
      <line x1="18" y1="6" x2="6" y2="18" />
    </svg>
  )
}

export function IconoDeFlecha({ haciaArriba }) {
  return (
    <svg {...propiedades} width={16} height={16}>
      <polyline points={haciaArriba ? '6 15 12 9 18 15' : '6 9 12 15 18 9'} />
    </svg>
  )
}

export function IconoDeAdvertencia() {
  return (
    <svg {...propiedades} width={16} height={16}>
      <path d="M12 3.5 22 20.5H2L12 3.5Z" />
      <line x1="12" y1="10" x2="12" y2="14.5" />
      <circle cx="12" cy="17.5" r="0.6" fill="currentColor" />
    </svg>
  )
}

export function IconoDeError() {
  return (
    <svg {...propiedades} width={16} height={16}>
      <circle cx="12" cy="12" r="9" />
      <line x1="12" y1="7.5" x2="12" y2="13" />
      <circle cx="12" cy="16.5" r="0.6" fill="currentColor" />
    </svg>
  )
}

export function IconoDeInformacion() {
  return (
    <svg {...propiedades} width={16} height={16}>
      <circle cx="12" cy="12" r="9" />
      <line x1="12" y1="11" x2="12" y2="16.5" />
      <circle cx="12" cy="7.8" r="0.6" fill="currentColor" />
    </svg>
  )
}

export function IconoDePantallaCompleta() {
  return (
    <svg {...propiedades}>
      <polyline points="4 9 4 4 9 4" />
      <polyline points="15 4 20 4 20 9" />
      <polyline points="20 15 20 20 15 20" />
      <polyline points="9 20 4 20 4 15" />
    </svg>
  )
}
