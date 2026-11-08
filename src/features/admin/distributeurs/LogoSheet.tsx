import { useState } from 'react';
import { Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner-native';

import { adminPartnersApi, type LogoKind } from '@/api/adminPartners';
import { SheetScreen } from '@/components/sheet/SheetScreen';
import { Button } from '@/components/ui';
import { errorMessage } from '@/features/preparation/components/ListState';
import { chooseAction } from '@/lib/actionSheet';
import { formatFileSize, pickFromSource, type AttachmentRules, type PickedFile } from '@/lib/pickAttachment';
import { fontSize, makeStyles, radius, spacing } from '@/theme';
import type { PartnerLogo } from '@/types/admin';

import { ToggleRow } from '../shared/components/FormParts';
import { DistributorLogo } from './components';
import { useDistributors, useRefreshPartners } from './hooks';

/** Logo : PNG, JPG, WebP ou SVG, 2 Mo maximum (le back convertit en PNG et redimensionne). */
const LOGO_RULES: AttachmentRules = {
  acceptedMimeTypes: ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'],
  maxFileSize: 2 * 1024 * 1024,
  maxFiles: 1,
};

/** Feuille de logo d'un distributeur ou d'une filiale (`kind` + `id`). */
export function LogoSheet() {
  const { kind, id } = useLocalSearchParams<{ kind: string; id: string }>();
  const logoKind: LogoKind = kind === 'subsidiary' ? 'subsidiary' : 'distributor';
  const distributors = useDistributors();
  let target: { name: string; logo: PartnerLogo } | undefined;
  for (const d of distributors.data ?? []) {
    if (logoKind === 'distributor' && d.id === id) {
      target = { name: d.name, logo: d };
      break;
    }
    const s = logoKind === 'subsidiary' ? d.warehouses.flatMap((w) => w.subsidiaries).find((x) => x.id === id) : undefined;
    if (s) {
      target = { name: s.name, logo: s };
      break;
    }
  }

  if (!target) {
    return (
      <SheetScreen title="Logo">
        <Text>Chargement…</Text>
      </SheetScreen>
    );
  }
  return <LogoForm kind={logoKind} id={id} name={target.name} logo={target.logo} />;
}

function LogoForm({ kind, id, name, logo }: { kind: LogoKind; id: string; name: string; logo: PartnerLogo }) {
  const styles = useStyles();
  const refresh = useRefreshPartners();
  const [file, setFile] = useState<PickedFile | null>(null);
  const [dark, setDark] = useState(logo.logoNeedsLightBackground);
  const hasLogo = !!logo.logoUrl;
  const changed = file !== null || dark !== logo.logoNeedsLightBackground;

  const save = useMutation({
    mutationFn: async () => {
      if (file) return adminPartnersApi.uploadLogo(kind, id, file, dark);
      return kind === 'distributor'
        ? adminPartnersApi.updateDistributor(id, { logoNeedsLightBackground: dark })
        : adminPartnersApi.updateSubsidiary(id, { logoNeedsLightBackground: dark });
    },
    onSuccess: async () => {
      await refresh();
      toast.success('Logo enregistré');
      router.back();
    },
    onError: (e) => toast.error(errorMessage(e, "Erreur lors de l'envoi du logo")),
  });

  const remove = useMutation({
    mutationFn: () => adminPartnersApi.removeLogo(kind, id),
    onSuccess: async () => {
      await refresh();
      toast.success('Logo supprimé');
      router.back();
    },
    onError: (e) => toast.error(errorMessage(e, 'Erreur lors de la suppression du logo')),
  });

  const pick = async () => {
    const source = await chooseAction<'photo' | 'document'>('Choisir un logo', [
      { label: 'Photothèque', value: 'photo' },
      { label: 'Fichiers', value: 'document' },
    ]);
    if (!source) return;
    const [picked] = await pickFromSource(source, LOGO_RULES, 1);
    if (picked) setFile(picked);
  };

  const busy = save.isPending || remove.isPending;

  return (
    <SheetScreen
      title={`Logo — ${name}`}
      closeLabel="Annuler"
      closeDisabled={busy}
      footer={
        <Button
          label="Enregistrer"
          loading={save.isPending}
          disabled={!changed || remove.isPending}
          onPress={() => save.mutate()}
          style={styles.submit}
        />
      }
    >
      <View style={styles.preview}>
        {file ? (
          <View style={[styles.picked, dark && styles.pickedDark]}>
            <Image source={{ uri: file.uri }} style={styles.pickedImage} contentFit="contain" />
          </View>
        ) : (
          <DistributorLogo logo={{ ...logo, logoNeedsLightBackground: dark }} label={name} size={96} />
        )}
        {file ? (
          <Text style={styles.text}>
            {file.name}
            {file.size ? ` · ${formatFileSize(file.size)}` : ''}
          </Text>
        ) : (
          <Text style={styles.text}>{hasLogo ? 'Logo actuel' : 'Aucun logo'}</Text>
        )}
      </View>
      <Button label={hasLogo || file ? 'Choisir une autre image' : 'Choisir une image'} variant="outline" onPress={() => void pick()} disabled={busy} />
      <ToggleRow
        label="Fond sombre"
        description="À activer si le logo contient des éléments blancs, pour qu'il reste lisible."
        value={dark}
        onValueChange={setDark}
      />
      <Text style={styles.text}>PNG, JPG, WebP ou SVG · 2 Mo maximum.</Text>
      {hasLogo ? (
        <Button
          label="Supprimer le logo"
          variant="ghost"
          destructive
          loading={remove.isPending}
          disabled={save.isPending}
          onPress={() => remove.mutate()}
        />
      ) : null}
    </SheetScreen>
  );
}

const useStyles = makeStyles((t) => ({
  preview: { alignItems: 'center', gap: spacing.sm },
  text: { fontSize: fontSize.xs, lineHeight: 17, color: t.textMuted, textAlign: 'center' },
  picked: {
    width: 96,
    height: 96,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: t.border,
    backgroundColor: t.surface,
  },
  pickedDark: { backgroundColor: '#131921' },
  pickedImage: { width: 80, height: 80 },
  submit: { marginBottom: spacing.sm },
}));
