'use client';

import { QRCodeSVG } from 'qrcode.react';
import styles from '@/app/checkout.module.css';

interface QrModalProps {
  url: string;
  onClose: () => void;
}

export default function QrModal({ url, onClose }: QrModalProps) {
  return (
    <div className={styles.qrModalOverlay}>
      <div className={styles.qrModal}>
        <h2 className={styles.qrTitle}>扫码完成支付</h2>
        <p className={styles.qrSubtitle}>请使用手机 App 扫描下方二维码</p>
        <div className={styles.qrCodeWrapper}>
          <QRCodeSVG value={url} size={192} level="M" />
        </div>
        <p className={styles.qrHint}>支付完成后系统将自动跳转</p>
        <button className={styles.actionBtn} onClick={onClose}>我已完成支付</button>
      </div>
    </div>
  );
}
