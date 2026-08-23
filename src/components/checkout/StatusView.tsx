'use client';

import styles from '@/app/checkout.module.css';
import type { CheckoutView, ResumeSummary } from '@/types/checkout';

export type StatusViewType =
  | 'success'
  | 'closed'
  | 'error'
  | 'blocked'
  | 'pending_review';

interface StatusViewProps {
  view?: CheckoutView;
  summary?: ResumeSummary;
  type: StatusViewType;
  errorMessage?: string;
}

function formatTimeShort(ts: string) {
  const d = new Date(ts);
  return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}

function goBackToMerchant(returnUrl?: string) {
  if (returnUrl) {
    window.location.href = returnUrl;
  } else if (document.referrer) {
    window.location.href = document.referrer;
  } else {
    window.close();
  }
}

function displayAmount(amount: number, currency?: string) {
  return (
    <div className={styles.amountValue} style={{ marginBottom: 32 }}>
      <span className={styles.currencySymbol}>{currency || 'USD'}</span>
      {amount.toFixed(2)}
    </div>
  );
}

export default function StatusView({ view, summary, type, errorMessage }: StatusViewProps) {
  const merchantName = view?.merchantName || summary?.merchantName || '';
  const tradeNo = view?.tradeNo || summary?.tradeNo || '';
  const currency = view?.currency || summary?.currency;
  const amount = view?.totalAmount ?? summary?.amount;

  if (type === 'success') {
    return (
      <div className={`${styles.statusView} ${styles.statusSuccess}`}>
        <div className={styles.statusIcon}>✓</div>
        <h2 className={styles.statusTitle}>{view?.statusText || '支付成功'}</h2>
        <p className={styles.statusMsg}>已成功向 {merchantName} 支付</p>
        {amount != null && displayAmount(amount, currency)}
        <div className={styles.orderDetails} style={{ marginBottom: 32 }}>
          {tradeNo && (
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>交易单号</span>
              <span className={styles.detailValue}>{tradeNo}</span>
            </div>
          )}
          {view?.paidTime && (
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>成交时间</span>
              <span className={styles.detailValue}>{formatTimeShort(view.paidTime)}</span>
            </div>
          )}
        </div>
        <div className={styles.successMessage}>感谢您的付款！</div>
      </div>
    );
  }

  if (type === 'blocked') {
    return (
      <div className={`${styles.statusView} ${styles.statusBlocked}`}>
        <div className={styles.statusIcon}>!</div>
        <h2 className={styles.statusTitle}>支付已被拦截</h2>
        <p className={styles.statusMsg}>
          该笔支付未通过风控审核，无法继续。如有疑问请联系商户客服。
        </p>
        {tradeNo && (
          <div className={styles.orderDetails} style={{ marginBottom: 32 }}>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>交易单号</span>
              <span className={styles.detailValue}>{tradeNo}</span>
            </div>
          </div>
        )}
        <button className={styles.actionBtn} type="button" onClick={() => goBackToMerchant(view?.returnUrl)}>
          返回商户
        </button>
      </div>
    );
  }

  if (type === 'pending_review') {
    return (
      <div className={`${styles.statusView} ${styles.statusPendingReview}`}>
        <div className={styles.statusIcon}>⏳</div>
        <h2 className={styles.statusTitle}>支付待审核</h2>
        <p className={styles.statusMsg}>
          您的支付已提交人工审核，请耐心等待。审核通过后您将收到继续支付的通知链接。
        </p>
        {tradeNo && (
          <div className={styles.orderDetails} style={{ marginBottom: 32 }}>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>交易单号</span>
              <span className={styles.detailValue}>{tradeNo}</span>
            </div>
          </div>
        )}
        <button className={styles.actionBtnSecondary} type="button" onClick={() => goBackToMerchant(view?.returnUrl)}>
          返回商户
        </button>
      </div>
    );
  }

  if (type === 'closed') {
    return (
      <div className={`${styles.statusView} ${styles.statusError}`}>
        <div className={styles.statusIcon}>×</div>
        <h2 className={styles.statusTitle}>订单已关闭</h2>
        <p className={styles.statusMsg}>该订单已超时或被主动关闭，无法继续支付</p>
        <div className={styles.orderDetails} style={{ marginBottom: 32 }}>
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>订单号</span>
            <span className={styles.detailValue}>{tradeNo}</span>
          </div>
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>商户</span>
            <span className={styles.detailValue}>{merchantName}</span>
          </div>
        </div>
        <button className={styles.actionBtn} type="button" onClick={() => goBackToMerchant()}>
          返回商户
        </button>
      </div>
    );
  }

  return (
    <div className={`${styles.statusView} ${styles.statusError}`}>
      <div className={styles.statusIcon}>⚠️</div>
      <h2 className={styles.statusTitle}>出错了</h2>
      <p className={styles.statusMsg}>{errorMessage || '请稍后重试'}</p>
      <button className={styles.actionBtn} type="button" onClick={() => location.reload()}>
        重试
      </button>
    </div>
  );
}
