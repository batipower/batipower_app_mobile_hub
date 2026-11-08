import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Redirect, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { ArrowLeft, RefreshCw, ShieldCheck } from 'lucide-react-native';
import { toast } from 'sonner-native';

import { isTwoFactorSessionLost } from '@/api/auth';
import { ApiError } from '@/api/client';
import { useAuth } from '@/auth/AuthProvider';
import { Button, Card, OtpInput, Screen } from '@/components/ui';
import { fontSize, makeStyles, radius, spacing, typography, useTheme, withAlpha } from '@/theme';

const CODE_LENGTH = 6;
const RESEND_COOLDOWN_SECONDS = 60;

export default function VerifyTwoFactorScreen() {
  const router = useRouter();
  const styles = useStyles();
  const t = useTheme();
  const { status, hasPendingTwoFactor, verifyTwoFactor, resendTwoFactorCode, cancelTwoFactor } =
    useAuth();

  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [hasError, setHasError] = useState(false);
  // Évite une double soumission (auto-envoi à 6 chiffres + toucher sur le bouton).
  const submittingRef = useRef(false);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => setCooldown((value) => (value <= 1 ? 0 : value - 1)), 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  const backToLogin = useCallback(() => {
    cancelTwoFactor();
    router.replace('/login');
  }, [cancelTwoFactor, router]);

  const notifyError = () =>
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => undefined);

  const submit = useCallback(
    async (value: string) => {
      if (submittingRef.current || value.length !== CODE_LENGTH) return;
      submittingRef.current = true;
      setSubmitting(true);
      setHasError(false);
      try {
        const outcome = await verifyTwoFactor(value);
        if (outcome === 'password_change_required') {
          toast.error("Vous devez d'abord changer votre mot de passe depuis l'espace web.");
          backToLogin();
        }
        // `authenticated` : le garde de navigation de la racine prend le relais.
      } catch (error) {
        notifyError();
        if (isTwoFactorSessionLost(error)) {
          toast.error('Session expirée. Veuillez vous reconnecter.');
          backToLogin();
          return;
        }
        toast.error(error instanceof ApiError ? error.message : 'Erreur de vérification');
        setHasError(true);
        setCode('');
      } finally {
        submittingRef.current = false;
        setSubmitting(false);
      }
    },
    [verifyTwoFactor, backToLogin],
  );

  const handleChange = (value: string) => {
    setCode(value);
    setHasError(false);
    if (value.length === CODE_LENGTH) void submit(value);
  };

  const handleResend = async () => {
    if (cooldown > 0 || resending) return;
    setResending(true);
    try {
      await resendTwoFactorCode();
      toast.success('Un nouveau code vous a été envoyé par email');
      setCooldown(RESEND_COOLDOWN_SECONDS);
      setCode('');
    } catch (error) {
      notifyError();
      if (isTwoFactorSessionLost(error)) {
        toast.error('Session expirée. Veuillez vous reconnecter.');
        backToLogin();
        return;
      }
      toast.error(error instanceof ApiError ? error.message : 'Impossible de renvoyer le code');
    } finally {
      setResending(false);
    }
  };

  // Écran rouvert sans vérification en cours (ex. app relancée) : retour à la connexion.
  // La condition sur `status` évite de rediriger pendant la bascule vers la session ouverte.
  if (status === 'signedOut' && !hasPendingTwoFactor) return <Redirect href="/login" />;

  return (
    <Screen scroll backgroundColor="transparent" contentStyle={styles.content}>
      <View style={styles.header}>
        <View style={styles.iconTile}>
          <ShieldCheck size={28} color={t.accentText} />
        </View>
        <Text style={styles.title} accessibilityRole="header">
          Vérification en deux étapes
        </Text>
        <Text style={styles.description}>
          Un code à 6 chiffres a été envoyé sur votre email. Saisissez-le ci-dessous.
        </Text>
      </View>

      <Card variant="glass">
        <View style={styles.form}>
          <OtpInput
            value={code}
            onChange={handleChange}
            length={CODE_LENGTH}
            editable={!submitting}
            hasError={hasError}
            autoFocus
          />

          <Button
            label="Vérifier et accéder"
            loading={submitting}
            disabled={code.length !== CODE_LENGTH}
            onPress={() => void submit(code)}
          />

          <View style={styles.resend}>
            <Text style={styles.resendHint}>Pas reçu le code ?</Text>
            <Button
              label={
                resending
                  ? 'Envoi…'
                  : cooldown > 0
                    ? `Renvoyer dans ${cooldown}s`
                    : 'Renvoyer le code'
              }
              variant="ghost"
              disabled={resending || cooldown > 0}
              onPress={() => void handleResend()}
              leadingIcon={<RefreshCw size={14} color={t.textMuted} />}
            />
          </View>
        </View>
      </Card>

      <Pressable onPress={backToLogin} accessibilityRole="button" hitSlop={12} style={styles.back}>
        <ArrowLeft size={16} color={t.textMuted} />
        <Text style={styles.backText}>Retour à la connexion</Text>
      </Pressable>
    </Screen>
  );
}

const useStyles = makeStyles((t) => ({
  content: { justifyContent: 'center', gap: spacing['2xl'] },
  header: { alignItems: 'center', gap: spacing.md },
  iconTile: {
    width: 56,
    height: 56,
    borderRadius: radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: withAlpha(t.accent, t.scheme === 'dark' ? 0.1 : 0.16),
    borderWidth: 1,
    borderColor: withAlpha(t.accent, 0.3),
  },
  title: { ...typography.title, color: t.text, textAlign: 'center' },
  description: {
    maxWidth: 300,
    fontSize: fontSize.sm,
    lineHeight: 20,
    color: t.textMuted,
    textAlign: 'center',
  },
  form: { gap: spacing['2xl'] },
  resend: {
    alignItems: 'center',
    gap: spacing.xs,
    paddingTop: spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth * 2,
    borderTopColor: t.border,
  },
  resendHint: { ...typography.caption, color: t.textSubtle },
  back: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs + 2,
  },
  backText: { fontSize: fontSize.sm, color: t.textMuted },
}));
