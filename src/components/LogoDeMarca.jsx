import { RUTA_DEL_LOGO } from '../data/logo.js'

/**
 * El logo del local, pequeño, para la barra superior y la Ayuda.
 *
 * Es decorativo: el nombre de la aplicación está escrito al lado, así que no
 * lleva texto alternativo y un lector de pantalla no lo anuncia dos veces.
 */
export function LogoDeMarca() {
  return <img className="logo-de-marca" src={RUTA_DEL_LOGO} alt="" width="48" height="32" />
}

export default LogoDeMarca
