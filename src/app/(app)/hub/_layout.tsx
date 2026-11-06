import { NativeTabs } from 'expo-router/native-tabs';

import { colors } from '@/theme';

/** Navigation du module HUB : barre d'onglets native iOS (Liquid Glass sur iOS 26+). */
export default function HubLayout() {
  return (
    <NativeTabs tintColor={colors.green}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Accueil</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'house', selected: 'house.fill' }} md="home" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="profil">
        <NativeTabs.Trigger.Label>Profil</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'person', selected: 'person.fill' }} md="person" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
