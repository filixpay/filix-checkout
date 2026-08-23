/**
 * Mask login identifiers for display (email or username).
 * e.g. user@example.com → u***@e***.com
 */
export function maskLoginLabel(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  const value = raw.trim();
  if (!value) return null;

  const at = value.indexOf('@');
  if (at > 0 && at < value.length - 1) {
    const local = value.slice(0, at);
    const domain = value.slice(at + 1);
    const localKeep = local.slice(0, 1);
    const dot = domain.lastIndexOf('.');
    const tld = dot > 0 ? domain.slice(dot) : '';
    const domainHead = domain.slice(0, 1);
    return `${localKeep}***@${domainHead}***${tld}`;
  }

  if (value.length <= 2) {
    return '*'.repeat(value.length);
  }
  return `${value.slice(0, 1)}***${value.slice(-1)}`;
}

const EMAIL_IN_TEXT =
  /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;

/** Mask any email addresses embedded in free-form hint / error text. */
export function maskEmailsInText(text: string | null | undefined): string {
  if (text == null || text === '') return text ?? '';
  return text.replace(EMAIL_IN_TEXT, (match) => maskLoginLabel(match) || '***');
}
