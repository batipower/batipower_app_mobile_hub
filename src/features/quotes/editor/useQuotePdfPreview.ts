import { useCallback, useState } from 'react';
import { toast } from 'sonner-native';

import { downloadQuotePdf } from '@/api/hubCustomerQuotes';
import { errorMessage } from '@/features/preparation/components/ListState';
import { openLocalFile } from '@/lib/openAttachment';

import { useQuoteEditor } from './QuoteEditorProvider';

/**
 * Aperçu du PDF du devis : l'état affiché est d'abord enregistré (le serveur génère le PDF depuis
 * la base), puis le fichier est téléchargé et ouvert dans l'aperçu natif (Quick Look), d'où le
 * commercial peut aussi le partager.
 */
export function useQuotePdfPreview() {
  const { state, derived, saveQuote } = useQuoteEditor();
  const [generating, setGenerating] = useState(false);

  const preview = useCallback(async () => {
    if (!state.quoteId) {
      toast.error("Enregistrez le devis avant d'afficher le PDF.");
      return;
    }
    setGenerating(true);
    try {
      // Un devis verrouillé est déjà en base : rien à enregistrer avant de générer le PDF.
      if (!derived.readOnly) {
        const saved = await saveQuote();
        if (!saved) return;
      }
      const file = await downloadQuotePdf(state.quoteId, state.quoteReference);
      await openLocalFile(file, state.quoteReference ? `Devis ${state.quoteReference}` : 'Devis');
    } catch (e) {
      toast.error(errorMessage(e, 'Impossible de générer le PDF'));
    } finally {
      setGenerating(false);
    }
  }, [state.quoteId, state.quoteReference, derived.readOnly, saveQuote]);

  return { preview, generating };
}
