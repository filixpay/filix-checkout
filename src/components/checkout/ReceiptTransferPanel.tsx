'use client';

import { useCallback, useState } from 'react';
import styles from '@/app/checkout.module.css';

export interface ReceiptTransferPanelProps {
  receiverName?: string;
  accountNumber?: string;
  bankName?: string;
  bankAddress?: string;
  swiftCode?: string;
  clearingCode?: string;
  amount?: number;
  currency?: string;
  transactionId: string;
  fallbackHtml?: string;
}

export function formatReceiptAmount(amount: number, currency: string) {
  return `${currency} ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function CopyIcon({ copied }: { copied: boolean }) {
  if (copied) {
    return (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function CopyButton({
  value,
  label,
  variant = 'icon',
}: {
  value: string;
  label: string;
  variant?: 'icon' | 'inlineRef';
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore clipboard errors
    }
  }, [value]);

  if (variant === 'inlineRef') {
    return (
      <button
        type="button"
        className={styles.receiptStripeRefCopyBtn}
        onClick={handleCopy}
        aria-label={`复制${label}`}
      >
        <CopyIcon copied={copied} />
        <span>{value}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      className={styles.receiptStripeCopyBtn}
      onClick={handleCopy}
      aria-label={`复制${label}`}
      title={copied ? '已复制' : `复制${label}`}
    >
      <CopyIcon copied={copied} />
    </button>
  );
}

function BankFieldRow({
  label,
  value,
  copyLabel,
  mono,
  multiline,
}: {
  label: string;
  value: string;
  copyLabel?: string;
  mono?: boolean;
  multiline?: boolean;
}) {
  return (
    <div className={styles.receiptStripeFieldRow}>
      <span className={styles.receiptStripeFieldLabel}>{label}</span>
      <div
        className={`${styles.receiptStripeFieldValue} ${mono ? styles.receiptStripeFieldMono : ''} ${
          multiline ? styles.receiptStripeFieldMultiline : ''
        }`}
      >
        <span>{value}</span>
        {copyLabel && <CopyButton value={value} label={copyLabel} />}
      </div>
    </div>
  );
}

export default function ReceiptTransferPanel({
  receiverName,
  accountNumber,
  bankName,
  bankAddress,
  swiftCode,
  clearingCode,
  amount,
  currency,
  transactionId,
  fallbackHtml,
}: ReceiptTransferPanelProps) {
  const hasStructuredData = Boolean(receiverName && accountNumber);

  if (!hasStructuredData && fallbackHtml) {
    return (
      <div
        className={styles.receiptLegacyHtml}
        dangerouslySetInnerHTML={{ __html: fallbackHtml.replace(/\/assets\/icons\//g, '/icons/') }}
      />
    );
  }

  const displayAmount =
    amount != null && currency ? formatReceiptAmount(amount, currency) : null;

  return (
    <section className={styles.receiptStripeStep} aria-labelledby="receipt-step-1-title">
      <div className={styles.receiptStripeStepHead}>
        <div className={styles.receiptStripeStepTitleRow}>
          <span className={styles.receiptStripeStepBadge} aria-hidden>
            1
          </span>
          <h3 id="receipt-step-1-title" className={styles.receiptStripeStepTitle}>
            从您的银行发起转账
          </h3>
        </div>
        <span className={styles.receiptStripeStepMeta}>到账时间：1–3 个工作日</span>
      </div>

      <p className={styles.receiptStripeStepDesc}>
        请通过您的网上银行或柜台发起电汇转账。请确保支付所有适用手续费，避免因扣费导致实到金额不足。
      </p>

      <div className={styles.receiptStripeBankCard}>
        {displayAmount && (
          <div className={styles.receiptStripeAmountRow}>
            <span className={styles.receiptStripeAmountLabel}>应转账金额 (Amount)</span>
            <span className={styles.receiptStripeAmountValue}>{displayAmount}</span>
          </div>
        )}

        <div className={styles.receiptStripeRefRow}>
          <div className={styles.receiptStripeRefInfo}>
            <div className={styles.receiptStripeRefTitle}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              原因 / 备忘或参考 (Reference)
            </div>
            <p className={styles.receiptStripeRefHint}>
              必须完整填写至银行转账「附言 / 备注」栏，用于自动对账入账。
            </p>
          </div>
          <CopyButton value={transactionId} label="付款参考号" variant="inlineRef" />
        </div>

        <div className={styles.receiptStripeFieldList}>
          {receiverName && (
            <BankFieldRow label="收款人姓名" value={receiverName} copyLabel="收款人姓名" />
          )}
          {accountNumber && (
            <BankFieldRow label="收款账号" value={accountNumber} copyLabel="收款账号" mono />
          )}
          {bankName && (
            <BankFieldRow label="银行名称" value={bankName} copyLabel="银行名称" />
          )}
          {bankAddress && (
            <BankFieldRow label="银行地址" value={bankAddress} copyLabel="银行地址" multiline />
          )}
          {swiftCode && (
            <BankFieldRow label="SWIFT / BIC" value={swiftCode} copyLabel="SWIFT Code" mono />
          )}
          {clearingCode && (
            <BankFieldRow label="结算代码 (Clearing Code)" value={clearingCode} copyLabel="结算代码" mono />
          )}
        </div>
      </div>
    </section>
  );
}
