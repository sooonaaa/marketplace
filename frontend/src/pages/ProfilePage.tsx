import React, { useState } from 'react';

// --- ИНТЕРФЕЙСЫ ---
interface ProfilePageProps {
  isLoggedIn: boolean;
  setIsLoggedIn: (value: boolean) => void;
  onBackToMain: () => void;
}

interface OrderItem {
  title: string;
  price: number;
  quantity: number;
}

interface Order {
  id: string;
  date: string;
  status: string;
  statusColor: string;
  total: number;
  deliveryMethod: string;
  deliveryAddress: string;
  items: OrderItem[];
}

// --- ЦВЕТОВАЯ ПАЛИТРА ---
const COLORS = {
  background: '#F8F8EB',     
  cardBg: '#FFFFFF',         
  primary: '#6A9D77',        // Фирменный шалфейный зеленый
  primaryHover: '#558360',   
  textDark: '#4E6053',       
  textLight: '#FFFFFF',      
  textMuted: '#8A9A8E',      
  border: '#E3ECE6',         
  accentLight: '#EAF0EB',    
};

export default function ProfilePage({ isLoggedIn, setIsLoggedIn, onBackToMain }: ProfilePageProps) {
  const [activeTab, setActiveTab] = useState<'info' | 'orders'>('info');
  const [isHoveredBack, setIsHoveredBack] = useState(false);
  const [isHoveredLogout, setIsHoveredLogout] = useState(false);
  const [hoveredTab, setHoveredTab] = useState<string | null>(null);

  // Состояния для модального окна деталей заказа
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isReturnHovered, setIsReturnHovered] = useState(false);

  // Демо-данные пользователя
  const user = {
    name: 'Иван Иванов',
    email: 'ivanov@mail.ru',
    phone: '+7 (999) 000-00-00',
    city: 'г. Чебоксары',
    regDate: '12.04.2024'
  };

  // Демо-данные заказов с полной информацией о составе и способе получения
  const mockOrders: Order[] = [
    {
      id: '№ 4829',
      date: '10.05.2026',
      status: 'Доставлен',
      statusColor: '#6A9D77',
      total: 1250,
      deliveryMethod: 'Самовывоз из пункта выдачи',
      deliveryAddress: 'г. Чебоксары, пр-т Ленина, д. 25, кв. 4',
      items: [
        { title: 'Натуральный липовый мед "Волжские просторы", 500г', price: 450, quantity: 2 },
        { title: 'Хрустящие ржаные хлебцы на закваске', price: 120, quantity: 2.9 } // (Пример условного веса или кратности из базы)
      ]
    },
    {
      id: '№ 4711',
      date: '24.04.2026',
      status: 'В пути',
      statusColor: '#FAAD14',
      total: 3200,
      deliveryMethod: 'Курьерская доставка',
      deliveryAddress: 'г. Чебоксары, ул. К. Маркса, д. 12, кв. 45',
      items: [
        { title: 'Льняной костюм Оверсайз (натуральный лен)', price: 3200, quantity: 1 }
      ]
    }
  ];

  // Обработчик для кнопки возврата товара
  const handleReturnProducts = (orderId: string) => {
    alert(`Заявка на возврат по заказу ${orderId} успешно создана. Наш менеджер свяжется с вами в ближайшее время.`);
    setSelectedOrder(null);
  };

  if (!isLoggedIn) {
    return (
      <div style={styles.emptyState}>
        <h3>Доступ ограничен</h3>
        <p>Пожалуйста, войдите в систему, чтобы просмотреть личный кабинет.</p>
        <button onClick={onBackToMain} style={styles.primaryButton}>На главную</button>
      </div>
    );
  }

  const isAnyOverlayOpen = !!selectedOrder;

  return (
    <div style={styles.pageContainer}>
      
      <style>{`
        body {
          overflow: ${isAnyOverlayOpen ? 'hidden' : 'auto'};
        }
        @keyframes scaleUp {
          from { opacity: 0; transform: translate(-50%, -48%) scale(0.96); }
          to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        }
      `}</style>

      {/* --- ЗА ТЕМНЯЮЩИЙ ОВЕРЛЕЙ ДЛЯ МОДАЛЬНОГО ОКНА --- */}
      <div 
        style={{
          ...styles.overlay,
          opacity: isAnyOverlayOpen ? 1 : 0,
          pointerEvents: isAnyOverlayOpen ? 'auto' : 'none',
        }}
        onClick={() => setSelectedOrder(null)}
      />

      {/* --- МОДАЛЬНОЕ ОКНО ДЕТАЛЕЙ ЗАКАЗА --- */}
      {selectedOrder && (
        <div style={styles.modalContainer}>
          <div style={styles.modalHeader}>
            <h2 style={styles.modalTitle}>Детали заказа {selectedOrder.id}</h2>
            <button 
              style={styles.modalCloseButton}
              onClick={() => setSelectedOrder(null)}
            >
              ✕
            </button>
          </div>

          <div style={styles.modalContent}>
            <div style={styles.modalMetaRow}>
              <span style={styles.modalDate}>От {selectedOrder.date}</span>
              <span style={{ ...styles.orderStatus, color: selectedOrder.statusColor, backgroundColor: selectedOrder.statusColor + '12' }}>
                {selectedOrder.status}
              </span>
            </div>

            {/* Способ получения */}
            <div style={styles.detailSection}>
              <h4 style={styles.detailSectionTitle}>📦 Способ получения</h4>
              <p style={styles.detailSectionText}><strong>{selectedOrder.deliveryMethod}</strong></p>
              <p style={styles.detailSectionSubtext}>{selectedOrder.deliveryAddress}</p>
            </div>

            {/* Состав заказа */}
            <div style={styles.detailSection}>
              <h4 style={styles.detailSectionTitle}>🛒 Состав заказа</h4>
              <div style={styles.itemsContainer}>
                {selectedOrder.items.map((item, idx) => (
                  <div key={idx} style={styles.itemRow}>
                    <span style={styles.itemName}>{item.title}</span>
                    <span style={styles.itemMeta}>
                      {item.quantity} шт. × {item.price} ₽
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Итоговая сумма */}
            <div style={styles.modalFooterRow}>
              <span style={styles.modalTotalLabel}>Итого к оплате:</span>
              <span style={styles.modalTotalValue}>{selectedOrder.total} ₽</span>
            </div>

            {/* Кнопка возврата товаров */}
            <button
              style={{
                ...styles.returnButton,
                backgroundColor: isReturnHovered ? '#FFF2F0' : 'transparent',
                color: '#FF4D4F',
                borderColor: isReturnHovered ? '#FF4D4F' : '#FFCCC7'
              }}
              onMouseEnter={() => setIsReturnHovered(true)}
              onMouseLeave={() => setIsReturnHovered(false)}
              onClick={() => handleReturnProducts(selectedOrder.id)}
            >
              ↩ Вернуть товары
            </button>
          </div>
        </div>
      )}

      {/* Шапка личного кабинета */}
      <header style={styles.header}>
        <div style={styles.headerContent}>
          <div 
            style={{
              ...styles.logoContainer,
              transform: isHoveredBack ? 'translateY(-1px)' : 'translateY(0)',
              opacity: isHoveredBack ? 0.9 : 1
            }}
            onClick={onBackToMain}
            onMouseEnter={() => setIsHoveredBack(true)}
            onMouseLeave={() => setIsHoveredBack(false)}
          >
            <span style={styles.logoIcon}>🌾</span>
            <div style={styles.logoText}>
              <h1 style={styles.logoTitle}>Чувашский Маркет</h1>
              <span style={styles.logoSubtitle}>Вернуться на главную</span>
            </div>
          </div>
          
          <button 
            style={{
              ...styles.logoutHeaderButton,
              backgroundColor: isHoveredLogout ? '#FF4D4F' : 'transparent',
              color: isHoveredLogout ? '#FFFFFF' : '#EAF0EB',
              border: isHoveredLogout ? '1px solid #FF4D4F' : '1px solid #EAF0EB'
            }}
            onMouseEnter={() => setIsHoveredLogout(true)}
            onMouseLeave={() => setIsHoveredLogout(false)}
            onClick={() => {
              setIsLoggedIn(false);
              onBackToMain();
            }}
          >
            Выйти из аккаунта
          </button>
        </div>
      </header>

      <main style={styles.mainContent}>
        <div style={styles.profileLayout}>
          
          {/* Боковое меню */}
          <aside style={styles.sidebar}>
            <div style={styles.userCardShort}>
              <div style={styles.avatarPlaceholder}>
                {user.name.charAt(0)}
              </div>
              <h3 style={styles.sidebarUserName}>{user.name}</h3>
              <span style={styles.sidebarUserCity}>{user.city}</span>
            </div>

            <nav style={styles.sidebarNav}>
              <button 
                onClick={() => setActiveTab('info')}
                onMouseEnter={() => setHoveredTab('info')}
                onMouseLeave={() => setHoveredTab(null)}
                style={{
                  ...styles.navButton,
                  backgroundColor: activeTab === 'info' 
                    ? COLORS.accentLight 
                    : hoveredTab === 'info' ? '#FAFBF9' : 'transparent',
                  color: activeTab === 'info' ? COLORS.primary : COLORS.textDark,
                  fontWeight: activeTab === 'info' ? '700' : '500'
                }}
              >
                👤 Личные данные
              </button>
              <button 
                onClick={() => setActiveTab('orders')}
                onMouseEnter={() => setHoveredTab('orders')}
                onMouseLeave={() => setHoveredTab(null)}
                style={{
                  ...styles.navButton,
                  backgroundColor: activeTab === 'orders' 
                    ? COLORS.accentLight 
                    : hoveredTab === 'orders' ? '#FAFBF9' : 'transparent',
                  color: activeTab === 'orders' ? COLORS.primary : COLORS.textDark,
                  fontWeight: activeTab === 'orders' ? '700' : '500'
                }}
              >
                📦 История заказов
              </button>
            </nav>
          </aside>

          {/* Контентная область */}
          <section style={styles.contentArea}>
            {activeTab === 'info' ? (
              <div>
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
                    <span style={styles.infoValue}>{user.phone}</span>
                  </div>
                  <div style={styles.infoBlock}>
                    <span style={styles.infoLabel}>Населенный пункт</span>
                    <span style={styles.infoValue}>{user.city}</span>
                  </div>
                  <div style={styles.infoBlock}>
                    <span style={styles.infoLabel}>Дата регистрации</span>
                    <span style={styles.infoValue}>{user.regDate}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <h2 style={styles.sectionTitle}>История заказов</h2>
                <div style={styles.ordersList}>
                  {mockOrders.map(order => (
                    <div 
                      key={order.id} 
                      style={styles.orderCard}
                      onClick={() => setSelectedOrder(order)}
                    >
                      <div style={styles.orderHeaderRow}>
                        <div>
                          <span style={styles.orderId}>{order.id}</span>
                          <span style={styles.orderDate}>от {order.date}</span>
                        </div>
                        <span style={{ ...styles.orderStatus, color: order.statusColor, backgroundColor: order.statusColor + '12' }}>
                          {order.status}
                        </span>
                      </div>
                      <div style={styles.orderBody}>
                        <span style={styles.orderItemsLabel}>Нажмите для просмотра деталей заказа. Состав:</span>
                        <p style={styles.orderItemsText}>
                          {order.items.map(item => `${item.title} (${item.quantity} шт.)`).join(', ')}
                        </p>
                      </div>
                      <div style={styles.orderFooterRow}>
                        <span style={styles.orderTotalLabel}>Сумма заказа:</span>
                        <span style={styles.orderTotalValue}>{order.total} ₽</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

        </div>
      </main>
    </div>
  );
}

// --- СТИЛИ СТРАНИЦЫ ---
const styles: { [key: string]: React.CSSProperties } = {
  pageContainer: { backgroundColor: COLORS.background, minHeight: '100vh', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', color: COLORS.textDark },
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(78, 96, 83, 0.4)', 
    backdropFilter: 'blur(3px)',               
    transition: 'opacity 0.3s ease',
    zIndex: 999
  },
  modalContainer: {
    position: 'fixed',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    backgroundColor: '#FFFFFF',
    width: '100%',
    maxWidth: '500px',
    borderRadius: '16px',
    padding: '28px',
    boxShadow: '0 20px 40px rgba(78, 96, 83, 0.3)',
    zIndex: 1000,
    animation: 'scaleUp 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)'
  },
  modalHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '16px'
  },
  modalTitle: {
    margin: 0,
    fontSize: '20px',
    fontWeight: '800',
    color: COLORS.textDark
  },
  modalCloseButton: {
    background: 'none',
    border: 'none',
    fontSize: '18px',
    cursor: 'pointer',
    color: COLORS.textMuted,
    padding: '4px',
    borderRadius: '50%',
  },
  modalContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  },
  modalMetaRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: `1px solid ${COLORS.border}`,
    paddingBottom: '12px'
  },
  modalDate: {
    fontSize: '14px',
    color: COLORS.textMuted,
    fontWeight: '500'
  },
  detailSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px'
  },
  detailSectionTitle: {
    margin: 0,
    fontSize: '13px',
    fontWeight: '700',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  detailSectionText: {
    margin: 0,
    fontSize: '14px',
    color: COLORS.textDark
  },
  detailSectionSubtext: {
    margin: 0,
    fontSize: '13px',
    color: COLORS.textMuted
  },
  itemsContainer: {
    backgroundColor: '#FAFBF9',
    borderRadius: '10px',
    border: `1px solid ${COLORS.border}`,
    padding: '12px 16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px'
  },
  itemRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '16px',
    fontSize: '14px',
    lineHeight: '1.4'
  },
  itemName: {
    fontWeight: '500',
    color: COLORS.textDark,
    flex: 1
  },
  itemMeta: {
    fontWeight: '700',
    color: COLORS.textDark,
    whiteSpace: 'nowrap'
  },
  modalFooterRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: '14px',
    borderTop: `1px solid ${COLORS.border}`,
  },
  modalTotalLabel: {
    fontSize: '15px',
    fontWeight: '600',
    color: COLORS.textDark
  },
  modalTotalValue: {
    fontSize: '20px',
    fontWeight: '800',
    color: COLORS.textDark
  },
  returnButton: {
    border: '1px solid',
    borderRadius: '10px',
    padding: '12px 0',
    fontWeight: '700',
    fontSize: '14px',
    width: '100%',
    transition: 'all 0.2s ease',
    cursor: 'pointer',
    outline: 'none',
    textAlign: 'center',
    marginTop: '6px'
  },
  header: { backgroundColor: COLORS.primary, position: 'sticky', top: 0, boxShadow: '0 4px 12px rgba(78, 96, 83, 0.15)', zIndex: 100 },
  headerContent: { maxWidth: '1500px', margin: '0 auto', padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  logoContainer: { display: 'flex', alignItems: 'center', gap: '12px', userSelect: 'none', cursor: 'pointer', transition: 'all 0.2s ease' },
  logoIcon: { fontSize: '32px' },
  logoText: { display: 'flex', flexDirection: 'column' },
  logoTitle: { margin: 0, fontSize: '22px', fontWeight: '800', color: COLORS.textLight, lineHeight: '1.1' },
  logoSubtitle: { fontSize: '11px', color: '#EAF0EB', textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: '600', marginTop: '2px' },
  logoutHeaderButton: { padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s ease', outline: 'none' },
  mainContent: { maxWidth: '1500px', margin: '0 auto', padding: '30px 20px' },
  profileLayout: { display: 'flex', gap: '30px', alignItems: 'flex-start' },
  sidebar: { width: '280px', backgroundColor: COLORS.cardBg, borderRadius: '16px', border: `1px solid ${COLORS.border}`, padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: '20px', flexShrink: 0 },
  userCardShort: { display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', borderBottom: `1px solid ${COLORS.border}`, paddingBottom: '20px' },
  avatarPlaceholder: { width: '60px', height: '60px', borderRadius: '50%', backgroundColor: COLORS.accentLight, color: COLORS.primary, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: '800', marginBottom: '12px' },
  sidebarUserName: { margin: '0 0 4px 0', fontSize: '16px', fontWeight: '700', color: COLORS.textDark },
  sidebarUserCity: { fontSize: '13px', color: COLORS.textMuted },
  sidebarNav: { display: 'flex', flexDirection: 'column', gap: '6px' },
  navButton: { display: 'flex', alignItems: 'center', padding: '12px 14px', borderRadius: '10px', border: 'none', cursor: 'pointer', fontSize: '14px', transition: 'all 0.15s ease', textAlign: 'left', width: '100%', outline: 'none' },
  contentArea: { flex: 1, backgroundColor: COLORS.cardBg, borderRadius: '16px', border: `1px solid ${COLORS.border}`, padding: '28px' },
  sectionTitle: { margin: '0 0 24px 0', fontSize: '22px', fontWeight: '800', color: COLORS.textDark },
  infoGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' },
  infoBlock: { display: 'flex', flexDirection: 'column', gap: '6px', backgroundColor: '#FAFBF9', padding: '14px 16px', borderRadius: '10px', border: `1px solid ${COLORS.border}` },
  infoLabel: { fontSize: '12px', fontWeight: '600', color: COLORS.textMuted },
  infoValue: { fontSize: '15px', fontWeight: '700', color: COLORS.textDark },
  ordersList: { display: 'flex', flexDirection: 'column', gap: '16px' },
  orderCard: { border: `1px solid ${COLORS.border}`, borderRadius: '12px', padding: '16px', backgroundColor: '#FAFBF9', cursor: 'pointer', transition: 'transform 0.2s ease, box-shadow 0.2s ease' },
  orderHeaderRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${COLORS.border}`, paddingBottom: '12px', marginBottom: '12px' },
  orderId: { fontSize: '15px', fontWeight: '700', color: COLORS.textDark, marginRight: '8px' },
  orderDate: { fontSize: '13px', color: COLORS.textMuted },
  orderStatus: { fontSize: '12px', fontWeight: '700', padding: '4px 10px', borderRadius: '6px' },
  orderBody: { marginBottom: '14px' },
  orderItemsLabel: { fontSize: '12px', color: COLORS.textMuted, fontWeight: '500' },
  orderItemsText: { margin: '4px 0 0 0', fontSize: '14px', fontWeight: '600', color: COLORS.textDark, display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' },
  emptyState: { textAlign: 'center', padding: '40px', backgroundColor: COLORS.cardBg, borderRadius: '12px' },
  primaryButton: { backgroundColor: COLORS.primary, color: '#FFFFFF', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', marginTop: '12px' }
};