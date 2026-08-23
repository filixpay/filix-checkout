'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import styles from '@/app/checkout.module.css';

interface PinInputModalProps {
  onConfirm: (pin: string) => void;
  onClose: () => void;
  loading?: boolean;
  errorMessage?: string | null;
  onClearError?: () => void;
}

export default function PinInputModal({
  onConfirm,
  onClose,
  loading,
  errorMessage,
  onClearError,
}: PinInputModalProps) {
  const [pin, setPin] = useState('');
  const lastConfirmedPin = useRef<string>('');

  const handlePress = useCallback(
    (num: string) => {
      onClearError?.();
      setPin((prev) => (prev.length < 6 ? prev + num : prev));
    },
    [onClearError],
  );

  const handleDelete = useCallback(() => {
    onClearError?.();
    setPin((prev) => prev.slice(0, -1));
  }, [onClearError]);

  useEffect(() => {
    if (errorMessage) {
      setPin('');
      lastConfirmedPin.current = '';
    }
  }, [errorMessage]);

  useEffect(() => {
    if (pin.length === 6 && pin !== lastConfirmedPin.current) {
      lastConfirmedPin.current = pin;
      onConfirm(pin);
    } else if (pin.length < 6) {
      lastConfirmedPin.current = '';
    }
  }, [pin, onConfirm]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (loading) return;
      
      if (e.key >= '0' && e.key <= '9') {
        handlePress(e.key);
      } else if (e.key === 'Backspace') {
        handleDelete();
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlePress, handleDelete, onClose, loading]);

  return (
    <div className={styles.walletSelectorOverlay}>
      <div className={styles.pinModal}>
        <h2 className={styles.qrTitle}>输入支付密码</h2>
        <p className={styles.qrSubtitle}>请输入 6 位数字支付密码</p>
        
        <div className={styles.pinDisplay}>
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className={`${styles.pinDot} ${i < pin.length ? styles.pinDotFilled : ''} ${errorMessage ? styles.pinDotError : ''}`}
            />
          ))}
        </div>

        {errorMessage ? (
          <p className={styles.pinValidation} aria-live="polite">
            {errorMessage}
          </p>
        ) : null}

        <div className={styles.numPad}>
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
            <button
              key={num}
              className={styles.numBtn}
              onClick={() => handlePress(num)}
              disabled={loading}
            >
              {num}
            </button>
          ))}
          <button className={`${styles.numBtn} ${styles.numBtnAction}`} onClick={onClose} disabled={loading}>
            取消
          </button>
          <button
            className={styles.numBtn}
            onClick={() => handlePress('0')}
            disabled={loading}
          >
            0
          </button>
          <button className={`${styles.numBtn} ${styles.numBtnAction}`} onClick={handleDelete} disabled={loading}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z" strokeLinecap="round" strokeLinejoin="round" />
              <line x1="18" y1="9" x2="12" y2="15" strokeLinecap="round" strokeLinejoin="round" />
              <line x1="12" y1="9" x2="18" y2="15" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

        {loading && (
          <div className={styles.pinLoadingOverlay} aria-live="polite" aria-busy="true">
            <div className={styles.loadingSpinner} />
          </div>
        )}
      </div>
    </div>
  );
}
