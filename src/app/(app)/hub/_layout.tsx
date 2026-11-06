import { NativeTabs } from 'expo-router/native-tabs';

import { colors } from '@/theme';

/** Navigation du module HUB : barre d'onglets native iOS (Liquid Glass sur iOS 26+). */
export default function HubLayout() {
  return (
    <NativeTabs tintColor={colors.green}>
      <NativeTabs.Trigger name="preparation">
        <NativeTabs.Trigger.Label>Préparation</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: 'shippingbox', selected: 'shippingbox.fill' }}
          md="inventory_2"
        />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="profil">
        <NativeTabs.Trigger.Label>Profil</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'person', selected: 'person.fill' }} md="person" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
