import { Component } from 'react'

/**
 * Atrapa los errores de dibujo de lo que envuelve y muestra otra cosa en su lugar,
 * para que un fallo en una parte no deje toda la pantalla en blanco.
 *
 * React solo permite hacer esto con un componente de clase. No lleva dependencias.
 *
 * @param {object} props
 * @param {(datos: { error: Error, reintentar: () => void }) => any} props.fallback
 *   lo que se muestra cuando algo lanza; `reintentar` vuelve a intentar dibujar lo de antes
 * @param {(error: Error) => void} [props.alFallar] se llama una vez por fallo, para anotarlo
 */
export class LimiteDeError extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error) {
    this.props.alFallar?.(error)
  }

  reintentar = () => {
    this.setState({ error: null })
  }

  render() {
    const { error } = this.state
    if (error === null) {
      return this.props.children
    }
    return this.props.fallback({ error, reintentar: this.reintentar })
  }
}

export default LimiteDeError
