import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowRight, Info, Lock, Mail } from 'lucide-react-native';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner-native';
import { z } from 'zod';

import { ApiError } from '@/api/client';
import { useAuth } from '@/auth/AuthProvider';
import { LogoMark } from '@/components/auth/LogoMark';
import { ModuleBadge } from '@/components/modules/ModuleBadge';
import { Button, Card, Screen, TextField, type TextInputHandle } from '@/components/ui';
import { openWebPage } from '@/lib/openWeb';
import { colors, fontSize, onDark, radius, spacing, typography, withAlpha } from '@/theme';

// Mêmes règles que le login web.
const schema = z.object({
  email: z.string().trim().pipe(z.email('Email invalide')),
  password: z.string().min(1, 'Mot de passe requis'),
});

type FormData = z.infer<typeof schema>;

export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAuth();
  const passwordRef = useRef<TextInputHandle>(null);
  const [submitting, setSubmitting] = useState(false);
  const [passwordChangeRequired, setPasswordChangeRequired] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = handleSubmit(async ({ email, password }) => {
    setSubmitting(true);
    setPasswordChangeRequired(false);
    try {
      const outcome = await login(email, password);
      if (outcome === 'two_factor_required') {
        toast.success('Code de vérification envoyé par email');
        router.push('/verify-2fa');
      } else if (outcome === 'password_change_required') {
        setPasswordChangeRequired(true);
      }
      // `authenticated` : le garde de navigation de la racine prend le relais.
    } catch (error) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => undefined);
      toast.error(error instanceof ApiError ? error.message : 'Erreur de connexion');
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <Screen scroll backgroundColor="transparent" contentStyle={styles.content}>
      <View style={styles.header}>
        <LogoMark size={64} />
        <View style={styles.brand}>
          <Text style={styles.brandName}>BATIPOWER</Text>
          <ModuleBadge module="HUB" size="sm" />
        </View>
        <Text style={styles.subtitle}>Connectez-vous à votre espace professionnel</Text>
      </View>

      <Card variant="glass">
        <View style={styles.form}>
          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextField
                label="Adresse email"
                icon={Mail}
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.email?.message}
                placeholder="vous@entreprise.com"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                textContentType="username"
                returnKeyType="next"
                submitBehavior="submit"
                onSubmitEditing={() => passwordRef.current?.focus()}
              />
            )}
          />

          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextField
                ref={passwordRef}
                label="Mot de passe"
                icon={Lock}
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.password?.message}
                placeholder="••••••••"
                secureToggle
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="current-password"
                textContentType="password"
                returnKeyType="go"
                onSubmitEditing={() => void onSubmit()}
              />
            )}
          />

          <Button
            label="Se connecter"
            loading={submitting}
            onPress={() => void onSubmit()}
            trailingIcon={<ArrowRight size={18} color={colors.white} />}
            testID="login-submit"
          />
        </View>
      </Card>

      {passwordChangeRequired ? (
        <View style={styles.notice} accessibilityRole="alert">
          <Info size={18} color={colors.green} style={styles.noticeIcon} />
          <View style={styles.noticeBody}>
            <Text style={styles.noticeText}>
              Première connexion : vous devez définir un nouveau mot de passe depuis l&apos;espace
              web, puis vous reconnecter ici.
            </Text>
            <Pressable
              onPress={() => void openWebPage('/login')}
              accessibilityRole="link"
              hitSlop={8}
            >
              <Text style={styles.noticeLink}>Ouvrir l&apos;espace web</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      <View style={styles.links}>
        <Pressable
          onPress={() => void openWebPage('/forgot-password')}
          accessibilityRole="link"
          hitSlop={12}
        >
          <Text style={styles.link}>Mot de passe oublié ?</Text>
        </Pressable>
        <Pressable
          onPress={() => void openWebPage('/register')}
          accessibilityRole="link"
          hitSlop={12}
        >
          <Text style={styles.link}>Demander un accès</Text>
        </Pressable>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Espace professionnel — accès restreint</Text>
        <Text style={styles.footerCopyright}>© {new Date().getFullYear()} Batipower</Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { justifyContent: 'center', gap: spacing['2xl'] },
  header: { alignItems: 'center', gap: spacing.lg },
  brand: { alignItems: 'center', gap: spacing.xs + 2, marginTop: spacing.xs },
  brandName: {
    fontSize: fontSize.base,
    fontWeight: '700',
    letterSpacing: 1.5,
    color: colors.white,
  },
  subtitle: { fontSize: fontSize.sm, color: onDark.textSubtle, textAlign: 'center' },
  form: { gap: spacing.xl },
  notice: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: withAlpha(colors.green, 0.3),
    backgroundColor: withAlpha(colors.green, 0.08),
  },
  noticeIcon: { marginTop: 2 },
  noticeBody: { flex: 1, gap: spacing.sm },
  noticeText: { fontSize: fontSize.sm, lineHeight: 20, color: onDark.textMuted },
  noticeLink: { fontSize: fontSize.sm, fontWeight: '600', color: colors.green },
  links: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xs,
  },
  link: { fontSize: fontSize.sm, color: onDark.textSubtle },
  footer: { alignItems: 'center', gap: 2, marginTop: spacing.sm },
  footerText: { ...typography.caption, color: onDark.textFaint },
  footerCopyright: { ...typography.caption, color: withAlpha(colors.white, 0.2) },
});
