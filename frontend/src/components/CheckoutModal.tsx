import React, { useMemo, useState } from 'react';
import { COLORS } from '../constants/colors';
import type { CartItem } from '../types/cart';
import { apiClient } from '../api/client';

interface CheckoutModalProps {
  items: CartItem[];
  onClose: () => void;
  onSuccess: () => void;
}

export default function CheckoutModal({ items, onClose, onSuccess }: CheckoutModalProps) {
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'sbp' | ''>('');
  const [deliveryType, setDeliveryType] = useState<'pickup' | 'courier' | ''>('');
  const [promoCode, setPromoCode] = useState('');
  const [addressCity, setAddressCity] = useState('');
  const [addressStreet, setAddressStreet] = useState('');
  const [addressHouse, setAddressHouse] = useState('');
  const [addressFlat, setAddressFlat] = useState('');
  const [addressIntercom, setAddressIntercom] = useState('');
  const [addressEntrance, setAddressEntrance] = useState('');
  const [addressFloor, setAddressFloor] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const total = useMemo(
    () => items.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [items]
  );

  const canSubmit =
    paymentMethod !== '' &&
    deliveryType !== '' &&
    (deliveryType === 'pickup' ||
      (addressCity.trim() && addressStreet.trim() && addressHouse.trim()));

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError('');
    try {
      await apiClient.post('/api/auth/orders/create/', {
        items: items.map((i) => ({ product_id: i.productId, quantity: i.quantity })),
        payment_method: paymentMethod,
        delivery_type: deliveryType,
        promo_code: promoCode,
        address_city: addressCity,
        address_street: addressStreet,
        address_house: addressHouse,
        address_flat: addressFlat,
        address_intercom: addressIntercom,
        address_entrance: addressEntrance,
        address_floor: addressFloor,
      });
      onSuccess();
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { error?: string } } }).response?.data?.error
          : undefined;
      setError(msg || 'Не удалось оформить заказ');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div style={styles.overlay} onClick={onClose} />
      <div style={styles.modal}>
        <div style={styles.header}>
          <h2 style={styles.title}>Оформление заказа</h2>
          <button type="button" style={styles.closeBtn} onClick={onClose} aria-label="Закрыть">
            ✕
          </button>
        </div>
        <div style={styles.body}>
          <div style={styles.layout}>
            <div style={styles.left}>
              <section style={styles.section}>
                <h3 style={styles.sectionTitle}>Товары</h3>
                <div style={styles.itemsList}>
                  {items.map((item) => (
                    <div key={item.productId} style={styles.productRow}>
                      <div style={styles.productThumb}>
                        {item.image ? (
                          <img src={item.image} alt={item.title} style={styles.productImg} />
                        ) : (
                          <span>📦</span>
                        )}
                      </div>
                      <div style={styles.productInfo}>
                        <span style={styles.productTitle}>{item.title}</span>
                        <span style={styles.productMeta}>
                          {item.quantity} шт. × {item.price} ₽
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section style={styles.section}>
                <h3 style={styles.sectionTitle}>Способ оплаты *</h3>
                <label style={styles.optionLabel}>
                  <input
                    type="radio"
                    name="payment"
                    checked={paymentMethod === 'card'}
                    onChange={() => setPaymentMethod('card')}
                  />
                  Банковская карта
                </label>
                <label style={styles.optionLabel}>
                  <input
                    type="radio"
                    name="payment"
                    checked={paymentMethod === 'sbp'}
                    onChange={() => setPaymentMethod('sbp')}
                  />
                  СБП
                </label>
              </section>

              <section style={styles.section}>
                <h3 style={styles.sectionTitle}>Способ доставки *</h3>
                <label style={styles.optionLabel}>
                  <input
                    type="radio"
                    name="delivery"
                    checked={deliveryType === 'pickup'}
                    onChange={() => setDeliveryType('pickup')}
                  />
                  Самовывоз от продавца
                </label>
                <label style={styles.optionLabel}>
                  <input
                    type="radio"
                    name="delivery"
                    checked={deliveryType === 'courier'}
                    onChange={() => setDeliveryType('courier')}
                  />
                  Доставка курьером
                </label>
                {deliveryType === 'courier' && (
                  <div style={styles.addressGrid}>
                    <input placeholder="Город *" value={addressCity} onChange={(e) => setAddressCity(e.target.value)} style={styles.input} />
                    <input placeholder="Улица *" value={addressStreet} onChange={(e) => setAddressStreet(e.target.value)} style={styles.input} />
                    <input placeholder="Дом *" value={addressHouse} onChange={(e) => setAddressHouse(e.target.value)} style={styles.input} />
                    <input placeholder="Квартира" value={addressFlat} onChange={(e) => setAddressFlat(e.target.value)} style={styles.input} />
                    <input placeholder="Домофон" value={addressIntercom} onChange={(e) => setAddressIntercom(e.target.value)} style={styles.input} />
                    <input placeholder="Подъезд" value={addressEntrance} onChange={(e) => setAddressEntrance(e.target.value)} style={styles.input} />
                    <input placeholder="Этаж" value={addressFloor} onChange={(e) => setAddressFloor(e.target.value)} style={styles.input} />
                  </div>
                )}
              </section>
            </div>

            <aside style={styles.summary}>
              <h3 style={styles.summaryTitle}>Итого</h3>
              <div style={styles.summaryRow}>
                <span>Товаров</span>
                <span>{items.reduce((s, i) => s + i.quantity, 0)} шт.</span>
              </div>
              <div style={styles.summaryTotal}>
                <span>Сумма</span>
                <span>{total.toLocaleString('ru-RU')} ₽</span>
              </div>
              <input
                placeholder="Промокод"
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value)}
                style={styles.promoInput}
              />
              {error && <p style={styles.error}>{error}</p>}
              <button
                type="button"
                disabled={!canSubmit || submitting}
                onClick={handleSubmit}
                style={{
                  ...styles.submitBtn,
                  opacity: canSubmit && !submitting ? 1 : 0.55,
                  cursor: canSubmit && !submitting ? 'pointer' : 'not-allowed',
                }}
              >
                {submitting ? 'Оформление...' : 'Оформить заказ'}
              </button>
            </aside>
          </div>
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
    backdropFilter: 'blur(3px)',
    zIndex: 1100,
  },
  modal: {
    position: 'fixed',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    backgroundColor: '#FFFFFF',
    width: 'min(920px, 94vw)',
    maxHeight: '90vh',
    borderRadius: '16px',
    boxShadow: '0 20px 40px rgba(78, 96, 83, 0.3)',
    zIndex: 1101,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '20px 24px',
    borderBottom: `1px solid ${COLORS.border}`,
  },
  title: { margin: 0, fontSize: '20px', fontWeight: '800' },
  closeBtn: {
    background: 'none',
    border: 'none',
    fontSize: '20px',
    cursor: 'pointer',
    color: COLORS.textMuted,
    padding: '4px 8px',
  },
  body: { padding: '20px 24px', overflowY: 'auto' },
  layout: { display: 'flex', gap: '24px', alignItems: 'flex-start' },
  left: { flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' },
  section: { display: 'flex', flexDirection: 'column', gap: '10px' },
  sectionTitle: { margin: 0, fontSize: '15px', fontWeight: '700', color: COLORS.textDark },
  itemsList: { display: 'flex', flexDirection: 'column', gap: '10px' },
  productRow: {
    display: 'flex',
    gap: '12px',
    alignItems: 'center',
    padding: '10px',
    borderRadius: '10px',
    border: `1px solid ${COLORS.border}`,
    backgroundColor: '#FAFBF9',
  },
  productThumb: {
    width: '56px',
    height: '56px',
    borderRadius: '8px',
    overflow: 'hidden',
    backgroundColor: COLORS.accentLight,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  productImg: { width: '100%', height: '100%', objectFit: 'cover' },
  productInfo: { display: 'flex', flexDirection: 'column', gap: '4px' },
  productTitle: { fontSize: '14px', fontWeight: '700', color: COLORS.textDark },
  productMeta: { fontSize: '12px', color: COLORS.textMuted },
  optionLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    cursor: 'pointer',
    color: COLORS.textDark,
  },
  addressGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
    gap: '10px',
    marginTop: '8px',
  },
  input: {
    padding: '10px 12px',
    borderRadius: '8px',
    border: `1px solid ${COLORS.border}`,
    fontSize: '14px',
    outline: 'none',
  },
  summary: {
    width: '260px',
    flexShrink: 0,
    backgroundColor: '#FAFBF9',
    borderRadius: '12px',
    border: `1px solid ${COLORS.border}`,
    padding: '18px',
    position: 'sticky',
    top: 0,
  },
  summaryTitle: { margin: '0 0 12px 0', fontSize: '16px', fontWeight: '800' },
  summaryRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '14px',
    color: COLORS.textMuted,
    marginBottom: '10px',
  },
  summaryTotal: {
    display: 'flex',
    justifyContent: 'space-between',
    fontWeight: '800',
    fontSize: '18px',
    paddingBottom: '14px',
    marginBottom: '14px',
    borderBottom: `1px solid ${COLORS.border}`,
  },
  promoInput: {
    width: '100%',
    padding: '10px 12px',
    borderRadius: '8px',
    border: `1px solid ${COLORS.border}`,
    fontSize: '14px',
    marginBottom: '12px',
    boxSizing: 'border-box',
  },
  error: { color: '#FF4D4F', fontSize: '13px', margin: '0 0 10px 0' },
  submitBtn: {
    width: '100%',
    padding: '13px 0',
    borderRadius: '10px',
    border: 'none',
    backgroundColor: COLORS.primary,
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: '15px',
  },
};
