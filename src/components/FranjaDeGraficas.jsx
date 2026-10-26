import { useInterfaz } from '../store/interfaz.js'
import { useSimulacion } from '../store/simulacion.js'
import GraficaDeColas from './GraficaDeColas.jsx'
import { IconoDeFlecha } from './iconos.jsx'
import { usePresencia } from './usePresencia.js'

/**
 * La franja de gráficas de debajo de la escena. Empieza plegada para que la
 * escena arranque con todo el alto; su botón es siempre visible y lleva texto
 * ("Mostrar gráficas" / "Ocultar gráficas"), nunca un ícono suelto.
 *
 * Cómo se anima sin redibujar el lienzo 3D en cada cuadro: el lienzo cambia de
 * tamaño UNA vez al abrir (el cuerpo reserva su alto de golpe) y UNA vez al
 * terminar de cerrar (se suelta ese alto). Entre las dos, la gráfica entra y
 * sale deslizándose con `transform` y `opacity`, recortada por el cuerpo.
 * Animar el alto obligaría a recalcular y repintar el 3D en cada cuadro.
 *
 * Sin datos todavía, la franja es una sola línea con el aviso en vez de un
 * cuerpo alto y vacío.
 */
export function FranjaDeGraficas() {
  const plegada = useInterfaz((estado) => estado.franjaPlegada)
  const alternarFranja = useInterfaz((estado) => estado.alternarFranja)
  const hayGrafica = useSimulacion((estado) => estado.puntos.length >= 2)
  const { montada, fase } = usePresencia(!plegada)

  return (
    <section className="franja" aria-label="Gráficas de las filas">
      <button
        type="button"
        className="franja-boton"
        aria-expanded={!plegada}
        aria-controls="franja-cuerpo"
        onClick={alternarFranja}
      >
        <IconoDeFlecha haciaArriba={plegada} />
        <span>{plegada ? 'Mostrar gráficas' : 'Ocultar gráficas'}</span>
      </button>
      {montada ? (
        <div
          id="franja-cuerpo"
          className={hayGrafica ? 'franja-cuerpo' : 'franja-cuerpo franja-cuerpo--vacia'}
        >
          <div className={`franja-contenido franja-contenido--${fase}`}>
            <GraficaDeColas alto="100%" conTitulo={false} />
          </div>
        </div>
      ) : null}
    </section>
  )
}

export default FranjaDeGraficas
