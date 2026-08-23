'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import styles from '@/app/checkout.module.css';
import type { CryptoDepositSession, ReceiptSession, ResumeSummary } from '@/types/checkout';
import StatusView from './StatusView';
import QrModal from './QrModal';
import ReceiptModal from './ReceiptModal';
import CryptoDepositModal from './CryptoDepositModal';
import { handlePaymentSessionResponse } from '@/lib/payment-handoff';

type PageState = 'loading' | 'ready' | 'error' | 'blocked' | 'pending_review' | 'success';

function formatExpireAt(iso?: string) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString('zh-CN', { hour12: false });
}

function LoadingSkeleton() {
  return (
    <div className={styles.statusView}>
      <div className={styles.skeleton} style={{ width: 80, height: 80, borderRadius: 40, margin: '0 auto 24px' }} />
      <div className={styles.skeleton} style={{ width: 180, height: 24, margin: '0 auto 12px' }} />
      <div className={styles.skeleton} style={{ width: 240, height: 16, margin: '0 auto 32px' }} />
      <div className={styles.skeleton} style={{ width: '100%', height: 48, borderRadius: 12 }} />
    </div>
  );
}

export default function ResumeClient() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [state, setState] = useState<PageState>('loading');
  const [error, setError] = useState('');
  const [summary, setSummary] = useState<ResumeSummary | null>(null);
  const [continuing, setContinuing] = useState(false);
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<ReceiptSession | null>(null);
  const [cryptoDeposit, setCryptoDeposit] = useState<CryptoDepositSession | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    setToast({ message, type });
  }, []);

  const loadSummary = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`/api/checkout/resume/${encodeURIComponent(token)}`);
      const data = await res.json();

      if (res.status === 404 || data.code === 'RESUME_TOKEN_INVALID') {
        setError('续跑链接无效或已过期，请联系商户重新获取');
        setState('error');
        return;
      }

      if (data.code !== 'SUCCESS' || !data.data) {
        setError(data.message || '加载失败，请稍后重试');
        setState('error');
        return;
      }

      const peek: ResumeSummary = data.data;
      setSummary(peek);

      if (peek.tradeStatus === 'REJECTED') {
        setState('blocked');
        return;
      }
      if (peek.tradeStatus === 'PENDING_REVIEW') {
        setState('pending_review');
        return;
      }
      if (peek.tradeStatus !== 'READY_FOR_AUTH') {
        setError(`当前支付状态（${peek.tradeStatus || '未知'}）无法继续`);
        setState('error');
        return;
      }

      setState('ready');
    } catch {
      setError('服务暂时不可用，请稍后重试');
      setState('error');
    }
  }, [token]);

  useEffect(() => {
    if (!token) {
      setError('缺少续跑凭证，请通过通知中的完整链接进入');
      setState('error');
      return;
    }
    loadSummary();
  }, [token, loadSummary]);

  const handleContinue = async () => {
    if (!token) return;
    setContinuing(true);

    try {
      const res = await fetch(
        `/api/checkout/resume/${encodeURIComponent(token)}/continue`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: '{}',
        },
      );

      const outcome = await handlePaymentSessionResponse(res, {
        onImmediateSuccess: () => setState('success'),
        onReceipt: (value) =>
          setReceipt({
            ...value,
            amount: value.amount ?? summary?.amount,
            currency: value.currency ?? summary?.currency ?? 'USD',
          }),
        onCryptoDeposit: (session) => setCryptoDeposit(session),
        onQr: (url) => setQrUrl(url),
        onError: (message) => showToast(message, 'error'),
      });

      if (outcome === 'blocked') {
        setState('blocked');
      } else if (outcome === 'pending_review') {
        setState('pending_review');
      } else if (outcome === 'failed') {
        // toast already shown
      }
    } catch {
      showToast('网络错误或服务暂时不可用，请稍后重试', 'error');
    } finally {
      setContinuing(false);
    }
  };

  const renderContent = () => {
    if (state === 'loading') {
      return <LoadingSkeleton />;
    }

    if (state === 'error') {
      return <StatusView type="error" errorMessage={error} />;
    }

    if (state === 'blocked') {
      return <StatusView type="blocked" summary={summary ?? undefined} />;
    }

    if (state === 'pending_review') {
      return <StatusView type="pending_review" summary={summary ?? undefined} />;
    }

    if (state === 'success') {
      return <StatusView type="success" summary={summary ?? undefined} />;
    }

    if (!summary) return null;

    const currency = summary.currency || 'CNY';
    const expires = formatExpireAt(summary.resumeExpireAt);

    return (
      <>
        <div className={styles.cardHeader}>
          <div className={styles.merchantInfo}>
            <div className={styles.merchantLogo}>
              {(summary.merchantName || 'M').charAt(0)}
            </div>
            <div className={styles.merchantName}>{summary.merchantName || '商户'}</div>
          </div>
          <div className={styles.amountContainer}>
            <div className={styles.amountLabel}>待支付金额</div>
            <div className={styles.amountValue}>
              <span className={styles.currencySymbol}>{currency}</span>
              {(summary.amount ?? 0).toFixed(2)}
            </div>
          </div>
          {expires && (
            <div className={styles.timerContainer}>
              <span>续跑链接有效期至 {expires}</span>
            </div>
          )}
        </div>

        <div className={styles.cardContent}>
          <div className={styles.resumeNotice}>
            风控审核已通过，请点击下方按钮继续完成支付。链接仅可使用一次。
          </div>

          <div className={styles.orderDetails}>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>商品描述</span>
              <span className={styles.detailValue}>{summary.subject || '商品支付'}</span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>交易单号</span>
              <span className={styles.detailValue}>{summary.tradeNo || '-'}</span>
            </div>
            {summary.channelCode && (
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>支付方式</span>
                <span className={styles.detailValue}>{summary.channelCode}</span>
              </div>
            )}
          </div>

          <button
            className={styles.actionBtn}
            type="button"
            disabled={continuing}
            onClick={handleContinue}
          >
            {continuing ? '处理中…' : '继续支付'}
          </button>
        </div>
      </>
    );
  };

  return (
    <>
      <div className={styles.checkoutCard}>{renderContent()}</div>

      <div className={styles.footerSecurity}>
        <div className={styles.copyright}>© 2026 FilixPay Safe Payment Service</div>
      </div>

      {qrUrl && (
        <QrModal
          url={qrUrl}
          onClose={() => {
            setQrUrl(null);
          }}
        />
      )}

      {receipt && (
        <ReceiptModal
          html={receipt.html}
          transactionId={receipt.transactionId}
          uploadUrl={receipt.uploadUrl}
          receiverName={receipt.receiverName}
          accountNumber={receipt.accountNumber}
          bankName={receipt.bankName}
          bankAddress={receipt.bankAddress}
          swiftCode={receipt.swiftCode}
          clearingCode={receipt.clearingCode}
          amount={receipt.amount}
          currency={receipt.currency}
          onClose={() => setReceipt(null)}
          onUploadSuccess={() => setState('success')}
          showToast={showToast}
        />
      )}

      {cryptoDeposit && (
        <CryptoDepositModal
          instructionHtml={cryptoDeposit.html}
          depositAddress={cryptoDeposit.depositAddress}
          invoiceAmount={cryptoDeposit.invoiceAmount}
          payAmount={cryptoDeposit.payAmount}
          asset={cryptoDeposit.asset}
          chain={cryptoDeposit.chain}
          expireAt={cryptoDeposit.expireAt}
          onClose={() => setCryptoDeposit(null)}
          showToast={showToast}
        />
      )}

      {toast && (
        <div className={`${styles.toast} ${styles.toastError}`}>
          <div className={styles.toastContent}>
            <span>{toast.message}</span>
          </div>
        </div>
      )}
    </>
  );
}
