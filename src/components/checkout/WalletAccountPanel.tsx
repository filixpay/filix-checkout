'use client';

import styles from '@/app/checkout.module.css';
import type { WalletAccount } from '@/types/checkout';
import { maskEmailsInText } from '@/lib/mask';

interface WalletAccountPanelProps {
  accounts: WalletAccount[];
  selectedCode?: string | number | null;
  totalAmount: number;
  currency: string;
  hint?: string;
  emptyReason?: string;
  loginLabel?: string | null;
  sellerName?: string;
  sellerCode?: string | number | null;
  authenticated: boolean;
  onSelect: (account: WalletAccount) => void;
  onLogin: () => void;
  onSwitchAccount?: () => void;
  /** Inline validation — no account selected when required */
  accountRequired?: boolean;
  /** API or business-rule error shown inline (not toast) */
  inlineError?: string | null;
}

function accountKey(account: WalletAccount) {
  return String(account.code);
}

function formatBalance(account: WalletAccount) {
  if (account.balance == null) return null;
  const value = Number(account.balance);
  if (!Number.isFinite(value)) return null;
  return value;
}

function resolveEmptyReason(emptyReason?: string, hint?: string) {
  if (emptyReason) return emptyReason;
  if (hint && (hint.includes('买卖双方') || hint.includes('SAME_PARTY') || hint.includes('收款方本身'))) {
    return 'SAME_PARTY_AS_SELLER';
  }
  return emptyReason;
}

function emptyStateCopy(emptyReason?: string, hint?: string) {
  const safeHint = hint ? maskEmailsInText(hint) : undefined;
  switch (resolveEmptyReason(emptyReason, hint)) {
    case 'SAME_PARTY_AS_SELLER':
      return {
        title: '买卖双方不能是同一商户',
        body:
          safeHint ||
          '当前登录账号可访问的商户就是本单收款方，余额支付要求付款方与收款方为不同商户。请使用其他企业账户登录后重试。',
      };
    case 'NO_IDENTITY':
      return {
        title: '尚未绑定商户身份',
        body: safeHint || '请先在商户后台完成入驻绑定，或使用浏览器无痕模式更换账号后重试。',
      };
    case 'UNAUTHENTICATED':
      return {
        title: '需要登录',
        body: safeHint || '请先登录后选择付款商户账户',
      };
    case 'NO_PAYER_MERCHANT':
    default:
      return {
        title: '暂无可用付款商户',
        body:
          safeHint ||
          '当前登录账号没有可用来付款的商户账户。请开通企业账户，或使用浏览器无痕模式更换账号后重试。',
      };
  }
}

export default function WalletAccountPanel({
  accounts,
  selectedCode,
  totalAmount,
  currency,
  hint,
  emptyReason,
  loginLabel,
  sellerName,
  sellerCode,
  authenticated,
  onSelect,
  onLogin,
  onSwitchAccount,
  accountRequired = false,
  inlineError = null,
}: WalletAccountPanelProps) {
  if (!authenticated) {
    const copy = emptyStateCopy('UNAUTHENTICATED', hint);
    return (
      <div className={`${styles.methodAccordion} ${styles.methodAccordionWarning}`}>
        <div className={styles.methodAccordionTitle}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
          <span>{copy.title}</span>
        </div>
        <p style={{ margin: '0 0 12px' }}>{copy.body}</p>
        <button type="button" className={styles.walletInlineLoginBtn} onClick={onLogin}>
          登录并选择商户账户
        </button>
      </div>
    );
  }

  if (!accounts.length) {
    const copy = emptyStateCopy(emptyReason, hint);
    return (
      <div className={`${styles.methodAccordion} ${styles.methodAccordionWarning}`}>
        <div className={styles.methodAccordionTitle}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <span>{copy.title}</span>
        </div>
        <div className={styles.walletEmptyMeta}>
          {loginLabel ? (
            <div>
              当前登录：<strong>{loginLabel}</strong>
            </div>
          ) : null}
          {sellerCode != null || sellerName ? (
            <div>
              本单收款方：
              <strong>
                {sellerName || '商户'}
                {sellerCode != null ? `（${sellerCode}）` : ''}
              </strong>
            </div>
          ) : null}
        </div>
        <p style={{ margin: '0 0 12px', whiteSpace: 'pre-wrap' }}>{copy.body}</p>
        {onSwitchAccount ? (
          <button type="button" className={styles.walletInlineLoginBtn} onClick={onSwitchAccount}>
            切换账号重新登录
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div
      className={`${styles.walletInlinePanel} ${
        accountRequired || inlineError ? styles.walletInlinePanelError : ''
      }`}
    >
      <div className={styles.walletInlineTitle}>
        选择付款商户账户
        {loginLabel ? <span className={styles.walletInlineLoginHint}>登录：{loginLabel}</span> : null}
      </div>
      {accountRequired ? (
        <p className={styles.walletInlineValidation} role="alert">
          请选择付款商户账户
        </p>
      ) : null}
      {inlineError ? (
        <p className={styles.walletInlineValidation} role="alert">
          {inlineError}
        </p>
      ) : null}
      <div className={styles.walletInlineList}>
        {accounts.map((account) => {
          const balance = formatBalance(account);
          const balanceUnknown = balance == null;
          const isInsufficient = !balanceUnknown && balance < totalAmount;
          const selected = selectedCode != null && accountKey(account) === String(selectedCode);

          return (
            <button
              key={accountKey(account)}
              type="button"
              className={`${styles.walletInlineItem} ${selected ? styles.walletInlineItemSelected : ''}`}
              disabled={isInsufficient}
              onClick={() => !isInsufficient && onSelect(account)}
            >
              <div className={styles.walletItemInfo}>
                <div className={styles.walletLabel}>{account.name}</div>
                <div className={styles.walletBalance}>
                  {balanceUnknown ? (
                    <span className={styles.walletBalanceValue}>提交时将校验可用余额</span>
                  ) : (
                    <>
                      可用余额:{' '}
                      <span className={styles.walletBalanceValue}>
                        {account.currency || currency} {balance.toFixed(2)}
                      </span>
                    </>
                  )}
                </div>
              </div>
              {isInsufficient ? (
                <span className={styles.methodHint} style={{ color: '#ef4444' }}>
                  余额不足
                </span>
              ) : selected ? (
                <div className={styles.methodSelectedMark} aria-hidden>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
