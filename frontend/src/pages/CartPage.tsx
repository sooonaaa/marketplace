import React, { useEffect, useMemo, useState } from 'react';
import { COLORS } from '../constants/colors';
import type { CartItem } from '../types/cart';
import { updateProductQuantity } from '../utils/cartStorage';

interface CartPageProps {
  cartItems: CartItem[];
  setCartItems: React.Dispatch<React.SetStateAction<CartItem[]>>;
  onProductClick: (productId: number) => void;
  onProceedToCheckout: (selectedItems: CartItem[]) => void;
}

export default function CartPage({
  cartItems,
  setCartItems,
  onProductClick,
  onProceedToCheckout,
}: CartPageProps) {
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [hoveredId, setHoveredId] = useState<number | null>(null);

  useEffect(() => {
    setSelectedIds(new Set(cartItems.map((i) => i.productId)));
  }, [cartItems]);

  const selectedItems = useMemo(
    () => cartItems.filter((i) => selectedIds.has(i.productId)),
    [cartItems, selectedIds]
  );

  const total = selectedItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const allSelected = cartItems.length > 0 && selectedIds.size === cartItems.length;

  const toggleItem = (productId: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) next.delete(productId);
      else next.add(productId);
      return next;
    });
  };

  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(cartItems.map((i) => i.productId)));
    }
  };

  const changeQty = (productId: number, quantity: number) => {
    setCartItems((prev) => updateProductQuantity(prev, productId, quantity));
    if (quantity <= 0) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(productId);
        return next;
      });
    }
  };

  if (cartItems.length === 0) {
    return (
      <div style={styles.emptyState}>
        <div style={{ fontSize: '48px', marginBottom: '12px' }}>🛒</div>
        <h2 style={styles.emptyTitle}>Корзина пуста</h2>
        <p style={styles.emptyText}>Добавьте товары из каталога, чтобы оформить заказ</p>
      </div>
    );
  }

  return (
    <div>
      <h2 style={styles.pageTitle}>Корзина</h2>
      <label style={styles.selectAllRow}>
        <input type="checkbox" checked={allSelected} onChange={toggleAll} style={styles.checkbox} />
        <span>Выбрать все</span>
      </label>
      <div style={styles.cartLayout}>
        <div style={styles.itemsList}>
          {cartItems.map((item) => (
            <div
              key={item.productId}
              style={{
                ...styles.cartItem,
                boxShadow: hoveredId === item.productId ? '0 4px 16px rgba(78, 96, 83, 0.08)' : 'none',
              }}
              onMouseEnter={() => setHoveredId(item.productId)}
              onMouseLeave={() => setHoveredId(null)}
            >
              <input
                type="checkbox"
                checked={selectedIds.has(item.productId)}
                onChange={() => toggleItem(item.productId)}
                style={styles.checkbox}
              />
              <div style={styles.itemImageWrap} onClick={() => onProductClick(item.productId)}>
                {item.image ? (
                  <img src={item.image} alt={item.title} style={styles.itemImage} />
                ) : (
                  <div style={styles.itemImagePlaceholder}>📦</div>
                )}
              </div>
              <div style={styles.itemInfo}>
                <span style={styles.itemTitle} onClick={() => onProductClick(item.productId)}>
                  {item.title}
                </span>
                <span style={styles.itemPrice}>{item.price} ₽ / шт.</span>
                <div style={styles.qtyRow}>
                  <button
                    type="button"
                    style={styles.qtyButton}
                    onClick={() => changeQty(item.productId, item.quantity - 1)}
                  >
                    −
                  </button>
                  <span style={styles.qtyValue}>{item.quantity}</span>
                  <button
                    type="button"
                    style={styles.qtyButton}
                    onClick={() => changeQty(item.productId, item.quantity + 1)}
                  >
                    +
                  </button>
                </div>
              </div>
              <div style={styles.itemTotal}>
                {(item.price * item.quantity).toLocaleString('ru-RU')} ₽
              </div>
            </div>
          ))}
        </div>
        <aside style={styles.summaryCard}>
          <h3 style={styles.summaryTitle}>Итого</h3>
          <div style={styles.summaryRow}>
            <span>Выбрано</span>
            <span>{selectedItems.reduce((s, i) => s + i.quantity, 0)} шт.</span>
          </div>
          <div style={styles.summaryTotalRow}>
            <span>Сумма</span>
            <span style={styles.summaryTotal}>{total.toLocaleString('ru-RU')} ₽</span>
          </div>
          <button
            type="button"
            style={{
              ...styles.checkoutButton,
              opacity: selectedItems.length === 0 ? 0.5 : 1,
              cursor: selectedItems.length === 0 ? 'not-allowed' : 'pointer',
            }}
            disabled={selectedItems.length === 0}
            onClick={() => onProceedToCheckout(selectedItems)}
          >
            Перейти к оформлению
          </button>
        </aside>
      </div>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  pageTitle: { margin: '0 0 16px 0', fontSize: '26px', fontWeight: '800', color: COLORS.textDark },
  selectAllRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '16px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    color: COLORS.textDark,
  },
  checkbox: { width: '18px', height: '18px', accentColor: COLORS.primary, cursor: 'pointer' },
  cartLayout: { display: 'flex', gap: '24px', alignItems: 'flex-start' },
  itemsList: { flex: 1, display: 'flex', flexDirection: 'column', gap: '14px' },
  cartItem: {
    display: 'flex',
    gap: '14px',
    alignItems: 'center',
    backgroundColor: COLORS.cardBg,
    borderRadius: '14px',
    border: `1px solid ${COLORS.border}`,
    padding: '16px',
    transition: 'box-shadow 0.2s ease',
  },
  itemImageWrap: { width: '88px', height: '88px', borderRadius: '10px', overflow: 'hidden', cursor: 'pointer', flexShrink: 0 },
  itemImage: { width: '100%', height: '100%', objectFit: 'cover' },
  itemImagePlaceholder: {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.accentLight,
    fontSize: '28px',
  },
  itemInfo: { flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' },
  itemTitle: { fontSize: '15px', fontWeight: '700', color: COLORS.textDark, cursor: 'pointer', lineHeight: 1.35 },
  itemPrice: { fontSize: '13px', color: COLORS.textMuted, fontWeight: '600' },
  qtyRow: { display: 'flex', alignItems: 'center', gap: '10px' },
  qtyButton: {
    width: '32px',
    height: '32px',
    borderRadius: '8px',
    border: `1px solid ${COLORS.border}`,
    backgroundColor: '#FAFBF9',
    color: COLORS.textDark,
    fontSize: '18px',
    fontWeight: '700',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyValue: { minWidth: '24px', textAlign: 'center', fontWeight: '700', fontSize: '15px' },
  itemTotal: { fontSize: '17px', fontWeight: '800', color: COLORS.textDark, whiteSpace: 'nowrap' },
  summaryCard: {
    width: '300px',
    flexShrink: 0,
    backgroundColor: COLORS.cardBg,
    borderRadius: '16px',
    border: `1px solid ${COLORS.border}`,
    padding: '24px',
    position: 'sticky',
    top: '90px',
  },
  summaryTitle: { margin: '0 0 16px 0', fontSize: '18px', fontWeight: '800' },
  summaryRow: { display: 'flex', justifyContent: 'space-between', marginBottom: '12px', fontSize: '14px', color: COLORS.textMuted },
  summaryTotalRow: {
    display: 'flex',
    justifyContent: 'space-between',
    paddingTop: '14px',
    marginBottom: '20px',
    borderTop: `1px solid ${COLORS.border}`,
    fontWeight: '700',
  },
  summaryTotal: { fontSize: '20px', color: COLORS.textDark },
  checkoutButton: {
    width: '100%',
    padding: '14px 0',
    borderRadius: '12px',
    border: 'none',
    backgroundColor: COLORS.primary,
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: '15px',
    boxShadow: '0 4px 12px rgba(106, 157, 119, 0.2)',
  },
  emptyState: {
    textAlign: 'center',
    padding: '60px 24px',
    backgroundColor: COLORS.cardBg,
    borderRadius: '16px',
    border: `1px solid ${COLORS.border}`,
  },
  emptyTitle: { margin: '0 0 8px 0', fontSize: '22px', fontWeight: '800' },
  emptyText: { margin: 0, color: COLORS.textMuted, fontSize: '15px' },
};
