'use client';

import styles from '@/app/checkout.module.css';
import type { WalletAccount } from '@/types/checkout';

interface WalletSelectorProps {
  accounts: WalletAccount[];
  totalAmount: number;
  currency: string;
  onSelect: (account: WalletAccount) => void;
  onClose: () => void;
}

export default function WalletSelector({ accounts, totalAmount, currency, onSelect, onClose }: WalletSelectorProps) {
  return (
    <div className={styles.walletSelectorOverlay}>
      <div className={styles.walletSelector}>
        <h2 className={styles.qrTitle}>选择支付钱包</h2>
        <p className={styles.qrSubtitle}>请选择一个余额充足的钱包账户</p>
        
        <div className={styles.walletList}>
          {accounts.map((account) => {
            // Advisory balance: null = unknown (do not block). Real 0 may be insufficient.
            const balanceUnknown = account.balance == null;
            const isInsufficient =
              !balanceUnknown && Number(account.balance) < totalAmount;

            return (
              <button
                key={String(account.code)}
                className={styles.walletItem}
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
                          {account.currency} {Number(account.balance).toFixed(2)}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                {isInsufficient && (
                  <div className={styles.methodHint} style={{ color: '#ef4444' }}>余额不足</div>
                )}
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="m9 18 6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            );
          })}
        </div>

        <button className={styles.actionBtn} style={{ marginTop: 24, background: '#f1f5f9', color: '#64748b' }} onClick={onClose}>
          取消
        </button>
      </div>
    </div>
  );
}
