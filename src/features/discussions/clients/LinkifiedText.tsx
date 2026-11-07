import { useMemo } from 'react';
import { Linking, Text, type StyleProp, type TextStyle } from 'react-native';
import { toast } from 'sonner-native';

import { openExternalUrl } from '@/lib/openWeb';

/**
 * Lien, e-mail ou numéro de téléphone français. Les alternatives sont testées dans cet ordre à
 * chaque position : une URL contenant des chiffres n'est donc jamais prise pour un téléphone.
 */
const TOKEN_PATTERN = new RegExp(
  [
    // URL http(s)
    String.raw`(https?:\/\/[^\s<>"']+)`,
    // E-mail
    String.raw`([\w.+-]+@[\w-]+(?:\.[\w-]+)+)`,
    // Téléphone : 06 12 34 56 78, 06.12.34.56.78, +33 6 12 34 56 78, 0033612345678…
    String.raw`((?<![\w+])(?:\+33|0033|0)[\s.-]?[1-9](?:[\s.-]?\d{2}){4}(?!\d))`,
  ].join('|'),
  'g',
);

/** Ponctuation de fin de phrase qui ne fait pas partie du lien. */
const TRAILING_PUNCTUATION = /[.,;:!?)\]}»]+$/;

type Part =
  | { kind: 'text'; value: string }
  | { kind: 'url' | 'email' | 'phone'; value: string };

/** Découpe un texte en morceaux bruts et en liens (la ponctuation finale d'une URL reste du texte). */
export function splitLinks(text: string): Part[] {
  const parts: Part[] = [];
  let cursor = 0;
  for (const match of text.matchAll(TOKEN_PATTERN)) {
    const [raw, url, email, phone] = match;
    const index = match.index ?? 0;
    let value = raw;
    let trailing = '';
    if (url) {
      trailing = url.match(TRAILING_PUNCTUATION)?.[0] ?? '';
      value = trailing ? url.slice(0, -trailing.length) : url;
    }
    if (index > cursor) parts.push({ kind: 'text', value: text.slice(cursor, index) });
    parts.push({ kind: url ? 'url' : email ? 'email' : phone ? 'phone' : 'text', value });
    if (trailing) parts.push({ kind: 'text', value: trailing });
    cursor = index + raw.length;
  }
  if (cursor < text.length) parts.push({ kind: 'text', value: text.slice(cursor) });
  return parts;
}

async function openLink(kind: 'url' | 'email' | 'phone', value: string) {
  if (kind === 'url') {
    await openExternalUrl(value);
    return;
  }
  const target = kind === 'email' ? `mailto:${value}` : `tel:${value.replace(/[^\d+]/g, '')}`;
  try {
    await Linking.openURL(target);
  } catch {
    toast.error(
      kind === 'email'
        ? "Impossible d'ouvrir l'application de messagerie."
        : "Impossible de lancer l'appel.",
    );
  }
}

type LinkifiedTextProps = {
  text: string;
  style?: StyleProp<TextStyle>;
  linkStyle?: StyleProp<TextStyle>;
};

/**
 * Texte brut dont les URL, e-mails et téléphones sont cliquables (lien de suivi transporteur,
 * adresse du client…). Le texte reste sélectionnable pour être copié.
 */
export function LinkifiedText({ text, style, linkStyle }: LinkifiedTextProps) {
  const parts = useMemo(() => splitLinks(text), [text]);
  return (
    <Text selectable style={style}>
      {parts.map((part, index) =>
        part.kind === 'text' ? (
          part.value
        ) : (
          <Text
            key={index}
            accessibilityRole="link"
            style={linkStyle}
            onPress={() => void openLink(part.kind, part.value)}
          >
            {part.value}
          </Text>
        ),
      )}
    </Text>
  );
}
