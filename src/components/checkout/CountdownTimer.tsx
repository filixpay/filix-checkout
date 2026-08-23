'use client';

import { useEffect, useState, useRef } from 'react';
import styles from '@/app/checkout.module.css';

interface CountdownTimerProps {
  expirySeconds: number;
  onExpired: () => void;
  variant?: 'default' | 'summary';
}

export default function CountdownTimer({ expirySeconds, onExpired, variant = 'default' }: CountdownTimerProps) {
  const [remaining, setRemaining] = useState(expirySeconds);
  const [expired, setExpired] = useState(false);
  const onExpiredRef = useRef(onExpired);
  onExpiredRef.current = onExpired;

  useEffect(() => {
    const timer = setInterval(() => {
      setRemaining((prev) => {
        const next = prev - 1;
        if (next <= 0) {
          clearInterval(timer);
          setExpired(true);
          setTimeout(() => onExpiredRef.current(), 5000);
          return 0;
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatTime = () => {
    if (expired) return '支付已超时';
    const d = Math.floor(remaining / (24 * 3600));
    const h = Math.floor((remaining % (24 * 3600)) / 3600);
    const m = Math.floor((remaining % 3600) / 60);
    const s = remaining % 60;

    if (variant === 'summary') {
      const parts: string[] = [];
      if (d > 0) parts.push(`${d}天`);
      if (h > 0 || d > 0) parts.push(`${h.toString().padStart(2, '0')}小时`);
      parts.push(`${m.toString().padStart(2, '0')}分 ${s.toString().padStart(2, '0')}秒`);
      return parts.join(' ');
    }

    let timeStr = '剩余 ';
    if (d > 0) timeStr += `${d}天 `;
    if (h > 0 || d > 0) timeStr += `${h}小时 `;
    timeStr += `${m}分 ${s}秒`;
    return timeStr;
  };

  if (variant === 'summary') {
    return (
      <div className={`${styles.timerSummary} ${expired ? styles.timerSummaryExpired : ''}`}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
        <span>
          支付剩余时间：<strong>{formatTime()}</strong>
        </span>
      </div>
    );
  }

  return (
    <div className={`${styles.timerContainer} ${expired ? styles.timerExpired : ''}`}>
      <div className={styles.timerDots}>
        <div className={styles.timerDot}></div>
        <div className={styles.timerDot}></div>
        <div className={styles.timerDot}></div>
      </div>
      <span>{formatTime()}</span>
    </div>
  );
}
