import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { Check } from 'lucide-react-native';

import { Button } from '@/components/ui';
import { fontSize, makeStyles, radius, spacing, useTheme, withAlpha } from '@/theme';
import type { StudioAttribute } from '@/types/hubStudio';

import {
  attributeDisplay,
  attributeGroup,
  attributeGroupOrder,
  foldText,
} from '../../domain/model';
import { useStudio } from '../StudioContext';
import { StudioCard, StudioHeading, StudioInput } from '../ui';

type AttributeGroup = { id: string; label: string; items: StudioAttribute[] };

/** Onglet Attributs : sélection (enregistrée en différé) des caractéristiques écrites sur la fiche. */
export function AttributesTab() {
  const styles = useStyles();
  const t = useTheme();
  const { attributes, attributesSaving, toggleAttribute, setAttributesSelected } = useStudio();
  const [query, setQuery] = useState('');
  const needle = foldText(query.trim());

  const visible = useMemo(
    () =>
      attributes.filter(
        (attr) =>
          !needle ||
          foldText(`${attr.canonicalName} ${attr.value} ${attr.unit ?? ''}`).includes(needle),
      ),
    [attributes, needle],
  );

  const groups = useMemo(() => {
    const map = new Map<string, AttributeGroup>();
    for (const attr of visible) {
      const group = attributeGroup(attr.canonicalName || '');
      const entry = map.get(group.id) ?? { ...group, items: [] };
      entry.items.push(attr);
      map.set(group.id, entry);
    }
    return [...map.values()].sort((a, b) => attributeGroupOrder(a.id) - attributeGroupOrder(b.id));
  }, [visible]);

  const selectedCount = attributes.filter((attr) => attr.selected !== false).length;
  const visibleNames = visible.map((attr) => attr.canonicalName);

  return (
    <View style={styles.root}>
      <StudioCard>
        <StudioInput
          value={query}
          onChangeText={setQuery}
          placeholder="Rechercher un attribut"
          autoCorrect={false}
          clearButtonMode="while-editing"
        />
        <View style={styles.row}>
          <View style={styles.flex}>
            <Button
              label="Tout cocher"
              variant="outline"
              disabled={visible.length === 0}
              onPress={() => setAttributesSelected(visibleNames, true)}
            />
          </View>
          <View style={styles.flex}>
            <Button
              label="Tout décocher"
              variant="outline"
              disabled={visible.length === 0}
              onPress={() => setAttributesSelected(visibleNames, false)}
            />
          </View>
        </View>
        <View style={styles.status}>
          {attributesSaving ? <ActivityIndicator size="small" color={t.accent} /> : null}
          <Text style={styles.hint}>
            {attributesSaving
              ? 'Enregistrement…'
              : `${selectedCount} retenu${selectedCount > 1 ? 's' : ''}`}
          </Text>
        </View>
      </StudioCard>

      {attributes.length === 0 ? <Text style={styles.empty}>Aucun attribut proposé.</Text> : null}
      {attributes.length > 0 && visible.length === 0 ? (
        <Text style={styles.empty}>Aucun attribut ne correspond à la recherche.</Text>
      ) : null}

      {groups.map((group) => (
        <View key={group.id} style={styles.group}>
          <StudioHeading>{group.label}</StudioHeading>
          {group.items.map((attr) => {
            const checked = attr.selected !== false;
            return (
              <Pressable
                key={attr.canonicalName}
                accessibilityRole="checkbox"
                accessibilityState={{ checked }}
                onPress={() => toggleAttribute(attr.canonicalName, !checked)}
                style={[
                  styles.item,
                  checked && {
                    borderColor: withAlpha(t.accent, 0.5),
                    backgroundColor: withAlpha(t.accent, 0.08),
                  },
                ]}
              >
                <View
                  style={[
                    styles.box,
                    checked && { backgroundColor: t.accent, borderColor: t.accent },
                  ]}
                >
                  {checked ? <Check size={13} color={t.onAccent} strokeWidth={3} /> : null}
                </View>
                <Text style={[styles.flex, styles.itemText]}>
                  <Text style={styles.bold}>{attr.canonicalName}</Text>
                  {` : ${attributeDisplay(attr.value, attr.unit)}`}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  root: { gap: spacing.md },
  flex: { flex: 1 },
  row: { flexDirection: 'row', gap: spacing.sm },
  status: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  hint: { fontSize: fontSize.xs, color: t.textMuted },
  empty: { paddingVertical: spacing.xl, textAlign: 'center', fontSize: fontSize.xs, color: t.textSubtle },
  group: { gap: spacing.sm },
  item: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    minHeight: 44,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: t.border,
    backgroundColor: t.card,
  },
  box: {
    width: 22,
    height: 22,
    marginTop: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm + 1,
    borderWidth: 1.5,
    borderColor: t.borderStrong,
  },
  itemText: { fontSize: fontSize.sm, lineHeight: 20, color: t.textMuted },
  bold: { fontWeight: '700', color: t.text },
}));
