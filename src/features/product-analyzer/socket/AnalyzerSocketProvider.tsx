import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';

import { useReserveHeartbeat } from '@/features/product-analyzer/hooks/useReserveHeartbeat';

import { AnalyzerEngine } from './analyzerEngine';

const EngineContext = createContext<AnalyzerEngine | null>(null);

/**
 * Monte le moteur d'analyse pour toute la pile Product Analyzer : une seule connexion socket,
 * partagée par l'analyse unitaire, la file et le bandeau « Analyse en cours » de l'historique.
 * Gère aussi le cycle de vie de l'app : à l'arrière-plan les lignes de réserve sont rendues,
 * au retour elles sont reprises et la connexion rétablie.
 */
export function AnalyzerSocketProvider({ children }: { children: ReactNode }) {
  const [engine] = useState(() => new AnalyzerEngine());

  useEffect(() => {
    void engine.connect();
    return () => engine.dispose();
  }, [engine]);

  const wasBackground = useRef(false);
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (status) => {
      if (status === 'background') {
        wasBackground.current = true;
        void engine.onBackground();
      } else if (status === 'active' && wasBackground.current) {
        wasBackground.current = false;
        void engine.onForeground();
      }
    });
    return () => subscription.remove();
  }, [engine]);

  useReserveHeartbeat({ getUuids: engine.getReserveUuids, onLost: engine.handleReserveLost });

  return <EngineContext.Provider value={engine}>{children}</EngineContext.Provider>;
}

export function useAnalyzerEngine(): AnalyzerEngine {
  const engine = useContext(EngineContext);
  if (!engine) throw new Error("AnalyzerSocketProvider manquant dans l'arbre.");
  return engine;
}
