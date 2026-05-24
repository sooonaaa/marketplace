import React, { useEffect, useState } from 'react';
import { COLORS } from '../constants/colors';
import { apiClient } from '../api/client';

interface ProfilePageProps {
  isLoggedIn: boolean;
  onLoginRequest: () => void;
  onGoToOrders: () => void;
}

interface UserProfile {
  name: string;
  email: string;
  phone: string;
  city: string;
  reg_date: string;
}

export default function ProfilePage({ isLoggedIn, onLoginRequest, onGoToOrders }: ProfilePageProps) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [fetchError, setFetchError] = useState(false);
  const [hoveredTab, setHoveredTab] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoggedIn) return;

    let cancelled = false;
    apiClient
      .get<UserProfile>('/api/auth/me/')
      .then((res) => {
        if (!cancelled) {
          setUser(res.data);
          setFetchError(false);
        }
      })
      .catch((err) => {
        console.error('Ошибка загрузки профиля:', err);
        if (!cancelled) setFetchError(true);
      });

    return () => {
      cancelled = true;
    };
  }, [isLoggedIn]);

  if (!isLoggedIn) {
    return (
      <div style={styles.emptyState}>
        <h3 style={styles.emptyTitle}>Доступ ограничен</h3>
        <p style={styles.emptyText}>Пожалуйста, войдите в систему, чтобы просмотреть личный кабинет.</p>
        <button type="button" style={styles.primaryButton} onClick={onLoginRequest}>
          Войти
        </button>
      </div>
    );
  }

  const loading = user === null && !fetchError;

  if (loading) {
    return <div style={styles.loading}>Загрузка данных...</div>;
  }

  if (!user) {
    return (
      <div style={styles.emptyState}>
        <p style={styles.emptyText}>Не удалось загрузить данные профиля</p>
      </div>
    );
  }

  return (
    <div style={styles.profileLayout}>
      <aside style={styles.sidebar}>
        <div style={styles.userCardShort}>
          <div style={styles.avatarPlaceholder}>{user.name.charAt(0) || '?'}</div>
          <h3 style={styles.sidebarUserName}>{user.name}</h3>
          <span style={styles.sidebarUserCity}>{user.city}</span>
        </div>
        <nav style={styles.sidebarNav}>
          <button
            type="button"
            style={{
              ...styles.navButton,
              backgroundColor: COLORS.accentLight,
              color: COLORS.primary,
              fontWeight: '700',
            }}
          >
            👤 Личные данные
          </button>
          <button
            type="button"
            onClick={onGoToOrders}
            onMouseEnter={() => setHoveredTab('orders')}
            onMouseLeave={() => setHoveredTab(null)}
            style={{
              ...styles.navButton,
              backgroundColor: hoveredTab === 'orders' ? '#FAFBF9' : 'transparent',
              color: COLORS.textDark,
              fontWeight: '500',
            }}
          >
            📦 История заказов
          </button>
        </nav>
      </aside>

      <section style={styles.contentArea}>
        <h2 style={styles.sectionTitle}>Личные данные</h2>
        <div style={styles.infoGrid}>
          <div style={styles.infoBlock}>
            <span style={styles.infoLabel}>Имя и Фамилия</span>
            <span style={styles.infoValue}>{user.name}</span>
          </div>
          <div style={styles.infoBlock}>
            <span style={styles.infoLabel}>Электронная почта</span>
            <span style={styles.infoValue}>{user.email}</span>
          </div>
          <div style={styles.infoBlock}>
            <span style={styles.infoLabel}>Номер телефона</span>
            <span style={styles.infoValue}>{user.phone || '—'}</span>
          </div>
          <div style={styles.infoBlock}>
            <span style={styles.infoLabel}>Населенный пункт</span>
            <span style={styles.infoValue}>{user.city}</span>
          </div>
          <div style={styles.infoBlock}>
            <span style={styles.infoLabel}>Дата регистрации</span>
            <span style={styles.infoValue}>{user.reg_date}</span>
          </div>
        </div>
      </section>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  profileLayout: { display: 'flex', gap: '30px', alignItems: 'flex-start' },
  sidebar: {
    width: '280px',
    backgroundColor: COLORS.cardBg,
    borderRadius: '16px',
    border: `1px solid ${COLORS.border}`,
    padding: '24px 16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    flexShrink: 0,
  },
  userCardShort: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    borderBottom: `1px solid ${COLORS.border}`,
    paddingBottom: '20px',
  },
  avatarPlaceholder: {
    width: '60px',
    height: '60px',
    borderRadius: '50%',
    backgroundColor: COLORS.accentLight,
    color: COLORS.primary,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '24px',
    fontWeight: '800',
    marginBottom: '12px',
  },
  sidebarUserName: { margin: '0 0 4px 0', fontSize: '16px', fontWeight: '700', color: COLORS.textDark },
  sidebarUserCity: { fontSize: '13px', color: COLORS.textMuted },
  sidebarNav: { display: 'flex', flexDirection: 'column', gap: '6px' },
  navButton: {
    display: 'flex',
    alignItems: 'center',
    padding: '12px 14px',
    borderRadius: '10px',
    border: 'none',
    cursor: 'pointer',
    fontSize: '14px',
    transition: 'all 0.15s ease',
    textAlign: 'left',
    width: '100%',
    outline: 'none',
    backgroundColor: 'transparent',
  },
  contentArea: {
    flex: 1,
    backgroundColor: COLORS.cardBg,
    borderRadius: '16px',
    border: `1px solid ${COLORS.border}`,
    padding: '28px',
  },
  sectionTitle: { margin: '0 0 24px 0', fontSize: '22px', fontWeight: '800', color: COLORS.textDark },
  infoGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' },
  infoBlock: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    backgroundColor: '#FAFBF9',
    padding: '14px 16px',
    borderRadius: '10px',
    border: `1px solid ${COLORS.border}`,
  },
  infoLabel: { fontSize: '12px', fontWeight: '600', color: COLORS.textMuted },
  infoValue: { fontSize: '15px', fontWeight: '700', color: COLORS.textDark },
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
  loading: { padding: '40px', textAlign: 'center', color: COLORS.textMuted },
};
