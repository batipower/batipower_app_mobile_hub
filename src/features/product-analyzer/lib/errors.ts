import { ApiError } from '@/api/client';

export function apiErrorMessage(err: unknown, fallback = 'Erreur'): string {
  if (err instanceof ApiError) {
    const body = err.body;
    if (body && typeof body === 'object' && 'message' in body) {
      const raw = (body as { message?: unknown }).message;
      if (Array.isArray(raw)) return raw.join(' · ');
      if (typeof raw === 'string' && raw.trim()) return raw;
    }
    if (err.message) return err.message;
  }
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}

export function apiErrorStatus(err: unknown): number | null {
  return err instanceof ApiError ? err.status : null;
}

export function apiErrorBody<T = Record<string, unknown>>(err: unknown): T | null {
  if (err instanceof ApiError && err.body && typeof err.body === 'object') {
    return err.body as T;
  }
  return null;
}

export function apiErrorCode(err: unknown): string | undefined {
  const body = apiErrorBody<{ code?: unknown }>(err);
  return typeof body?.code === 'string' ? body.code : undefined;
}
