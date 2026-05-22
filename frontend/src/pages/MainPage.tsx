import React, { useState, useMemo, useRef, useEffect } from 'react';
import axios from 'axios';
// Импортируем страницу продукта
import ProductPage from './ProductPage'; 
import ProfilePage from './ProfilePage';
import type { Category } from '../constants/categories';

// --- ТИПЫ И ИНТЕРФЕЙСЫ ---
interface Product {
  id: number;
  title: string;
  price: number;
  old_price?: number;
  category: string;
  rating: number;
  reviews_count: number;
  manufacturer: string;
  city: string;
  image?: string;
  is_local_verified: boolean;
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
  rating: '#FAAD14',         
};



export default function MainPage() {
  // Добавлено состояние навигации: 'main' или 'product'
  const [activePage, setActivePage] = useState<'main' | 'product' | 'profile'>('main');
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [onlyLocal, setOnlyLocal] = useState<boolean>(false);
  const [hoveredCardId, setHoveredCardId] = useState<number | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([
    { id: 'all', name: 'Все категории', icon: '📦' }
  ]);
  // Новое состояние для сортировки
  const [sortBy, setSortBy] = useState<string>('rating');

  // Состояния для поиска
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeSearchFilter, setActiveSearchFilter] = useState<string>('');
  const [isSearchFocused, setIsSearchFocused] = useState<boolean>(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
  const params: Record<string, string> = {};
  if (activeSearchFilter) params.search = activeSearchFilter;
  if (selectedCategory && selectedCategory !== 'all') params.category = selectedCategory;
  
  axios.get('http://localhost:8000/api/products/', { params })
    .then(res => setProducts(res.data))
    .catch(err => console.error('Ошибка загрузки продуктов:', err));
}, [activeSearchFilter, selectedCategory]);

useEffect(() => {
  axios.get('http://localhost:8000/api/categories/')
    .then(res => setCategories([
      { id: 'all', name: 'Все категории', icon: '📦' },
      ...res.data
    ]))
    .catch(err => console.error('Ошибка загрузки категорий:', err));
}, []);
  // Состояния авторизации
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);

  // Состояния для боковых панелей и модальных окон
  const [isCatalogOpen, setIsCatalogOpen] = useState<boolean>(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState<boolean>(false);
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState<boolean>(false);

  // Состояния для интерактивных элементов шапки
  const [isCatalogHovered, setIsCatalogHovered] = useState(false);
  const [isLoginHovered, setIsLoginHovered] = useState(false);
  const [isCartHovered, setIsCartHovered] = useState(false);
  
  // Состояния для ховера кнопок внутри поповеров и модалок
  const [isPopLoginHovered, setIsPopLoginHovered] = useState(false);
  const [isPopRegHovered, setIsPopRegHovered] = useState(false);
  const [isPopLkHovered, setIsPopLkHovered] = useState(false);
  const [isPopOrdersHovered, setIsPopOrdersHovered] = useState(false);
  const [isPopLogoutHovered, setIsPopLogoutHovered] = useState(false);
  const [isModalSubmitHovered, setIsModalSubmitHovered] = useState(false);
  const [isRegSubmitHovered, setIsRegSubmitHovered] = useState(false);
  const [hoveredCatalogCatId, setHoveredCatalogCatId] = useState<string | null>(null);

  // Поля ввода формы авторизации
  const [loginValue, setLoginValue] = useState('');
  const [passwordValue, setPasswordValue] = useState('');
  const [rememberMe, setRememberMe] = useState(false);

  // Поля ввода формы регистрации
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regAgreement, setRegAgreement] = useState(false);

  // Обработчик и маска для номера телефона в регистрации
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;
    const cleanNumbers = input.replace(/\D/g, '');
    
    if (!cleanNumbers) {
      setRegPhone('');
      return;
    }

    let formatted = '+7 ';
    const digits = cleanNumbers[0] === '7' || cleanNumbers[0] === '8' 
      ? cleanNumbers.substring(1, 11) 
      : cleanNumbers.substring(0, 10);

    if (digits.length > 0) {
      formatted += `(${digits.substring(0, 3)}`;
    }
    if (digits.length >= 3) {
      formatted += `) ${digits.substring(3, 6)}`;
    }
    if (digits.length >= 6) {
      formatted += `-${digits.substring(6, 8)}`;
    }
    if (digits.length >= 8) {
      formatted += `-${digits.substring(8, 10)}`;
    }

    setRegPhone(formatted);
  };

  // Ограничение ввода Email
  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    const filteredVal = val.replace(/[^a-zA-Z0-9@._-]/g, '');
    setRegEmail(filteredVal);
  };

  // Проверка Email на домен
  const isEmailValid = useMemo(() => {
    if (!regEmail) return true;
    const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(regEmail);
  }, [regEmail]);

  // Проверка валидности формы регистрации
  const isFormValid = useMemo(() => {
    return (
      regName.trim().length > 0 &&
      regEmail.trim().length > 0 &&
      isEmailValid &&
      regPhone.length === 18 && 
      regPassword.trim().length > 0 &&
      regAgreement
    );
  }, [regName, regEmail, isEmailValid, regPhone, regPassword, regAgreement]);


// Сортировка продуктов
  const filteredProducts = useMemo(() => {
    const result = [...products];
    if (selectedCategory !== 'all') {
      if (sortBy === 'cheap') result.sort((a, b) => a.price - b.price);
      else if (sortBy === 'expensive') result.sort((a, b) => b.price - a.price);
      else if (sortBy === 'rating') result.sort((a, b) => b.rating - a.rating);
    }
    return result;
  }, [products, selectedCategory, sortBy]);

  const currentCategoryName = useMemo(() => {
    const cat = categories.find(c => c.id === selectedCategory);
    return cat ? cat.name : 'Каталог';
  }, [selectedCategory, categories]);

 const handleLoginSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  try {
    const res = await axios.post('http://localhost:8000/api/auth/login/', {
      email: loginValue,
      password: passwordValue,
    });
    localStorage.setItem('access_token', res.data.access);
    localStorage.setItem('user_name', res.data.name);
    setIsLoggedIn(true);
    setIsLoginModalOpen(false);
    setLoginValue('');
    setPasswordValue('');
  } catch {
    alert('Неверный логин или пароль');
  }
};

const handleRegisterSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!isFormValid) return;
  try {
    await axios.post('http://localhost:8000/api/auth/register/', {
      name: regName,
      email: regEmail,
      phone: regPhone,
      password: regPassword,
    });
    alert(`Аккаунт создан! Добро пожаловать, ${regName}`);
    setIsRegisterModalOpen(false);
    setRegName('');
    setRegEmail('');
    setRegPhone('');
    setRegPassword('');
    setRegAgreement(false);
  } catch (err: unknown) {
    if (axios.isAxiosError(err)) {
      alert(err.response?.data?.error || 'Ошибка регистрации');
    }
  }
};

  // Метод выполнения поиска при клике на лупу или Enter
  const executeSearch = () => {
    setActiveSearchFilter(searchQuery);
    setIsSearchFocused(false);
    if (searchInputRef.current) {
      searchInputRef.current.blur();
    }
    // Если мы были на странице товара, возвращаемся на главную для отображения результатов поиска
    setActivePage('main');
  };

  // Добавлен метод клика по карточке товара
const handleProductClick = (productId: number) => {
  setSelectedProductId(productId);
  setActivePage('product');
};

  const shouldShowSearchOverlay = isSearchFocused;
  const isAnyOverlayOpen = isCatalogOpen || isLoginModalOpen || isRegisterModalOpen || shouldShowSearchOverlay;

  // Если активна страница товара, рендерим ProductPage (управляя переключением обратно через логотип)
if (activePage === 'product') {
    return (
      <ProductPage 
        isLoggedIn={isLoggedIn} 
        setIsLoggedIn={setIsLoggedIn} 
        onBackToMain={() => setActivePage('main')} 
        productId={selectedProductId!}
        onSearch={(query) => {
          setSearchQuery(query);
          setActiveSearchFilter(query);
          setActivePage('main');
        }}
        onCategorySelect={(categoryId) => {
          setSelectedCategory(categoryId);
          setActivePage('main');
        }}
      />
    );
  }
if (activePage === 'profile') {
  return (
    <ProfilePage 
      isLoggedIn={isLoggedIn}
      setIsLoggedIn={setIsLoggedIn}
      onBackToMain={() => setActivePage('main')}
    />
  );
}
  return (
    <div style={styles.pageContainer}>
      
      <style>{`
        html {
          scrollbar-gutter: stable;
        }
        body {
          margin: 0 !important;
          padding: 0 !important;
          box-sizing: border-box;
          background-color: ${COLORS.background};
          overflow: ${isAnyOverlayOpen ? 'hidden' : 'auto'};
        }
        *, *:before, *:after {
          box-sizing: inherit;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(2px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes scaleUp {
          from { opacity: 0; transform: translate(-50%, -48%) scale(0.96); }
          to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        }
      `}</style>
      
      {/* --- ОБЩИЙ ЗА ТЕМНЯЮЩИЙ ОВЕРЛЕЙ --- */}
      <div 
        style={{
          ...styles.overlay,
          opacity: isAnyOverlayOpen ? 1 : 0,
          pointerEvents: isAnyOverlayOpen ? 'auto' : 'none',
          zIndex: shouldShowSearchOverlay ? 90 : 999 
        }}
        onClick={() => {
          setIsCatalogOpen(false);
          setIsLoginModalOpen(false);
          setIsRegisterModalOpen(false);
          setIsSearchFocused(false);
        }}
      />

      {/* --- МОДАЛЬНОЕ ОКНО АВТОРИЗАЦИИ --- */}
      {isLoginModalOpen && (
        <div style={styles.modalContainer}>
          <div style={styles.modalHeader}>
            <h2 style={styles.modalTitle}>Вход в личный кабинет</h2>
            <button 
              style={styles.modalCloseButton}
              onClick={() => setIsLoginModalOpen(false)}
            >
              ✕
            </button>
          </div>
          
          <form onSubmit={handleLoginSubmit} style={styles.modalForm}>
            <div style={styles.inputGroup}>
              <label style={styles.inputLabel}>Email</label>
              <input 
                type="text" 
                required
                placeholder="Введите email"
                value={loginValue}
                onChange={(e) => setLoginValue(e.target.value)}
                style={styles.modalInput}
              />
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.inputLabel}>Пароль</label>
              <input 
                type="password" 
                required
                placeholder="Введите пароль"
                value={passwordValue}
                onChange={(e) => setPasswordValue(e.target.value)}
                style={styles.modalInput}
              />
            </div>

            <div style={styles.modalCheckboxRow}>
              <label style={styles.modalCheckboxLabel}>
                <input 
                  type="checkbox" 
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  style={styles.checkbox}
                />
                <span style={styles.checkboxText}>Запомнить меня</span>
              </label>
              <span style={styles.forgotPassword}>Забыли пароль?</span>
            </div>

            <button 
              type="submit"
              style={{
                ...styles.modalSubmitButton,
                backgroundColor: isModalSubmitHovered ? COLORS.primaryHover : COLORS.primary,
              }}
              onMouseEnter={() => setIsModalSubmitHovered(true)}
              onMouseLeave={() => setIsModalSubmitHovered(false)}
            >
              Войти
            </button>

            <div style={styles.switchModalRow}>
              Ещё нет аккаунта?{' '}
              <span 
                style={styles.switchModalLink}
                onClick={() => {
                  setIsLoginModalOpen(false);
                  setIsRegisterModalOpen(true);
                }}
              >
                Зарегистрироваться
              </span>
            </div>
          </form>
        </div>
      )}

      {/* --- МОДАЛЬНОЕ ОКНО РЕГИСТРАЦИИ --- */}
      {isRegisterModalOpen && (
        <div style={styles.modalContainer}>
          <div style={styles.modalHeader}>
            <h2 style={styles.modalTitle}>Регистрация</h2>
            <button 
              style={styles.modalCloseButton}
              onClick={() => setIsRegisterModalOpen(false)}
            >
              ✕
            </button>
          </div>
          
          <form onSubmit={handleRegisterSubmit} style={styles.modalForm}>
            <div style={styles.inputGroup}>
              <label style={styles.inputLabel}>Имя и Фамилия</label>
              <input 
                type="text" 
                required
                placeholder="Иван Иванов"
                value={regName}
                onChange={(e) => setRegName(e.target.value)}
                style={styles.modalInput}
              />
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.inputLabel}>Электронная почта</label>
              <input 
                type="text" 
                required
                placeholder="example@mail.ru"
                value={regEmail}
                onChange={handleEmailChange}
                style={{
                  ...styles.modalInput,
                  borderColor: !isEmailValid && regEmail ? '#FF4D4F' : COLORS.border,
                  backgroundColor: !isEmailValid && regEmail ? '#FFF2F0' : '#FAFBF9'
                }}
              />
              {!isEmailValid && regEmail && (
                <span style={styles.errorText}>Некорректный формат (ожидается: имя@домен.код)</span>
              )}
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.inputLabel}>Номер телефона</label>
              <input 
                type="tel" 
                required
                placeholder="+7 (999) 000-00-00"
                value={regPhone}
                onChange={handlePhoneChange}
                maxLength={18}
                style={styles.modalInput}
              />
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.inputLabel}>Пароль</label>
              <input 
                type="password" 
                required
                placeholder="Создайте сложный пароль"
                value={regPassword}
                onChange={(e) => setRegPassword(e.target.value)}
                style={styles.modalInput}
              />
            </div>

            <div style={{ ...styles.modalCheckboxRow, alignItems: 'flex-start' }}>
              <label style={styles.modalCheckboxLabel}>
                <input 
                  type="checkbox" 
                  checked={regAgreement}
                  onChange={(e) => setRegAgreement(e.target.checked)}
                  style={{ ...styles.checkbox, marginTop: '2px' }}
                />
                <span style={{ ...styles.checkboxText, lineHeight: '1.4', fontSize: '12px', color: COLORS.textDark }}>
                  Я согласен с условиями использования и правилами платформы
                </span>
              </label>
            </div>

            <button 
              type="submit"
              disabled={!isFormValid}
              style={{
                ...styles.modalSubmitButton,
                backgroundColor: !isFormValid 
                  ? '#C2CFC6' 
                  : (isRegSubmitHovered ? COLORS.primaryHover : COLORS.primary),
                cursor: isFormValid ? 'pointer' : 'not-allowed',
                boxShadow: isFormValid ? '0 4px 10px rgba(106, 157, 119, 0.2)' : 'none'
              }}
              onMouseEnter={() => setIsRegSubmitHovered(true)}
              onMouseLeave={() => setIsRegSubmitHovered(false)}
            >
              Создать аккаунт
            </button>

            <div style={styles.switchModalRow}>
              Уже есть аккаунт?{' '}
              <span 
                style={styles.switchModalLink}
                onClick={() => {
                  setIsRegisterModalOpen(false);
                  setIsLoginModalOpen(true);
                }}
              >
                Войти
              </span>
            </div>
          </form>
        </div>
      )}

      {/* --- ВЫДВИЖНОЙ КАТАЛОГ --- */}
      <div 
        style={{
          ...styles.catalogDrawer,
          transform: isCatalogOpen ? 'translateX(0)' : 'translateX(-100%)',
        }}
      >
        <div style={styles.drawerHeader}>
          <h2 style={styles.drawerTitle}>Каталог товаров</h2>
          <button 
            style={styles.drawerCloseButton}
            onClick={() => setIsCatalogOpen(false)}
          >
            ✕
          </button>
        </div>
        <div style={styles.drawerContent}>
          {categories.map(category => {
            const isSelected = selectedCategory === category.id;
            const isHovered = hoveredCatalogCatId === category.id;
            return (
              <div
                key={category.id}
                onClick={() => {
                  setSelectedCategory(category.id);
                  setIsCatalogOpen(false);
                }}
                onMouseEnter={() => setHoveredCatalogCatId(category.id)}
                onMouseLeave={() => setHoveredCatalogCatId(null)}
                style={{
                  ...styles.drawerItem,
                  backgroundColor: isSelected 
                    ? COLORS.accentLight 
                    : isHovered ? '#FAFBF9' : 'transparent',
                  color: isSelected ? COLORS.primary : COLORS.textDark,
                  fontWeight: isSelected ? '700' : '500',
                }}
              >
                <span style={styles.drawerItemIcon}>{category.icon}</span>
                <span>{category.name}</span>
                {isSelected && <span style={styles.drawerItemActiveCheck}>✓</span>}
              </div>
            );
          })}
        </div>
      </div>

      {/* --- НАВИГАЦИОННОЕ МЕНЮ --- */}
      <header style={{ ...styles.header, zIndex: shouldShowSearchOverlay ? 101 : 100 }}>
        <div style={styles.headerContent}>
          
          <div style={styles.logoContainer}>
            <span style={styles.logoIcon}>🌾</span>
            <div style={styles.logoText}>
              <h1 style={styles.logoTitle}>Чувашский Маркет</h1>
              <span style={styles.logoSubtitle}>Витрина местных товаров</span>
            </div>
          </div>

          <div 
            style={{
              ...styles.actionItem,
              color: isCatalogHovered || isCatalogOpen ? COLORS.textLight : COLORS.accentLight,
              transform: isCatalogHovered ? 'translateY(-1px)' : 'translateY(0)',
              marginLeft: '8px'
            }} 
            onClick={() => setIsCatalogOpen(true)}
            onMouseEnter={() => setIsCatalogHovered(true)}
            onMouseLeave={() => setIsCatalogHovered(false)}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7"></rect>
              <rect x="14" y="3" width="7" height="7"></rect>
              <rect x="14" y="14" width="7" height="7"></rect>
              <rect x="3" y="14" width="7" height="7"></rect>
            </svg>
            <span style={styles.actionText}>Каталог</span>
          </div>

          <div style={styles.searchBar}>
            <input 
              ref={searchInputRef}
              type="text" 
              placeholder="Поиск товаров, брендов или городов..." 
              value={searchQuery}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => {
                setTimeout(() => {
                  setIsSearchFocused(false);
                }, 180);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  executeSearch();
                }
              }}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={styles.searchInput}
            />
            <button 
              onClick={executeSearch}
              style={styles.searchButton}
              title="Найти"
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = COLORS.primaryHover}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = COLORS.primary}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
            </button>
          </div>

          <div style={styles.headerActions}>
            
            <div 
              style={styles.loginWrapper}
              onMouseEnter={() => setIsLoginHovered(true)}
              onMouseLeave={() => setIsLoginHovered(false)}
            >
              <div 
                onClick={() => !isLoggedIn && setIsLoginModalOpen(true)}
                style={{
                  ...styles.actionItem,
                  color: isLoginHovered || isLoginModalOpen || isRegisterModalOpen ? COLORS.textLight : COLORS.accentLight,
                  transform: isLoginHovered ? 'translateY(-1px)' : 'translateY(0)'
                }} 
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
                <span style={styles.actionText}>{isLoggedIn ? 'Профиль' : 'Войти'}</span>
              </div>

              {isLoginHovered && !isLoginModalOpen && !isRegisterModalOpen && (
                <div style={styles.loginPopover}>
                  <div style={styles.popoverArrow}></div>
                  {!isLoggedIn ? (
                    <>
                      <button 
                        style={{
                          ...styles.popoverButton,
                          backgroundColor: isPopLoginHovered ? COLORS.primaryHover : COLORS.primary,
                          color: '#FFFFFF'
                        }}
                        onMouseEnter={() => setIsPopLoginHovered(true)}
                        onMouseLeave={() => setIsPopLoginHovered(false)}
                        onClick={() => setIsLoginModalOpen(true)}
                      >
                        Войти
                      </button>
                      <button 
                        style={{
                          ...styles.popoverButton,
                          backgroundColor: isPopRegHovered ? COLORS.accentLight : '#FFFFFF',
                          color: COLORS.textDark,
                          border: `1px solid ${COLORS.border}`,
                        }}
                        onMouseEnter={() => setIsPopRegHovered(true)}
                        onMouseLeave={() => setIsPopRegHovered(false)}
                        onClick={() => setIsRegisterModalOpen(true)}
                      >
                        Зарегистрироваться
                      </button>
                    </>
                  ) : (
                    <>
                      <button 
                        style={{
                          ...styles.popoverButton,
                          backgroundColor: isPopLkHovered ? COLORS.accentLight : '#FFFFFF',
                          color: COLORS.textDark,
                          border: `1px solid ${COLORS.border}`,
                        }}
                        onMouseEnter={() => setIsPopLkHovered(true)}
                        onMouseLeave={() => setIsPopLkHovered(false)}
                        onClick={() => {
                          setActivePage('profile'); // <-- Заменяем alert на переход в профиль
                          setIsLoginHovered(false); // Закрываем всплывающее окошко ховера
                        }}
                        >
                        Личный кабинет
                      </button>
                      <button 
                        style={{
                          ...styles.popoverButton,
                          backgroundColor: isPopOrdersHovered ? COLORS.accentLight : '#FFFFFF',
                          color: COLORS.textDark,
                          border: `1px solid ${COLORS.border}`,
                        }}
                        onMouseEnter={() => setIsPopOrdersHovered(true)}
                        onMouseLeave={() => setIsPopOrdersHovered(false)}
                        onClick={() => alert('Переход к заказам')}
                      >
                        Заказы
                      </button>
                      <button 
                        style={{
                          ...styles.popoverButton,
                          backgroundColor: isPopLogoutHovered ? '#FF4D4F' : '#FFF2F0',
                          color: isPopLogoutHovered ? '#FFFFFF' : '#FF4D4F',
                          border: '1px solid #FFCCC7',
                        }}
                        onMouseEnter={() => setIsPopLogoutHovered(true)}
                        onMouseLeave={() => setIsPopLogoutHovered(false)}
                        onClick={() => {
                          setIsLoggedIn(false);
                          setIsLoginHovered(false);
                        }}
                      >
                        Выйти
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>

            {isLoggedIn && (
              <div 
                style={{ 
                  ...styles.actionItem, 
                  color: isCartHovered ? COLORS.textLight : COLORS.accentLight,
                  transform: isCartHovered ? 'translateY(-1px)' : 'translateY(0)'
                }} 
                onClick={() => alert('Переход в корзину')}
                onMouseEnter={() => setIsCartHovered(true)}
                onMouseLeave={() => setIsCartHovered(false)}
              >
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="9" cy="21" r="1"></circle>
                    <circle cx="20" cy="21" r="1"></circle>
                    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
                  </svg>
                </div>
                <span style={styles.actionText}>Корзина</span>
              </div>
            )}

          </div>

        </div>
      </header>

      <main style={styles.mainContent}>
        
        <section style={styles.banner}>
          <div style={styles.bannerTextContainer}>
            <span style={styles.bannerTag}>Экосистема локальных брендов</span>
            <h2 style={styles.bannerTitle}>Поддержите местных производителей</h2>
            <p style={styles.bannerDesc}>
              Уникальные товары Вашего региона напрямую от мастеров, фабрик и фермерских хозяйств. Быстрая доставка без лишних посредников.
            </p>
          </div>
        </section>

        <div style={styles.filterToolbar}>
          <div style={styles.filterLeftSection}>
            <label style={styles.checkboxLabel}>
              <input 
                type="checkbox" 
                checked={onlyLocal}
                onChange={(e) => setOnlyLocal(e.target.checked)}
                style={styles.checkbox}
              />
              <span style={{ fontSize: '14px', fontWeight: 600, color: COLORS.textDark }}>
                🛡️ Только проверенное местное производство
              </span>
            </label>

            {/* БЛОК СОРТИРОВКИ: Появляется, только если выбрана конкретная категория */}
            {selectedCategory !== 'all' && (
              <div style={styles.sortWrapper}>
                <span style={styles.sortLabel}>Сортировка:</span>
                <select 
                  value={sortBy} 
                  onChange={(e) => setSortBy(e.target.value)} 
                  style={styles.sortSelect}
                >
                  <option value="rating">По рейтингу</option>
                  <option value="cheap">Сначала дешевле</option>
                  <option value="expensive">Сначала дороже</option>
                </select>
              </div>
            )}
            
            {selectedCategory !== 'all' && (
              <div style={styles.badgeWrapper}>
                {selectedCategory !== 'all' && (
                  <span style={styles.activeCategoryBadge}>
                    Категория: {currentCategoryName}
                    <button 
                      style={styles.resetCategoryButton}
                      onClick={() => setSelectedCategory('all')}
                    >
                      ✕
                    </button>
                  </span>
                )}
              </div>
            )}
          </div>
          <span style={styles.resultsCount}>Найдено позиций: {filteredProducts.length}</span>
        </div>

        {filteredProducts.length === 0 ? (
          <div style={styles.emptyState}>
            <span style={{ fontSize: '48px' }}>🔎</span>
            <h3 style={{ margin: '12px 0 6px 0', color: COLORS.textDark }}>Ничего не найдено</h3>
            <p style={{ margin: 0, color: COLORS.textMuted }}>Попробуйте изменить поисковый запрос или сбросить фильтры</p>
          </div>
        ) : (
          <div style={styles.productGrid}>
            {filteredProducts.map(product => (
              <div 
                key={product.id} 
                onClick={() => handleProductClick(product.id)}
                style={{
                  ...styles.productCard,
                  cursor: 'pointer',
                  transform: hoveredCardId === product.id ? 'translateY(-4px)' : 'translateY(0)',
                  boxShadow: hoveredCardId === product.id ? '0 10px 20px rgba(78, 96, 83, 0.12)' : '0 2px 6px rgba(0, 0, 0, 0.02)'
                }}
                onMouseEnter={() => setHoveredCardId(product.id)}
                onMouseLeave={() => setHoveredCardId(null)}
              >
                <div style={styles.imageWrapper}>
                  <img src={product.image} alt={product.title} style={styles.productImage} />
                  {product.is_local_verified && (
                    <span style={styles.verifiedBadge}>Проверенный продавец</span>
                  )}
                </div>

                <div style={styles.cardBody}>
                  <div style={styles.priceRow}>
                    <span style={styles.currentPrice}>{product.price} ₽</span>
                    {product.old_price && <span style={styles.old_price}>{product.old_price} ₽</span>}
                  </div>
                  <h3 style={styles.productTitle} title={product.title}>{product.title}</h3>
                  <div style={styles.ratingRow}>
                    <span style={{ color: COLORS.rating }}>★</span>
                    <span style={styles.ratingValue}>{product.rating}</span>
                    <span style={styles.reviews_count}>({product.reviews_count} отзывов)</span>
                  </div>
                  <div style={styles.manufacturerBlock}>
                    <span style={styles.manufacturerName}>🏭 {product.manufacturer}</span>
                    <span style={styles.manufacturerCity}>{product.city}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

      </main>
    </div>
  );
}

// --- ИЗОЛИРОВАННЫЕ СТИЛИ ---
const styles: { [key: string]: React.CSSProperties } = {
  pageContainer: { backgroundColor: COLORS.background, minHeight: '100vh', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', color: COLORS.textDark, paddingBottom: '60px' },
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(78, 96, 83, 0.4)', 
    backdropFilter: 'blur(3px)',               
    transition: 'opacity 0.3s ease',
  },
  modalContainer: {
    position: 'fixed',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    backgroundColor: '#FFFFFF',
    width: '100%',
    maxWidth: '420px',
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
    marginBottom: '20px'
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
    transition: 'color 0.2s ease',
  },
  modalForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px'
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px'
  },
  inputLabel: {
    fontSize: '13px',
    fontWeight: '700',
    color: COLORS.textDark
  },
  modalInput: {
    padding: '11px 14px',
    borderRadius: '10px',
    border: `1px solid ${COLORS.border}`,
    fontSize: '14px',
    color: COLORS.textDark,
    outline: 'none',
    transition: 'border-color 0.2s ease',
    backgroundColor: '#FAFBF9'
  },
  errorText: {
    fontSize: '11px',
    color: '#FF4D4F',
    fontWeight: '600',
    marginTop: '2px'
  },
  modalCheckboxRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: '2px',
    marginBottom: '4px'
  },
  modalCheckboxLabel: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '10px',
    cursor: 'pointer',
    userSelect: 'none'
  },
  checkboxText: {
    fontSize: '13px',
    fontWeight: '600',
    color: COLORS.textDark
  },
  forgotPassword: {
    fontSize: '13px',
    fontWeight: '600',
    color: COLORS.primary,
    cursor: 'pointer'
  },
  modalSubmitButton: {
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '10px',
    padding: '12px 0',
    fontWeight: '700',
    fontSize: '15px',
    width: '100%',
    transition: 'all 0.2s ease',
    outline: 'none',
    marginTop: '6px'
  },
  switchModalRow: {
    textAlign: 'center',
    fontSize: '13px',
    color: COLORS.textDark,
    marginTop: '10px',
    fontWeight: '500'
  },
  switchModalLink: {
    color: COLORS.primary,
    fontWeight: '700',
    cursor: 'pointer',
    textDecoration: 'underline',
    marginLeft: '4px'
  },
  catalogDrawer: {
    position: 'fixed',
    top: 0,
    left: 0,
    bottom: 0,
    width: '350px',
    backgroundColor: '#FFFFFF',
    zIndex: 1000,
    boxShadow: '4px 0 25px rgba(0, 0, 0, 0.15)',
    display: 'flex',
    flexDirection: 'column',
    transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)', 
  },
  drawerHeader: {
    padding: '24px 20px',
    borderBottom: `1px solid ${COLORS.border}`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  drawerTitle: {
    margin: 0,
    fontSize: '20px',
    fontWeight: '800',
    color: COLORS.textDark,
  },
  drawerCloseButton: {
    background: 'none',
    border: 'none',
    fontSize: '20px',
    cursor: 'pointer',
    color: COLORS.textMuted,
    padding: '4px 8px',
    borderRadius: '6px',
    transition: 'all 0.2s ease',
  },
  drawerContent: {
    padding: '12px 8px',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    overflowY: 'auto',
  },
  drawerItem: {
    display: 'flex',
    alignItems: 'center',
    padding: '14px 16px',
    borderRadius: '10px',
    cursor: 'pointer',
    fontSize: '15px',
    transition: 'all 0.15s ease',
    userSelect: 'none',
    position: 'relative'
  },
  drawerItemIcon: {
    marginRight: '14px',
    fontSize: '18px',
  },
  drawerItemActiveCheck: {
    position: 'absolute',
    right: '16px',
    fontSize: '14px',
  },
  header: {
    backgroundColor: COLORS.primary, 
    position: 'sticky',
    top: 0,
    boxShadow: '0 4px 12px rgba(78, 96, 83, 0.15)'
  },
  headerContent: {
    maxWidth: '1500px',            
    margin: '0 auto',
    padding: '10px 20px', 
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '24px'
  },
  logoContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    userSelect: 'none',
    flexShrink: 0                  
  },
  logoIcon: {
    fontSize: '32px'
  },
  logoText: {
    display: 'flex',
    flexDirection: 'column'
  },
  logoTitle: {
    margin: 0,
    fontSize: '22px',
    fontWeight: '800',
    color: COLORS.textLight, 
    letterSpacing: '-0.5px',
    lineHeight: '1.1'
  },
  logoSubtitle: {
    fontSize: '11px',
    color: '#EAF0EB', 
    textTransform: 'uppercase',
    letterSpacing: '0.8px',
    fontWeight: '600',
    marginTop: '2px'
  },
  searchBar: {
    flex: 1,
    maxWidth: '650px',            
    display: 'flex',
    alignItems: 'center',         
    borderRadius: '30px',         
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
    padding: '4px 6px 4px 16px',  
    position: 'relative'
  },
  searchInput: {
    flex: 1,
    padding: '8px 0',
    border: 'none',
    outline: 'none',
    fontSize: '14px',
    color: COLORS.textDark,
    backgroundColor: 'transparent'
  },
  searchButton: {
    backgroundColor: COLORS.primary, 
    color: COLORS.textLight,
    border: 'none',
    borderRadius: '50%',          
    width: '34px',                
    height: '34px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background-color 0.2s ease',
    marginLeft: '8px',
    outline: 'none'
  },
  headerActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '28px',
    flexShrink: 0
  },
  loginWrapper: {
    position: 'relative',          
    paddingBottom: '10px',         
    marginBottom: '-10px',
  },
  actionItem: {
    display: 'flex',
    flexDirection: 'column',       
    alignItems: 'center',
    gap: '5px',                   
    cursor: 'pointer',
    userSelect: 'none',
    transition: 'color 0.2s ease, transform 0.2s ease',
    minWidth: '56px'               
  },
  actionText: {
    fontSize: '12px',              
    fontWeight: '600',
    letterSpacing: '0.2px'
  },
  loginPopover: {
    position: 'absolute',
    top: '52px',                  
    right: '-40px',
    backgroundColor: '#FFFFFF',
    borderRadius: '12px',
    padding: '14px',
    boxShadow: '0 10px 25px rgba(78, 96, 83, 0.2)',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    width: '180px',
    zIndex: 200,
    border: `1px solid ${COLORS.border}`
  },
  popoverArrow: {
    position: 'absolute',
    top: '-6px',
    right: '58px',
    width: '10px',
    height: '10px',
    backgroundColor: '#FFFFFF',
    transform: 'rotate(45deg)',
    borderLeft: `1px solid ${COLORS.border}`,
    borderTop: `1px solid ${COLORS.border}`
  },
  popoverButton: {
    padding: '9px 0',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: '700',
    cursor: 'pointer',
    border: 'none',
    width: '100%',
    transition: 'all 0.15s ease',
    textAlign: 'center',
    outline: 'none'
  },
  mainContent: {
    maxWidth: '1500px',            
    margin: '0 auto',
    padding: '24px 20px'
  },
  banner: {
    background: `linear-gradient(135deg, ${COLORS.accentLight} 0%, #EFF5F1 100%)`,
    borderRadius: '16px',
    padding: '36px',
    marginBottom: '28px',
    border: `1px solid rgba(106, 157, 119, 0.15)`,
    boxShadow: '0 4px 15px rgba(106, 157, 119, 0.03)'
  },
  bannerTextContainer: {
    maxWidth: '800px'              
  },
  bannerTag: {
    backgroundColor: COLORS.primary,
    color: '#FFFFFF',
    fontSize: '11px',
    fontWeight: '700',
    padding: '5px 12px',
    borderRadius: '30px',
    display: 'inline-block',
    marginBottom: '14px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  bannerTitle: {
    margin: '0 0 10px 0',
    fontSize: '32px',
    fontWeight: '800',
    color: COLORS.textDark,
    lineHeight: '1.2'
  },
  bannerDesc: {
    margin: 0,
    fontSize: '15px',
    color: COLORS.textDark,
    opacity: 0.85,
    lineHeight: '1.6'
  },
  filterToolbar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: '45px',                
    marginBottom: '24px',
    borderBottom: `1px solid ${COLORS.border}`,
    paddingBottom: '14px',
    boxSizing: 'content-box'
  },
  filterLeftSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    height: '100%'
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    cursor: 'pointer',
    userSelect: 'none',
    whiteSpace: 'nowrap'
  },
  checkbox: {
    width: '18px',
    height: '18px',
    accentColor: COLORS.primary,
    cursor: 'pointer'
  },
  // Новые добавленные стили для блока сортировки
  sortWrapper: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginLeft: '8px',
    animation: 'fadeIn 0.15s ease-out'
  },
  sortLabel: {
    fontSize: '14px',
    fontWeight: 500,
    color: COLORS.textMuted
  },
  sortSelect: {
    padding: '6px 12px',
    borderRadius: '8px',
    border: `1px solid ${COLORS.border}`,
    backgroundColor: '#FFFFFF',
    color: COLORS.textDark,
    fontSize: '14px',
    fontWeight: 600,
    outline: 'none',
    cursor: 'pointer',
    fontFamily: 'inherit'
  },
  badgeWrapper: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    height: '100%'
  },
  activeCategoryBadge: {
    backgroundColor: COLORS.accentLight,
    color: COLORS.primary,
    fontSize: '13px',
    fontWeight: '700',
    padding: '6px 12px',
    borderRadius: '20px',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    border: `1px solid rgba(106, 157, 119, 0.2)`,
    lineHeight: '1',
    animation: 'fadeIn 0.15s ease-out' 
  },
  resetCategoryButton: {
    background: 'none',
    border: 'none',
    color: COLORS.textDark,
    cursor: 'pointer',
    fontSize: '12px',
    padding: '0 2px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.6,
    transition: 'opacity 0.2s ease',
  },
  resultsCount: {
    fontSize: '14px',
    fontWeight: '500',
    color: COLORS.textMuted,
    whiteSpace: 'nowrap'
  },
  productGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', 
    gap: '24px'
  },
  productCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: '14px',
    border: `1px solid ${COLORS.border}`,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    transition: 'transform 0.25s ease, box-shadow 0.25s ease'
  },
  imageWrapper: {
    position: 'relative',
    paddingTop: '100%', 
    backgroundColor: '#FAFBF9',
    overflow: 'hidden'
  },
  productImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    objectFit: 'cover'
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: '10px',
    left: '10px',
    backgroundColor: 'rgba(78, 96, 83, 0.95)', 
    color: '#FFFFFF',
    fontSize: '10px',
    fontWeight: '700',
    padding: '5px 10px',
    borderRadius: '6px',
    backdropFilter: 'blur(4px)',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
  },
  cardBody: {
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    paddingBottom: '20px'
  },
  priceRow: {
    display: 'flex',
    alignItems: 'baseline',
    gap: '8px',
    marginBottom: '8px'
  },
  currentPrice: {
    fontSize: '20px',
    fontWeight: '800',
    color: COLORS.textDark
  },
  old_price: {
    fontSize: '13px',
    color: COLORS.textMuted,
    textDecoration: 'line-through'
  },
  productTitle: {
    margin: '0 0 10px 0',
    fontSize: '14px',
    fontWeight: '500',
    lineHeight: '1.45',
    color: COLORS.textDark,
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
    height: '40px',
    cursor: 'pointer'
  },
  ratingRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '13px',
    marginBottom: '14px'
  },
  ratingValue: {
    fontWeight: '700',
    color: COLORS.textDark
  },
  reviews_count: {
    color: COLORS.textMuted
  },
  manufacturerBlock: {
    backgroundColor: COLORS.background,
    padding: '10px 12px',
    borderRadius: '8px',
    display: 'flex',
    flexDirection: 'column',
    gap: '3px',
    border: '1px solid rgba(106, 157, 119, 0.08)'
  },
  manufacturerName: {
    fontSize: '12px',
    fontWeight: '700',
    color: COLORS.textDark,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis'
  },
  manufacturerCity: {
    fontSize: '11px',
    color: COLORS.textMuted,
    paddingLeft: '16px'
  },
  emptyState: {
    textAlign: 'center',
    padding: '60px 20px',
    backgroundColor: COLORS.cardBg,
    borderRadius: '16px',
    border: `1px solid ${COLORS.border}`
  }
};