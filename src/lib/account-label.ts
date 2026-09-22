/**
 * Backend may concatenate merchant name and alias as "Name - alias".
 * When alias is missing it can become the literal "null" — strip that for display.
 */
export function formatMerchantAccountLabel(name: string | null | undefined): string {
  if (name == null) return '';
  return String(name).replace(/\s*-\s*null\s*$/i, '').trim();
}
