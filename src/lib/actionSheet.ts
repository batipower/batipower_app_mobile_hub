import { ActionSheetIOS, Alert, Platform } from 'react-native';

export interface ActionSheetOption<T extends string> {
  label: string;
  value: T;
  destructive?: boolean;
}

/**
 * Feuille d'actions native : `ActionSheetIOS` sur iOS, boîte de dialogue sur Android (3 choix
 * au plus, la fermeture par l'extérieur annule). Résout avec `null` si l'utilisateur annule.
 */
export function chooseAction<T extends string>(
  title: string | undefined,
  options: readonly ActionSheetOption<T>[],
  message?: string,
): Promise<T | null> {
  return new Promise((resolve) => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          title,
          message,
          options: [...options.map((o) => o.label), 'Annuler'],
          cancelButtonIndex: options.length,
          destructiveButtonIndex: options.flatMap((o, i) => (o.destructive ? [i] : [])),
        },
        (index) => resolve(index >= 0 && index < options.length ? options[index]!.value : null),
      );
      return;
    }
    Alert.alert(
      title ?? '',
      message,
      options.map((o) => ({
        text: o.label,
        style: o.destructive ? ('destructive' as const) : ('default' as const),
        onPress: () => resolve(o.value),
      })),
      { cancelable: true, onDismiss: () => resolve(null) },
    );
  });
}
