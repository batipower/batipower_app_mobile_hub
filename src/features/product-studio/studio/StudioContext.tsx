import { createContext, useContext, type ReactNode } from 'react';

import { useProductStudio, type ProductStudioController } from '../hooks/useProductStudio';

const StudioCtx = createContext<ProductStudioController | null>(null);

/** Fournit le contrôleur du Studio d'une fiche (un provider par référence). */
export function StudioProvider({
  reference,
  onDeployQueued,
  children,
}: {
  reference: string;
  onDeployQueued?: () => void;
  children: ReactNode;
}) {
  const studio = useProductStudio(reference, true, { onDeployQueued });
  return <StudioCtx.Provider value={studio}>{children}</StudioCtx.Provider>;
}

export function useStudio(): ProductStudioController {
  const studio = useContext(StudioCtx);
  if (!studio) throw new Error('useStudio doit être utilisé dans un StudioProvider');
  return studio;
}
