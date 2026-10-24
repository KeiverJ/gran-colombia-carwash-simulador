import { useSimulacion } from '../store/simulacion.js'
import { comoReloj } from './formato.js'

/** Un servidor: una placa de lavado o un puesto de acabado. */
function Servidor({ numero, moto, libre }) {
  return (
    <div className={libre ? 'servidor libre' : 'servidor ocupado'}>
      <span className="servidor-numero">{numero}</span>
      <span className="servidor-estado">
        {libre ? 'libre' : `moto ${moto.n} · plan ${moto.plan}`}
      </span>
    </div>
  )
}

/** Cuántas motos esperan en una fila. */
function Fila({ nombre, motos }) {
  return (
    <p className="fila">
      {nombre}: <strong>{motos.length}</strong>{' '}
      {motos.length === 1 ? 'moto esperando' : 'motos esperando'}
    </p>
  )
}

export function VistaDelLavadero() {
  const foto = useSimulacion((estado) => estado.foto)

  return (
    <section className="lavadero">
      <h2>El lavadero</h2>
      <p className="reloj">
        Tiempo simulado: <strong>{comoReloj(foto.relojMin)}</strong>
      </p>

      <h3>Etapa 1: lavado</h3>
      <Fila nombre="Fila para el lavado" motos={foto.colaLavado} />
      <div className="servidores">
        {foto.placas.map((placa) => (
          <Servidor key={placa.numero} {...placa} />
        ))}
      </div>

      <h3>Etapa 2: acabado</h3>
      <Fila nombre="Fila para el acabado" motos={foto.colaAcabado} />
      <div className="servidores">
        {foto.puestos.map((puesto) => (
          <Servidor key={puesto.numero} {...puesto} />
        ))}
      </div>

      <p className="nota">
        Han llegado {foto.motosLlegadas} motos y han salido {foto.motosSalidas}.
      </p>
    </section>
  )
}

export default VistaDelLavadero
