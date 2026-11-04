import { useMemo } from 'react'

import { armarResultados } from '../experimentos/lote.js'
import { useExperimentos } from './experimentos.js'

/** Los resultados del último lote, armados con lo que haya llegado (también si se canceló). */
export function useResultadosDeExperimentos() {
  const solicitud = useExperimentos((e) => e.solicitudDelLote)
  const acumulado = useExperimentos((e) => e.acumulado)
  return useMemo(() => (solicitud ? armarResultados(solicitud, acumulado) : null), [solicitud, acumulado])
}
