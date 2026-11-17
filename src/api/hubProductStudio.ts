import { apiClient } from '@/api/client';
import type {
  StudioApplyResponse,
  StudioBrandAction,
  StudioCategoryDecision,
  StudioCategoryNode,
  StudioDraft,
  StudioFieldDecision,
  StudioFieldKey,
  StudioImageImportResponse,
  StudioManufacturer,
  StudioPublicLink,
  StudioQuickSavePayload,
  StudioQuickSaveResponse,
  StudioScores,
  StudioSiteContent,
  StudioTab,
} from '@/types/hubStudio';

const base = (reference: string) => `hub-app/products/${encodeURIComponent(reference)}/studio`;

/**
 * Client du Product Studio de la fiche produit HUB (`hub-app/products/:reference/studio`),
 * ouvert au SUPERADMIN et au MANAGER. Toutes les écritures renvoient le brouillon à jour.
 * La préparation complète (pipeline IA) et le déploiement passent par la file : `hub-product-studio-jobs.ts`.
 */
export const hubProductStudioApi = {
  getDraft: (reference: string) => apiClient.get<StudioDraft>(`${base(reference)}/draft`),

  getScores: (reference: string) => apiClient.get<StudioScores>(`${base(reference)}/scores`),

  listManufacturers: (reference: string) =>
    apiClient.get<StudioManufacturer[]>(`${base(reference)}/manufacturers`),

  decideField: (reference: string, field: StudioFieldKey, decision: StudioFieldDecision, editedValue?: string) =>
    apiClient.post<StudioDraft>(`${base(reference)}/fields/${field}/decide`, { decision, editedValue }),

  /** Valide (ou rouvre) une étape de relecture : contenu, attributs, images, geo, associes, categories. */
  validateStep: (reference: string, step: StudioTab, validated: boolean) =>
    apiClient.post<StudioDraft>(`${base(reference)}/steps/${step}`, { validated }),

  regenerateField: (reference: string, field: StudioFieldKey, instruction?: string) =>
    apiClient.post<StudioDraft>(`${base(reference)}/fields/${field}/regenerate`, {
      instruction: instruction || undefined,
    }),

  decideBrand: (reference: string, body: { action: StudioBrandAction; manufacturerId?: number; createName?: string }) =>
    apiClient.post<StudioDraft>(`${base(reference)}/brand`, body),

  uploadBrandLogo: (reference: string, dataUrl: string) =>
    apiClient.post<StudioDraft>(`${base(reference)}/brand/logo`, { dataUrl }),

  decideAttributes: (reference: string, selectedNames: string[]) =>
    apiClient.post<StudioDraft>(`${base(reference)}/attributes`, { selectedNames }),

  decideRelated: (reference: string, selectedReferences: string[]) =>
    apiClient.post<StudioDraft>(`${base(reference)}/related`, { selectedReferences }),

  refreshRelated: (reference: string) => apiClient.post<StudioDraft>(`${base(reference)}/related/refresh`, {}),

  /** Arbre complet des catégories actives (hors racine et accueil). */
  listCategories: (reference: string) => apiClient.get<StudioCategoryNode[]>(`${base(reference)}/categories`),

  /** Enregistre l'état final des catégories (cocher = ajouter, décocher = retirer) et la principale. */
  decideCategory: (reference: string, decision: StudioCategoryDecision) =>
    apiClient.post<StudioDraft>(`${base(reference)}/category`, decision),

  refreshCategory: (reference: string) => apiClient.post<StudioDraft>(`${base(reference)}/category/refresh`, {}),

  refreshGeo: (reference: string) => apiClient.post<StudioDraft>(`${base(reference)}/geo/refresh`, {}),

  removeGeoFaq: (reference: string, index: number) =>
    apiClient.delete<StudioDraft>(`${base(reference)}/geo/faq/${index}`),

  reorderImages: (reference: string, assetIds: string[]) =>
    apiClient.post<StudioDraft>(`${base(reference)}/images/reorder`, { assetIds }),

  setCoverImage: (reference: string, assetId: string) =>
    apiClient.post<StudioDraft>(`${base(reference)}/images/${encodeURIComponent(assetId)}/cover`, {}),

  deleteImage: (reference: string, assetId: string) =>
    apiClient.delete<StudioDraft>(`${base(reference)}/images/${encodeURIComponent(assetId)}`),

  generateImage: (reference: string, viewType: string) =>
    apiClient.post<StudioDraft>(`${base(reference)}/images/generate`, { viewType }),

  importImages: (reference: string, urls: string[]) =>
    apiClient.post<StudioImageImportResponse>(`${base(reference)}/images/import-batch`, { urls }),

  apply: (reference: string, dryRun: boolean) =>
    apiClient.post<StudioApplyResponse>(`${base(reference)}/apply`, { dryRun }),


  /** Lien public (`active` + `publicUrl`) pour « Voir sur le site » — SUPERADMIN + MANAGER. */
  getPublicLink: (reference: string) => apiClient.get<StudioPublicLink>(`${base(reference)}/public-link`),

  /** Contenu actuellement publié sur le site (pré-remplissage de l'édition rapide). */
  getSiteContent: (reference: string) => apiClient.get<StudioSiteContent>(`${base(reference)}/site-content`),

  /** Édition rapide : écriture directe + invalidation immédiate du cache du site. */
  quickSave: (reference: string, payload: StudioQuickSavePayload) =>
    apiClient.patch<StudioQuickSaveResponse>(`${base(reference)}/quick-save`, payload),

  rollback: (reference: string, logId: string) =>
    apiClient.post<{ rolledBack: boolean }>(`${base(reference)}/apply-logs/${encodeURIComponent(logId)}/rollback`, {}),
};
