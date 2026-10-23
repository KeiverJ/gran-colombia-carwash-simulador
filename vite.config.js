import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // El repositorio se publica en https://keiverj.github.io/gran-colombia-carwash-simulador/
  // así que los recursos deben pedirse desde esa subcarpeta.
  base: '/gran-colombia-carwash-simulador/',
  test: {
    // El motor de simulación es JavaScript puro: las pruebas corren con Node,
    // sin navegador. Las funciones de Vitest se importan explícitamente.
    environment: 'node',
    include: ['src/**/*.test.js', 'src/**/*.test.jsx'],
  },
})
