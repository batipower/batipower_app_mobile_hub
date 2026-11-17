import { errorMessage } from '@/features/preparation/components/ListState';

/** Message d'erreur affichable d'une exception de l'API (équivalent du `getApiErrorMessage` du web). */
export const getApiErrorMessage = (error: unknown, fallback: string): string =>
  errorMessage(error, fallback);
