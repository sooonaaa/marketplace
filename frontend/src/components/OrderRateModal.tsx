import React, { useMemo, useState } from 'react';
import { COLORS } from '../constants/colors';
import { apiClient } from '../api/client';
import type { OrderData, OrderItemData } from '../types/order';

interface OrderRateModalProps {
  order: OrderData;
  onClose: () => void;
  onDone: () => void;
}

export default function OrderRateModal({ order, onClose, onDone }: OrderRateModalProps) {
  const itemsToRate = useMemo(
    () => order.items.filter((i) => i.productId && !i.reviewed),
    [order.items]
  );
  const [stepIndex, setStepIndex] = useState(0);
  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const currentItem: OrderItemData | undefined = itemsToRate[stepIndex];

  if (itemsToRate.length === 0) {
    return (
      <ModalShell title="Оценить товары" onClose={onClose}>
        <p style={{ margin: 0, color: COLORS.textMuted }}>Все товары из этого заказа уже оценены.</p>
      </ModalShell>
    );
  }

  const submitRating = async () => {
    if (!currentItem?.productId || rating < 1) {
      setError('Выберите оценку от 1 до 5');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await apiClient.post(`/api/auth/orders/${order.id}/review/`, {
        product_id: currentItem.productId,
        rating,
        text: reviewText.trim(),
      });
      if (stepIndex + 1 >= itemsToRate.length) {
        onDone();
        onClose();
      } else {
        setStepIndex((s) => s + 1);
        setRating(0);
        setReviewText('');
      }
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { error?: string } } }).response?.data?.error
          : undefined;
      setError(msg || 'Не удалось сохранить оценку');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ModalShell title="Оценить товары" onClose={onClose}>
      <p style={styles.progress}>
        Товар {stepIndex + 1} из {itemsToRate.length}
      </p>
      <div style={styles.productPreview}>
        {currentItem?.image ? (
          <img src={currentItem.image} alt={currentItem.title} style={styles.thumb} />
        ) : (
          <div style={styles.thumbPlaceholder}>📦</div>
        )}
        <span style={styles.productName}>{currentItem?.title}</span>
      </div>
      <div style={styles.starsRow}>
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            style={{
              ...styles.starBtn,
              color: star <= rating ? COLORS.rating : COLORS.border,
            }}
            onClick={() => setRating(star)}
          >
            ★
          </button>
        ))}
      </div>
      <textarea
        value={reviewText}
        onChange={(e) => setReviewText(e.target.value)}
        placeholder="Поделитесь вашими впечатлениями от покупки"
        style={styles.textarea}
        rows={4}
      />
      {error && <p style={styles.error}>{error}</p>}
      <button
        type="button"
        disabled={submitting || rating < 1}
        onClick={submitRating}
        style={{
          ...styles.submitBtn,
          opacity: rating >= 1 && !submitting ? 1 : 0.5,
        }}
      >
        {stepIndex + 1 >= itemsToRate.length ? 'Сохранить' : 'Далее'}
      </button>
    </ModalShell>
  );
}

function ModalShell({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <>
      <div style={styles.overlay} onClick={onClose} />
      <div style={styles.modal}>
        <div style={styles.header}>
          <h2 style={styles.title}>{title}</h2>
          <button type="button" style={styles.closeBtn} onClick={onClose} aria-label="Закрыть">
            ✕
          </button>
        </div>
        <div style={styles.body}>{children}</div>
      </div>
    </>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  overlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(78, 96, 83, 0.45)',
    zIndex: 1100,
  },
  modal: {
    position: 'fixed',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    backgroundColor: '#FFFFFF',
    width: 'min(440px, 92vw)',
    borderRadius: '16px',
    boxShadow: '0 20px 40px rgba(78, 96, 83, 0.3)',
    zIndex: 1101,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '18px 22px',
    borderBottom: `1px solid ${COLORS.border}`,
  },
  title: { margin: 0, fontSize: '18px', fontWeight: '800' },
  closeBtn: { background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: COLORS.textMuted },
  body: { padding: '22px' },
  progress: { margin: '0 0 14px 0', fontSize: '13px', color: COLORS.textMuted },
  productPreview: { display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '18px' },
  thumb: { width: '64px', height: '64px', borderRadius: '10px', objectFit: 'cover' },
  thumbPlaceholder: {
    width: '64px',
    height: '64px',
    borderRadius: '10px',
    backgroundColor: COLORS.accentLight,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '24px',
  },
  productName: { fontSize: '14px', fontWeight: '700', lineHeight: 1.35 },
  starsRow: { display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '18px' },
  starBtn: {
    background: 'none',
    border: 'none',
    fontSize: '36px',
    cursor: 'pointer',
    padding: 0,
  },
  error: { color: '#FF4D4F', fontSize: '13px', margin: '0 0 10px 0' },
  textarea: {
    width: '100%',
    padding: '10px 12px',
    borderRadius: '8px',
    border: `1px solid ${COLORS.border}`,
    fontSize: '14px',
    marginBottom: '14px',
    resize: 'vertical',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
  },
  submitBtn: {
    width: '100%',
    padding: '12px 0',
    borderRadius: '10px',
    border: 'none',
    backgroundColor: COLORS.primary,
    color: '#FFFFFF',
    fontWeight: '700',
    cursor: 'pointer',
  },
};
