import React, { useCallback, useEffect, useState } from 'react';
import { COLORS } from '../constants/colors';
import { apiClient } from '../api/client';
import AccountLayout, { accountStyles } from '../components/AccountLayout';
import SimpleBarChart from '../components/SimpleBarChart';

type Section = 'tickets' | 'submissions' | 'products' | 'users' | 'reviews' | 'analytics';

const ADMIN_MENU = [
  { id: 'tickets', label: 'Обращения', icon: '✉️' },
  { id: 'submissions', label: 'Заявки на товары', icon: '📋' },
  { id: 'products', label: 'Модерация товаров', icon: '🏷️' },
  { id: 'users', label: 'Пользователи', icon: '👥' },
  { id: 'reviews', label: 'Отзывы', icon: '⭐' },
  { id: 'analytics', label: 'Аналитика', icon: '📊' },
];

interface Ticket {
  id: number;
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  description: string;
  status: string;
  created_at: string;
}

interface AdminProduct {
  id: number;
  title: string;
  price: number;
  status: string;
  status_label: string;
  status_reason: string;
  category: string;
  seller?: {
    first_name: string;
    last_name: string;
    patronymic: string;
    email: string;
    phone: string;
    business_form_label: string;
    inn: string;
  };
  show_seller_details?: boolean;
}

interface AdminUser {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  city: string;
  role: string;
  role_label: string;
  patronymic?: string;
  business_form_label?: string;
  inn?: string;
}

interface AdminReview {
  id: number;
  product_title: string;
  author: string;
  rating: number;
  text: string;
  date: string;
}

interface Analytics {
  visits_24h: number;
  visits_7d: number;
  new_users_24h: number;
  sales_count_24h: number;
  sales_count_total: number;
  revenue_total: number;
  revenue_24h: number;
  pending_products: number;
  pending_reviews: number;
  open_tickets: number;
  visits_chart: { label: string; value: number }[];
  sales_chart: { label: string; value: number }[];
}

export default function AdminPage() {
  const [section, setSection] = useState<Section>('tickets');
  const [adminName, setAdminName] = useState('Администратор');
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [submissions, setSubmissions] = useState<AdminProduct[]>([]);
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [reviews, setReviews] = useState<AdminReview[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [removeModal, setRemoveModal] = useState<AdminProduct | null>(null);
  const [removeReason, setRemoveReason] = useState('');
  const [rejectModal, setRejectModal] = useState<AdminProduct | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [editUser, setEditUser] = useState<AdminUser | null>(null);
  const [userRoleFilter, setUserRoleFilter] = useState('');

  const loadTickets = useCallback(() => {
    apiClient.get<Ticket[]>('/api/auth/admin/tickets/').then((r) => setTickets(r.data)).catch(() => {});
  }, []);

  const loadSubmissions = useCallback(() => {
    apiClient.get<AdminProduct[]>('/api/auth/admin/products/pending/').then((r) => setSubmissions(r.data)).catch(() => {});
  }, []);

  const loadProducts = useCallback(() => {
    apiClient.get<AdminProduct[]>('/api/auth/admin/products/').then((r) => setProducts(r.data)).catch(() => {});
  }, []);

  const loadUsers = useCallback(() => {
    apiClient
      .get<AdminUser[]>('/api/auth/admin/users/', { params: userRoleFilter ? { role: userRoleFilter } : {} })
      .then((r) => setUsers(r.data))
      .catch(() => {});
  }, [userRoleFilter]);

  const loadReviews = useCallback(() => {
    apiClient.get<AdminReview[]>('/api/auth/admin/reviews/?status=pending').then((r) => setReviews(r.data)).catch(() => {});
  }, []);

  const loadAnalytics = useCallback(() => {
    apiClient.get<Analytics>('/api/auth/admin/analytics/').then((r) => setAnalytics(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    apiClient.get<{ name: string }>('/api/auth/me/').then((r) => setAdminName(r.data.name || 'Администратор'));
    loadTickets();
    loadSubmissions();
    loadProducts();
    loadUsers();
    loadReviews();
    loadAnalytics();
  }, [loadTickets, loadSubmissions, loadProducts, loadUsers, loadReviews, loadAnalytics]);

  useEffect(() => {
    loadUsers();
  }, [userRoleFilter, loadUsers]);

  const approveProduct = async (id: number) => {
    await apiClient.post(`/api/auth/admin/products/${id}/moderate/`, { action: 'approve' });
    loadSubmissions();
    loadProducts();
  };

  const rejectProduct = async () => {
    if (!rejectModal || !rejectReason.trim()) return;
    await apiClient.post(`/api/auth/admin/products/${rejectModal.id}/moderate/`, {
      action: 'reject',
      reason: rejectReason,
    });
    setRejectModal(null);
    setRejectReason('');
    loadSubmissions();
    loadProducts();
  };

  const removeProduct = async () => {
    if (!removeModal || !removeReason.trim()) return;
    await apiClient.post(`/api/auth/admin/products/${removeModal.id}/remove/`, { reason: removeReason });
    setRemoveModal(null);
    setRemoveReason('');
    loadProducts();
  };

  const saveUser = async () => {
    if (!editUser) return;
    await apiClient.patch('/api/auth/admin/users/', { ...editUser, user_id: editUser.id });
    setEditUser(null);
    loadUsers();
  };

  return (
    <>
      <AccountLayout
        userName={adminName}
        userSubtitle="Панель администратора"
        menuItems={ADMIN_MENU}
        activeId={section}
        onSelect={(id) => setSection(id as Section)}
      >
        {section === 'tickets' && (
          <>
            <h2 style={accountStyles.panelTitle}>Обращения</h2>
            {tickets.length === 0 ? (
              <p style={accountStyles.emptyText}>Нет обращений</p>
            ) : (
              <div style={styles.list}>
                {tickets.map((t) => (
                  <div key={t.id} style={styles.card}>
                    <div style={{ flex: 1 }}>
                      <strong>{t.first_name} {t.last_name}</strong>
                      <div style={styles.muted}>{t.email} · {t.phone}</div>
                      <div style={styles.muted}>{t.created_at}</div>
                      <p style={{ marginTop: '8px' }}>{t.description}</p>
                    </div>
                    {t.status === 'open' && (
                      <button type="button" style={styles.smallBtn} onClick={() => apiClient.patch(`/api/auth/admin/tickets/${t.id}/close/`).then(loadTickets)}>
                        Закрыть
                      </button>
                    )}
                    {t.status === 'closed' && <span style={styles.badge}>Закрыто</span>}
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {section === 'submissions' && (
          <>
            <h2 style={accountStyles.panelTitle}>Заявки на добавление товаров</h2>
            {submissions.length === 0 ? (
              <p style={accountStyles.emptyText}>Нет заявок на рассмотрении</p>
            ) : (
              <div style={styles.list}>
                {submissions.map((p) => (
                  <div key={p.id} style={styles.cardCol}>
                    <strong>{p.title}</strong> — {p.status_label}
                    {p.show_seller_details && p.seller && (
                      <div style={styles.sellerBox}>
                        <div style={styles.sellerTitle}>Данные продавца</div>
                        <div>{p.seller.first_name} {p.seller.last_name} {p.seller.patronymic}</div>
                        <div style={styles.muted}>{p.seller.email} · {p.seller.phone}</div>
                        <div style={styles.muted}>{p.seller.business_form_label} · ИНН {p.seller.inn}</div>
                      </div>
                    )}
                    <div style={styles.actions}>
                      <button type="button" style={styles.approveBtn} onClick={() => approveProduct(p.id)}>Одобрить</button>
                      <button type="button" style={styles.rejectBtn} onClick={() => { setRejectModal(p); setRejectReason(''); }}>Отклонить</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {section === 'products' && (
          <>
            <h2 style={accountStyles.panelTitle}>Модерация товаров</h2>
            <div style={styles.list}>
              {products.map((p) => (
                <div key={p.id} style={styles.card}>
                  <div style={{ flex: 1 }}>
                    <strong>{p.title}</strong>
                    <div style={styles.muted}>Статус: {p.status_label}{p.status_reason ? ` — ${p.status_reason}` : ''}</div>
                  </div>
                  {p.status === 'published' && (
                    <button type="button" style={styles.rejectBtn} onClick={() => { setRemoveModal(p); setRemoveReason(''); }}>Удалить из каталога</button>
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        {section === 'users' && (
          <>
            <div style={accountStyles.panelHeader}>
              <h2 style={accountStyles.panelTitle}>Пользователи и продавцы</h2>
              <select value={userRoleFilter} onChange={(e) => setUserRoleFilter(e.target.value)} style={styles.select}>
                <option value="">Все роли</option>
                <option value="user">Покупатели</option>
                <option value="seller">Продавцы</option>
                <option value="admin">Администраторы</option>
              </select>
            </div>
            <div style={styles.list}>
              {users.map((u) => (
                <div key={u.id} style={styles.card}>
                  <div style={{ flex: 1 }}>
                    <strong>{u.first_name} {u.last_name}</strong> — {u.role_label}
                    <div style={styles.muted}>{u.email} · {u.phone}</div>
                  </div>
                  <button type="button" style={styles.smallBtn} onClick={() => setEditUser({ ...u })}>Изменить</button>
                </div>
              ))}
            </div>
          </>
        )}

        {section === 'reviews' && (
          <>
            <h2 style={accountStyles.panelTitle}>Модерация отзывов</h2>
            {reviews.length === 0 ? (
              <p style={accountStyles.emptyText}>Нет отзывов на модерации</p>
            ) : (
              <div style={styles.list}>
                {reviews.map((r) => (
                  <div key={r.id} style={styles.cardCol}>
                    <strong>{r.product_title}</strong>
                    <div style={styles.muted}>{r.author} · {r.date} · {'★'.repeat(r.rating)}</div>
                    {r.text && <p>{r.text}</p>}
                    <div style={styles.actions}>
                      <button type="button" style={styles.approveBtn} onClick={() => apiClient.post(`/api/auth/admin/reviews/${r.id}/moderate/`, { action: 'approve' }).then(loadReviews)}>Опубликовать</button>
                      <button type="button" style={styles.rejectBtn} onClick={() => apiClient.post(`/api/auth/admin/reviews/${r.id}/moderate/`, { action: 'reject' }).then(loadReviews)}>Отклонить</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {section === 'analytics' && analytics && (
          <>
            <h2 style={accountStyles.panelTitle}>Аналитика маркетплейса</h2>
            <div style={styles.statsGrid}>
              <div style={styles.statCard}><span style={styles.statLabel}>Посещения за 24 ч</span><strong style={styles.statValue}>{analytics.visits_24h}</strong></div>
              <div style={styles.statCard}><span style={styles.statLabel}>Посещения за 7 дней</span><strong style={styles.statValue}>{analytics.visits_7d}</strong></div>
              <div style={styles.statCard}><span style={styles.statLabel}>Новые пользователи (24 ч)</span><strong style={styles.statValue}>{analytics.new_users_24h}</strong></div>
              <div style={styles.statCard}><span style={styles.statLabel}>Продажи (24 ч)</span><strong style={styles.statValue}>{analytics.sales_count_24h}</strong></div>
              <div style={styles.statCard}><span style={styles.statLabel}>Продажи всего</span><strong style={styles.statValue}>{analytics.sales_count_total}</strong></div>
              <div style={styles.statCard}><span style={styles.statLabel}>Сумма продаж</span><strong style={styles.statValue}>{analytics.revenue_total.toLocaleString('ru-RU')} ₽</strong></div>
              <div style={styles.statCard}><span style={styles.statLabel}>Сумма за 24 ч</span><strong style={styles.statValue}>{analytics.revenue_24h.toLocaleString('ru-RU')} ₽</strong></div>
              <div style={styles.statCard}><span style={styles.statLabel}>На модерации</span><strong style={styles.statValue}>{analytics.pending_products} тов. / {analytics.pending_reviews} отз.</strong></div>
            </div>
            <div style={styles.chartsRow}>
              <SimpleBarChart title="Посещения по дням" data={analytics.visits_chart} />
              <SimpleBarChart title="Продажи по дням" data={analytics.sales_chart} color="#FAAD14" />
            </div>
          </>
        )}
      </AccountLayout>

      {removeModal && (
        <>
          <div style={styles.overlay} onClick={() => setRemoveModal(null)} />
          <div style={styles.modal}>
            <h3>Удалить «{removeModal.title}» из каталога</h3>
            <label style={styles.muted}>Причина (увидит продавец)</label>
            <textarea value={removeReason} onChange={(e) => setRemoveReason(e.target.value)} rows={4} style={styles.textarea} />
            <div style={styles.actions}>
              <button type="button" style={styles.rejectBtn} onClick={() => setRemoveModal(null)}>Отмена</button>
              <button type="button" style={styles.approveBtn} onClick={removeProduct}>Удалить</button>
            </div>
          </div>
        </>
      )}

      {rejectModal && (
        <>
          <div style={styles.overlay} onClick={() => setRejectModal(null)} />
          <div style={styles.modal}>
            <h3>Отклонить «{rejectModal.title}»</h3>
            <textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} rows={4} style={styles.textarea} placeholder="Причина отклонения" />
            <div style={styles.actions}>
              <button type="button" style={styles.smallBtn} onClick={() => setRejectModal(null)}>Отмена</button>
              <button type="button" style={styles.rejectBtn} onClick={rejectProduct}>Отклонить</button>
            </div>
          </div>
        </>
      )}

      {editUser && (
        <>
          <div style={styles.overlay} onClick={() => setEditUser(null)} />
          <div style={styles.modal}>
            <h3>Редактировать пользователя</h3>
            <input value={editUser.first_name} onChange={(e) => setEditUser({ ...editUser, first_name: e.target.value })} style={styles.input} placeholder="Имя" />
            <input value={editUser.last_name} onChange={(e) => setEditUser({ ...editUser, last_name: e.target.value })} style={styles.input} placeholder="Фамилия" />
            <input value={editUser.email} onChange={(e) => setEditUser({ ...editUser, email: e.target.value })} style={styles.input} placeholder="Email" />
            <input value={editUser.phone} onChange={(e) => setEditUser({ ...editUser, phone: e.target.value })} style={styles.input} placeholder="Телефон" />
            <select value={editUser.role} onChange={(e) => setEditUser({ ...editUser, role: e.target.value })} style={styles.input}>
              <option value="user">Покупатель</option>
              <option value="seller">Продавец</option>
              <option value="admin">Администратор</option>
            </select>
            <button type="button" style={styles.approveBtn} onClick={saveUser}>Сохранить</button>
          </div>
        </>
      )}
    </>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  list: { display: 'flex', flexDirection: 'column', gap: '12px' },
  card: { display: 'flex', gap: '12px', alignItems: 'flex-start', padding: '14px', backgroundColor: '#FAFBF9', borderRadius: '12px', border: `1px solid ${COLORS.border}` },
  cardCol: { display: 'flex', flexDirection: 'column', gap: '10px', padding: '14px', backgroundColor: '#FAFBF9', borderRadius: '12px', border: `1px solid ${COLORS.border}` },
  muted: { fontSize: '13px', color: COLORS.textMuted },
  smallBtn: { padding: '8px 12px', borderRadius: '8px', border: `1px solid ${COLORS.border}`, background: '#FFF', cursor: 'pointer', fontWeight: '600' },
  approveBtn: { padding: '8px 14px', borderRadius: '8px', border: 'none', background: COLORS.primary, color: '#FFF', cursor: 'pointer', fontWeight: '600' },
  rejectBtn: { padding: '8px 14px', borderRadius: '8px', border: 'none', background: '#FFF2F0', color: '#FF4D4F', cursor: 'pointer', fontWeight: '600' },
  actions: { display: 'flex', gap: '8px', flexWrap: 'wrap' },
  sellerBox: { backgroundColor: '#FFF', padding: '12px', borderRadius: '8px', border: `1px solid ${COLORS.border}` },
  sellerTitle: { fontWeight: '700', marginBottom: '6px', fontSize: '13px' },
  badge: { fontSize: '12px', color: COLORS.textMuted },
  select: { padding: '8px 12px', borderRadius: '8px', border: `1px solid ${COLORS.border}` },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '12px', marginBottom: '20px' },
  statCard: { backgroundColor: '#FAFBF9', padding: '14px', borderRadius: '10px', border: `1px solid ${COLORS.border}`, display: 'flex', flexDirection: 'column', gap: '6px' },
  statLabel: { fontSize: '12px', color: COLORS.textMuted },
  statValue: { fontSize: '20px', color: COLORS.textDark },
  chartsRow: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' },
  overlay: { position: 'fixed', inset: 0, backgroundColor: 'rgba(78,96,83,0.45)', zIndex: 1100 },
  modal: { position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', background: '#FFF', padding: '24px', borderRadius: '16px', zIndex: 1101, width: 'min(440px,92vw)', display: 'flex', flexDirection: 'column', gap: '10px' },
  textarea: { padding: '10px', borderRadius: '8px', border: `1px solid ${COLORS.border}`, width: '100%', boxSizing: 'border-box' },
  input: { padding: '10px', borderRadius: '8px', border: `1px solid ${COLORS.border}`, width: '100%', boxSizing: 'border-box' },
};
