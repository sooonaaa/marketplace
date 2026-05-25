import React, { useState } from 'react';
import { COLORS } from '../constants/colors';
import { apiClient } from '../api/client';
import type { OrderData } from '../types/order';
import { CANCEL_REASONS } from '../utils/orderHelpers';

interface OrderCancelModalProps {
  order: OrderData;
  mode: 'reason' | 'info';
  onClose: () => void;
  onDone: () => void;
}

export default function OrderCancelModal({ order, mode, onClose, onDone }: OrderCancelModalProps) {
  const [selectedReason, setSelectedReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (mode === 'info') {
    return (
      <Shell title="Отмена заказа" onClose={onClose}>
        <p style={styles.infoText}>
          Заказ уже в пути или готовится к отправке. Обратитесь в службу поддержки.
        </p>
        <button type="button" style={styles.submitBtn} onClick={onClose}>
          Понятно
        </button>
      </Shell>
    );
  }

  const handleSubmit = async () => {
    if (!selectedReason) {
      setError('Выберите причину отмены');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await apiClient.post(`/api/auth/orders/${order.id}/cancel/`, {
        reason: selectedReason,
        custom_reason: selectedReason === 'Нет нужной причины' ? customReason : '',
      });
      onDone();
      onClose();
    } catch (err: unknown) {
      const data =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { error?: string; message?: string } } }).response?.data
          : undefined;
      if (data?.error === 'in_transit') {
        setError(data.message || 'Заказ уже в пути');
      } else {
        setError(data?.error || 'Не удалось отменить заказ');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Shell title={`Отмена заказа ${order.orderNumber}`} onClose={onClose}>
      <p style={styles.hint}>Выберите причину отмены:</p>
      <div style={styles.reasonList}>
        {CANCEL_REASONS.map((reason) => (
          <label key={reason} style={styles.reasonLabel}>
            <input
              type="radio"
              name="cancelReason"
              checked={selectedReason === reason}
              onChange={() => setSelectedReason(reason)}
            />
            {reason}
          </label>
        ))}
      </div>
      {selectedReason === 'Нет нужной причины' && (
        <textarea
          value={customReason}
          onChange={(e) => setCustomReason(e.target.value)}
          placeholder="Пожалуйста, опишите проблему"
          style={styles.textarea}
          rows={3}
        />
      )}
      {error && <p style={styles.error}>{error}</p>}
      <button
        type="button"
        disabled={submitting}
        onClick={handleSubmit}
        style={{ ...styles.submitBtn, backgroundColor: '#FF4D4F' }}
      >
        {submitting ? 'Отмена...' : 'Отменить заказ'}
      </button>
    </Shell>
  );
}

function Shell({
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
        <ModalHeader title={title} onClose={onClose} />
        <div style={styles.body}>{children}</div>
      </div>
    </>
  );
}

function ModalHeader({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <div style={styles.header}>
      <h2 style={styles.title}>{title}</h2>
      <button type="button" style={styles.closeBtn} onClick={onClose}>
        ✕
      </button>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  overlay: { position: 'fixed', inset: 0, backgroundColor: 'rgba(78,96,83,0.45)', zIndex: 1100 },
  modal: {
    position: 'fixed',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    backgroundColor: '#FFF',
    width: 'min(440px, 92vw)',
    borderRadius: '16px',
    zIndex: 1101,
    boxShadow: '0 20px 40px rgba(78,96,83,0.3)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '18px 22px',
    borderBottom: `1px solid ${COLORS.border}`,
  },
  title: { margin: 0, fontSize: '17px', fontWeight: '800' },
  closeBtn: { background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: COLORS.textMuted },
  body: { padding: '22px' },
  hint: { margin: '0 0 12px 0', fontSize: '14px', color: COLORS.textMuted },
  reasonList: { display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '14px' },
  reasonLabel: { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', cursor: 'pointer' },
  textarea: {
    width: '100%',
    padding: '10px',
    borderRadius: '8px',
    border: `1px solid ${COLORS.border}`,
    fontSize: '14px',
    marginBottom: '12px',
    boxSizing: 'border-box',
  },
  infoText: { margin: '0 0 20px 0', fontSize: '15px', lineHeight: 1.5, color: COLORS.textDark },
  error: { color: '#FF4D4F', fontSize: '13px' },
  submitBtn: {
    width: '100%',
    padding: '12px 0',
    borderRadius: '10px',
    border: 'none',
    backgroundColor: COLORS.primary,
    color: '#FFF',
    fontWeight: '700',
    cursor: 'pointer',
    marginTop: '8px',
  },
};
