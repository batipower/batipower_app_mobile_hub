import { ActionSheetIOS, Alert, Platform } from 'react-native';

export type ActionEntry = {
  label: string;
  run: () => void;
  destructive?: boolean;
};

/** Menu d'actions natif (feuille d'actions iOS, boîte de dialogue ailleurs). */
export function showActions(title: string | undefined, entries: readonly ActionEntry[]) {
  if (entries.length === 0) return;
  if (Platform.OS === 'ios') {
    const destructiveIndex = entries.findIndex((entry) => entry.destructive);
    ActionSheetIOS.showActionSheetWithOptions(
      {
        title,
        options: [...entries.map((entry) => entry.label), 'Annuler'],
        cancelButtonIndex: entries.length,
        destructiveButtonIndex: destructiveIndex >= 0 ? destructiveIndex : undefined,
      },
      (index) => entries[index]?.run(),
    );
    return;
  }
  Alert.alert(title ?? 'Actions', undefined, [
    ...entries.map((entry) => ({
      text: entry.label,
      style: entry.destructive ? ('destructive' as const) : ('default' as const),
      onPress: entry.run,
    })),
    { text: 'Annuler', style: 'cancel' as const },
  ]);
}
