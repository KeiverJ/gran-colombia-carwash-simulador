import { MOTO } from './posiciones.js'
import { ALTO_DE_LA_MARCA, EJE_DE_RUEDA, RADIO_DE_RUEDA } from './recursosDeMoto.js'

/**
 * Una moto armada con figuras simples: dos ruedas, el cuerpo, el asiento y el
 * manubrio, más el indicador de su plan encima.
 *
 * Mira hacia la **Z positiva**, que es el frente del local. Quien la mueva le
 * gira el grupo entero con `rotation.y`, y así apunta hacia donde avanza.
 *
 * Las figuras y los colores no se crean aquí: vienen de `recursosDeMoto.js`,
 * creados una sola vez y compartidos entre todas las motos dibujadas.
 *
 * @param {object} props
 * @param {object} props.recursos los compartidos, de `crearRecursosDeMoto`
 * @param {Function} props.grupoRef para mover la moto sin pasar por React
 */
export function Moto({ recursos, grupoRef }) {
  const { geometrias, marcas, materiales } = recursos
  // El orden de las piezas importa: `pintarMoto` cuenta con él.
  return (
    <group ref={grupoRef} visible={false}>
      <mesh
        geometry={geometrias.rueda}
        material={materiales.pieza}
        position={[0, RADIO_DE_RUEDA, EJE_DE_RUEDA]}
        rotation={[0, 0, Math.PI / 2]}
      />
      <mesh
        geometry={geometrias.rueda}
        material={materiales.pieza}
        position={[0, RADIO_DE_RUEDA, -EJE_DE_RUEDA]}
        rotation={[0, 0, Math.PI / 2]}
      />
      <mesh geometry={geometrias.cuerpo} material={materiales[2]} position={[0, 0.52, 0]} />
      <mesh
        geometry={geometrias.asiento}
        material={materiales.asiento}
        position={[0, 0.74, -0.25]}
      />
      <mesh
        geometry={geometrias.manubrio}
        material={materiales.pieza}
        position={[0, 0.88, MOTO.largo / 2 - 0.43]}
      />
      <mesh geometry={marcas[2]} material={materiales[2]} position={[0, ALTO_DE_LA_MARCA, 0]} />
    </group>
  )
}

export default Moto
