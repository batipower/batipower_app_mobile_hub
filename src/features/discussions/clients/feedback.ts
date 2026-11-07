import * as Haptics from 'expo-haptics';

/** Retours haptiques du flux Clients (jamais bloquants : l'échec est ignoré). */

export function hapticSuccess() {
  void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
}

export function hapticError() {
  void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => undefined);
}

export function hapticLight() {
  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
}
