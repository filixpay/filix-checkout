'use client';

import styles from '@/app/checkout.module.css';
import type { CreditAccount } from '@/types/checkout';

interface CreditSelectorProps {
  accounts: CreditAccount[];
  totalAmount: number;
  currency: string;
  onSelect: (account: CreditAccount) => void;
  onClose: () => void;
}

export default function CreditSelector({ accounts, totalAmount, currency, onSelect, onClose }: CreditSelectorProps) {
  return (
    <div className={styles.walletSelectorOverlay}>
      <div className={styles.walletSelector}>
        <h2 className={styles.qrTitle}>选择支付方式</h2>
        <p className={styles.qrSubtitle}>请选择一个可用的信用支付账户</p>
        
        <div className={styles.walletList}>
          {accounts.map((account) => {
            const isInsufficient = account.availableAmount < totalAmount;
            
            return (
              <button
                key={account.code}
                className={styles.walletItem}
                disabled={isInsufficient}
                onClick={() => !isInsufficient && onSelect(account)}
              >
                <div className={styles.walletItemInfo}>
                  <div className={styles.walletLabel}>{account.name}</div>
                  <div className={styles.walletBalance}>
                    可用额度: <span className={styles.walletBalanceValue}>{currency} {account.availableAmount.toFixed(2)}</span>
                  </div>
                </div>
                {isInsufficient && (
                  <div className={styles.methodHint} style={{ color: '#ef4444' }}>额度不足</div>
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
