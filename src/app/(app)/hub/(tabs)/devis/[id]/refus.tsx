import { RefuseSheet } from '@/features/quotes/request/RefuseSheet';
import { useQuoteEditor } from '@/features/quotes/editor/QuoteEditorProvider';

/** Refus du devis en cours d'édition : l'identifiant vient de l'éditeur (le segment peut valoir `nouveau`). */
export default function QuoteRefusalRoute() {
  const { state, reload } = useQuoteEditor();
  return <RefuseSheet target="QUOTE" targetId={state.quoteId ?? undefined} onRefused={() => void reload()} />;
}
