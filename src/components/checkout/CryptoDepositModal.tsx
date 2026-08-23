'use client';

import { QRCodeSVG } from 'qrcode.react';
import styles from '@/app/checkout.module.css';

interface CryptoDepositModalProps {
  instructionHtml: string;
  depositAddress?: string;
  invoiceAmount?: string;
  payAmount?: string;
  asset?: string;
  chain?: string;
  expireAt?: string;
  onClose: () => void;
  showToast: (msg: string, type: 'success' | 'error') => void;
}

function formatExpireAt(iso?: string): string | null {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleString('zh-CN', { hour12: false });
  } catch {
    return iso;
  }
}

function truncateAddress(address: string): string {
  if (address.length <= 16) return address;
  return `${address.slice(0, 8)}…${address.slice(-8)}`;
}

export default function CryptoDepositModal({
  instructionHtml,
  depositAddress,
  invoiceAmount,
  payAmount,
  asset = 'USDT',
  chain = 'TRON',
  expireAt,
  onClose,
  showToast,
}: CryptoDepositModalProps) {
  const isStaticV2 = Boolean(payAmount);
  const assetLabel = asset || 'USDT';
  const chainLabel = chain || 'TRON';
  const expireLabel = formatExpireAt(expireAt);

  const copyText = async (text: string, successMsg: string) => {
    try {
      await navigator.clipboard.writeText(text);
      showToast(successMsg, 'success');
    } catch {
      showToast('复制失败，请手动选择', 'error');
    }
  };

  return (
    <div className={styles.receiptModalOverlay}>
      <div className={styles.receiptModal}>
        <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="关闭">
          ×
        </button>
        <div className={styles.receiptModalContent}>
          {isStaticV2 ? (
            <div className={styles.cryptoStaticPanel}>
              <h2 className={styles.cryptoTitle}>
                {assetLabel} ({chainLabel}) 充值
              </h2>

              {invoiceAmount && (
                <div className={styles.cryptoAmountRow}>
                  <span className={styles.cryptoAmountLabel}>订单金额</span>
                  <span className={styles.cryptoAmountValue}>
                    {invoiceAmount} {assetLabel}
                  </span>
                </div>
              )}

              <div className={styles.cryptoPayAmountBox}>
                <span className={styles.cryptoAmountLabel}>请转账精确金额</span>
                <span className={styles.cryptoPayAmount}>{payAmount}</span>
                <span className={styles.cryptoPayAmountUnit}>{assetLabel}</span>
                <button
                  type="button"
                  onClick={() => copyText(payAmount!, '转账金额已复制')}
                  className={`${styles.receiptBtn} ${styles.receiptBtnPrimary}`}
                  style={{ width: '100%', marginTop: 12 }}
                >
                  复制转账金额
                </button>
              </div>

              {depositAddress && (
                <div className={styles.cryptoAddressBlock}>
                  <span className={styles.cryptoAmountLabel}>充值地址（固定）</span>
                  <code className={styles.cryptoAddressCode}>{truncateAddress(depositAddress)}</code>
                  <div className={styles.cryptoExtras}>
                    <div className={styles.qrCodeWrapper}>
                      <QRCodeSVG value={depositAddress} size={160} level="M" />
                    </div>
                    <p className={styles.qrHint}>扫码或复制地址，转入上方精确金额</p>
                    <button
                      type="button"
                      onClick={() => copyText(depositAddress, '地址已复制')}
                      className={`${styles.receiptBtn} ${styles.receiptBtnPrimary}`}
                      style={{ width: '100%' }}
                    >
                      复制充值地址
                    </button>
                  </div>
                </div>
              )}

              {expireLabel && (
                <p className={styles.cryptoExpire}>有效期至：{expireLabel}</p>
              )}

              <p className={styles.cryptoWarning}>
                转账金额必须与「请转账精确金额」<strong>完全一致</strong>，否则无法自动到账。
              </p>
            </div>
          ) : (
            <>
              <div
                dangerouslySetInnerHTML={{
                  __html: instructionHtml.replace(/\/assets\/icons\//g, '/icons/'),
                }}
              />
              {depositAddress && (
                <div className={styles.cryptoExtras}>
                  <div className={styles.qrCodeWrapper}>
                    <QRCodeSVG value={depositAddress} size={160} level="M" />
                  </div>
                  <p className={styles.qrHint}>扫码或复制地址，转入不少于指定金额的 {assetLabel} (TRC20)</p>
                  <button
                    type="button"
                    onClick={() => copyText(depositAddress, '地址已复制')}
                    className={`${styles.receiptBtn} ${styles.receiptBtnPrimary}`}
                    style={{ width: '100%' }}
                  >
                    复制充值地址
                  </button>
                </div>
              )}
            </>
          )}

          <p className={styles.uploadNote} style={{ marginTop: 20 }}>
            链上到账后系统将自动确认，请勿关闭本页
          </p>
          <button type="button" className={styles.actionBtn} onClick={onClose} style={{ marginTop: 16 }}>
            我已完成转账
          </button>
        </div>
      </div>
    </div>
  );
}
