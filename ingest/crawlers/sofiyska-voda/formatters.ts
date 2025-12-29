/**
 * Text sanitization and formatting utilities
 */

/**
 * Sanitize text by removing extra whitespace and trimming
 */
export function sanitizeText(text?: string | null): string | null {
  if (!text) return null;
  const trimmed = text.replaceAll(/\s+/g, " ").trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Ensure a timestamp is converted to a valid Date or null
 */
export function ensureDate(timestamp?: number | null): Date | null {
  if (!timestamp && timestamp !== 0) {
    return null;
  }

  const date = new Date(timestamp);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Format a date using Bulgarian locale
 */
export function formatDate(
  date?: Date | null,
  formatter?: Intl.DateTimeFormat
): string | null {
  if (!date) return null;

  const defaultFormatter = new Intl.DateTimeFormat("bg-BG", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "Europe/Sofia",
  });

  return (formatter ?? defaultFormatter).format(date);
}

/**
 * Build markdown message from feature attributes
 */
export function buildMessage(
  attributes: Record<string, unknown> | undefined,
  layer: { name: string },
  dateFormatter?: Intl.DateTimeFormat
): string {
  const paragraphs: string[] = [];
  const location = sanitizeText(attributes?.LOCATION as string | null);
  const description = sanitizeText(attributes?.DESCRIPTION as string | null);

  if (location) {
    paragraphs.push(location);
  }

  if (description && description !== location) {
    paragraphs.push(description);
  }

  const startDate = formatDate(
    ensureDate(attributes?.START_ as number | null),
    dateFormatter
  );
  const endDate = formatDate(
    ensureDate(attributes?.ALERTEND as number | null),
    dateFormatter
  );
  const lastUpdate = formatDate(
    ensureDate(attributes?.LASTUPDATE as number | null),
    dateFormatter
  );

  const metadata = [
    `**Категория:** ${layer.name}`,
    attributes?.ACTIVESTATUS
      ? `**Статус:** ${attributes.ACTIVESTATUS as string}`
      : null,
    startDate ? `**Начало:** ${startDate}` : null,
    endDate ? `**Край:** ${endDate}` : null,
    lastUpdate ? `**Последно обновяване:** ${lastUpdate}` : null,
    attributes?.SOFIADISTRICT
      ? `**Район на СО (ID):** ${attributes.SOFIADISTRICT as number}`
      : null,
    attributes?.CONTACT ? `**Контакт:** ${attributes.CONTACT as string}` : null,
  ].filter(Boolean);

  if (metadata.length) {
    // Use 2 spaces + newline for proper markdown hard line breaks
    paragraphs.push(metadata.join("  \n"));
  }

  return paragraphs.join("\n\n");
}
