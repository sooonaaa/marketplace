import React, { useState, useRef, useEffect, useMemo } from 'react';
import axios from 'axios';
import type { Category } from '../constants/categories';
import type { CartItem } from '../types/cart';
import { COLORS } from '../constants/colors';
import { API_BASE_URL } from '../constants/api';
import { addToCart, getCartCount, getProductQuantity, updateProductQuantity } from '../utils/cartStorage';
import { saveAuth, clearAuth } from '../utils/authStorage';

interface ProductPageProps {
  isLoggedIn: boolean;
  setIsLoggedIn: (value: boolean) => void;
  cartItems: CartItem[];
  setCartItems: React.Dispatch<React.SetStateAction<CartItem[]>>;
  onBackToMain: () => void;
  onGoToCart: () => void;
  onGoToProfile: () => void;
  onGoToOrders: () => void;
  onCategorySelect: (categoryId: string) => void;
  productId: number;
  onSearch: (query: string) => void;
} 


export default function ProductPage({
  isLoggedIn,
  setIsLoggedIn,
  cartItems,
  setCartItems,
  onBackToMain,
  onGoToCart,
  onGoToProfile,
  onGoToOrders,
  onCategorySelect,
  productId,
  onSearch,
}: ProductPageProps) {
  const cartCount = useMemo(() => getCartCount(cartItems), [cartItems]);
  const productQty = useMemo(() => getProductQuantity(cartItems, productId), [cartItems, productId]);  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSearchFocused, setIsSearchFocused] = useState<boolean>(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [categories, setCategories] = useState<Category[]>([
  { id: 'all', name: 'Все категории', icon: '📦' }
]);

useEffect(() => {
  axios.get(`${API_BASE_URL}/api/categories/`)
    .then(res => setCategories([
      { id: 'all', name: 'Все категории', icon: '📦' },
      ...res.data
    ]))
    .catch(err => console.error('Ошибка загрузки категорий:', err));
}, []);
  const [productData, setProductData] = useState<{
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
  description?: string;
  specs?: { label: string; value: string }[];
} | null>(null);

useEffect(() => {
  axios.get(`${API_BASE_URL}/api/products/${productId}/`)
    .then(res => setProductData(res.data))
    .catch(err => console.error('Ошибка загрузки товара:', err));
}, [productId]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

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
  const isFormValid = 
    regName.trim().length > 0 &&
    regEmail.trim().length > 0 &&
    regPhone.length === 18 &&
    regPassword.trim().length > 0 &&
    regAgreement;
  // Интерактив на странице товара
  const [isOrderBtnHovered, setIsOrderBtnHovered] = useState(false);
  const [isGoToCartHovered, setIsGoToCartHovered] = useState(false);
  const [activeTab, setActiveTab] = useState<'desc' | 'specs'>('desc');

  const handleAddToCart = () => {
    if (!productData) return;
    setCartItems((prev) =>
      addToCart(prev, {
        productId: productData.id,
        title: productData.title,
        price: Number(productData.price),
        image: productData.image,
      })
    );
  };

  const handleQtyChange = (delta: number) => {
    const nextQty = productQty + delta;
    setCartItems((prev) => updateProductQuantity(prev, productId, nextQty));
  };

const handleLoginSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  try {
    const res = await axios.post(`${API_BASE_URL}/api/auth/login/`, {
      email: loginValue,
      password: passwordValue,
    });
    saveAuth(res.data.access, res.data.refresh, res.data.name);
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
    const res = await axios.post(`${API_BASE_URL}/api/auth/register/`, {
      name: regName,
      email: regEmail,
      phone: regPhone,
      password: regPassword,
    });
    saveAuth(res.data.access, res.data.refresh, res.data.name);
    setIsLoggedIn(true);
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
  setIsSearchFocused(false);
  if (searchInputRef.current) {
    searchInputRef.current.blur();
  }
  onSearch(searchQuery);
};


  // Логика затемнения (экран темнеет всегда, когда инпут в фокусе)
  const shouldShowSearchOverlay = isSearchFocused;
  const isAnyOverlayOpen = isCatalogOpen || isLoginModalOpen || isRegisterModalOpen || shouldShowSearchOverlay;

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
      
      {/* --- ОБЩИЙ ЗАТЕМНЯЮЩИЙ ОВЕРЛЕЙ --- */}
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
            <button style={styles.modalCloseButton} onClick={() => setIsLoginModalOpen(false)}>✕</button>
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
            <button style={styles.modalCloseButton} onClick={() => setIsRegisterModalOpen(false)}>✕</button>
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
                type="email" 
                required
                placeholder="example@mail.ru"
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
                style={styles.modalInput}
              />
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.inputLabel}>Номер телефона</label>
              <input 
                type="tel" 
                required
                placeholder="+7 (999) 000-00-00"
                value={regPhone}
                onChange={(e) => setRegPhone(e.target.value)}
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
              disabled={!regAgreement}
              style={{
                ...styles.modalSubmitButton,
                backgroundColor: !regAgreement 
                  ? '#C2CFC6' 
                  : (isRegSubmitHovered ? COLORS.primaryHover : COLORS.primary),
                cursor: regAgreement ? 'pointer' : 'not-allowed',
                boxShadow: regAgreement ? '0 4px 10px rgba(106, 157, 119, 0.2)' : 'none'
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
          <button style={styles.drawerCloseButton} onClick={() => setIsCatalogOpen(false)}>✕</button>
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
                  onCategorySelect(category.id); // Вызываем функцию перехода на главную с нужной категорией
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
          
            <div 
              onClick={onBackToMain} 
              style={{ ...styles.logoContainer, cursor: 'pointer' }}
            >
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
            {/* Кнопка поиска видна всегда для поддержки стирания текста */}
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
                onClick={() => {
                  if (isLoggedIn) {
                    onGoToProfile();
                  } else {
                    setIsLoginModalOpen(true);
                  }
                }}
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
                          onGoToProfile();
                          setIsLoginHovered(false);
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
                        onClick={() => {
                          onGoToOrders();
                          setIsLoginHovered(false);
                        }}
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
                          clearAuth();
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

            <div 
              style={{ 
                ...styles.actionItem, 
                color: isCartHovered ? COLORS.textLight : COLORS.accentLight,
                transform: isCartHovered ? 'translateY(-1px)' : 'translateY(0)'
              }} 
              onClick={onGoToCart}
              onMouseEnter={() => setIsCartHovered(true)}
              onMouseLeave={() => setIsCartHovered(false)}
            >
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="9" cy="21" r="1"></circle>
                  <circle cx="20" cy="21" r="1"></circle>
                  <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
                </svg>
                {cartCount > 0 && <span style={styles.cartBadge}>{cartCount}</span>}
              </div>
              <span style={styles.actionText}>Корзина</span>
            </div>

          </div>

        </div>
      </header>

      {/* --- ОСНОВНОЙ КОНТЕНТ СТРАНИЦЫ ТОВАРA --- */}
      <main style={styles.mainContent}>
        
{/* Хлебные крошки */}
<div style={styles.breadcrumbs}>
  <span style={styles.breadcrumbLink} onClick={onBackToMain}>Главная</span>
  <span style={styles.breadcrumbDivider}>/</span>
  <span 
    style={styles.breadcrumbLink} 
    onClick={() => onCategorySelect(productData?.category || 'all')}
  >
    {categories.find(c => c.id === productData?.category)?.name || 'Каталог'}
  </span>
  <span style={styles.breadcrumbDivider}>/</span>
  <span style={styles.breadcrumbCurrent}>{productData?.title}</span>
</div>

        <div style={styles.productLayout}>
          
          {/* Левая колонка: Изображение */}
          <div style={styles.gallerySection}>
            <div style={styles.mainImageWrapper}>
              <img src={productData?.image} alt={productData?.title} style={styles.mainProductImage} />
              {productData?.is_local_verified && (
                <span style={styles.pageVerifiedBadge}>🛡️ Проверенный продавец</span>
              )}
            </div>
          </div>

          {/* Правая колонка: Информация и покупка */}
          <div style={styles.infoSection}>
            <h1 style={styles.productMainTitle}>{productData?.title}</h1>
            
            <div style={styles.ratingAndReviewsRow}>
              <div style={styles.starsContainer}>
                <span style={{ color: COLORS.rating, fontSize: '18px' }}>★</span>
                <span style={styles.ratingValueText}>{productData?.rating}</span>
              </div>
              <span style={styles.reviewsCountText}>{productData?.reviews_count} отзывов покупателей</span>
            </div>

            <div style={styles.priceCard}>
              <div style={styles.pagePriceRow}>
                <span style={styles.pageCurrentPrice}>{productData?.price} ₽</span>
                {productData?.old_price && (
                  <span style={styles.pageOldPrice}>{productData?.old_price} ₽</span>
                )}
                {productData?.old_price && (
                  <span style={styles.discountBadge}>-{Math.round(((productData?.old_price - productData?.price) / productData?.old_price) * 100)}%</span>
                )}
              </div>
              
              {productQty === 0 ? (
                <button
                  type="button"
                  onClick={handleAddToCart}
                  style={{
                    ...styles.pageAddToCartButton,
                    backgroundColor: isOrderBtnHovered ? COLORS.primaryHover : COLORS.primary,
                  }}
                  onMouseEnter={() => setIsOrderBtnHovered(true)}
                  onMouseLeave={() => setIsOrderBtnHovered(false)}
                >
                  Добавить в корзину
                </button>
              ) : (
                <div style={styles.cartActionsRow}>
                  <div style={styles.qtyControlGroup}>
                    <button
                      type="button"
                      style={styles.qtyButton}
                      onClick={() => handleQtyChange(-1)}
                    >
                      −
                    </button>
                    <span style={styles.qtyDisplay}>{productQty}</span>
                    <button
                      type="button"
                      style={styles.qtyButton}
                      onClick={() => handleQtyChange(1)}
                    >
                      +
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={onGoToCart}
                    style={{
                      ...styles.goToCartButton,
                      backgroundColor: isGoToCartHovered ? COLORS.primaryHover : COLORS.primary,
                    }}
                    onMouseEnter={() => setIsGoToCartHovered(true)}
                    onMouseLeave={() => setIsGoToCartHovered(false)}
                  >
                    В корзину
                  </button>
                </div>
              )}
            </div>

            {/* Блок производителя */}
            <div style={styles.pageManufacturerBlock}>
              <div style={{ fontSize: '20px' }}>🏭</div>
              <div>
                <div style={styles.pageManufacturerName}>{productData?.manufacturer}</div>
                <div style={styles.pageManufacturerCity}>{productData?.city}</div>
              </div>
              <div style={styles.localProductionTag}>Местное производство</div>
            </div>

            {/* Табы: Описание / Характеристики */}
            <div style={styles.tabsContainer}>
              <div style={styles.tabsHeader}>
                <button 
                  style={{
                    ...styles.tabButton,
                    color: activeTab === 'desc' ? COLORS.primary : COLORS.textDark,
                    borderBottom: activeTab === 'desc' ? `3px solid ${COLORS.primary}` : '3px solid transparent',
                    fontWeight: activeTab === 'desc' ? '700' : '500'
                  }}
                  onClick={() => setActiveTab('desc')}
                >
                  Описание товара
                </button>
                <button 
                  style={{
                    ...styles.tabButton,
                    color: activeTab === 'specs' ? COLORS.primary : COLORS.textDark,
                    borderBottom: activeTab === 'specs' ? `3px solid ${COLORS.primary}` : '3px solid transparent',
                    fontWeight: activeTab === 'specs' ? '700' : '500'
                  }}
                  onClick={() => setActiveTab('specs')}
                >
                  Характеристики
                </button>
              </div>

              <div style={styles.tabContent}>
                {activeTab === 'desc' ? (
                  <p style={styles.descriptionParagraph}>{productData?.description}</p>
                ) : (
                  <div style={styles.specsTable}>
                    {productData?.specs?.map((spec, index) => (
                      <div key={index} style={styles.specsRow}>
                        <span style={styles.specLabel}>{spec.label}</span>
                        <span style={styles.specValue}>{spec.value}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

          </div>

        </div>

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
  modalHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' },
  modalTitle: { margin: 0, fontSize: '20px', fontWeight: '800', color: COLORS.textDark },
  modalCloseButton: { background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: COLORS.textMuted, padding: '4px', borderRadius: '50%' },
  modalForm: { display: 'flex', flexDirection: 'column', gap: '14px' },
  inputGroup: { display: 'flex', flexDirection: 'column', gap: '6px' },
  inputLabel: { fontSize: '13px', fontWeight: '700', color: COLORS.textDark },
  modalInput: { padding: '11px 14px', borderRadius: '10px', border: `1px solid ${COLORS.border}`, fontSize: '14px', color: COLORS.textDark, outline: 'none', backgroundColor: '#FAFBF9' },
  modalCheckboxRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2px', marginBottom: '4px' },
  modalCheckboxLabel: { display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer', userSelect: 'none' },
  checkboxText: { fontSize: '13px', fontWeight: '600', color: COLORS.textDark },
  forgotPassword: { fontSize: '13px', fontWeight: '600', color: COLORS.primary, cursor: 'pointer' },
  modalSubmitButton: { color: '#FFFFFF', border: 'none', borderRadius: '10px', padding: '12px 0', fontWeight: '700', fontSize: '15px', width: '100%', transition: 'all 0.2s ease', outline: 'none', marginTop: '6px' },
  switchModalRow: { textAlign: 'center', fontSize: '13px', color: COLORS.textDark, marginTop: '10px', fontWeight: '500' },
  switchModalLink: { color: COLORS.primary, fontWeight: '700', cursor: 'pointer', textDecoration: 'underline', marginLeft: '4px' },
  catalogDrawer: { position: 'fixed', top: 0, left: 0, bottom: 0, width: '350px', backgroundColor: '#FFFFFF', zIndex: 1000, boxShadow: '4px 0 25px rgba(0, 0, 0, 0.15)', display: 'flex', flexDirection: 'column', transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)' },
  drawerHeader: { padding: '24px 20px', borderBottom: `1px solid ${COLORS.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  drawerTitle: { margin: 0, fontSize: '20px', fontWeight: '800', color: COLORS.textDark },
  drawerCloseButton: { background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: COLORS.textMuted, padding: '4px 8px', borderRadius: '6px' },
  drawerContent: { padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: '4px', overflowY: 'auto' },
  drawerItem: { display: 'flex', alignItems: 'center', padding: '14px 16px', borderRadius: '10px', cursor: 'pointer', fontSize: '15px', transition: 'all 0.15s ease', userSelect: 'none', position: 'relative' },
  drawerItemIcon: { marginRight: '14px', fontSize: '18px' },
  drawerItemActiveCheck: { position: 'absolute', right: '16px', fontSize: '14px' },
  header: { backgroundColor: COLORS.primary, position: 'sticky', top: 0, boxShadow: '0 4px 12px rgba(78, 96, 83, 0.15)' },
  headerContent: { maxWidth: '1500px', margin: '0 auto', padding: '10px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '24px' },
  logoContainer: { display: 'flex', alignItems: 'center', gap: '12px', userSelect: 'none', flexShrink: 0 },
  logoIcon: { fontSize: '32px' },
  logoText: { display: 'flex', flexDirection: 'column' },
  logoTitle: { margin: 0, fontSize: '22px', fontWeight: '800', color: COLORS.textLight, letterSpacing: '-0.5px', lineHeight: '1.1' },
  logoSubtitle: { fontSize: '11px', color: '#EAF0EB', textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: '600', marginTop: '2px' },
  searchBar: { flex: 1, maxWidth: '650px', display: 'flex', alignItems: 'center', borderRadius: '30px', overflow: 'hidden', backgroundColor: '#FFFFFF', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', padding: '4px 6px 4px 16px', position: 'relative' },
  searchInput: { flex: 1, padding: '8px 0', border: 'none', outline: 'none', fontSize: '14px', color: COLORS.textDark, backgroundColor: 'transparent' },
  searchButton: { backgroundColor: COLORS.primary, color: COLORS.textLight, border: 'none', borderRadius: '50%', width: '34px', height: '34px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background-color 0.2s ease', marginLeft: '8px', outline: 'none' },
  headerActions: { display: 'flex', alignItems: 'center', gap: '28px', flexShrink: 0 },
  loginWrapper: { position: 'relative', paddingBottom: '10px', marginBottom: '-10px' },
  actionItem: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px', cursor: 'pointer', userSelect: 'none', transition: 'color 0.2s ease, transform 0.2s ease', minWidth: '56px' },
  actionText: { fontSize: '12px', fontWeight: '600', letterSpacing: '0.2px' },
  loginPopover: { position: 'absolute', top: '52px', right: '-40px', backgroundColor: '#FFFFFF', borderRadius: '12px', padding: '14px', boxShadow: '0 10px 25px rgba(78, 96, 83, 0.2)', display: 'flex', flexDirection: 'column', gap: '8px', width: '180px', zIndex: 200, border: `1px solid ${COLORS.border}` },
  popoverArrow: { position: 'absolute', top: '-6px', right: '58px', width: '10px', height: '10px', backgroundColor: '#FFFFFF', transform: 'rotate(45deg)', borderLeft: `1px solid ${COLORS.border}`, borderTop: `1px solid ${COLORS.border}` },
  popoverButton: { padding: '9px 0', borderRadius: '8px', fontSize: '13px', fontWeight: '700', cursor: 'pointer', border: 'none', width: '100%', transition: 'all 0.15s ease', textAlign: 'center', outline: 'none' },
  cartBadge: { position: 'absolute', top: '-6px', right: '-10px', backgroundColor: COLORS.textDark, color: '#FFFFFF', fontSize: '10px', fontWeight: '700', borderRadius: '50%', width: '16px', height: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.3)', border: `1px solid ${COLORS.primary}` },
  activeCategoryBadge: { backgroundColor: COLORS.accentLight, color: COLORS.primary, fontSize: '13px', fontWeight: '700', padding: '6px 12px', borderRadius: '20px', display: 'inline-flex', alignItems: 'center', gap: '8px', border: `1px solid rgba(106, 157, 119, 0.2)`, lineHeight: '1', animation: 'fadeIn 0.15s ease-out' },
  resetCategoryButton: { background: 'none', border: 'none', color: COLORS.textDark, cursor: 'pointer', fontSize: '12px', padding: '0 2px', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.6, transition: 'opacity 0.2s ease' },

  // СТИЛИ СТРАНИЦЫ ТОВАРА
  mainContent: { maxWidth: '1200px', margin: '0 auto', padding: '20px 20px' },
  breadcrumbs: { display: 'flex', gap: '8px', alignItems: 'center', fontSize: '13px', color: COLORS.textMuted, marginBottom: '24px' },
  breadcrumbLink: { cursor: 'pointer', fontWeight: '600', transition: 'color 0.2s ease' },
  breadcrumbDivider: { userSelect: 'none' },
  breadcrumbCurrent: { color: COLORS.textDark, fontWeight: '500' },
  
  productLayout: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '40px', alignItems: 'start' },
  gallerySection: { backgroundColor: COLORS.cardBg, borderRadius: '16px', border: `1px solid ${COLORS.border}`, padding: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.01)' },
  mainImageWrapper: { position: 'relative', width: '100%', paddingTop: '80%', overflow: 'hidden', borderRadius: '12px', backgroundColor: '#FAFBF9' },
  mainProductImage: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' },
  pageVerifiedBadge: { position: 'absolute', top: '16px', left: '16px', backgroundColor: 'rgba(78, 96, 83, 0.95)', color: '#FFFFFF', fontSize: '12px', fontWeight: '700', padding: '6px 14px', borderRadius: '8px', boxShadow: '0 4px 8px rgba(0,0,0,0.1)' },
  
  infoSection: { display: 'flex', flexDirection: 'column', gap: '20px' },
  productMainTitle: { margin: 0, fontSize: '26px', fontWeight: '800', color: COLORS.textDark, lineHeight: '1.3' },
  ratingAndReviewsRow: { display: 'flex', alignItems: 'center', gap: '16px', fontSize: '14px' },
  starsContainer: { display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '700' },
  ratingValueText: { color: COLORS.textDark, marginTop: '2px' },
  reviewsCountText: { color: COLORS.textMuted, fontWeight: '500' },
  
  priceCard: { backgroundColor: COLORS.cardBg, border: `1px solid ${COLORS.border}`, borderRadius: '16px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', boxShadow: '0 6px 15px rgba(78, 96, 83, 0.04)' },
  pagePriceRow: { display: 'flex', alignItems: 'baseline', gap: '12px' },
  pageCurrentPrice: { fontSize: '32px', fontWeight: '900', color: COLORS.textDark },
  pageOldPrice: { fontSize: '16px', color: COLORS.textMuted, textDecoration: 'line-through' },
  discountBadge: { backgroundColor: '#E25C5C', color: '#FFFFFF', fontSize: '12px', fontWeight: '700', padding: '3px 8px', borderRadius: '6px', marginLeft: '4px' },
  pageAddToCartButton: { color: '#FFFFFF', border: 'none', borderRadius: '12px', padding: '14px 0', fontWeight: '700', fontSize: '16px', cursor: 'pointer', width: '100%', transition: 'background-color 0.2s ease', outline: 'none', boxShadow: '0 4px 12px rgba(106, 157, 119, 0.2)' },
  cartActionsRow: { display: 'flex', gap: '12px', alignItems: 'stretch' },
  qtyControlGroup: { display: 'flex', alignItems: 'center', gap: '8px', flex: 1, backgroundColor: '#FAFBF9', borderRadius: '12px', border: `1px solid ${COLORS.border}`, padding: '6px 10px', justifyContent: 'center' },
  qtyButton: { width: '36px', height: '36px', borderRadius: '8px', border: `1px solid ${COLORS.border}`, backgroundColor: '#FFFFFF', color: COLORS.textDark, fontSize: '20px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  qtyDisplay: { minWidth: '32px', textAlign: 'center', fontWeight: '800', fontSize: '17px', color: COLORS.textDark },
  goToCartButton: { flex: 1, color: '#FFFFFF', border: 'none', borderRadius: '12px', padding: '14px 16px', fontWeight: '700', fontSize: '15px', cursor: 'pointer', transition: 'background-color 0.2s ease', outline: 'none', boxShadow: '0 4px 12px rgba(106, 157, 119, 0.2)' },
  
  pageManufacturerBlock: { display: 'flex', alignItems: 'center', gap: '14px', backgroundColor: '#EAF0EB', padding: '14px 18px', borderRadius: '12px', border: '1px solid rgba(106, 157, 119, 0.15)', position: 'relative' },
  pageManufacturerName: { fontSize: '15px', fontWeight: '700', color: COLORS.textDark },
  pageManufacturerCity: { fontSize: '13px', color: COLORS.textMuted, marginTop: '2px' },
  localProductionTag: { position: 'absolute', right: '18px', backgroundColor: COLORS.primary, color: '#FFFFFF', fontSize: '10px', fontWeight: '700', padding: '4px 8px', borderRadius: '6px', textTransform: 'uppercase' },
  
  tabsContainer: { marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '16px' },
  tabsHeader: { display: 'flex', gap: '24px', borderBottom: `2px solid ${COLORS.border}` },
  tabButton: { background: 'none', border: 'none', padding: '10px 0', fontSize: '15px', cursor: 'pointer', transition: 'all 0.2s ease', outline: 'none' },
  tabContent: { backgroundColor: COLORS.cardBg, border: `1px solid ${COLORS.border}`, borderRadius: '16px', padding: '20px', boxShadow: '0 4px 12px rgba(0,0,0,0.01)', minHeight: '150px' },
  descriptionParagraph: { margin: 0, fontSize: '14px', color: COLORS.textDark, lineHeight: '1.6', opacity: 0.9 },
  specsTable: { display: 'flex', flexDirection: 'column', gap: '12px' },
  specsRow: { display: 'flex', justifyContent: 'space-between', fontSize: '14px', paddingBottom: '8px', borderBottom: `1px dashed ${COLORS.border}` },
  specLabel: { color: COLORS.textMuted, fontWeight: '500' },
  specValue: { color: COLORS.textDark, fontWeight: '600', textAlign: 'right', maxWidth: '60%' }
};