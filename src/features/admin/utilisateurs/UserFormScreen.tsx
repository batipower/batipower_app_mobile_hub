import { useMemo, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { UserX } from 'lucide-react-native';
import { toast } from 'sonner-native';

import { adminAccountsApi } from '@/api/adminAccounts';
import { Button, TextField } from '@/components/ui';
import { EmptyState, errorMessage } from '@/features/preparation/components/ListState';
import { fontSize, makeStyles, spacing, useTheme } from '@/theme';
import type { AdminUser } from '@/types/admin';

import { useSubsidiaryOptions } from '../hooks/useAdminOptions';
import { ADMIN_USERS_KEY } from '../queryKeys';
import {
  ALL_ROLES,
  accessPayload,
  brandAccessFromUser,
  effectiveModules,
  pickDefaultModule,
  validateAccessForm,
  type AccessFormValue,
} from '../shared/accessRules';
import { AccessFields } from '../shared/components/AccessFields';
import { ToggleRow } from '../shared/components/FormParts';
import { useAdminUser } from './hooks/useAdminUsers';
import { passwordProblem } from './passwordRule';
import { userWarehouseView } from './userHelpers';

type FormState = {
  email: string;
  name: string;
  password: string;
  access: AccessFormValue;
  isActive: boolean;
  mustChangePassword: boolean;
  twoFactorEnabled: boolean;
  canExportNego: boolean;
  canAccessAccounting: boolean;
  prismEnabled: boolean;
};

function initialState(user?: AdminUser): FormState {
  const modules = effectiveModules(user?.modules);
  return {
    email: user?.email ?? '',
    name: user?.name ?? '',
    password: '',
    access: {
      role: user?.role ?? 'ACHETEUR',
      code: user?.code ?? '',
      categoryTypes: user?.categoryTypes ?? [],
      warehouse: user?.warehouse ?? '',
      subsidiaryId: user?.subsidiaryId ?? '',
      modules,
      defaultModule: pickDefaultModule(modules, user?.defaultModule),
      brandAccess: brandAccessFromUser(user),
    },
    isActive: user?.isActive ?? true,
    mustChangePassword: user?.mustChangePassword ?? true,
    twoFactorEnabled: user?.twoFactorEnabled ?? true,
    canExportNego: user?.canExportNego ?? true,
    canAccessAccounting: user?.canAccessAccounting ?? false,
    prismEnabled: user?.prismEnabled ?? false,
  };
}

/**
 * Création (sans `id`) ou modification (`id`) d'un compte, en plein écran : identité, accès
 * (`AccessFields`), puis en modification les interrupteurs de sécurité et de droits.
 */
export function UserFormScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const t = useTheme();
  const { user, isLoading } = useAdminUser(id);

  if (id && !user) {
    return (
      <>
        <Stack.Screen options={{ title: 'Modifier' }} />
        <View style={{ padding: spacing.xl }}>
          <EmptyState
            icon={<UserX size={24} color={t.textMuted} />}
            title={isLoading ? 'Chargement…' : 'Utilisateur introuvable'}
          />
        </View>
      </>
    );
  }
  return <UserForm user={user} />;
}

function UserForm({ user }: { user?: AdminUser }) {
  const styles = useStyles();
  const queryClient = useQueryClient();
  const subsidiaries = useSubsidiaryOptions();
  const isCreate = !user;
  const [form, setForm] = useState<FormState>(() => initialState(user));
  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const role = form.access.role;
  const isBrandManager = role === 'RESPONSABLE_MARQUE';
  const warehouseNotSavedYet = useMemo(
    () => !!user && !user.warehouse && !!userWarehouseView(user)?.derived,
    [user],
  );

  const mutation = useMutation({
    mutationFn: async () => {
      if (!user) {
        return adminAccountsApi.createUser({
          email: form.email.trim(),
          password: form.password,
          name: form.name.trim(),
          ...accessPayload(form.access, 'create'),
        });
      }
      return adminAccountsApi.updateUser(user.id, {
        email: form.email.trim(),
        name: form.name.trim(),
        ...accessPayload(form.access, 'update'),
        isActive: form.isActive,
        mustChangePassword: form.mustChangePassword,
        twoFactorEnabled: form.twoFactorEnabled,
        canExportNego: form.canExportNego,
        canAccessAccounting: role === 'MANAGER' ? form.canAccessAccounting : false,
        prismEnabled: role === 'SUPERADMIN' ? form.prismEnabled : false,
      });
    },
    onSuccess: async () => {
      toast.success(isCreate ? 'Utilisateur créé' : 'Utilisateur mis à jour');
      await queryClient.invalidateQueries({ queryKey: ADMIN_USERS_KEY });
      router.back();
    },
    onError: (error) =>
      toast.error(errorMessage(error, isCreate ? 'Création impossible' : 'Mise à jour impossible')),
  });

  const submit = () => {
    if (!form.name.trim()) return toast.error('Le nom est obligatoire');
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) return toast.error('Adresse e-mail invalide');
    if (isCreate) {
      const problem = passwordProblem(form.password);
      if (problem) return toast.error(problem);
    }
    const sub = subsidiaries.data?.find((o) => o.id === form.access.subsidiaryId);
    const problem = validateAccessForm(form.access, sub);
    if (problem) return toast.error(problem);
    mutation.mutate();
  };

  return (
    <>
      <Stack.Screen options={{ title: isCreate ? 'Nouvel utilisateur' : 'Modifier' }} />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        automaticallyAdjustKeyboardInsets
        showsVerticalScrollIndicator={false}
      >
        <TextField
          label="Nom"
          value={form.name}
          onChangeText={(v) => set('name', v)}
          autoCapitalize="words"
          autoComplete="name"
        />
        <TextField
          label="E-mail"
          value={form.email}
          onChangeText={(v) => set('email', v)}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
        />
        {isCreate ? (
          <View style={styles.passwordBlock}>
            <TextField
              label="Mot de passe provisoire"
              value={form.password}
              onChangeText={(v) => set('password', v)}
              secureToggle
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="new-password"
            />
            <Text style={styles.hint}>
              10 caractères minimum, avec une majuscule, un chiffre et un caractère spécial.
            </Text>
          </View>
        ) : null}

        <AccessFields
          value={form.access}
          onChange={(access) => set('access', access)}
          roles={ALL_ROLES}
          currentSubsidiaryId={user?.subsidiaryId}
          warehouseNotSavedYet={warehouseNotSavedYet}
        />

        {!isCreate ? (
          <View style={styles.toggles}>
            <Text style={styles.sectionTitle}>Sécurité et droits</Text>
            <ToggleRow label="Compte actif" value={form.isActive} onValueChange={(v) => set('isActive', v)} />
            <ToggleRow
              label="Mot de passe à changer"
              description="Impose un nouveau mot de passe à la prochaine connexion."
              value={form.mustChangePassword}
              onValueChange={(v) => set('mustChangePassword', v)}
            />
            <ToggleRow
              label="Double authentification"
              description="Code de vérification par e-mail à chaque connexion."
              value={form.twoFactorEnabled}
              onValueChange={(v) => set('twoFactorEnabled', v)}
            />
            {!isBrandManager ? (
              <ToggleRow
                label="Export négo autorisé"
                description="Autorise le téléchargement des fichiers Excel sur la page opportunités."
                value={form.canExportNego}
                onValueChange={(v) => set('canExportNego', v)}
              />
            ) : null}
            {role === 'MANAGER' ? (
              <ToggleRow
                label="Accès Comptabilité"
                description="Ouvre le téléchargement des dossiers comptables mensuels."
                value={form.canAccessAccounting}
                onValueChange={(v) => set('canAccessAccounting', v)}
              />
            ) : null}
            {role === 'SUPERADMIN' ? (
              <ToggleRow
                label="Agent PRISM"
                description="Assistant IA de gestion en lecture seule. Désactivé par défaut."
                value={form.prismEnabled}
                onValueChange={(v) => set('prismEnabled', v)}
              />
            ) : null}
          </View>
        ) : null}

        <Button
          label={isCreate ? 'Créer l’utilisateur' : 'Enregistrer'}
          loading={mutation.isPending}
          onPress={submit}
        />
      </ScrollView>
    </>
  );
}

const useStyles = makeStyles((t) => ({
  content: { padding: spacing.xl, paddingBottom: 160, gap: spacing.xl },
  passwordBlock: { gap: spacing.xs },
  hint: { fontSize: 12, lineHeight: 17, color: t.textSubtle },
  toggles: { gap: spacing.sm },
  sectionTitle: { fontSize: fontSize.sm, fontWeight: '700', color: t.textSubtle, textTransform: 'uppercase' },
}));
