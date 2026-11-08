/**
 * Ligne de devis en cours d'édition — porté depuis `LineRow` du front-printer
 * (`app/responsable-achat/devis-client/page.tsx`).
 */
export type LineRow = {
  key: string;
  /** Type de ligne : "product" (défaut), "title" (titre de section), "text" (texte libre). */
  lineType?: 'product' | 'title' | 'text';
  /** Contenu texte pour les lignes title/text. */
  content?: string;
  /** Remarque attachée à une ligne produit. */
  note?: string;
  reference: string;
  quantity: number;
  /** Prix HT déjà remisé — stocké pour l'API. */
  unitPriceHT: number;
  /** Prix TTC catalogue public effectif (prix réellement affiché/vendu sur le site). */
  catalogPriceTTC: number;
  /** Prix TTC catalogue de base (avant remise publique du site) — affiché barré. */
  baseCatalogPriceTTC?: number;
  /** Remise appliquée 0–30 %. */
  discountPct: number;
  productLabel?: string;
  taxRate: number;
  prestashopProductId?: string | number;
  imageUrl?: string;
  /** Poids unitaire en grammes (depuis ApproRows.weightInGrams). Affichage et calcul transport uniquement. */
  weightInGrams?: number | null;
  /** Dimensions colis (cm, depuis ApproRows). Contrôle du périmètre GLS uniquement. */
  packageLengthCm?: number | null;
  packageWidthCm?: number | null;
  packageHeightCm?: number | null;
  /** Nombre de colis affecté à cette ligne (calculé depuis nbPieceByColis, éditable en override). */
  nbColisLine?: number;
  /**
   * Vrai si l'utilisateur a manuellement édité `nbColisLine` sur cette ligne
   * pendant la session. Bloque la re-synchronisation automatique depuis
   * `quantity / nbPieceByColis` (changement de qté, enrichissement catalogue).
   */
  nbColisLineManual?: boolean;
  /** Nb de pièces par colis (depuis ApproRows). 1 pièce = 1 colis si absent. */
  nbPieceByColis?: number | null;
  codeFlevy?: string | null;
  codeDombasle?: string | null;
  /** PA HT unitaire CATALOGUE (fixPriceHT depuis ApproRows). Initial / non négocié. */
  costHT?: number | null;
  /**
   * PA HT unitaire NÉGOCIÉ par les RAF (offre eBAT importée). Quand renseigné,
   * prend le pas sur `costHT` pour le calcul de marge brute. Null tant
   * qu'aucune offre RAF n'a été appliquée à la ligne.
   */
  negotiatedCostHT?: number | null;
  /**
   * Prix unitaire HT lu sur le devis eBAT (informatif). N'écrase PAS `costHT` :
   * sert uniquement à afficher un badge comparatif dans la colonne PA HT.
   */
  costEbatHT?: number | null;
  /**
   * Écotaxe HT unitaire, égale à l'écotaxe de l'entrepôt retenu (celui au plus bas
   * (prix + écotaxe) × multiple parmi Flevy/Dombasle). Ajoutée au PA HT pour tous
   * les calculs de coût / marge (front + back). 0 ou null si non applicable.
   */
  ecotaxHT?: number | null;
  /** Mode prix client dans le panneau pricing: "proposed" (IA), "catalog" (catalogue site) ou "custom" (saisi manuellement). */
  priceMode?: 'proposed' | 'catalog' | 'custom';
  /** Produit actif sur PrestaShop (visible sur le site). undefined = inconnu. */
  active?: boolean;
  /** Ligne en cours d'enrichissement (ajout optimiste : les données se chargent). */
  loading?: boolean;
};
