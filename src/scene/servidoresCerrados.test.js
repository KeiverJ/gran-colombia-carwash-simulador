import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import { COLORES_COMPARTIDOS } from '../estilos/colores.js'

/**
 * `Servidores.jsx` es un componente de R3F y estas pruebas corren con Node, sin
 * WebGL: lo que se puede comprobar aquí es que las formas y los materiales
 * nuevos se crean en el mismo sitio que los demás, y que ese sitio los suelta
 * todos al desmontar la escena.
 */
const fuente = readFileSync('src/scene/Servidores.jsx', 'utf8')

describe('la losa cerrada y la señal de cerrándose se liberan con la escena', () => {
  it('la barrera y el cono nacen junto a las demás formas', () => {
    const formas = fuente.slice(fuente.indexOf('function useFormasDeLosas'), fuente.indexOf('function useMaterialesDeLosas'))
    expect(formas).toContain('barrera: barreraDeCierre(')
    expect(formas).toContain('cono: conoDeCierre(')
  })

  it('todas las formas y todos los materiales se sueltan al desmontar', () => {
    expect(fuente).toContain('Object.values(formas).forEach((forma) => forma.dispose())')
    expect(fuente).toContain('Object.values(materiales).forEach((material) => material.dispose())')
  })

  it('el material de la losa cerrada sale de un color compartido del tema', () => {
    expect(fuente).toContain('COLOR_DE_ESCENA.losaCerrada')
    expect(COLORES_COMPARTIDOS['escena-losa-cerrada']).toBeDefined()
    expect(COLORES_COMPARTIDOS['escena-barrera-de-cierre']).toBeDefined()
  })

  it('las gotas de agua también caen en una placa que se está cerrando con su moto', () => {
    const gotas = readFileSync('src/scene/Particulas.jsx', 'utf8')
    expect(gotas).toContain('estaLevantada(estados[i])')
  })
})
