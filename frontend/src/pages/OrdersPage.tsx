import React, { useCallback, useEffect, useState } from 'react';
import { COLORS } from '../constants/colors';
import { apiClient } from '../api/client';
import type { OrderData } from '../types/order';
import OrderRateModal from '../components/OrderRateModal';
import OrderReturnModal from '../components/OrderReturnModal';

interface OrdersPageProps {
  isLoggedIn: boolean;
  onLoginRequest: () => void;
}

export default function OrdersPage({ isLoggedIn, onLoginRequest }: OrdersPageProps) {
  const [orders, setOrders] = useState<OrderData[]>([]);
  const [hasFetched, setHasFetched] = useState(false);
  const [fetchError, setFetchError] = useState(false);
  const [rateOrder, setRateOrder] = useState<OrderData | null>(null);
  const [returnOrder, setReturnOrder] = useState<OrderData | null>(null);

  const loadOrders = useCallback(() => {
    if (!isLoggedIn) return;
    apiClient
      .get<OrderData[]>('/api/auth/orders/')
      .then((res) => {
        setOrders(res.data);
        setHasFetched(true);
        setFetchError(false);
      })
      .catch((err) => {
        console.error('Ошибка загрузки заказов:', err);
        setFetchError(true);
        setHasFetched(true);
      });
  }, [isLoggedIn]);

  useEffect(() => {
    if (!isLoggedIn) return;
    loadOrders();
  }, [isLoggedIn, loadOrders]);

  if (!isLoggedIn) {
    return (
      <div style={styles.emptyState}>
        <h2 style={styles.emptyTitle}>Войдите в аккаунт</h2>
        <p style={styles.emptyText}>История заказов доступна после авторизации</p>
        <button type="button" style={styles.primaryButton} onClick={onLoginRequest}>
          Войти
        </button>
      </div>
    );
  }

  const loading = !hasFetched;

  if (loading) {
    return <div style={styles.loading}>Загрузка заказов...</div>;
  }

  if (fetchError) {
    return (
      <div style={styles.emptyState}>
        <p style={styles.emptyText}>Не удалось загрузить заказы</p>
        <button type="button" style={styles.primaryButton} onClick={loadOrders}>
          Повторить
        </button>
      </div>
    );
  }

  return (
    <>
      {rateOrder && (
        <OrderRateModal
          order={rateOrder}
          onClose={() => setRateOrder(null)}
          onDone={loadOrders}
        />
      )}
      {returnOrder && (
        <OrderReturnModal
          order={returnOrder}
          onClose={() => setReturnOrder(null)}
          onDone={loadOrders}
        />
      )}

      <h2 style={styles.pageTitle}>Мои заказы</h2>
      {orders.length === 0 ? (
        <div style={styles.emptyState}>
          <p style={styles.emptyText}>У вас пока нет заказов</p>
        </div>
      ) : (
        <div style={styles.ordersList}>
          {orders.map((order) => (
            <article key={order.id} style={styles.orderCard}>
              <div style={styles.orderHeaderRow}>
                <div>
                  <span style={styles.orderId}>{order.orderNumber}</span>
                  <span style={styles.orderDate}>от {order.date}</span>
                </div>
                <span
                  style={{
                    ...styles.orderStatus,
                    color: order.statusColor,
                    backgroundColor: order.statusColor + '12',
                  }}
                >
                  {order.status}
                </span>
              </div>

              <div style={styles.metaGrid}>
                <div>
                  <span style={styles.metaLabel}>Дата получения</span>
                  <span style={styles.metaValue}>{order.receivedAt || '—'}</span>
                </div>
                <div>
                  <span style={styles.metaLabel}>Способ доставки</span>
                  <span style={styles.metaValue}>{order.deliveryMethod}</span>
                </div>
                {order.deliveryType === 'courier' && order.deliveryAddress && (
                  <div style={{ gridColumn: '1 / -1' }}>
                    <span style={styles.metaLabel}>Адрес</span>
                    <span style={styles.metaValue}>{order.deliveryAddress}</span>
                  </div>
                )}
              </div>

              <div style={styles.itemsGallery}>
                {order.items.map((item) => (
                  <div key={item.id} style={styles.galleryItem}>
                    {item.image ? (
                      <img src={item.image} alt={item.title} style={styles.galleryImg} />
                    ) : (
                      <div style={styles.galleryPlaceholder}>📦</div>
                    )}
                    <span style={styles.galleryQty}>×{item.quantity}</span>
                  </div>
                ))}
              </div>

              <div style={styles.orderFooterRow}>
                <span style={styles.orderTotalLabel}>Сумма заказа:</span>
                <span style={styles.orderTotalValue}>
                  {order.total.toLocaleString('ru-RU')} ₽
                </span>
              </div>

              <div style={styles.actionsRow}>
                <button
                  type="button"
                  style={styles.actionBtnPrimary}
                  onClick={() => setRateOrder(order)}
                >
                  Оценить товары
                </button>
                <button
                  type="button"
                  style={styles.actionBtnSecondary}
                  onClick={() => setReturnOrder(order)}
                >
                  Вернуть товары
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  pageTitle: { margin: '0 0 24px 0', fontSize: '26px', fontWeight: '800', color: COLORS.textDark },
  loading: { padding: '40px', textAlign: 'center', color: COLORS.textMuted },
  ordersList: { display: 'flex', flexDirection: 'column', gap: '18px' },
  orderCard: {
    border: `1px solid ${COLORS.border}`,
    borderRadius: '14px',
    padding: '18px',
    backgroundColor: COLORS.cardBg,
  },
  orderHeaderRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: `1px solid ${COLORS.border}`,
    paddingBottom: '12px',
    marginBottom: '14px',
  },
  orderId: { fontSize: '16px', fontWeight: '800', color: COLORS.textDark, marginRight: '10px' },
  orderDate: { fontSize: '13px', color: COLORS.textMuted },
  orderStatus: { fontSize: '12px', fontWeight: '700', padding: '4px 10px', borderRadius: '6px' },
  metaGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: '12px',
    marginBottom: '14px',
  },
  metaLabel: { display: 'block', fontSize: '11px', fontWeight: '600', color: COLORS.textMuted, marginBottom: '4px' },
  metaValue: { fontSize: '14px', fontWeight: '600', color: COLORS.textDark },
  itemsGallery: { display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '14px' },
  galleryItem: { position: 'relative', width: '72px', height: '72px' },
  galleryImg: { width: '100%', height: '100%', objectFit: 'cover', borderRadius: '10px', border: `1px solid ${COLORS.border}` },
  galleryPlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: '10px',
    backgroundColor: COLORS.accentLight,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '24px',
    border: `1px solid ${COLORS.border}`,
  },
  galleryQty: {
    position: 'absolute',
    bottom: '4px',
    right: '4px',
    backgroundColor: COLORS.textDark,
    color: '#FFF',
    fontSize: '10px',
    fontWeight: '700',
    padding: '2px 6px',
    borderRadius: '6px',
  },
  orderFooterRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '14px',
  },
  orderTotalLabel: { fontSize: '14px', color: COLORS.textMuted },
  orderTotalValue: { fontSize: '18px', fontWeight: '800', color: COLORS.textDark },
  actionsRow: { display: 'flex', gap: '10px', flexWrap: 'wrap' },
  actionBtnPrimary: {
    padding: '10px 16px',
    borderRadius: '10px',
    border: 'none',
    backgroundColor: COLORS.primary,
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: '13px',
    cursor: 'pointer',
  },
  actionBtnSecondary: {
    padding: '10px 16px',
    borderRadius: '10px',
    border: `1px solid ${COLORS.border}`,
    backgroundColor: '#FFFFFF',
    color: COLORS.textDark,
    fontWeight: '700',
    fontSize: '13px',
    cursor: 'pointer',
  },
  emptyState: {
    textAlign: 'center',
    padding: '48px 24px',
    backgroundColor: COLORS.cardBg,
    borderRadius: '16px',
    border: `1px solid ${COLORS.border}`,
  },
  emptyTitle: { margin: '0 0 8px 0', fontSize: '20px', fontWeight: '800' },
  emptyText: { margin: '0 0 16px 0', color: COLORS.textMuted },
  primaryButton: {
    backgroundColor: COLORS.primary,
    color: '#FFFFFF',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: '600',
  },
};
