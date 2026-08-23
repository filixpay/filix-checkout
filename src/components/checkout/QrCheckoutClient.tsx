'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import type { QrPaymentCodeResponse, QrPaymentRequest } from '@/types/checkout';

const currencyMap: Record<string, { symbol: string; name: string; flag: string }> = {
  CNY: { symbol: '¥', name: '人民币 CNY', flag: '🇨🇳' },
  USD: { symbol: '$', name: '美元 USD', flag: '🇺🇸' },
  EUR: { symbol: '€', name: '欧元 EUR', flag: '🇪🇺' },
  HKD: { symbol: 'HK$', name: '港币 HKD', flag: '🇭🇰' },
};

// Toast component
function Toast({ message, type, onDone }: { message: string; type: 'success' | 'error'; onDone: () => void }) {
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setFadeOut(true);
      setTimeout(onDone, 300);
    }, 3500);
    return () => clearTimeout(timer);
  }, [type, onDone]);

  return (
    <div className={`qr-toast ${type === 'error' ? 'qr-toast-error' : 'qr-toast-success'} ${fadeOut ? 'qr-toast-out' : ''}`}>
      <div className="qr-toast-icon">
        {type === 'error' ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </div>
      <span>{message}</span>
    </div>
  );
}

export default function QrCheckoutClient() {
  const searchParams = useSearchParams();
  const loc = searchParams.get('loc');

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [qrData, setQrData] = useState<QrPaymentCodeResponse['data'] | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);

  // Form state
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('CNY');
  const [payerNote, setPayerNote] = useState('');
  const amountInputRef = useRef<HTMLInputElement>(null);

  const loadQrMetadata = useCallback(async () => {
    if (!loc) return;
    try {
      const res = await fetch(`/api/checkout/payment-code?loc=${encodeURIComponent(loc)}`);
      if (!res.ok) {
        setError('无效的收款码，请重试');
        setLoading(false);
        return;
      }
      const data: QrPaymentCodeResponse = await res.json();
      if (data.code !== 'SUCCESS') {
        setError(data.message || '加载失败');
        setLoading(false);
        return;
      }
      setQrData(data.data);
      setLoading(false);
    } catch {
      setError('服务暂时不可用，请稍后重试');
      setLoading(false);
    }
  }, [loc]);

  useEffect(() => {
    if (!loc) {
      setError('缺少收款码信息');
      setLoading(false);
      return;
    }
    loadQrMetadata();
  }, [loc, loadQrMetadata]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loc || !amount || Number(amount) <= 0) {
      setToast({ message: '请输入有效的支付金额', type: 'error' });
      return;
    }

    setSubmitting(true);
    try {
      const requestData: QrPaymentRequest = {
        loc,
        amount: Number(amount),
        currency,
        payerNote: payerNote || undefined
      };

      const res = await fetch('/api/checkout/create-order-from-qr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData)
      });

      const result = await res.json();
      if (result.code === 'SUCCESS') {
        const paymentToken = result.data?.token;
        if (paymentToken) {
          window.location.href = `/?token=${encodeURIComponent(paymentToken)}`;
        } else {
          setToast({ message: '订单创建成功，但未能获取支付令牌', type: 'error' });
          setSubmitting(false);
        }
      } else {
        setToast({ message: result.message || '创建订单失败', type: 'error' });
        setSubmitting(false);
      }
    } catch {
      setToast({ message: '网络错误，请稍后重试', type: 'error' });
      setSubmitting(false);
    }
  };

  const cur = currencyMap[currency] || currencyMap.CNY;

  // ─── Loading ───
  if (loading) {
    return (
      <div className="qr-page">
        <div className="qr-card">
          <div className="qr-skeleton-header">
            <div className="qr-skeleton qr-sk-avatar" />
            <div className="qr-skeleton qr-sk-name" />
            <div className="qr-skeleton qr-sk-loc" />
          </div>
          <div className="qr-skeleton-body">
            <div className="qr-skeleton qr-sk-amount" />
            <div className="qr-skeleton qr-sk-row" />
            <div className="qr-skeleton qr-sk-row" />
            <div className="qr-skeleton qr-sk-btn" />
          </div>
        </div>
        <style>{pageStyles}</style>
      </div>
    );
  }

  // ─── Error ───
  if (error) {
    return (
      <div className="qr-page">
        <div className="qr-card">
          <div className="qr-error-view">
            <div className="qr-error-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="1.5">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <h2>出错了</h2>
            <p>{error}</p>
            <button onClick={() => window.location.reload()} className="qr-retry-btn">重新加载</button>
          </div>
        </div>
        <style>{pageStyles}</style>
      </div>
    );
  }

  // ─── Main UI ───
  return (
    <div className="qr-page">
      <div className="qr-card">
        {/* ── Merchant Header ── */}
        <div className="qr-header">
          <div className="qr-merchant-avatar">
            {qrData?.merchantName?.charAt(0) || 'F'}
          </div>
          <div className="qr-merchant-name">{qrData?.merchantName}</div>
          <div className="qr-location-badge">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            {qrData?.locationName}
          </div>
        </div>

        {/* ── Amount Input Area ── */}
        <form onSubmit={handleSubmit}>
          <div className="qr-amount-section">
            <div className="qr-amount-label">付款金额</div>
            <div className="qr-amount-row" onClick={() => amountInputRef.current?.focus()}>
              <span className="qr-currency-sign">{cur.symbol}</span>
              <input
                ref={amountInputRef}
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="qr-amount-input"
                autoFocus
                required
              />
            </div>
          </div>

          {/* ── Currency Selector ── */}
          <div className="qr-field-section">
            <label className="qr-field-label">币种</label>
            <button
              type="button"
              className="qr-currency-btn"
              onClick={() => setShowCurrencyPicker(!showCurrencyPicker)}
            >
              <span className="qr-currency-flag">{cur.flag}</span>
              <span className="qr-currency-text">{cur.name}</span>
              <svg className={`qr-currency-arrow ${showCurrencyPicker ? 'open' : ''}`} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>
            {showCurrencyPicker && (
              <div className="qr-currency-dropdown">
                {Object.entries(currencyMap).map(([code, info]) => (
                  <button
                    key={code}
                    type="button"
                    className={`qr-currency-option ${currency === code ? 'active' : ''}`}
                    onClick={() => { setCurrency(code); setShowCurrencyPicker(false); }}
                  >
                    <span className="qr-currency-flag">{info.flag}</span>
                    <span>{info.name}</span>
                    {currency === code && (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="3">
                        <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ── Note ── */}
          <div className="qr-field-section">
            <label className="qr-field-label">付款备注 <span className="qr-optional">选填</span></label>
            <input
              type="text"
              placeholder="添加备注信息..."
              value={payerNote}
              onChange={(e) => setPayerNote(e.target.value)}
              className="qr-note-input"
              maxLength={120}
            />
          </div>

          {/* ── Submit Button ── */}
          <button
            type="submit"
            disabled={submitting || !amount || Number(amount) <= 0}
            className="qr-submit-btn"
          >
            {submitting ? (
              <><div className="qr-spinner" />处理中...</>
            ) : (
              <>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <rect x="1" y="4" width="22" height="16" rx="2" />
                  <line x1="1" y1="10" x2="23" y2="10" />
                </svg>
                确认付款{amount && Number(amount) > 0 ? ` ${cur.symbol}${Number(amount).toFixed(2)}` : ''}
              </>
            )}
          </button>
        </form>

        {/* ── Footer ── */}
        <div className="qr-footer">
          <div className="qr-secure-row">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="11" width="18" height="11" rx="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            <span>安全加密支付 · SSL Protected</span>
          </div>
          <div className="qr-powered">Powered by <strong>FilixPay</strong></div>
        </div>
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onDone={() => setToast(null)} />}
      <style>{pageStyles}</style>
    </div>
  );
}

// ─── Inline scoped styles ───
const pageStyles = `
  .qr-page {
    position: fixed;
    inset: 0;
    background: linear-gradient(165deg, #f0f4ff 0%, #e8ecf7 40%, #f8f9fc 100%);
    display: flex;
    align-items: flex-start;
    justify-content: center;
    padding: 0;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
    z-index: 9999;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", sans-serif;
  }

  .qr-card {
    width: 100%;
    max-width: 440px;
    background: #fff;
    border-radius: 0 0 28px 28px;
    box-shadow: 0 8px 40px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04);
    padding-bottom: 24px;
    animation: qrSlideUp 0.5s cubic-bezier(0.16,1,0.3,1);
  }

  /* ── Header ── */
  .qr-header {
    background: linear-gradient(135deg, #6366f1 0%, #818cf8 100%);
    padding: 36px 24px 28px;
    text-align: center;
    border-radius: 0 0 28px 28px;
    position: relative;
  }

  .qr-merchant-avatar {
    width: 56px;
    height: 56px;
    background: rgba(255,255,255,0.2);
    backdrop-filter: blur(10px);
    border: 2px solid rgba(255,255,255,0.3);
    border-radius: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 26px;
    font-weight: 700;
    color: #fff;
    margin: 0 auto 12px;
    text-shadow: 0 1px 2px rgba(0,0,0,0.1);
  }

  .qr-merchant-name {
    font-size: 20px;
    font-weight: 700;
    color: #fff;
    margin-bottom: 10px;
    letter-spacing: -0.3px;
  }

  .qr-location-badge {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    background: rgba(255,255,255,0.15);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255,255,255,0.2);
    color: rgba(255,255,255,0.95);
    padding: 6px 14px;
    border-radius: 100px;
    font-size: 13px;
    font-weight: 500;
  }

  /* ── Amount Section ── */
  .qr-amount-section {
    padding: 28px 24px 0;
    text-align: center;
  }

  .qr-amount-label {
    font-size: 13px;
    font-weight: 600;
    color: #94a3b8;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    margin-bottom: 16px;
  }

  .qr-amount-row {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
    padding: 12px 0 20px;
    border-bottom: 2px solid #f1f5f9;
    cursor: text;
    transition: border-color 0.3s;
  }

  .qr-amount-row:focus-within {
    border-bottom-color: #6366f1;
  }

  .qr-currency-sign {
    font-size: 28px;
    font-weight: 600;
    color: #94a3b8;
    transition: color 0.3s;
  }

  .qr-amount-row:focus-within .qr-currency-sign {
    color: #6366f1;
  }

  .qr-amount-input {
    background: transparent;
    border: none;
    outline: none;
    font-size: 48px;
    font-weight: 800;
    color: #1e293b;
    width: 200px;
    text-align: left;
    font-family: 'Inter', -apple-system, sans-serif;
    caret-color: #6366f1;
    -moz-appearance: textfield;
  }

  .qr-amount-input::placeholder {
    color: #e2e8f0;
  }

  .qr-amount-input::-webkit-outer-spin-button,
  .qr-amount-input::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }

  /* ── Field Section ── */
  .qr-field-section {
    padding: 0 24px;
    margin-top: 24px;
  }

  .qr-field-label {
    display: block;
    font-size: 13px;
    font-weight: 600;
    color: #64748b;
    margin-bottom: 8px;
    padding-left: 2px;
  }

  .qr-optional {
    font-weight: 400;
    color: #94a3b8;
    font-size: 12px;
  }

  /* ── Currency Picker ── */
  .qr-currency-btn {
    display: flex;
    align-items: center;
    width: 100%;
    padding: 14px 16px;
    background: #f8fafc;
    border: 1.5px solid #e2e8f0;
    border-radius: 14px;
    cursor: pointer;
    transition: all 0.2s;
    font-family: inherit;
    font-size: 15px;
    color: #1e293b;
    gap: 10px;
  }

  .qr-currency-btn:hover {
    border-color: #cbd5e1;
    background: #f1f5f9;
  }

  .qr-currency-flag { font-size: 20px; }
  .qr-currency-text { flex: 1; text-align: left; font-weight: 500; }
  .qr-currency-arrow {
    transition: transform 0.25s;
    color: #94a3b8;
  }
  .qr-currency-arrow.open { transform: rotate(180deg); }

  .qr-currency-dropdown {
    margin-top: 6px;
    background: #fff;
    border: 1.5px solid #e2e8f0;
    border-radius: 14px;
    overflow: hidden;
    box-shadow: 0 8px 24px rgba(0,0,0,0.08);
    animation: qrDropIn 0.2s ease;
  }

  .qr-currency-option {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    padding: 14px 16px;
    background: transparent;
    border: none;
    border-bottom: 1px solid #f1f5f9;
    cursor: pointer;
    font-family: inherit;
    font-size: 15px;
    color: #334155;
    transition: background 0.15s;
  }

  .qr-currency-option:last-child { border-bottom: none; }
  .qr-currency-option:hover { background: #f8fafc; }
  .qr-currency-option.active {
    background: #f0f0ff;
    color: #6366f1;
    font-weight: 600;
  }

  /* ── Note Input ── */
  .qr-note-input {
    width: 100%;
    padding: 14px 16px;
    background: #f8fafc;
    border: 1.5px solid #e2e8f0;
    border-radius: 14px;
    font-family: inherit;
    font-size: 15px;
    color: #1e293b;
    transition: all 0.2s;
    outline: none;
  }

  .qr-note-input:focus {
    border-color: #6366f1;
    box-shadow: 0 0 0 4px rgba(99,102,241,0.08);
    background: #fff;
  }

  .qr-note-input::placeholder { color: #cbd5e1; }

  /* ── Submit Button ── */
  .qr-submit-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    width: calc(100% - 48px);
    margin: 32px 24px 0;
    padding: 17px;
    background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
    color: #fff;
    border: none;
    border-radius: 16px;
    font-size: 17px;
    font-weight: 700;
    font-family: inherit;
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.4,0,0.2,1);
    box-shadow: 0 4px 16px rgba(99,102,241,0.3);
    letter-spacing: 0.3px;
    position: relative;
    overflow: hidden;
  }

  .qr-submit-btn::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(135deg, rgba(255,255,255,0.15) 0%, transparent 100%);
    opacity: 0;
    transition: opacity 0.3s;
  }

  .qr-submit-btn:hover:not(:disabled)::before { opacity: 1; }

  .qr-submit-btn:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 8px 28px rgba(99,102,241,0.35);
  }

  .qr-submit-btn:active:not(:disabled) {
    transform: translateY(0);
    box-shadow: 0 2px 8px rgba(99,102,241,0.25);
  }

  .qr-submit-btn:disabled {
    opacity: 0.45;
    cursor: not-allowed;
    box-shadow: none;
  }

  /* ── Spinner ── */
  .qr-spinner {
    width: 20px;
    height: 20px;
    border: 2.5px solid rgba(255,255,255,0.3);
    border-top-color: #fff;
    border-radius: 50%;
    animation: qrSpin 0.7s linear infinite;
  }

  /* ── Footer ── */
  .qr-footer {
    margin-top: 28px;
    padding: 0 24px;
    text-align: center;
  }

  .qr-secure-row {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    font-size: 12px;
    color: #94a3b8;
    margin-bottom: 6px;
  }

  .qr-powered {
    font-size: 12px;
    color: #cbd5e1;
  }

  .qr-powered strong {
    color: #94a3b8;
    font-weight: 600;
  }

  /* ── Error View ── */
  .qr-error-view {
    padding: 60px 24px 40px;
    text-align: center;
  }

  .qr-error-icon { margin-bottom: 16px; }

  .qr-error-view h2 {
    font-size: 22px;
    font-weight: 700;
    color: #1e293b;
    margin-bottom: 8px;
  }

  .qr-error-view p {
    font-size: 15px;
    color: #64748b;
    margin-bottom: 28px;
  }

  .qr-retry-btn {
    padding: 14px 40px;
    background: #6366f1;
    color: #fff;
    border: none;
    border-radius: 14px;
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
    font-family: inherit;
    transition: all 0.2s;
  }

  .qr-retry-btn:hover {
    background: #4f46e5;
    box-shadow: 0 4px 12px rgba(99,102,241,0.3);
  }

  /* ── Skeleton ── */
  .qr-skeleton-header {
    background: linear-gradient(135deg, #6366f1 0%, #818cf8 100%);
    padding: 36px 24px 28px;
    border-radius: 0 0 28px 28px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
  }

  .qr-skeleton-body {
    padding: 28px 24px;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .qr-skeleton {
    background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
    background-size: 200% 100%;
    animation: qrShimmer 1.5s infinite;
    border-radius: 8px;
  }

  .qr-sk-avatar { width: 56px; height: 56px; border-radius: 16px; background: rgba(255,255,255,0.15) !important; }
  .qr-sk-name { width: 140px; height: 20px; background: rgba(255,255,255,0.12) !important; }
  .qr-sk-loc { width: 120px; height: 28px; border-radius: 100px; background: rgba(255,255,255,0.1) !important; }
  .qr-sk-amount { width: 100%; height: 60px; border-radius: 14px; }
  .qr-sk-row { width: 100%; height: 50px; border-radius: 14px; }
  .qr-sk-btn { width: 100%; height: 56px; border-radius: 16px; margin-top: 8px; }

  /* ── Toast ── */
  .qr-toast {
    position: fixed;
    top: 24px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 14px 24px;
    border-radius: 14px;
    font-size: 14px;
    font-weight: 500;
    z-index: 99999;
    box-shadow: 0 8px 30px rgba(0,0,0,0.12);
    animation: qrToastIn 0.35s cubic-bezier(0.16,1,0.3,1);
    font-family: inherit;
  }

  .qr-toast-error {
    background: #fff;
    color: #dc2626;
    border: 1px solid #fee2e2;
  }

  .qr-toast-success {
    background: #fff;
    color: #059669;
    border: 1px solid #d1fae5;
  }

  .qr-toast-icon { display: flex; }
  .qr-toast-out { animation: qrToastOut 0.3s ease forwards; }

  /* ── Animations ── */
  @keyframes qrSlideUp {
    from { opacity: 0; transform: translateY(-12px); }
    to { opacity: 1; transform: translateY(0); }
  }

  @keyframes qrSpin {
    to { transform: rotate(360deg); }
  }

  @keyframes qrShimmer {
    from { background-position: 200% 0; }
    to { background-position: -200% 0; }
  }

  @keyframes qrDropIn {
    from { opacity: 0; transform: translateY(-6px); }
    to { opacity: 1; transform: translateY(0); }
  }

  @keyframes qrToastIn {
    from { opacity: 0; transform: translateX(-50%) translateY(-16px); }
    to { opacity: 1; transform: translateX(-50%) translateY(0); }
  }

  @keyframes qrToastOut {
    from { opacity: 1; transform: translateX(-50%) translateY(0); }
    to { opacity: 0; transform: translateX(-50%) translateY(-16px); }
  }

  /* ── Mobile Full-screen ── */
  @media (max-width: 480px) {
    .qr-page {
      background: #fff;
    }
    .qr-card {
      max-width: 100%;
      border-radius: 0;
      box-shadow: none;
      min-height: 100vh;
    }
  }

  @media (min-width: 481px) {
    .qr-page {
      align-items: center;
      padding: 24px;
    }
    .qr-card {
      border-radius: 28px;
      margin-top: 0;
    }
    .qr-header {
      border-radius: 28px 28px 28px 28px;
    }
  }
`;
