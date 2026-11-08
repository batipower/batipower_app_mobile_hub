import type { AnalyzeRequest } from '../socket/types';

/** Même demande d'analyse, avec « forcer » : ré-analyse (`reanalyze`) ou ligne de trace catalogue (`catalogue`). */
export function withForce(request: AnalyzeRequest, force: 'reanalyze' | 'catalogue'): AnalyzeRequest {
  const flag = force === 'reanalyze' ? { forceReanalyze: true } : { forceCatalogue: true };
  return request.start.type === 'ebat'
    ? { ...request, start: { type: 'ebat', payload: { ...request.start.payload, ...flag } } }
    : { ...request, start: { type: 'ean', payload: { ...request.start.payload, ...flag } } };
}
