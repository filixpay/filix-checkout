'use client';

import styles from '@/app/checkout.module.css';
import type { PaymentMethod, WalletAccount } from '@/types/checkout';
import { maskEmailsInText } from '@/lib/mask';
import WalletAccountPanel from './WalletAccountPanel';

interface PaymentMethodButtonProps {
  method: PaymentMethod;
  selected: boolean;
  onSelect: (channelCode: string, configId: string) => void;
  loading?: boolean;
  totalAmount?: number;
  currency?: string;
  authenticated?: boolean;
  loginLabel?: string | null;
  sellerName?: string;
  sellerCode?: string | number | null;
  selectedWalletCode?: string | number | null;
  onSelectWalletAccount?: (account: WalletAccount) => void;
  onLoginRequest?: () => void;
  onSwitchAccount?: () => void;
  walletAccountRequired?: boolean;
  walletInlineError?: string | null;
}

function getAccordionContent(method: PaymentMethod) {
  const code = method.channelCode.toUpperCase();

  if (code === 'WALLET') {
    // Wallet accounts / login / empty states render via WalletAccountPanel.
    return null;
  }

  if (code === 'RECEIPT') {
    return {
      variant: 'info' as const,
      title: '转账须知',
      body: '点击「前往付款」后将生成专属银行收款账号及付款参考号。提交银行水单后 1–2 个工作日内完成对账入账。',
    };
  }

  if (method.sandbox && method.testAccountDescription) {
    return {
      variant: 'warning' as const,
      title: '沙箱测试信息',
      body: method.testAccountDescription,
    };
  }

  if (code === 'CRYPTO' || code === 'NOWPAYMENTS') {
    return {
      variant: 'info' as const,
      title: '链上转账',
      body: method.hint || '系统将生成精确转账金额与收款地址，请在有效期内完成链上转账。',
    };
  }

  if (code === 'CREDIT' && method.creditAccounts?.length) {
    const account = method.creditAccounts[0];
    return {
      variant: 'info' as const,
      title: '信用额度',
      body: `${account.name} 可用额度：${account.availableAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    };
  }

  if (method.hint) {
    return {
      variant: 'info' as const,
      title: '提示',
      body: method.hint,
    };
  }

  return null;
}

export default function PaymentMethodButton({
  method,
  selected,
  onSelect,
  loading,
  totalAmount = 0,
  currency = 'CNY',
  authenticated = false,
  loginLabel,
  sellerName,
  sellerCode,
  selectedWalletCode,
  onSelectWalletAccount,
  onLoginRequest,
  onSwitchAccount,
  walletAccountRequired = false,
  walletInlineError = null,
}: PaymentMethodButtonProps) {
  const isWallet = method.channelCode === 'WALLET';
  const isCredit = method.channelCode === 'CREDIT';
  // Keep WALLET/CREDIT selectable so users can open login / empty-state guidance.
  const effectivelyEnabled = method.enabled || isWallet || isCredit;
  const accordion = selected && !isWallet ? getAccordionContent(method) : null;
  const walletAccounts = method.walletAccounts || [];

  return (
    <div className={styles.paymentItemWrapper}>
      <button
        type="button"
        className={`${styles.paymentBtn} ${selected ? styles.paymentBtnSelected : ''}`}
        disabled={!effectivelyEnabled}
        onClick={() => effectivelyEnabled && onSelect(method.channelCode, method.configId)}
        aria-pressed={selected}
      >
        <div className={styles.methodInfo}>
          <div className={styles.methodIconWrap}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              className={styles.methodIcon}
              src={`/icons/${method.channelCode.toLowerCase()}.svg`}
              alt=""
              onError={(e) => {
                (e.target as HTMLImageElement).src =
                  method.iconUrl || 'https://cdn-icons-png.flaticon.com/512/263/263142.png';
              }}
            />
          </div>
          <div>
            <div className={styles.methodName}>
              {method.displayName}
              {method.sandbox && <span className={styles.sandboxTag}>Sandbox</span>}
            </div>
            {!selected && method.hint && (
              <div className={styles.methodHint}>{maskEmailsInText(method.hint)}</div>
            )}
          </div>
        </div>
        {selected && loading ? (
          <div className={styles.loadingSpinner} />
        ) : selected ? (
          <div className={styles.methodSelectedMark} aria-hidden>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        ) : null}
      </button>

      {selected && isWallet && onSelectWalletAccount && onLoginRequest && (
        <WalletAccountPanel
          accounts={walletAccounts}
          selectedCode={selectedWalletCode}
          totalAmount={totalAmount}
          currency={currency}
          hint={method.hint}
          emptyReason={method.walletEmptyReason}
          loginLabel={loginLabel}
          sellerName={sellerName}
          sellerCode={sellerCode}
          authenticated={authenticated}
          onSelect={onSelectWalletAccount}
          onLogin={onLoginRequest}
          onSwitchAccount={onSwitchAccount}
          accountRequired={walletAccountRequired}
          inlineError={walletInlineError}
        />
      )}

      {accordion && (
        <div
          className={`${styles.methodAccordion} ${
            accordion.variant === 'warning' ? styles.methodAccordionWarning : ''
          }`}
        >
          <div className={styles.methodAccordionTitle}>
            {accordion.variant === 'warning' ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
            )}
            <span>{accordion.title}</span>
          </div>
          <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{accordion.body}</p>
        </div>
      )}
    </div>
  );
}
