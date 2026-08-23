import type { CryptoDepositSession, PaymentSessionResponse, ReceiptSession } from '@/types/checkout';

export type PaymentHandoffHandlers = {
  onImmediateSuccess: () => void;
  onProcessing?: () => void;
  onReceipt: (receipt: ReceiptSession) => void;
  onCryptoDeposit: (session: CryptoDepositSession) => void;
  onQr: (url: string) => void;
  onError: (message: string) => void;
  onFormWindowClosed?: () => void;
};

const WALLET_ERROR_MESSAGES: Record<string, string> = {
  RISK_BLOCKED: '支付已被风控拦截',
  PAYMENT_PENDING_REVIEW: '支付待风控审核',
  ORDER_AMOUNT_CHANGED: '订单金额已变化，请刷新页面后重新提交',
  INSUFFICIENT_BALANCE: '账户余额不足',
  ORDER_NOT_PAYABLE: '订单当前不可支付，请刷新后重试',
  PAYMENT_ALREADY_FAILED: '上一笔支付未完成，请重新提交',
  FUNDS_RESERVE_CONFLICT: '资金预占冲突，请重新提交',
  ASSET_MISMATCH: '付款币种与订单不一致',
  PAYER_MISMATCH: '付款账户与订单占用信息不一致',
  IDEMPOTENCY_PAYLOAD_MISMATCH: '支付请求已过期，请重新提交',
  PAYMENT_FAILED: '支付失败，请重试',
  PAYER_NOT_MERCHANT: '付款账户类型不支持余额支付',
  CAPABILITY_RESTRICTED: '该账户暂无余额支付权限',
  PRICING_NOT_CONFIGURED: '收款方手续费未配置，请联系商户',
  INVALID_PAYMENT_PIN: '支付密码错误',
  PAYER_ACCESS_DENIED: '无权使用该付款账户',
  SAME_BUYER_SELLER: '不能向本商户自己付款',
  BUYER_NOT_FOUND: '付款商户不存在',
  ADMISSION_RETRYABLE: '支付处理中，请稍候',
};

export type RiskGateResult = 'blocked' | 'pending_review' | null;

const REAUTH_CODES = new Set(['INVALID_TOKEN', 'MISSING_AUTH']);

export function isReauthRequired(json: PaymentSessionResponse): boolean {
  return REAUTH_CODES.has(json.code || '');
}

export function parseRiskGate(res: Response, json: PaymentSessionResponse): RiskGateResult {
  const errorCode = json.code || json.data?.errorCode;
  if ((res.status === 403 && json.code === 'RISK_BLOCKED') || errorCode === 'RISK_BLOCKED') {
    return 'blocked';
  }
  if (
    (res.status === 409 && json.code === 'PAYMENT_PENDING_REVIEW') ||
    errorCode === 'PAYMENT_PENDING_REVIEW'
  ) {
    return 'pending_review';
  }
  return null;
}

export function applyPaymentSessionJson(
  json: PaymentSessionResponse,
  handlers: PaymentHandoffHandlers,
): boolean {
  if (json.code !== 'SUCCESS') {
    const detail = json.message
      ? `${json.code ? `[${json.code}] ` : ''}${json.message}`
      : '支付初始化失败';
    handlers.onError(detail);
    return false;
  }

  if (json.resultCode === 'SUCCESS' || json.data?.resultCode === 'SUCCESS') {
    handlers.onImmediateSuccess();
    return true;
  }

  const data = json.data;
  if (!data) {
    handlers.onError('未获取到有效的支付引导信息');
    return false;
  }

  if (data.paymentState === 'SUCCEEDED') {
    handlers.onImmediateSuccess();
    return true;
  }
  if (data.paymentState === 'PROCESSING') {
    handlers.onProcessing?.();
    return true;
  }
  if (data.paymentState === 'FAILED') {
    const code = data.errorCode || 'PAYMENT_FAILED';
    handlers.onError(WALLET_ERROR_MESSAGES[code] || json.message || '支付失败，请重试');
    return false;
  }

  if (data.instructionHtml && data.transactionId) {
    if (data.receiptUploadUrl) {
      const meta = data.metadata;
      const metaAmount = meta?.amount ? Number(meta.amount) : undefined;
      handlers.onReceipt({
        html: data.instructionHtml,
        transactionId: data.transactionId,
        uploadUrl: data.receiptUploadUrl,
        receiverName: meta?.receiverName,
        accountNumber: meta?.accountNumber,
        bankName: meta?.bankName,
        bankAddress: meta?.bankAddress,
        swiftCode: meta?.swiftCode ?? meta?.swift,
        clearingCode: meta?.clearingCode ?? meta?.routingNumber,
        amount: metaAmount != null && !Number.isNaN(metaAmount) ? metaAmount : undefined,
        currency: meta?.currency,
      });
    } else {
      const meta = data.metadata;
      handlers.onCryptoDeposit({
        html: data.instructionHtml,
        depositAddress: meta?.depositAddress,
        invoiceAmount: meta?.invoiceAmount,
        payAmount: meta?.payAmount,
        asset: meta?.asset,
        chain: meta?.chain,
        expireAt: meta?.expireAt,
      });
    }
    return true;
  }

  if (data.qrCodeUrl) {
    handlers.onQr(data.qrCodeUrl);
    return true;
  }

  if (data.paymentUrl) {
    window.location.href = data.paymentUrl;
    return true;
  }

  if (data.html) {
    document.body.innerHTML = data.html;
    return true;
  }

  handlers.onError('未获取到有效的支付引导信息');
  return false;
}

/** Handle fetch result from create-payment-session or resume/continue. */
export async function handlePaymentSessionResponse(
  res: Response,
  handlers: PaymentHandoffHandlers,
): Promise<RiskGateResult | 'handled' | 'failed' | 'processing' | 'reauth'> {
  const contentType = res.headers.get('content-type') || '';

  if (!contentType.includes('application/json')) {
    const text = await res.text();
    if (text.includes('<form')) {
      const win = window.open('', '_blank');
      if (win) {
        win.document.write(text);
        win.document.close();
        if (handlers.onFormWindowClosed) {
          const check = setInterval(() => {
            if (win.closed) {
              clearInterval(check);
              handlers.onFormWindowClosed!();
            }
          }, 1000);
        }
      } else {
        document.body.innerHTML = text;
      }
    } else {
      document.body.innerHTML = text;
    }
    return 'handled';
  }

  const json: PaymentSessionResponse = await res.json();
  if (isReauthRequired(json)) {
    return 'reauth';
  }
  const risk = parseRiskGate(res, json);
  if (risk) {
    return risk;
  }

  const ok = applyPaymentSessionJson(json, handlers);
  if (!ok) {
    return 'failed';
  }
  if (json.data?.paymentState === 'PROCESSING') {
    return 'processing';
  }
  return 'handled';
}
