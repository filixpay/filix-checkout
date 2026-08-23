export interface WalletAccount {
  accountType: string;
  /** Advisory only; null/omitted means unknown (submit-time check). */
  balance?: number | null;
  code: string | number;
  currency: string;
  default?: boolean;
  isDefault?: boolean;
  name: string;
  status: string;
  userId?: string;
}

export interface CreditAccount {
  accountType: string;
  availableAmount: number;
  code: string;
  name: string;
  status: string;
}

export interface PaymentMethod {
  channelCode: string;
  configId: string;
  displayName: string;
  iconUrl?: string;
  enabled: boolean;
  sandbox?: boolean;
  hint?: string;
  /** WALLET empty-state reason from backend */
  walletEmptyReason?:
    | 'UNAUTHENTICATED'
    | 'NO_IDENTITY'
    | 'NO_PAYER_MERCHANT'
    | 'SAME_PARTY_AS_SELLER'
    | string;
  testAccountDescription?: string;
  walletAccounts?: WalletAccount[];
  creditAccounts?: CreditAccount[];
}

export interface CheckoutView {
  merchantName: string;
  /** Seller merchant business code — used for same-party wallet empty-state copy */
  sellerCode?: number | string;
  totalAmount: number;
  currency?: string;
  tradeNo: string;
  orderDescription?: string;
  orderStatus: 'PENDING' | 'SUCCESS' | 'CLOSED';
  paidTime?: string;
  expirySeconds?: number;
  availablePaymentMethods?: PaymentMethod[];
  returnUrl?: string;
  statusText?: string;
}

export interface CheckoutResponse {
  code: string;
  message?: string;
  data: CheckoutView;
}

/** RECEIPT offline bank transfer — from create-payment-session */
export interface ReceiptSession {
  html: string;
  transactionId: string;
  uploadUrl: string;
  receiverName?: string;
  accountNumber?: string;
  bankName?: string;
  bankAddress?: string;
  swiftCode?: string;
  clearingCode?: string;
  amount?: number;
  currency?: string;
}

/** CRYPTO Static v2 — metadata from create-payment-session */
export interface CryptoDepositSession {
  html: string;
  depositAddress?: string;
  invoiceAmount?: string;
  payAmount?: string;
  asset?: string;
  chain?: string;
  expireAt?: string;
}

export interface PaymentSessionResponse {
  code: string;
  message?: string;
  resultCode?: string;
  success?: boolean;
  timestamp?: number;
  data?: PaymentSessionData;
}

export interface PaymentSessionData {
  resultCode?: string;
  paymentState?: 'PROCESSING' | 'SUCCEEDED' | 'FAILED';
  errorCode?: string;
  retryable?: boolean;
  qrCodeUrl?: string;
  paymentUrl?: string;
  html?: string;
  instructionHtml?: string;
  receiptUploadUrl?: string;
  transactionId?: string;
  metadata?: Record<string, string>;
}

export interface ResumeSummary {
  paymentAttemptId: number;
  tradeStatus: string;
  amount: number;
  resumeExpireAt?: string;
  tradeNo?: string;
  subject?: string;
  currency?: string;
  merchantName?: string;
  channelCode?: string;
}

export interface ResumePeekResponse {
  code: string;
  message?: string;
  data?: ResumeSummary;
}

export interface OrderCreateRequest {
  merchantOrderId: string;
  subject: string;
  returnUrl?: string;
  totalAmount: {
    amount: number;
    currency: string;
  };
  orderItems: OrderItemRequest[];
  customerName?: string;
  customerEmail?: string;
  customermobile?: string;
}

export interface OrderItemRequest {
  businessProductId?: string;
  description?: string;
  quantity: number;
  unitPrice: number;
}

export interface QrPaymentCodeResponse {
  code: string;
  data: {
    locationName: string;
    locationCode: number;
    merchantName: string;
  };
  message: string;
  success: boolean;
  timestamp: number;
}

export interface QrPaymentRequest {
  loc: string;
  amount: number;
  currency: string;
  payerNote?: string;
}
