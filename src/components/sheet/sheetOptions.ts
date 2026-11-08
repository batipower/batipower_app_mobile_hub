import type { ComponentProps } from 'react';
import type { Stack } from 'expo-router';

import type { Theme } from '@/theme';

export type SheetScreenOptions = NonNullable<ComponentProps<typeof Stack.Screen>['options']>;

/** Rayon des coins de toutes les feuilles natives de l'app. */
export const SHEET_CORNER_RADIUS = 24;

/** Détents usuels : une feuille enfant (choix) reprend ceux de la feuille qui l'ouvre. */
export const SHEET_DETENTS = {
  half: [0.5, 1],
  editor: [0.5, 0.9],
  sort: [0.7, 1],
  tall: [0.9, 1],
} as const;

/**
 * Options communes des feuilles natives (`formSheet`) : grabber, rayon unique, fond qui suit
 * le thème et pas d'en-tête de pile (le titre et les actions sont rendus par `SheetScreen`).
 * À utiliser par tous les layouts, jamais de copie locale.
 */
export function sheetOptions(
  theme: Pick<Theme, 'bgElevated'>,
  detents: readonly number[],
  extra: Partial<SheetScreenOptions> = {},
): SheetScreenOptions {
  return {
    presentation: 'formSheet',
    sheetAllowedDetents: [...detents],
    sheetGrabberVisible: true,
    sheetCornerRadius: SHEET_CORNER_RADIUS,
    contentStyle: { backgroundColor: theme.bgElevated },
    headerShown: false,
    ...extra,
  } as SheetScreenOptions;
}
