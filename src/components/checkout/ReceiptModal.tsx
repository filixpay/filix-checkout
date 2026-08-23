'use client';

import { useCallback, useRef, useState } from 'react';
import { resolveReceiptUploadPath } from '@/lib/receipt-upload';
import type { ReceiptSession } from '@/types/checkout';
import ReceiptTransferPanel, { formatReceiptAmount } from './ReceiptTransferPanel';
import styles from '@/app/checkout.module.css';

interface ReceiptModalProps extends ReceiptSession {
  onClose: () => void;
  onUploadSuccess: () => void;
  showToast: (msg: string, type: 'success' | 'error') => void;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'];

function isAcceptedFile(file: File) {
  if (ACCEPTED_TYPES.includes(file.type)) return true;
  const ext = file.name.split('.').pop()?.toLowerCase();
  return ext === 'pdf' || ext === 'jpg' || ext === 'jpeg' || ext === 'png';
}

export default function ReceiptModal({
  html,
  transactionId,
  uploadUrl,
  receiverName,
  accountNumber,
  bankName,
  bankAddress,
  swiftCode,
  clearingCode,
  amount,
  currency,
  onClose,
  onUploadSuccess,
  showToast,
}: ReceiptModalProps) {
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const hasStructuredData = Boolean(receiverName && accountNumber);
  const displayAmount =
    amount != null && currency ? formatReceiptAmount(amount, currency) : '对应金额';
  const canSubmit = Boolean(selectedFile && isConfirmed && !uploading);

  const uploadFile = useCallback(
    async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('transactionId', transactionId);

      setUploading(true);

      try {
        const uploadPath = resolveReceiptUploadPath(uploadUrl);
        const res = await fetch(uploadPath, {
          method: 'POST',
          body: formData,
        });

        const result = await res.json();
        if (result.code === 'SUCCESS') {
          showToast('付款凭证已提交，我们将在 1–2 个工作日内完成审核', 'success');
          setTimeout(() => {
            onClose();
            onUploadSuccess();
          }, 5000);
        } else {
          showToast('提交失败：' + (result.message || '请稍后重试'), 'error');
          setUploading(false);
        }
      } catch {
        showToast('网络异常，请稍后重试', 'error');
        setUploading(false);
      }
    },
    [transactionId, uploadUrl, showToast, onClose, onUploadSuccess],
  );

  const validateAndSetFile = useCallback(
    (file: File) => {
      if (!isAcceptedFile(file)) {
        showToast('仅支持 JPG、PNG、PDF 格式', 'error');
        return;
      }
      if (file.size > MAX_FILE_SIZE) {
        showToast('文件大小不能超过 5 MB', 'error');
        return;
      }
      setSelectedFile(file);
    },
    [showToast],
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    if (hasStructuredData) {
      validateAndSetFile(file);
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      showToast('文件大小不能超过 5 MB', 'error');
      return;
    }
    void uploadFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) validateAndSetFile(file);
  };

  const handleSubmit = () => {
    if (selectedFile && isConfirmed) void uploadFile(selectedFile);
  };

  return (
    <div className={styles.receiptModalOverlay}>
      <div className={`${styles.receiptModal} ${hasStructuredData ? styles.receiptModalV2 : ''}`}>
        <div className={styles.receiptModalBody}>
          {!hasStructuredData && (
            <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="关闭">
              ×
            </button>
          )}

          {hasStructuredData && (
            <header className={styles.receiptStripeHeader}>
              <div className={styles.receiptStripeHeaderMain}>
                <div className={styles.receiptStripeHeaderIcon} aria-hidden>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="2" y="5" width="20" height="14" rx="2" />
                    <path d="M2 10h20" />
                  </svg>
                </div>
                <div>
                  <h2 className={styles.receiptStripeHeaderTitle}>银行转账付款</h2>
                  <p className={styles.receiptStripeHeaderSubtitle}>电汇 / 银行转账付款流程</p>
                </div>
              </div>
              <button type="button" className={styles.receiptHeaderCloseBtn} onClick={onClose} aria-label="关闭">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
                </svg>
              </button>
            </header>
          )}

          <div className={hasStructuredData ? styles.receiptModalScroll : styles.receiptModalContent}>
            <ReceiptTransferPanel
              receiverName={receiverName}
              accountNumber={accountNumber}
              bankName={bankName}
              bankAddress={bankAddress}
              swiftCode={swiftCode}
              clearingCode={clearingCode}
              amount={amount}
              currency={currency}
              transactionId={transactionId}
              fallbackHtml={html}
            />

            {hasStructuredData && (
              <>
                <hr className={styles.receiptStepDivider} />

                <section className={styles.receiptStripeStep} aria-labelledby="receipt-step-2-title">
                  <div className={styles.receiptStripeStepTitleRow}>
                    <span className={styles.receiptStripeStepBadge} aria-hidden>
                      2
                    </span>
                    <h3 id="receipt-step-2-title" className={styles.receiptStripeStepTitle}>
                      附上您的收据 / 付款凭证
                    </h3>
                    <span className={styles.receiptStripeRequiredTag}>必须</span>
                  </div>

                  <p className={styles.receiptStripeStepDesc}>
                    转出资金后，请上传银行转账证明的截图或 PDF 文件，这有助于加快人工验证和入账速度。
                  </p>

                  <div className={styles.receiptStripeStepBody}>
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => fileInputRef.current?.click()}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          fileInputRef.current?.click();
                        }
                      }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        setDragOver(true);
                      }}
                      onDragLeave={() => setDragOver(false)}
                      onDrop={handleDrop}
                      className={`${styles.receiptUploadDropzone} ${
                        selectedFile ? styles.receiptUploadDropzoneDone : ''
                      } ${dragOver ? styles.receiptUploadDropzoneActive : ''}`}
                    >
                      {selectedFile ? (
                        <div className={styles.receiptUploadDone}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                            <path d="M22 4L12 14.01l-3-3" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                          <span>已选择：{selectedFile.name}</span>
                        </div>
                      ) : (
                        <div className={styles.receiptUploadPrompt}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                            <polyline points="17 8 12 3 7 8" />
                            <line x1="12" y1="3" x2="12" y2="15" />
                          </svg>
                          <span>点击上传汇款收据 (支持 PDF / PNG / JPG)</span>
                        </div>
                      )}
                    </div>
                  </div>
                </section>

                <hr className={styles.receiptStepDivider} />

                <label className={styles.receiptConfirmRow}>
                  <input
                    type="checkbox"
                    checked={isConfirmed}
                    onChange={(e) => setIsConfirmed(e.target.checked)}
                    className={styles.receiptConfirmCheckbox}
                  />
                  <span className={styles.receiptConfirmLabel}>
                    我确认已通过电汇发起 <strong>{displayAmount}</strong> 的转账，支付了相关费用，且已上传有效凭证。
                  </span>
                </label>
              </>
            )}
          </div>

          {hasStructuredData ? (
            <div className={styles.receiptStripeFooter}>
              <button type="button" className={styles.receiptBackBtn} onClick={onClose}>
                返回
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!canSubmit}
                className={`${styles.receiptConfirmBtn} ${canSubmit ? styles.receiptConfirmBtnActive : ''}`}
              >
                <span>{uploading ? '正在提交…' : '确认已转账'}</span>
                {!uploading && (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </button>
            </div>
          ) : (
            <div className={styles.receiptUploadSection}>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className={`${styles.receiptBtn} ${styles.receiptBtnPrimary}`}
              >
                {uploading ? '正在提交…' : '提交付款凭证'}
              </button>
              <p className={styles.uploadNote}>支持 JPG、PNG、PDF 格式，单文件不超过 5 MB</p>
            </div>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,.pdf"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
      </div>
    </div>
  );
}
