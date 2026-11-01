import { useEffect, useMemo } from 'react'

import { COLOR_DE_ESCENA } from '../estilos/colores.js'
import { useSimulacion } from '../store/simulacion.js'
import { NIVELES_DE_CALIDAD, useCalidad } from './calidad.js'
import { geometriaDeLosCharcos, repartoDeLosCharcos } from './charcos.js'

/**
 * Los charcos del piso mojado: **una sola malla** de óvalos irregulares con un
 * material liso (casi sin rugosidad) que refleja el cielo del entorno. Su reparto
 * sale de `charcos.js` y se rehace cuando cambia el número de placas o de puestos.
 * Es quieto: no depende del reloj, así que no tiene nada que congelar en pausa.
 *
 * A calidad baja (nivel 3) se oculta, sin desmontarse.
 */
export function Charcos() {
  const placas = useSimulacion((estado) => estado.parametros.placas)
  const puestos = useSimulacion((estado) => estado.parametros.puestos)
  const visible = useCalidad((estado) => NIVELES_DE_CALIDAD[estado.nivel].charcos)
  const geometria = useMemo(() => geometriaDeLosCharcos(repartoDeLosCharcos(placas, puestos)), [placas, puestos])
  useEffect(() => () => geometria.dispose(), [geometria])

  return (
    <mesh geometry={geometria} visible={visible}>
      <meshStandardMaterial color={COLOR_DE_ESCENA.cieloHorizonte} metalness={0.2} roughness={0.05} />
    </mesh>
  )
}

export default Charcos
