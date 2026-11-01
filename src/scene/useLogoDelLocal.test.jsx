import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { ESTADO_DEL_LOGO, useLetreroDelLocal, useLogoDelLocal } from './useLogoDelLocal.js'

function Sonda() {
  const { estado, logo } = useLogoDelLocal()
  return <p data-estado={estado} data-logo={String(logo)} />
}

function SondaDelLetrero() {
  const { estado, logo } = useLetreroDelLocal()
  return <p data-estado={estado} data-logo={String(logo)} />
}

describe('useLetreroDelLocal', () => {
  it('arranca en «cargando», sin letrero', () => {
    const html = renderToStaticMarkup(<SondaDelLetrero />)
    expect(html).toContain(`data-estado="${ESTADO_DEL_LOGO.cargando}"`)
    expect(html).toContain('data-logo="null"')
  })
})

describe('useLogoDelLocal', () => {
  it('arranca en «cargando», sin logo', () => {
    const html = renderToStaticMarkup(<Sonda />)
    expect(html).toContain(`data-estado="${ESTADO_DEL_LOGO.cargando}"`)
    expect(html).toContain('data-logo="null"')
  })

  it('tiene los tres estados', () => {
    expect(Object.values(ESTADO_DEL_LOGO).sort()).toEqual(['cargando', 'fallo', 'listo'])
  })
})
