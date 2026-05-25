import React, { useState } from 'react';
import { COLORS } from '../constants/colors';
import { apiClient } from '../api/client';
import type { OrderData } from '../types/order';

interface ReturnItemState {
  orderItemId: number;
  selected: boolean;
  reason: string;
  productPhotos: File[];
  packagingPhotos: File[];
}

interface OrderReturnModalProps {
  order: OrderData;
  onClose: () => void;
  onDone: () => void;
}

export default function OrderReturnModal({ order, onClose, onDone }: OrderReturnModalProps) {
  const returnableItems = order.items.filter((item) => !item.returned);
  const [items, setItems] = useState<ReturnItemState[]>(
    returnableItems.map((item) => ({
      orderItemId: item.id,
      selected: false,
      reason: '',
      productPhotos: [],
      packagingPhotos: [],
    }))
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (returnableItems.length === 0) {
    return (
      <>
        <div style={styles.overlay} onClick={onClose} />
        <div style={styles.modal}>
          <div style={styles.header}>
            <h2 style={styles.title}>Вернуть товары</h2>
            <button type="button" style={styles.closeBtn} onClick={onClose}>✕</button>
          </div>
          <div style={styles.body}>
            <p style={{ margin: 0, color: COLORS.textMuted }}>По всем товарам из этого заказа заявки на возврат уже созданы.</p>
          </div>
        </div>
      </>
    );
  }

  const updateItem = (id: number, patch: Partial<ReturnItemState>) => {
    setItems((prev) => prev.map((i) => (i.orderItemId === id ? { ...i, ...patch } : i)));
  };

  const handleFiles = (
    id: number,
    field: 'productPhotos' | 'packagingPhotos',
    fileList: FileList | null
  ) => {
    if (!fileList) return;
    updateItem(id, { [field]: Array.from(fileList) });
  };

  const handleSubmit = async () => {
    const selected = items.filter((i) => i.selected);
    if (selected.length === 0) {
      setError('Выберите хотя бы один товар');
      return;
    }
    for (const item of selected) {
      if (!item.reason.trim()) {
        setError('Укажите причину возврата для каждого выбранного товара');
        return;
      }
      if (item.productPhotos.length < 1 || item.packagingPhotos.length < 1) {
        setError('Для каждого товара нужны фото товара и упаковки');
        return;
      }
    }

    const formData = new FormData();
    formData.append(
      'items',
      JSON.stringify(
        selected.map((i) => ({ order_item_id: i.orderItemId, reason: i.reason }))
      )
    );
    for (const item of selected) {
      item.productPhotos.forEach((file) => {
        formData.append(`product_${item.orderItemId}`, file);
      });
      item.packagingPhotos.forEach((file) => {
        formData.append(`packaging_${item.orderItemId}`, file);
      });
    }

    setSubmitting(true);
    setError('');
    try {
      await apiClient.post(`/api/auth/orders/${order.id}/return/`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      onDone();
      onClose();
      alert('Заявка на возврат отправлена');
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { error?: string } } }).response?.data?.error
          : undefined;
      setError(msg || 'Не удалось отправить заявку');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div style={styles.overlay} onClick={onClose} />
      <div style={styles.modal}>
        <div style={styles.header}>
          <h2 style={styles.title}>Вернуть товары — {order.orderNumber}</h2>
          <button type="button" style={styles.closeBtn} onClick={onClose} aria-label="Закрыть">
            ✕
          </button>
        </div>
        <div style={styles.body}>
          {items.map((state, idx) => {
            const orderItem = returnableItems[idx];
            return (
              <div key={state.orderItemId} style={styles.itemBlock}>
                <label style={styles.checkRow}>
                  <input
                    type="checkbox"
                    checked={state.selected}
                    onChange={(e) => updateItem(state.orderItemId, { selected: e.target.checked })}
                  />
                  <span style={styles.itemTitle}>{orderItem.title}</span>
                </label>
                {state.selected && (
                  <div style={styles.itemDetails}>
                    <textarea
                      placeholder="Причина возврата *"
                      value={state.reason}
                      onChange={(e) => updateItem(state.orderItemId, { reason: e.target.value })}
                      style={styles.textarea}
                      rows={3}
                    />
                    <div style={styles.fileRow}>
                      <label style={styles.fileLabel}>
                        Фото товара * (мин. 1)
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={(e) =>
                            handleFiles(state.orderItemId, 'productPhotos', e.target.files)
                          }
                          style={styles.fileInput}
                        />
                      </label>
                      <span style={styles.fileCount}>Выбрано: {state.productPhotos.length}</span>
                    </div>
                    <div style={styles.fileRow}>
                      <label style={styles.fileLabel}>
                        Фото упаковки * (мин. 1)
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={(e) =>
                            handleFiles(state.orderItemId, 'packagingPhotos', e.target.files)
                          }
                          style={styles.fileInput}
                        />
                      </label>
                      <span style={styles.fileCount}>Выбрано: {state.packagingPhotos.length}</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          {error && <p style={styles.error}>{error}</p>}
          <button
            type="button"
            disabled={submitting}
            onClick={handleSubmit}
            style={styles.submitBtn}
          >
            {submitting ? 'Отправка...' : 'Отправить заявку'}
          </button>
        </div>
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
    width: 'min(560px, 94vw)',
    maxHeight: '88vh',
    borderRadius: '16px',
    boxShadow: '0 20px 40px rgba(78, 96, 83, 0.3)',
    zIndex: 1101,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    padding: '18px 22px',
    borderBottom: `1px solid ${COLORS.border}`,
    gap: '12px',
  },
  title: { margin: 0, fontSize: '17px', fontWeight: '800', flex: 1 },
  closeBtn: { background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: COLORS.textMuted },
  body: { padding: '18px 22px', overflowY: 'auto' },
  itemBlock: {
    border: `1px solid ${COLORS.border}`,
    borderRadius: '12px',
    padding: '14px',
    marginBottom: '12px',
    backgroundColor: '#FAFBF9',
  },
  checkRow: { display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer' },
  itemTitle: { fontSize: '14px', fontWeight: '700', lineHeight: 1.35 },
  itemDetails: { marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '10px' },
  textarea: {
    width: '100%',
    padding: '10px',
    borderRadius: '8px',
    border: `1px solid ${COLORS.border}`,
    fontSize: '14px',
    resize: 'vertical',
    boxSizing: 'border-box',
  },
  fileRow: { display: 'flex', flexDirection: 'column', gap: '4px' },
  fileLabel: { fontSize: '13px', fontWeight: '600', color: COLORS.textDark },
  fileInput: { marginTop: '4px', fontSize: '12px' },
  fileCount: { fontSize: '12px', color: COLORS.textMuted },
  error: { color: '#FF4D4F', fontSize: '13px' },
  submitBtn: {
    width: '100%',
    padding: '13px 0',
    borderRadius: '10px',
    border: 'none',
    backgroundColor: COLORS.primary,
    color: '#FFFFFF',
    fontWeight: '700',
    cursor: 'pointer',
    marginTop: '8px',
  },
};
