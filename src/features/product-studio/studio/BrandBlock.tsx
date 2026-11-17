import { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { TriangleAlert } from 'lucide-react-native';
import { toast } from 'sonner-native';

import { Badge, Button } from '@/components/ui';
import { fontSize, makeStyles, radius, spacing, useTheme } from '@/theme';
import type { StudioBrandProposal, StudioManufacturer } from '@/types/hubStudio';

import { foldText } from '../domain/model';
import { useStudioManufacturers } from '../hooks/useStudioQueries';
import { useStudio } from './StudioContext';
import { StudioCard, StudioHeading, StudioInput } from './ui';

const MAX_LOGO_BYTES = 2 * 1024 * 1024;
const VISIBLE_RESULTS = 8;

function ManufacturerPicker({
  reference,
  label,
  pending,
  onAttach,
  onCreate,
}: {
  reference: string;
  label: string;
  pending: boolean;
  onAttach: (id: number) => void;
  onCreate: (name: string) => void;
}) {
  const styles = useStyles();
  const [query, setQuery] = useState('');
  const [picked, setPicked] = useState<StudioManufacturer | null>(null);
  const [wanted, setWanted] = useState(false);
  const manufacturers = useStudioManufacturers(reference, wanted);
  const items = useMemo(() => manufacturers.data ?? [], [manufacturers.data]);

  const needle = foldText(query);
  const filtered = needle ? items.filter((item) => foldText(item.name).includes(needle)) : items;
  const exactMatch = needle ? items.some((item) => foldText(item.name) === needle) : false;
  const canCreate =
    !manufacturers.isLoading && !manufacturers.isError && query.trim().length >= 2 && !exactMatch;
  const showList = wanted && !picked;

  return (
    <View style={styles.picker}>
      <Text style={styles.label}>{label}</Text>
      <StudioInput
        value={picked ? picked.name : query}
        placeholder="Rechercher une marque…"
        autoCorrect={false}
        onFocus={() => setWanted(true)}
        onChangeText={(value) => {
          setPicked(null);
          setQuery(value);
        }}
      />
      {showList ? (
        <View style={styles.list}>
          {manufacturers.isLoading ? <Text style={styles.muted}>Chargement…</Text> : null}
          {manufacturers.isError ? (
            <Text style={styles.muted}>Liste des marques indisponible.</Text>
          ) : null}
          {!manufacturers.isLoading && !manufacturers.isError && filtered.length === 0 && !canCreate ? (
            <Text style={styles.muted}>Aucune marque.</Text>
          ) : null}
          {filtered.slice(0, VISIBLE_RESULTS).map((item) => (
            <Pressable
              key={item.id}
              style={styles.option}
              onPress={() => {
                setPicked(item);
                setQuery(item.name);
              }}
            >
              <Text style={styles.optionText}>{item.name}</Text>
            </Pressable>
          ))}
          {filtered.length > VISIBLE_RESULTS ? (
            <Text style={styles.muted}>
              {filtered.length - VISIBLE_RESULTS} autres : précisez la recherche.
            </Text>
          ) : null}
          {canCreate ? (
            <Pressable
              style={styles.option}
              disabled={pending}
              onPress={() => onCreate(query.trim())}
            >
              <Text style={[styles.optionText, styles.bold]}>{`Créer « ${query.trim()} »`}</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
      <Button
        label="Rattacher"
        variant="outline"
        disabled={pending || !picked}
        onPress={() => picked && onAttach(picked.id)}
      />
    </View>
  );
}

function LogoUploader({ proposal }: { proposal: StudioBrandProposal }) {
  const styles = useStyles();
  const { blocks } = useStudio();
  if (proposal.status === 'NONE') return null;

  const uploading = blocks.brandLogo.isPending;
  const immediate = proposal.status === 'ATTACH' || proposal.status === 'ALREADY_ATTACHED';
  const hasPending = Boolean(proposal.logoDataUrl);
  const hasUploaded = Boolean(proposal.logoUploaded);

  const pick = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      base64: true,
      quality: 0.8,
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    if (!asset?.base64) {
      toast.error('Lecture du fichier en échec');
      return;
    }
    // Taille réelle de l'image encodée (base64 = 4/3 des octets).
    if (asset.base64.length * 0.75 > MAX_LOGO_BYTES) {
      toast.error('Logo trop volumineux (max 2 Mo)');
      return;
    }
    blocks.brandLogo.mutate(`data:${asset.mimeType ?? 'image/jpeg'};base64,${asset.base64}`);
  };

  return (
    <View style={styles.logo}>
      <View style={styles.logoRow}>
        {proposal.logoDataUrl ? (
          <Image
            source={{ uri: proposal.logoDataUrl }}
            style={styles.logoImg}
            contentFit="contain"
            accessibilityLabel="Logo en attente"
          />
        ) : null}
        <Button
          label={uploading ? 'Envoi…' : hasPending || hasUploaded ? 'Changer le logo' : 'Ajouter un logo'}
          variant="outline"
          loading={uploading}
          onPress={() => void pick()}
        />
      </View>
      {immediate ? (
        <Text style={styles.muted}>
          {hasUploaded ? 'Logo mis à jour.' : 'Le logo est appliqué tout de suite sur PrestaShop.'}
        </Text>
      ) : null}
      {proposal.status === 'CREATE' ? (
        <Text style={styles.muted}>
          {hasPending ? 'Logo prêt.' : 'Le logo sera envoyé à la création de la marque.'}
        </Text>
      ) : null}
    </View>
  );
}

function DecisionButtons({
  pending,
  onAccept,
  onReject,
}: {
  pending: boolean;
  onAccept: () => void;
  onReject: () => void;
}) {
  const styles = useStyles();
  return (
    <View style={styles.row}>
      <View style={styles.flex}>
        <Button label="Valider" disabled={pending} onPress={onAccept} />
      </View>
      <View style={styles.flex}>
        <Button label="Refuser" variant="outline" disabled={pending} onPress={onReject} />
      </View>
    </View>
  );
}

/** Bloc « Marque » : rattachement / création côté PrestaShop, logo, décision. */
export function BrandBlock() {
  const styles = useStyles();
  const t = useTheme();
  const { reference, draft, brandProposal, brandDecision, brandMissing, blocks } = useStudio();
  if (!brandProposal && !draft?.preparedAt) return null;
  // Toujours visible : un produit doit avoir une marque, même sans proposition eBatPro.
  const proposal: StudioBrandProposal = brandProposal ?? { status: 'NONE' };

  const pending = blocks.brand.isPending;
  const accept = () => blocks.brand.mutate({ action: 'ACCEPT' });
  const reject = () => blocks.brand.mutate({ action: 'REJECT' });
  const pickerLabel =
    proposal.status === 'ALREADY_ATTACHED' || proposal.status === 'ATTACH'
      ? 'Changer de marque'
      : 'Rattacher une marque';
  const badgeLabel = brandMissing
    ? brandDecision === 'REJECTED'
      ? 'Refusée : obligatoire'
      : 'Obligatoire'
    : 'Validée';
  const hasAnyLogo = Boolean(proposal.ebatLogoUrl || proposal.logoDataUrl);

  return (
    <StudioCard tone={brandMissing ? 'danger' : undefined}>
      <View style={styles.headRow}>
        <StudioHeading>Marque</StudioHeading>
        <Badge label={badgeLabel} tone={brandMissing ? 'red' : 'green'} />
      </View>

      {brandMissing ? (
        <View style={styles.alert}>
          <TriangleAlert size={16} color={t.danger} />
          <Text style={[styles.alertText, styles.flex]}>
            <Text style={styles.bold}>Marque obligatoire. </Text>
            {brandDecision === 'REJECTED'
              ? 'Vous avez refusé la marque : choisissez-en une autre ci-dessous pour pouvoir valider le contenu et mettre le produit en ligne.'
              : 'Un produit doit avoir une marque : validez la marque proposée ou rattachez-en une pour pouvoir valider le contenu et mettre le produit en ligne.'}
          </Text>
        </View>
      ) : null}

      {proposal.status === 'ALREADY_ATTACHED' ? (
        <View style={styles.block}>
          <Text style={styles.text}>
            Marque actuelle :{' '}
            <Text style={styles.bold}>{proposal.current?.name || `#${proposal.current?.id}`}</Text>
          </Text>
          <LogoUploader proposal={proposal} />
        </View>
      ) : null}

      {proposal.status === 'ATTACH' ? (
        <View style={styles.block}>
          <Text style={styles.text}>
            eBatPro : <Text style={styles.bold}>{proposal.ebatName}</Text> → PrestaShop #
            {proposal.match?.id} ({proposal.match?.name})
          </Text>
          <DecisionButtons pending={pending} onAccept={accept} onReject={reject} />
          <LogoUploader proposal={proposal} />
        </View>
      ) : null}

      {proposal.status === 'CREATE' ? (
        <View style={styles.block}>
          <Text style={styles.text}>
            Créer « <Text style={styles.bold}>{proposal.createName || proposal.ebatName}</Text> » dans
            PrestaShop
            {proposal.ebatLogoUrl ? ' (logo eBat si disponible)' : ' — aucun logo eBat'} et la
            rattacher.
          </Text>
          {!hasAnyLogo ? (
            <Text style={[styles.muted, { color: t.warning }]}>La marque sera créée sans logo.</Text>
          ) : null}
          <DecisionButtons pending={pending} onAccept={accept} onReject={reject} />
          <LogoUploader proposal={proposal} />
        </View>
      ) : null}

      {proposal.status === 'NONE' ? (
        <Text style={styles.muted}>Aucune marque eBatPro. Choisissez une marque PrestaShop.</Text>
      ) : null}

      <ManufacturerPicker
        reference={reference}
        label={pickerLabel}
        pending={pending}
        onAttach={(manufacturerId) => blocks.brand.mutate({ action: 'ATTACH', manufacturerId })}
        onCreate={(createName) => blocks.brand.mutate({ action: 'CREATE', createName })}
      />
    </StudioCard>
  );
}

const useStyles = makeStyles((t) => ({
  flex: { flex: 1 },
  row: { flexDirection: 'row', gap: spacing.sm },
  headRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  bold: { fontWeight: '700', color: t.text },
  text: { fontSize: fontSize.sm, lineHeight: 20, color: t.text },
  muted: { fontSize: fontSize.xs, color: t.textSubtle, lineHeight: 17 },
  label: { fontSize: fontSize.xs, fontWeight: '600', color: t.textMuted },
  block: { gap: spacing.sm },
  alert: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: t.dangerBg,
  },
  alertText: { fontSize: fontSize.xs, lineHeight: 17, color: t.text },
  picker: { gap: spacing.sm },
  list: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: t.border,
    backgroundColor: t.surface,
    padding: spacing.xs,
  },
  option: { minHeight: 40, justifyContent: 'center', paddingHorizontal: spacing.sm },
  optionText: { fontSize: fontSize.sm, color: t.text },
  logo: { gap: spacing.xs },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  logoImg: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: t.border,
    backgroundColor: '#fff',
  },
}));
