import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

import { CREDITOS_DE_AMBIENTE, CREDITOS_DE_MODELOS } from '../data/creditosDeModelos.js'

const README = readFileSync('README.md', 'utf8')

describe('los créditos del README', () => {
  it('nombran a los 15 modelos de ambiente con su autor, su licencia y su enlace', () => {
    for (const { titulo, autor, licencia, url } of CREDITOS_DE_AMBIENTE) {
      expect(README, `${titulo} de ${autor}`).toContain(`[${titulo}](${url}) de ${autor} ([${licencia}]`)
    }
  })

  it('siguen nombrando a las seis motos', () => {
    for (const { titulo, autor, url } of CREDITOS_DE_MODELOS) {
      expect(README, `${titulo} de ${autor}`).toContain(`[${titulo}](${url}) de ${autor}`)
    }
  })

  it('no dicen «por confirmar» ni nombran los modelos que no se usan', () => {
    expect(README.toLowerCase()).not.toContain('por confirmar')
    expect(README).not.toContain('fbDxapxkwY9')
    expect(README.toLowerCase()).not.toContain('macross')
  })

  it('coinciden con la Ayuda: los mismos 21 enlaces de Poly Pizza', () => {
    const enlaces = README.match(/https:\/\/poly\.pizza\/m\/[\w-]+/g) ?? []
    expect(new Set(enlaces).size).toBe(CREDITOS_DE_MODELOS.length + CREDITOS_DE_AMBIENTE.length)
  })
})

describe('los archivos de los modelos', () => {
  it('existen los de las motos y los de ambiente', () => {
    for (const { archivo } of CREDITOS_DE_MODELOS) expect(existsSync(`public/modelos/${archivo}`)).toBe(true)
    for (const { archivo } of CREDITOS_DE_AMBIENTE) expect(existsSync(`public/modelos/ambiente/${archivo}`)).toBe(true)
  })
})

describe('las imágenes y los enlaces del README', () => {
  // Las imágenes de `![...](ruta)` y las de `<img src="ruta">`.
  const imagenes = [
    ...[...README.matchAll(/!\[[^\]]*\]\(([^)\s]+)\)/g)].map((m) => m[1]),
    ...[...README.matchAll(/<img\b[^>]*\bsrc="([^"]+)"/g)].map((m) => m[1]),
  ]

  it('hay capturas', () => {
    expect(imagenes.filter((ruta) => ruta.startsWith('capturas/')).length).toBeGreaterThanOrEqual(12)
  })

  it('cada imagen existe y es una captura de capturas/ o el logo de public/', () => {
    for (const ruta of imagenes) {
      expect(ruta, ruta).toMatch(/^(capturas|public)\//)
      expect(existsSync(ruta), `no existe ${ruta}`).toBe(true)
    }
  })

  it('cada captura de capturas/ se usa en el README', () => {
    for (const archivo of readdirSync('capturas')) {
      expect(imagenes, `capturas/${archivo} no está en el README`).toContain(`capturas/${archivo}`)
    }
  })

  it('las copias de capturas/ pesan menos de 400 KB', () => {
    for (const archivo of readdirSync('capturas')) {
      expect(statSync(`capturas/${archivo}`).size, archivo).toBeLessThan(400 * 1024)
    }
  })

  it('no nombra carpetas que no se suben a GitHub', () => {
    for (const carpeta of ['docs/', 'openspec/', 'modelos-candidatos', '.claude/', 'CLAUDE.md']) {
      expect(README, carpeta).not.toContain(carpeta)
    }
  })

  it('enlaza a la licencia MIT y el archivo existe', () => {
    expect(README).toContain('[licencia MIT](LICENSE)')
    expect(readFileSync('LICENSE', 'utf8')).toContain('Copyright (c) 2026 Keiver Esneid Castellanos Julio')
    expect(readFileSync('LICENSE', 'utf8')).toMatch(/^MIT License/)
  })

  it('el enlace a la aplicación publicada apunta a GitHub Pages del repositorio', () => {
    expect(README).toContain('https://keiverj.github.io/gran-colombia-carwash-simulador/')
  })

  it('cada enlace interno de la tabla de contenidos tiene su sección', () => {
    const titulos = [...README.matchAll(/^##+ (.+)$/gm)].map((m) =>
      m[1]
        .toLowerCase()
        .replace(/[^\p{L}\p{N}\s-]/gu, '')
        .trim()
        .replace(/\s/g, '-'),
    )
    const enlaces = [...README.matchAll(/\]\(#([^)]+)\)/g)].map((m) => m[1])
    expect(enlaces.length).toBeGreaterThan(10)
    for (const enlace of enlaces) expect(titulos, `#${enlace}`).toContain(enlace)
  })
})
