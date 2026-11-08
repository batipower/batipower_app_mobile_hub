/** Règle de mot de passe du back (création de compte) : 10 caractères, majuscule, chiffre, spécial. */
export function passwordProblem(password: string): string | null {
  if (password.length < 10) return 'Le mot de passe doit contenir au moins 10 caractères';
  if (!/[A-Z]/.test(password)) return 'Le mot de passe doit contenir au moins une majuscule';
  if (!/[0-9]/.test(password)) return 'Le mot de passe doit contenir au moins un chiffre';
  if (!/[^A-Za-z0-9]/.test(password)) return 'Le mot de passe doit contenir au moins un caractère spécial';
  return null;
}
