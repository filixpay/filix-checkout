/**
 * Map backend receipt upload URL to the checkout Next.js proxy route.
 */
export function resolveReceiptUploadPath(_receiptUploadUrl?: string): string {
  return '/api/checkout/upload-receipt';
}
