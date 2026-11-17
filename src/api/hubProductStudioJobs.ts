import { apiClient } from '@/api/client';
import type {
  StudioBatchStatus,
  StudioBulkOutcome,
  StudioDeployOptions,
  StudioEstimateResponse,
  StudioJob,
  StudioJobCurrentResponse,
  StudioJobEnqueueResponse,
  StudioJobListResponse,
  StudioJobNotificationsResponse,
  StudioQueueOverview,
  StudioReviewResponse,
} from '@/types/hubStudioJobs';

/** Préfixe commun des requêtes de la file du Studio (invalidation d'un coup). */
export const STUDIO_JOBS_QUERY_KEY = ['product-studio-jobs'] as const;
export const studioJobKeys = {
  current: (reference: string) => [...STUDIO_JOBS_QUERY_KEY, 'current', reference] as const,
  notifications: () => [...STUDIO_JOBS_QUERY_KEY, 'notifications'] as const,
  queue: () => [...STUDIO_JOBS_QUERY_KEY, 'queue'] as const,
  review: () => [...STUDIO_JOBS_QUERY_KEY, 'review'] as const,
  batch: (batchId: string) => [...STUDIO_JOBS_QUERY_KEY, 'batch', batchId] as const,
  estimate: (references: string[]) => [...STUDIO_JOBS_QUERY_KEY, 'estimate', references] as const,
  list: (params: Record<string, unknown>) => [...STUDIO_JOBS_QUERY_KEY, 'list', params] as const,
};

const productBase = (reference: string) => `hub-app/products/${encodeURIComponent(reference)}/studio/jobs`;

/**
 * File d'attente du Product Studio : préparation IA et « Valider et déployer »
 * lancés en arrière-plan. L'identité du demandeur est toujours lue côté serveur.
 */
export const hubProductStudioJobsApi = {
  prepare: (reference: string) => apiClient.post<StudioJobEnqueueResponse>(`${productBase(reference)}/prepare`, {}),

  /** `forceGeo` : publie le GEO recalculé même si une intro plus riche est déjà en ligne. */
  deploy: (reference: string, options: StudioDeployOptions = {}) =>
    apiClient.post<StudioJobEnqueueResponse>(
      `${productBase(reference)}/deploy`,
      options.forceGeo ? { forceGeo: true } : {},
    ),

  /**
   * Prépare plusieurs fiches d'un coup (500 max par envoi). `autoDeploy` (SUPERADMIN) publie ensuite
   * automatiquement les fiches dont le contrôle préalable est « prête ». La réponse porte un `batchId` de suivi.
   */
  prepareBulk: (references: string[], options: { autoDeploy?: boolean } = {}) =>
    apiClient.post<StudioBulkOutcome>('hub-app/product-studio/jobs/prepare-bulk', {
      references,
      ...(options.autoDeploy ? { autoDeploy: true } : {}),
    }),

  /** Note actuelle et note après estimée (sans IA) d'une sélection, avec alertes de publication. */
  estimate: (references: string[], options: { signal?: AbortSignal } = {}) =>
    apiClient.post<StudioEstimateResponse>(
      'hub-app/product-studio/estimate',
      { references },
      { signal: options.signal },
    ),

  /** État d'un lancement groupé : étape et notes par fiche, compteurs. */
  batch: (batchId: string) =>
    apiClient.get<StudioBatchStatus>(`hub-app/product-studio/batches/${encodeURIComponent(batchId)}`),

  /**
   * Déploie les fiches « prêtes » (SUPERADMIN). `references` limite l'envoi à une sélection ;
   * chaque fiche est recontrôlée côté serveur juste avant sa mise en file.
   */
  deployReady: (options: { references?: string[]; limit?: number } = {}) =>
    apiClient.post<StudioBulkOutcome>('hub-app/product-studio/jobs/deploy-ready', options),

  current: (reference: string) => apiClient.get<StudioJobCurrentResponse>(`${productBase(reference)}/current`),

  list: (params: { status?: string; requestedBy?: string; limit?: number } = {}) =>
    apiClient.get<StudioJobListResponse>('hub-app/product-studio/jobs', {
      query: { status: params.status, requestedBy: params.requestedBy, limit: params.limit },
    }),

  /** Vue file complète : SUPERADMIN uniquement. */
  queue: () => apiClient.get<StudioQueueOverview>('hub-app/product-studio/queue'),

  /** Fiches préparées non appliquées ou appliquées non en ligne : SUPERADMIN uniquement. */
  review: () => apiClient.get<StudioReviewResponse>('hub-app/product-studio/review'),

  notifications: () => apiClient.get<StudioJobNotificationsResponse>('hub-app/product-studio/notifications'),

  markSeen: (body: { jobIds?: string[]; all?: boolean }) =>
    apiClient.post<{ updated: number }>('hub-app/product-studio/notifications/seen', body),

  cancel: (id: string) =>
    apiClient.post<{ job: StudioJob }>(`hub-app/product-studio/jobs/${encodeURIComponent(id)}/cancel`, {}),

  /** Écarte une fiche de « À traiter » (rien n'est supprimé) : SUPERADMIN uniquement. */
  dismissReview: (reference: string) =>
    apiClient.post<{ dismissed: boolean; reference: string }>(
      `hub-app/product-studio/review/${encodeURIComponent(reference)}/dismiss`,
      {},
    ),

  /** Écarte un échec ou un traitement partiel de « À traiter » : SUPERADMIN uniquement. */
  dismissJob: (id: string) =>
    apiClient.post<{ dismissed: boolean; reference: string }>(
      `hub-app/product-studio/jobs/${encodeURIComponent(id)}/dismiss`,
      {},
    ),
};
