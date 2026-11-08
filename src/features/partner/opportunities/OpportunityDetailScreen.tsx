import { Text, View } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { CheckCircle2, Mail, RotateCcw } from 'lucide-react-native';

import { Badge, Button, DetailSection, InfoRow } from '@/components/ui';
import { formatDate, formatDateTime, formatEuro, formatInteger } from '@/lib/format';
import { roleLabel } from '@/modules/roles';
import { fontSize, makeStyles, monoFontFamily, radius, spacing, useTheme } from '@/theme';

import { openOpportunityConversation } from '../navigation';
import { warehouseLabel } from '../products/constants';
import { ConversationLink } from '../shared/ConversationLink';
import { DetailScroll } from '../shared/DetailScroll';
import { OPPORTUNITY_STATUS_META } from './constants';
import { useOpportunityActions, useMarkOpportunityRead } from './hooks/useOpportunityActions';
import { useOpportunityDetail } from './hooks/useOpportunityDetail';

/**
 * Fiche d'une opportunité, en lecture : produit, prix demandé / actuel / proposé / obtenu,
 * historique des propositions et notes. Les actions simples (traitée, non lue) n'existent que sur
 * une opportunité ouverte, comme sur le web ; la proposition de prix reste sur l'espace web.
 * La fiche marque l'opportunité comme lue à l'ouverture.
 */
export function OpportunityDetailScreen() {
  const styles = useStyles();
  const t = useTheme();
  const { uuid } = useLocalSearchParams<{ uuid: string }>();
  const { opportunity, loading, error, notFound, refetch } = useOpportunityDetail(uuid);
  const { treat, untreat, markUnread } = useOpportunityActions(uuid ?? '');
  useMarkOpportunityRead(uuid);

  const status = opportunity ? OPPORTUNITY_STATUS_META[opportunity.status] : null;
  const isOpen = opportunity?.status === 'OPEN';
  const treated = !!opportunity?.treatedAt;

  return (
    <>
      <Stack.Screen options={{ title: 'Opportunité' }} />
      <DetailScroll
        loading={loading}
        error={error}
        notFound={notFound}
        notFoundTitle="Opportunité introuvable"
        notFoundText="Cette opportunité n'existe plus ou n'est pas accessible à votre compte."
        errorFallback="Impossible de charger l'opportunité"
        refetch={refetch}
      >
        {opportunity && status ? (
          <>
            <View style={styles.hero}>
              {opportunity.brand ? <Text style={styles.brand}>{opportunity.brand}</Text> : null}
              <Text style={styles.designation}>
                {opportunity.designation ?? 'Sans désignation'}
              </Text>
              {opportunity.ean ? <Text style={styles.mono}>EAN {opportunity.ean}</Text> : null}
              <View style={styles.badges}>
                <Badge label={status.label} tone={status.tone} />
                {opportunity.depWarehouse ? (
                  <Badge label={`DEP ${warehouseLabel(opportunity.depWarehouse)}`} tone="blue" />
                ) : null}
                {treated ? <Badge label="Traitée" tone="green" /> : null}
              </View>
            </View>

            {isOpen ? (
              <View style={styles.actions}>
                {treated ? (
                  <Button
                    label="Démarquer"
                    variant="outline"
                    loading={untreat.isPending}
                    leadingIcon={<RotateCcw size={16} color={t.text} />}
                    onPress={() => untreat.mutate()}
                  />
                ) : (
                  <Button
                    label="Marquer traitée"
                    loading={treat.isPending}
                    leadingIcon={<CheckCircle2 size={16} color={t.onAccent} />}
                    onPress={() => treat.mutate()}
                  />
                )}
                <Button
                  label="Marquer non lue"
                  variant="outline"
                  loading={markUnread.isPending}
                  leadingIcon={<Mail size={16} color={t.text} />}
                  onPress={() => markUnread.mutate()}
                />
              </View>
            ) : null}

            <ConversationLink
              count={opportunity.messagesCount}
              preview={
                opportunity.lastMessage
                  ? `${opportunity.lastMessage.authorName} : ${opportunity.lastMessage.content}`
                  : null
              }
              onPress={() => openOpportunityConversation(opportunity.uuid)}
            />

            <DetailSection title="Prix">
              <InfoRow label="Prix d'équilibre demandé HT" value={formatEuro(opportunity.requestedMinPriceHT)} />
              <InfoRow label="PA actuel HT" value={formatEuro(opportunity.currentFixPriceHT)} />
              {opportunity.proposedPriceHT != null ? (
                <InfoRow label="Prix proposé HT" value={formatEuro(opportunity.proposedPriceHT)} />
              ) : null}
              {opportunity.proposedAt ? (
                <InfoRow
                  label="Proposé le"
                  value={[
                    formatDateTime(opportunity.proposedAt),
                    opportunity.proposedByName ? `par ${opportunity.proposedByName}` : null,
                  ]
                    .filter(Boolean)
                    .join(' ')}
                />
              ) : null}
              {opportunity.obtainedPriceHT != null ? (
                <InfoRow label="Prix obtenu HT" value={formatEuro(opportunity.obtainedPriceHT)} />
              ) : null}
              {opportunity.obtainedQuantity != null ? (
                <InfoRow label="Quantité obtenue" value={formatInteger(opportunity.obtainedQuantity)} />
              ) : null}
              {opportunity.availabilityDate ? (
                <InfoRow
                  label="Disponibilité"
                  value={formatDate(opportunity.availabilityDate) ?? '—'}
                />
              ) : null}
              {opportunity.amazonBuyboxSeller ? (
                <InfoRow label="BuyBox Amazon" value={opportunity.amazonBuyboxSeller} />
              ) : null}
            </DetailSection>

            {opportunity.proposals.length > 0 ? (
              <DetailSection title={`Propositions (${opportunity.proposals.length})`}>
                {opportunity.proposals.map((proposal) => (
                  <View key={proposal.id} style={styles.proposal}>
                    <View style={styles.proposalHeader}>
                      <Text style={styles.proposalPrice}>{formatEuro(proposal.proposedPriceHT)}</Text>
                      <Text style={styles.proposalDate}>{formatDateTime(proposal.createdAt)}</Text>
                    </View>
                    <Text style={styles.proposalAuthor}>
                      {proposal.authorName}
                      {proposal.authorRole ? ` · ${roleLabel(proposal.authorRole)}` : ''}
                    </Text>
                    {proposal.note ? <Text style={styles.note}>{proposal.note}</Text> : null}
                  </View>
                ))}
              </DetailSection>
            ) : null}

            {opportunity.resolutionNote || opportunity.operatorComment ? (
              <DetailSection title="Notes">
                {opportunity.resolutionNote ? (
                  <View style={styles.noteBlock}>
                    <Text style={styles.noteLabel}>Note de résolution</Text>
                    <Text style={styles.note}>{opportunity.resolutionNote}</Text>
                  </View>
                ) : null}
                {opportunity.operatorComment ? (
                  <View style={styles.noteBlock}>
                    <Text style={styles.noteLabel}>Commentaire</Text>
                    <Text style={styles.note}>{opportunity.operatorComment}</Text>
                  </View>
                ) : null}
              </DetailSection>
            ) : null}

            <DetailSection title="Suivi">
              <InfoRow label="Reçue le" value={formatDate(opportunity.createdAt) ?? '—'} />
              {opportunity.treatedAt ? (
                <InfoRow
                  label="Traitée le"
                  value={[
                    formatDate(opportunity.treatedAt),
                    opportunity.treatedByName ? `par ${opportunity.treatedByName}` : null,
                  ]
                    .filter(Boolean)
                    .join(' ')}
                />
              ) : null}
              {opportunity.resolvedAt ? (
                <InfoRow label="Résolue le" value={formatDate(opportunity.resolvedAt) ?? '—'} />
              ) : null}
              {opportunity.codeEbat ? (
                <InfoRow label="Code eBat" value={opportunity.codeEbat} mono copyLabel="Code eBat" />
              ) : null}
            </DetailSection>

            <Text style={styles.footnote}>
              Pour proposer un prix, utilisez l&apos;espace web.
            </Text>
          </>
        ) : null}
      </DetailScroll>
    </>
  );
}

const useStyles = makeStyles((t) => ({
  hero: { gap: spacing.xs },
  brand: { fontSize: fontSize.sm, fontWeight: '700', color: t.accentText },
  designation: { fontSize: fontSize.lg, fontWeight: '700', color: t.text },
  mono: { fontFamily: monoFontFamily, fontSize: fontSize.xs, color: t.textMuted },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs + 2, paddingTop: spacing.xs },
  actions: { gap: spacing.sm },
  proposal: {
    gap: 2,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: t.surface,
  },
  proposalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  proposalPrice: { fontSize: fontSize.base, fontWeight: '700', color: t.text },
  proposalDate: { fontSize: fontSize.xs, color: t.textSubtle },
  proposalAuthor: { fontSize: fontSize.xs, color: t.textMuted },
  noteBlock: { gap: 2 },
  noteLabel: { fontSize: fontSize.xs, fontWeight: '700', color: t.textMuted },
  note: { fontSize: fontSize.sm, lineHeight: 20, color: t.text },
  footnote: {
    paddingHorizontal: spacing.lg,
    textAlign: 'center',
    fontSize: fontSize.xs,
    lineHeight: 17,
    color: t.textFaint,
  },
}));
