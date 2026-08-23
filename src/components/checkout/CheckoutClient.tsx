'use client';

import { useEffect, useState, useCallback, useRef, type ReactNode } from 'react';
import { useSession, signIn, signOut } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import styles from '@/app/checkout.module.css';
import type { CheckoutView, CryptoDepositSession, ReceiptSession, PaymentMethod } from '@/types/checkout';
import { handlePaymentSessionResponse } from '@/lib/payment-handoff';
import { maskLoginLabel } from '@/lib/mask';
import CountdownTimer from './CountdownTimer';
import PaymentMethodButton from './PaymentMethodButton';
import StatusView from './StatusView';
import QrModal from './QrModal';
import ReceiptModal from './ReceiptModal';
import CryptoDepositModal from './CryptoDepositModal';
import WalletSelector from './WalletSelector';
import CreditSelector from './CreditSelector';
import PinInputModal from './PinInputModal';
import type { WalletAccount, CreditAccount } from '@/types/checkout';

function methodKey(method: PaymentMethod) {
  return `${method.channelCode}:${method.configId}`;
}

function formatCheckoutAmount(amount: number) {
  return amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function isWalletAccount(
  account: WalletAccount | CreditAccount | null,
): account is WalletAccount {
  return account != null && !('availableAmount' in account);
}

function isWalletInlineError(message: string) {
  return /付款商户|付款账户|buyer|BUYER|买卖双方|同一商户|请先.*选择|余额不足|无权使用/i.test(message);
}

function isPinInlineError(message: string) {
  return /INVALID_PAYMENT_PIN|支付密码|PAYMENT_PIN/i.test(message);
}

function formatPaymentErrorMessage(message: string) {
  return message.replace(/^\[[^\]]+\]\s*/, '');
}

function resolvePayButtonState(
  selectedMethod: PaymentMethod | undefined,
  selectedAccount: WalletAccount | CreditAccount | null,
  isAuthenticated: boolean,
  currency: string,
  totalAmount: number,
) {
  const amountLabel = `${currency} ${formatCheckoutAmount(totalAmount)}`;
  const payLabel = `前往付款 (${amountLabel})`;

  if (!selectedMethod) {
    return { canPay: false, label: '请选择支付方式', walletAccountRequired: false };
  }

  const code = selectedMethod.channelCode;

  if (code === 'WALLET') {
    const accounts = selectedMethod.walletAccounts || [];
    if (!isAuthenticated) {
      return { canPay: true, label: '登录并前往付款', walletAccountRequired: false };
    }
    if (accounts.length === 0) {
      return { canPay: false, label: '暂无可用付款商户', walletAccountRequired: false };
    }
    const walletAccount = isWalletAccount(selectedAccount) ? selectedAccount : null;
    if (!walletAccount) {
      return { canPay: false, label: '请选择付款商户账户', walletAccountRequired: true };
    }
    const balance = walletAccount.balance;
    if (balance != null && Number.isFinite(Number(balance)) && Number(balance) < totalAmount) {
      return { canPay: false, label: '所选账户余额不足', walletAccountRequired: false };
    }
    return { canPay: true, label: payLabel, walletAccountRequired: false };
  }

  if (code === 'CREDIT') {
    const accounts = selectedMethod.creditAccounts || [];
    if (!isAuthenticated) {
      return { canPay: true, label: '登录并前往付款', walletAccountRequired: false };
    }
    if (accounts.length === 0) {
      return { canPay: false, label: '暂无可用信用账户', walletAccountRequired: false };
    }
    const creditAccount =
      selectedAccount && 'availableAmount' in selectedAccount ? selectedAccount : null;
    if (!creditAccount) {
      return { canPay: false, label: '请选择付款信用账户', walletAccountRequired: false };
    }
    return { canPay: true, label: payLabel, walletAccountRequired: false };
  }

  return {
    canPay: selectedMethod.enabled !== false,
    label: payLabel,
    walletAccountRequired: false,
  };
}

function Toast({ message, type, onDone }: { message: string; type: 'success' | 'error'; onDone: () => void }) {
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    const duration = type === 'success' ? 8000 : 5000;
    const timer = setTimeout(() => {
      setFadeOut(true);
      setTimeout(onDone, 300);
    }, duration);
    return () => clearTimeout(timer);
  }, [type, onDone]);

  if (type === 'success') {
    return (
      <div className={`${styles.toast} ${styles.toastSuccess} ${fadeOut ? styles.toastFadeOut : ''}`}>
        <div className={styles.toastSuccessContent}>
          <div className={styles.toastSuccessIcon}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="3">
              <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <span className={styles.toastSuccessMsg}>{message}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`${styles.toast} ${styles.toastError} ${fadeOut ? styles.toastFadeOut : ''}`}>
      <div className={styles.toastContent}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <span>{message}</span>
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className={styles.checkoutSkeletonGrid}>
      <div className={styles.checkoutSkeletonSummary}>
        <div className={styles.skeleton} style={{ width: 140, height: 28, borderRadius: 12 }} />
        <div className={styles.skeleton} style={{ width: 180, height: 40, borderRadius: 8 }} />
        <div className={styles.skeleton} style={{ width: '100%', height: 1 }} />
        <div className={styles.skeleton} style={{ width: '80%', height: 14 }} />
        <div className={styles.skeleton} style={{ width: '90%', height: 14 }} />
      </div>
      <div className={styles.checkoutSkeletonAction}>
        <div className={styles.skeleton} style={{ width: 120, height: 16, marginBottom: 8 }} />
        <div className={`${styles.skeleton} ${styles.skeletonBtn}`} />
        <div className={`${styles.skeleton} ${styles.skeletonBtn}`} />
        <div className={`${styles.skeleton} ${styles.skeletonBtn}`} />
        <div className={styles.skeleton} style={{ width: '100%', height: 48, borderRadius: 16, marginTop: 'auto' }} />
      </div>
    </div>
  );
}

function CheckoutFooter() {
  return (
    <div className={styles.footerSecurity}>
      <div className={styles.footerBadgeRow}>
        <span>PCI-DSS COMPLIANT</span>
        <span className={styles.footerDot}>•</span>
        <span>SSL SECURE</span>
        <span className={styles.footerDot}>•</span>
        <span>24/7 SUPPORT</span>
      </div>
      <div className={styles.copyright}>© 2026 FilixPay Safe Payment Service. All rights reserved.</div>
    </div>
  );
}

function CheckoutTopBar({
  merchantName,
  loginLabel,
  authenticated,
  onSwitchAccount,
}: {
  merchantName?: string;
  loginLabel?: string | null;
  authenticated?: boolean;
  onSwitchAccount?: () => void;
}) {
  const name = merchantName || 'Filix Platform';
  const initial = name.charAt(0).toUpperCase();

  return (
    <div className={styles.checkoutTopBar}>
      <div className={styles.checkoutTopBrand}>
        <div className={styles.checkoutTopLogo}>{initial}</div>
        <span className={styles.checkoutTopName}>{name}</span>
      </div>
      <div className={styles.checkoutTopRight}>
        {authenticated && loginLabel ? (
          <div className={styles.checkoutTopUser}>
            <span className={styles.checkoutTopUserLabel}>{loginLabel}</span>
            {onSwitchAccount ? (
              <button type="button" className={styles.checkoutTopUserSwitch} onClick={onSwitchAccount}>
                切换账号
              </button>
            ) : null}
          </div>
        ) : (
          <div className={styles.checkoutTopSecure}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="11" width="18" height="11" rx="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            <span>256-Bit SSL 加密安全支付</span>
          </div>
        )}
      </div>
    </div>
  );
}

function loginLabelFromSession(session: {
  user?: { email?: string | null; name?: string | null } | null;
  accessToken?: string;
} | null): string | null {
  const email = session?.user?.email?.trim();
  if (email) return email;
  const name = session?.user?.name?.trim();
  if (name) return name;
  const token = session?.accessToken;
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return (
      (typeof payload.email === 'string' && payload.email) ||
      (typeof payload.preferred_username === 'string' && payload.preferred_username) ||
      (typeof payload.name === 'string' && payload.name) ||
      null
    );
  } catch {
    return null;
  }
}

export default function CheckoutClient() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const { data: session, status: sessionStatus } = useSession();

  const [state, setState] = useState<'loading' | 'error' | 'ready' | 'blocked' | 'pending_review'>('loading');
  const [error, setError] = useState('');
  const [view, setView] = useState<CheckoutView | null>(null);
  const [loadingPayment, setLoadingPayment] = useState<string | null>(null);
  const [selectedMethodKey, setSelectedMethodKey] = useState<string | null>(null);

  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<ReceiptSession | null>(null);
  const [cryptoDeposit, setCryptoDeposit] = useState<CryptoDepositSession | null>(null);
  const [activeWalletMethod, setActiveWalletMethod] = useState<{ channel: string; configId: string; accounts: WalletAccount[] } | null>(null);
  const [activeCreditMethod, setActiveCreditMethod] = useState<{ channel: string; configId: string; accounts: CreditAccount[] } | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<WalletAccount | CreditAccount | null>(null);
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinError, setPinError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [walletInlineError, setWalletInlineError] = useState<string | null>(null);

  const pollingRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pinErrorRef = useRef(false);

  useEffect(() => {
    return () => {
      if (pollingRef.current) {
        clearTimeout(pollingRef.current);
      }
    };
  }, []);

  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    setToast({ message, type });
  }, []);

  const handlePaymentError = useCallback(
    (message: string) => {
      if (isPinInlineError(message)) {
        pinErrorRef.current = true;
        setPinError(formatPaymentErrorMessage(message));
        return;
      }
      pinErrorRef.current = false;

      const walletSelected = view?.availablePaymentMethods?.some(
        (m) => methodKey(m) === selectedMethodKey && m.channelCode === 'WALLET',
      );
      if (walletSelected && isWalletInlineError(message)) {
        setWalletInlineError(formatPaymentErrorMessage(message));
        return;
      }
      showToast(message, 'error');
    },
    [view, selectedMethodKey, showToast],
  );

  const accessToken = session?.accessToken;
  const loginLabel = maskLoginLabel(loginLabelFromSession(session));
  const isAuthenticated = sessionStatus === 'authenticated';

  const switchAccount = useCallback(async () => {
    if (token) localStorage.setItem('pending_wallet_payment', token);
    await signOut({ redirect: false });
    await signIn('keycloak', { callbackUrl: window.location.href });
  }, [token]);

  const loadCheckoutMetadata = useCallback(async () => {
    if (!token) return;
    try {
      const headers: Record<string, string> = {};
      if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
      }
      const res = await fetch(`/api/checkout/pay?token=${encodeURIComponent(token)}`, { headers });
      if (res.status === 400 || res.status === 404) {
        setError('支付链接无效或已过期，请联系商户重新发起支付');
        setState('error');
        return;
      }
      const data = await res.json();
      if (data.code !== 'SUCCESS') {
        const msgMap: Record<string, string> = {
          ORDER_NOT_FOUND: '订单未找到',
          INVALID_TOKEN: '支付凭证无效',
          TOKEN_EXPIRED: '支付链接已过期',
          ORDER_CLOSED: '订单已关闭',
        };
        setError(msgMap[data.code] || data.message || '加载失败，请稍后重试');
        setState('error');
        return;
      }
      const nextView = data.data as CheckoutView;
      setView(nextView);
      setState('ready');

      // Keep / restore wallet payer selection after auth-aware reloads.
      const walletMethod = nextView.availablePaymentMethods?.find((m) => m.channelCode === 'WALLET');
      const accounts = walletMethod?.walletAccounts || [];
      if (accounts.length > 0) {
        setSelectedAccount((prev) => {
          if (prev && !('availableAmount' in prev)) {
            const stillThere = accounts.find((a) => String(a.code) === String(prev.code));
            if (stillThere) return stillThere;
          }
          return accounts.find((a) => a.default || a.isDefault) || accounts[0];
        });
      }
    } catch {
      setError('服务暂时不可用，请稍后重试');
      setState('error');
    }
  }, [token, accessToken]);

  useEffect(() => {
    if (!token) {
      setError('缺少支付凭证，请通过正确链接进入');
      setState('error');
      return;
    }
    if (sessionStatus === 'loading') return;
    loadCheckoutMetadata();
  }, [token, loadCheckoutMetadata, sessionStatus, accessToken]);

  useEffect(() => {
    if (sessionStatus === 'authenticated') {
      const pendingWallet = localStorage.getItem('pending_wallet_payment');
      if (pendingWallet === token) {
        localStorage.removeItem('pending_wallet_payment');
        window.location.reload();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionStatus]);

  useEffect(() => {
    if (!view?.availablePaymentMethods?.length) return;
    setSelectedMethodKey((current) => {
      if (current && view.availablePaymentMethods!.some((m) => methodKey(m) === current)) {
        return current;
      }
      const first =
        view.availablePaymentMethods!.find((m) => m.enabled) ||
        view.availablePaymentMethods!.find((m) => m.channelCode === 'WALLET' || m.channelCode === 'CREDIT') ||
        view.availablePaymentMethods![0];
      return first ? methodKey(first) : null;
    });
  }, [view]);

  useEffect(() => {
    if (!view || !selectedMethodKey) return;
    const method = view.availablePaymentMethods?.find((m) => methodKey(m) === selectedMethodKey);
    if (!method) return;

    if (method.channelCode === 'WALLET') {
      const accounts = method.walletAccounts || [];
      if (accounts.length === 0) return;
      setSelectedAccount((prev) => {
        if (isWalletAccount(prev)) {
          const stillThere = accounts.find((a) => String(a.code) === String(prev.code));
          if (stillThere) return stillThere;
        }
        return accounts.find((a) => a.default || a.isDefault) || accounts[0];
      });
      return;
    }

    if (method.channelCode === 'CREDIT') {
      const accounts = method.creditAccounts || [];
      if (accounts.length === 0) return;
      setSelectedAccount((prev) => {
        if (prev && 'availableAmount' in prev) {
          const stillThere = accounts.find((a) => String(a.code) === String(prev.code));
          if (stillThere) return stillThere;
        }
        return accounts[0];
      });
      return;
    }

    setSelectedAccount(null);
  }, [selectedMethodKey, view]);

  const startPolling = useCallback(() => {
    const poll = async () => {
      try {
        const res = await fetch(`/api/checkout/pay?token=${encodeURIComponent(token!)}`);
        const data = await res.json();
        if (data.code === 'SUCCESS' && data.data.orderStatus === 'SUCCESS') {
          location.reload();
          return;
        }
      } catch {
        /* ignore */
      }
      pollingRef.current = setTimeout(poll, 3000);
    };
    poll();
  }, [token]);

  const startPayment = async (
    channel: string,
    configId: string,
    pin?: string,
    accountOverride?: WalletAccount | CreditAccount | null,
  ) => {
    if (!token) return;
    const payerAccount = accountOverride !== undefined ? accountOverride : selectedAccount;

    if (channel === 'WALLET') {
      if (sessionStatus !== 'authenticated') {
        localStorage.setItem('pending_wallet_payment', token);
        signIn('keycloak', { callbackUrl: window.location.href });
        return;
      }

      const method = view?.availablePaymentMethods?.find((m) => m.channelCode === 'WALLET');
      const accounts = method?.walletAccounts || [];
      if (accounts.length > 0 && !payerAccount) {
        return;
      }
      if (!payerAccount) {
        return;
      }
      if (!pin) {
        setSelectedAccount(payerAccount);
        setShowPinModal(true);
        return;
      }
    }

    if (channel === 'CREDIT') {
      if (sessionStatus !== 'authenticated') {
        localStorage.setItem('pending_wallet_payment', token);
        signIn('keycloak', { callbackUrl: window.location.href });
        return;
      }

      const method = view?.availablePaymentMethods?.find((m) => m.channelCode === 'CREDIT');
      const accounts = method?.creditAccounts || [];
      if (accounts.length > 0 && !payerAccount) {
        setActiveCreditMethod({ channel, configId: method!.configId, accounts });
        return;
      }
      if (!payerAccount) {
        return;
      }
      if (!pin) {
        setSelectedAccount(payerAccount);
        setShowPinModal(true);
        return;
      }
    }

    setLoadingPayment(`${channel}:${configId}`);

    try {
      const body: Record<string, unknown> = { token, preferredPaymentMethod: channel, configId };
      if (payerAccount?.code != null && payerAccount.code !== '') {
        body.buyerCode = Number(payerAccount.code);
      }
      if (pin) {
        body.paymentPin = pin;
      }

      const fetchHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
      if (session?.accessToken) {
        fetchHeaders['Authorization'] = `Bearer ${session.accessToken}`;
      }
      const res = await fetch('/api/checkout/create-payment-session', {
        method: 'POST',
        headers: fetchHeaders,
        body: JSON.stringify(body),
      });

      const outcome = await handlePaymentSessionResponse(res, {
        onImmediateSuccess: () => {
          loadCheckoutMetadata();
          setSelectedAccount(null);
          setShowPinModal(false);
          setPinError(null);
        },
        onProcessing: () => {
          startPolling();
        },
        onReceipt: (value) =>
          setReceipt({
            ...value,
            amount: value.amount ?? view?.totalAmount,
            currency: value.currency ?? view?.currency ?? 'USD',
          }),
        onCryptoDeposit: (session) => {
          setCryptoDeposit(session);
          startPolling();
        },
        onQr: (url) => {
          setQrUrl(url);
          startPolling();
        },
        onError: handlePaymentError,
        onFormWindowClosed: loadCheckoutMetadata,
      });

      if (outcome === 'reauth') {
        localStorage.setItem('pending_wallet_payment', token);
        await signIn('keycloak', { callbackUrl: window.location.href });
        return;
      }
      if (outcome === 'blocked') {
        setState('blocked');
        setLoadingPayment(null);
        setSelectedAccount(null);
        setShowPinModal(false);
        return;
      }
      if (outcome === 'pending_review') {
        setState('pending_review');
        setLoadingPayment(null);
        setSelectedAccount(null);
        setShowPinModal(false);
        return;
      }
      if (outcome === 'processing' || outcome === 'handled') {
        setLoadingPayment(null);
        setSelectedAccount(null);
        setShowPinModal(false);
        setPinError(null);
        return;
      }
      if (outcome === 'failed') {
        setLoadingPayment(null);
        if (pinErrorRef.current) {
          pinErrorRef.current = false;
          return;
        }
        setSelectedAccount(null);
        setShowPinModal(false);
        setPinError(null);
        return;
      }
    } catch {
      showToast('网络错误或服务暂时不可用，请稍后重试', 'error');
    }

    setLoadingPayment(null);
    setSelectedAccount(null);
    setShowPinModal(false);
    setPinError(null);
  };

  const handleWalletSelect = (account: WalletAccount) => {
    setSelectedAccount(account);
    setActiveWalletMethod(null);
    setShowPinModal(true);
  };

  const handleCreditSelect = (account: CreditAccount) => {
    setSelectedAccount(account);
    setActiveCreditMethod(null);
    setShowPinModal(true);
  };

  const handlePinConfirm = useCallback(
    async (pin: string) => {
      setPinError(null);
      pinErrorRef.current = false;

      if (!selectedAccount) {
        setShowPinModal(false);
        setWalletInlineError('请选择付款商户账户');
        return;
      }

      let channel = 'WALLET';
      let configId = '';

      if (activeCreditMethod || 'availableAmount' in selectedAccount) {
        channel = 'CREDIT';
        configId =
          activeCreditMethod?.configId ||
          view?.availablePaymentMethods?.find((m) => m.channelCode === 'CREDIT')?.configId ||
          '';
      } else {
        channel = 'WALLET';
        configId =
          activeWalletMethod?.configId ||
          view?.availablePaymentMethods?.find((m) => m.channelCode === 'WALLET')?.configId ||
          '';
      }

      if (!configId) return;
      await startPayment(channel, configId, pin, selectedAccount);
    },
    [activeWalletMethod, activeCreditMethod, selectedAccount, view],
  );

  const handlePinClose = useCallback(() => {
    setShowPinModal(false);
    setPinError(null);
    pinErrorRef.current = false;
  }, []);

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearTimeout(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  const handleQrClose = () => {
    stopPolling();
    setQrUrl(null);
    loadCheckoutMetadata();
  };

  const handleCryptoClose = () => {
    stopPolling();
    setCryptoDeposit(null);
    loadCheckoutMetadata();
  };

  const handlePayClick = () => {
    const method = view?.availablePaymentMethods?.find((m) => methodKey(m) === selectedMethodKey);
    if (method) {
      startPayment(method.channelCode, method.configId);
    }
  };

  const renderStatusCard = (content: ReactNode) => (
    <div className={styles.checkoutShell}>
      <CheckoutTopBar
        merchantName={view?.merchantName}
        loginLabel={loginLabel}
        authenticated={isAuthenticated}
        onSwitchAccount={switchAccount}
      />
      <div className={`${styles.checkoutCard} ${styles.checkoutCardSingle}`}>{content}</div>
      <CheckoutFooter />
    </div>
  );

  const renderCheckoutGrid = () => {
    if (!view) return null;

    const currency = view.currency || 'USD';
    const selectedMethod = view.availablePaymentMethods?.find((m) => methodKey(m) === selectedMethodKey);
    const isPaying = Boolean(loadingPayment);
    const payState = resolvePayButtonState(
      selectedMethod,
      selectedAccount,
      isAuthenticated,
      currency,
      view.totalAmount,
    );
    const { canPay, label: payLabel, walletAccountRequired } = payState;

    return (
      <div className={styles.checkoutGrid}>
        <aside className={styles.summaryPanel}>
          <div className={styles.summaryPanelMain}>
            <div className={styles.summaryMerchant}>
              <div className={styles.summaryMerchantLogo}>{view.merchantName.charAt(0)}</div>
              <span className={styles.summaryMerchantName}>{view.merchantName}</span>
            </div>

            {view.expirySeconds && view.expirySeconds > 0 ? (
              <CountdownTimer expirySeconds={view.expirySeconds} onExpired={loadCheckoutMetadata} variant="summary" />
            ) : (
              <div className={styles.timerSummary}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                <span>
                  支付剩余时间：<strong>请尽快支付</strong>
                </span>
              </div>
            )}

            <div className={styles.summaryAmountBlock}>
              <span className={styles.summaryAmountLabel}>支付金额 (Total Due)</span>
              <div className={styles.summaryAmountValue}>
                <span className={styles.summaryCurrency}>{currency}</span>
                <span className={styles.summaryAmountNumber}>{formatCheckoutAmount(view.totalAmount)}</span>
              </div>
            </div>

            <hr className={styles.summaryDivider} />

            <div className={styles.summaryDetails}>
              <div className={styles.summaryDetailRow}>
                <span className={styles.summaryDetailLabel}>商品描述</span>
                <span className={styles.summaryDetailValue}>{view.orderDescription || '商品支付'}</span>
              </div>
              <div className={styles.summaryDetailRow}>
                <span className={styles.summaryDetailLabel}>交易单号</span>
                <span className={`${styles.summaryDetailValue} ${styles.summaryDetailMono}`}>{view.tradeNo}</span>
              </div>
            </div>
          </div>

          <div className={styles.summaryTrust}>
            <div className={styles.summaryTrustTitle}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              <span>FilixPay Safe Payment</span>
            </div>
            <p>您的付款凭证及交易数据受 PCI-DSS 合规保护。</p>
          </div>
        </aside>

        <div className={styles.actionPanel}>
          <div className={styles.actionPanelHeader}>
            <h3 className={styles.actionPanelTitle}>选择支付方式</h3>
            <p className={styles.actionPanelSubtitle}>选择您偏好的渠道完成付款</p>
          </div>

          <div className={styles.paymentMethods}>
            {view.availablePaymentMethods?.map((method) => (
              <PaymentMethodButton
                key={methodKey(method)}
                method={method}
                selected={selectedMethodKey === methodKey(method)}
                onSelect={(channel, configId) => {
                  setSelectedMethodKey(`${channel}:${configId}`);
                  setWalletInlineError(null);
                }}
                loading={loadingPayment === methodKey(method)}
                totalAmount={view.totalAmount}
                currency={currency}
                authenticated={isAuthenticated}
                loginLabel={loginLabel}
                sellerName={view.merchantName}
                sellerCode={view.sellerCode}
                selectedWalletCode={
                  selectedAccount && !('availableAmount' in selectedAccount)
                    ? selectedAccount.code
                    : null
                }
                onSelectWalletAccount={(account) => {
                  setSelectedAccount(account);
                  setWalletInlineError(null);
                }}
                walletAccountRequired={
                  walletAccountRequired && selectedMethodKey === methodKey(method)
                }
                walletInlineError={
                  selectedMethodKey === methodKey(method) ? walletInlineError : null
                }
                onLoginRequest={() => {
                  if (token) localStorage.setItem('pending_wallet_payment', token);
                  signIn('keycloak', { callbackUrl: window.location.href });
                }}
                onSwitchAccount={switchAccount}
              />
            ))}
          </div>

          <button
            type="button"
            className={styles.checkoutPayBtn}
            disabled={!canPay || isPaying}
            onClick={handlePayClick}
          >
            {isPaying ? (
              <>
                <div className={styles.loadingSpinner} />
                <span>正在处理…</span>
              </>
            ) : (
              <>
                <span>{payLabel}</span>
                {canPay ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : null}
              </>
            )}
          </button>
        </div>
      </div>
    );
  };

  const renderMainCard = () => {
    if (state === 'loading') {
      return <LoadingSkeleton />;
    }

    if (state === 'error') {
      return <StatusView type="error" errorMessage={error} />;
    }

    if (state === 'blocked') {
      return <StatusView view={view ?? undefined} type="blocked" />;
    }

    if (state === 'pending_review') {
      return <StatusView view={view ?? undefined} type="pending_review" />;
    }

    if (!view) return null;

    if (view.orderStatus === 'SUCCESS') {
      return <StatusView view={view} type="success" />;
    }

    if (view.orderStatus === 'CLOSED') {
      return <StatusView view={view} type="closed" />;
    }

    return renderCheckoutGrid();
  };

  const showGridLayout = state === 'ready' && view?.orderStatus === 'PENDING';

  return (
    <>
      {showGridLayout ? (
        <div className={styles.checkoutShell}>
          <CheckoutTopBar
            merchantName={view.merchantName}
            loginLabel={loginLabel}
            authenticated={isAuthenticated}
            onSwitchAccount={switchAccount}
          />
          <div className={styles.checkoutCard}>{renderMainCard()}</div>
          <CheckoutFooter />
        </div>
      ) : (
        renderStatusCard(renderMainCard())
      )}

      {qrUrl && <QrModal url={qrUrl} onClose={handleQrClose} />}

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
          onUploadSuccess={loadCheckoutMetadata}
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
          onClose={handleCryptoClose}
          showToast={showToast}
        />
      )}

      {activeWalletMethod && (
        <WalletSelector
          accounts={activeWalletMethod.accounts}
          totalAmount={view?.totalAmount || 0}
          currency={view?.currency || 'USD'}
          onSelect={handleWalletSelect}
          onClose={() => setActiveWalletMethod(null)}
        />
      )}

      {activeCreditMethod && (
        <CreditSelector
          accounts={activeCreditMethod.accounts}
          totalAmount={view?.totalAmount || 0}
          currency={view?.currency || 'USD'}
          onSelect={handleCreditSelect}
          onClose={() => setActiveCreditMethod(null)}
        />
      )}

      {showPinModal && (
        <PinInputModal
          onConfirm={handlePinConfirm}
          onClose={handlePinClose}
          loading={!!loadingPayment}
          errorMessage={pinError}
          onClearError={() => setPinError(null)}
        />
      )}

      {toast && <Toast message={toast.message} type={toast.type} onDone={() => setToast(null)} />}
    </>
  );
}
