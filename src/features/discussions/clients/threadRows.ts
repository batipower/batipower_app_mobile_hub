import type { SupportMessage } from '@/types/supportChat';

export type ThreadRow =
  | { kind: 'date'; key: string; label: string }
  | { kind: 'message'; key: string; message: SupportMessage; showAuthor: boolean };

/** « Aujourd'hui », « Hier », sinon « 12 novembre 2026 ». */
function dayLabel(date: Date, now: Date): string {
  if (date.toDateString() === now.toDateString()) return "Aujourd'hui";
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return 'Hier';
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

/**
 * Lignes d'une liste inversée (le plus récent d'abord) : messages et séparateurs de jour. Le
 * nom de l'auteur n'est affiché qu'au premier message d'une série du même expéditeur.
 */
export function buildThreadRows(messages: readonly SupportMessage[], now = new Date()): ThreadRow[] {
  const rows: ThreadRow[] = [];
  let previous: SupportMessage | undefined;
  for (const message of messages) {
    const date = new Date(message.createdAt);
    const sameDay =
      previous !== undefined &&
      new Date(previous.createdAt).toDateString() === date.toDateString();
    if (!sameDay && !Number.isNaN(date.getTime())) {
      rows.push({ kind: 'date', key: `date-${message.id}`, label: dayLabel(date, now) });
    }
    rows.push({
      kind: 'message',
      key: message.id,
      message,
      showAuthor: !sameDay || previous?.sender !== message.sender,
    });
    previous = message;
  }
  return rows.reverse();
}
