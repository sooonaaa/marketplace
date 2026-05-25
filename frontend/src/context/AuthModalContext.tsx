import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../constants/api';
import { COLORS } from '../constants/colors';
import { saveAuth } from '../utils/authStorage';
import { formatRuPhoneInput } from '../utils/phoneMask';
import ForgotPasswordModals from '../components/auth/ForgotPasswordModals';
import { authModalStyles as styles } from '../components/auth/modalStyles';

export function notifyAuthUpdated() {
  window.dispatchEvent(new Event('chuvash-auth-updated'));
}

type AccountRole = 'user' | 'seller';

interface AuthModalContextValue {
  isAnyAuthModalOpen: boolean;
  openBuyerLogin: () => void;
  openBuyerRegister: () => void;
  openSellerLogin: () => void;
  openSellerRegister: () => void;
  openForgotPassword: (role: AccountRole) => void;
  closeAllModals: () => void;
}

const AuthModalContext = createContext<AuthModalContextValue | null>(null);

export function useAuthModal() {
  const ctx = useContext(AuthModalContext);
  if (!ctx) throw new Error('useAuthModal must be used within AuthModalProvider');
  return ctx;
}

export function AuthModalProvider({ children }: { children: React.ReactNode }) {
  const [buyerLoginOpen, setBuyerLoginOpen] = useState(false);
  const [buyerRegisterOpen, setBuyerRegisterOpen] = useState(false);
  const [sellerLoginOpen, setSellerLoginOpen] = useState(false);
  const [sellerRegisterOpen, setSellerRegisterOpen] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotRole, setForgotRole] = useState<AccountRole>('user');

  const [loginValue, setLoginValue] = useState('');
  const [passwordValue, setPasswordValue] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [sellerLoginValue, setSellerLoginValue] = useState('');
  const [sellerPasswordValue, setSellerPasswordValue] = useState('');
  const [sellerRememberMe, setSellerRememberMe] = useState(false);

  const [regFirstName, setRegFirstName] = useState('');
  const [regLastName, setRegLastName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('+7');
  const [regPassword, setRegPassword] = useState('');
  const [regAgreement, setRegAgreement] = useState(false);

  const [sellerRegFirstName, setSellerRegFirstName] = useState('');
  const [sellerRegLastName, setSellerRegLastName] = useState('');
  const [sellerRegPatronymic, setSellerRegPatronymic] = useState('');
  const [sellerRegEmail, setSellerRegEmail] = useState('');
  const [sellerRegPhone, setSellerRegPhone] = useState('+7');
  const [sellerRegPassword, setSellerRegPassword] = useState('');
  const [sellerRegBusinessForm, setSellerRegBusinessForm] = useState<'self_employed' | 'individual' | ''>('');
  const [sellerRegInn, setSellerRegInn] = useState('');
  const [sellerRegAgreement, setSellerRegAgreement] = useState(false);

  const [submitHovered, setSubmitHovered] = useState(false);
  const [regSubmitHovered, setRegSubmitHovered] = useState(false);

  const closeAllModals = useCallback(() => {
    setBuyerLoginOpen(false);
    setBuyerRegisterOpen(false);
    setSellerLoginOpen(false);
    setSellerRegisterOpen(false);
    setForgotOpen(false);
  }, []);

  const isEmailValid = !regEmail || /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(regEmail);
  const isFormValid =
    regFirstName.trim() && regLastName.trim() && regEmail.trim() && isEmailValid &&
    regPhone.length === 18 && regPassword.trim() && regAgreement;

  const isSellerFormValid =
    sellerRegFirstName.trim() &&
    sellerRegLastName.trim() &&
    sellerRegPatronymic.trim() &&
    sellerRegEmail.trim() &&
    /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(sellerRegEmail) &&
    sellerRegPhone.length === 18 &&
    sellerRegPassword.trim() &&
    sellerRegBusinessForm !== '' &&
    sellerRegInn.length === 12 &&
    /^\d{12}$/.test(sellerRegInn) &&
    sellerRegAgreement;

  const isAnyAuthModalOpen = buyerLoginOpen || buyerRegisterOpen || sellerLoginOpen || sellerRegisterOpen || forgotOpen;

  const value = useMemo(
    () => ({
      isAnyAuthModalOpen,
      openBuyerLogin: () => { closeAllModals(); setBuyerLoginOpen(true); },
      openBuyerRegister: () => { closeAllModals(); setBuyerRegisterOpen(true); },
      openSellerLogin: () => { closeAllModals(); setSellerLoginOpen(true); },
      openSellerRegister: () => { closeAllModals(); setSellerRegisterOpen(true); },
      openForgotPassword: (role: AccountRole) => {
        closeAllModals();
        setForgotRole(role);
        setForgotOpen(true);
      },
      closeAllModals,
    }),
    [isAnyAuthModalOpen, closeAllModals],
  );

  const handleBuyerLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await axios.post(`${API_BASE_URL}/api/auth/login/`, {
        email: loginValue,
        password: passwordValue,
        role: 'user',
      });
      saveAuth(res.data.access, res.data.refresh, res.data.name, res.data.role);
      notifyAuthUpdated();
      setBuyerLoginOpen(false);
      setLoginValue('');
      setPasswordValue('');
    } catch {
      alert('Неверный логин или пароль');
    }
  };

  const handleSellerLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await axios.post(`${API_BASE_URL}/api/auth/login/`, {
        email: sellerLoginValue,
        password: sellerPasswordValue,
        role: 'seller',
      });
      saveAuth(res.data.access, res.data.refresh, res.data.name, res.data.role);
      notifyAuthUpdated();
      setSellerLoginOpen(false);
      setSellerLoginValue('');
      setSellerPasswordValue('');
    } catch {
      alert('Неверный логин или пароль');
    }
  };

  const handleBuyerRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;
    try {
      const res = await axios.post(`${API_BASE_URL}/api/auth/register/`, {
        first_name: regFirstName,
        last_name: regLastName,
        email: regEmail,
        phone: regPhone,
        password: regPassword,
      });
      saveAuth(res.data.access, res.data.refresh, res.data.name, res.data.role);
      notifyAuthUpdated();
      setBuyerRegisterOpen(false);
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) alert(err.response?.data?.error || 'Ошибка регистрации');
    }
  };

  const handleSellerRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSellerFormValid) return;
    try {
      const res = await axios.post(`${API_BASE_URL}/api/auth/register/seller/`, {
        first_name: sellerRegFirstName,
        last_name: sellerRegLastName,
        patronymic: sellerRegPatronymic,
        email: sellerRegEmail,
        phone: sellerRegPhone,
        password: sellerRegPassword,
        business_form: sellerRegBusinessForm,
        inn: sellerRegInn,
      });
      saveAuth(res.data.access, res.data.refresh, res.data.name, res.data.role);
      notifyAuthUpdated();
      setSellerRegisterOpen(false);
      alert('Регистрация продавца завершена!');
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) alert(err.response?.data?.error || 'Ошибка регистрации');
    }
  };

  const openForgotFromLogin = (role: AccountRole) => {
    closeAllModals();
    setForgotRole(role);
    setForgotOpen(true);
  };

  return (
    <AuthModalContext.Provider value={value}>
      {children}

      {buyerLoginOpen && (
        <div style={styles.modalContainer}>
          <div style={styles.modalHeader}>
            <h2 style={styles.modalTitle}>Вход в личный кабинет</h2>
            <button type="button" style={styles.modalCloseButton} onClick={() => setBuyerLoginOpen(false)}>✕</button>
          </div>
          <form onSubmit={handleBuyerLogin} style={styles.modalForm}>
            <div style={styles.inputGroup}>
              <label style={styles.inputLabel}>Email</label>
              <input required value={loginValue} onChange={(e) => setLoginValue(e.target.value)} style={styles.modalInput} placeholder="Введите email" />
            </div>
            <div style={styles.inputGroup}>
              <label style={styles.inputLabel}>Пароль</label>
              <input required type="password" value={passwordValue} onChange={(e) => setPasswordValue(e.target.value)} style={styles.modalInput} placeholder="Введите пароль" />
            </div>
            <div style={styles.modalCheckboxRow}>
              <label style={styles.modalCheckboxLabel}>
                <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} style={styles.checkbox} />
                <span style={styles.checkboxText}>Запомнить меня</span>
              </label>
              <span style={styles.forgotPassword} onClick={() => openForgotFromLogin('user')}>Забыли пароль?</span>
            </div>
            <button
              type="submit"
              style={{ ...styles.modalSubmitButton, backgroundColor: submitHovered ? COLORS.primaryHover : COLORS.primary }}
              onMouseEnter={() => setSubmitHovered(true)}
              onMouseLeave={() => setSubmitHovered(false)}
            >
              Войти
            </button>
            <div style={styles.switchModalRow}>
              Ещё нет аккаунта?{' '}
              <span style={styles.switchModalLink} onClick={() => { setBuyerLoginOpen(false); setBuyerRegisterOpen(true); }}>Зарегистрироваться</span>
            </div>
          </form>
        </div>
      )}

      {buyerRegisterOpen && (
        <div style={styles.modalContainer}>
          <div style={styles.modalHeader}>
            <h2 style={styles.modalTitle}>Регистрация</h2>
            <button type="button" style={styles.modalCloseButton} onClick={() => setBuyerRegisterOpen(false)}>✕</button>
          </div>
          <form onSubmit={handleBuyerRegister} style={styles.modalForm}>
            <div style={styles.inputGroup}><label style={styles.inputLabel}>Имя</label><input required value={regFirstName} onChange={(e) => setRegFirstName(e.target.value)} style={styles.modalInput} /></div>
            <div style={styles.inputGroup}><label style={styles.inputLabel}>Фамилия</label><input required value={regLastName} onChange={(e) => setRegLastName(e.target.value)} style={styles.modalInput} /></div>
            <div style={styles.inputGroup}>
              <label style={styles.inputLabel}>Email</label>
              <input required value={regEmail} onChange={(e) => setRegEmail(e.target.value.replace(/[^a-zA-Z0-9@._-]/g, ''))} style={styles.modalInput} />
            </div>
            <div style={styles.inputGroup}>
              <label style={styles.inputLabel}>Телефон</label>
              <input required type="tel" value={regPhone} onChange={(e) => setRegPhone(formatRuPhoneInput(e.target.value))} maxLength={18} style={styles.modalInput} placeholder="+7 (999) 000-00-00" />
            </div>
            <div style={styles.inputGroup}>
              <label style={styles.inputLabel}>Пароль</label>
              <input required type="password" value={regPassword} onChange={(e) => setRegPassword(e.target.value)} style={styles.modalInput} />
            </div>
            <label style={styles.modalCheckboxLabel}>
              <input type="checkbox" checked={regAgreement} onChange={(e) => setRegAgreement(e.target.checked)} style={styles.checkbox} />
              <span style={styles.checkboxText}>Согласен с условиями платформы</span>
            </label>
            <button type="submit" disabled={!isFormValid} style={{ ...styles.modalSubmitButton, backgroundColor: isFormValid ? (regSubmitHovered ? COLORS.primaryHover : COLORS.primary) : '#C2CFC6' }} onMouseEnter={() => setRegSubmitHovered(true)} onMouseLeave={() => setRegSubmitHovered(false)}>
              Создать аккаунт
            </button>
            <div style={styles.switchModalRow}>
              Уже есть аккаунт? <span style={styles.switchModalLink} onClick={() => { setBuyerRegisterOpen(false); setBuyerLoginOpen(true); }}>Войти</span>
            </div>
          </form>
        </div>
      )}

      {sellerLoginOpen && (
        <div style={styles.modalContainer}>
          <div style={styles.modalHeader}>
            <h2 style={styles.modalTitle}>Вход в личный кабинет продавца</h2>
            <button type="button" style={styles.modalCloseButton} onClick={() => setSellerLoginOpen(false)}>✕</button>
          </div>
          <form onSubmit={handleSellerLogin} style={styles.modalForm}>
            <div style={styles.inputGroup}><label style={styles.inputLabel}>Email</label><input required value={sellerLoginValue} onChange={(e) => setSellerLoginValue(e.target.value)} style={styles.modalInput} /></div>
            <div style={styles.inputGroup}><label style={styles.inputLabel}>Пароль</label><input required type="password" value={sellerPasswordValue} onChange={(e) => setSellerPasswordValue(e.target.value)} style={styles.modalInput} /></div>
            <div style={styles.modalCheckboxRow}>
              <label style={styles.modalCheckboxLabel}>
                <input type="checkbox" checked={sellerRememberMe} onChange={(e) => setSellerRememberMe(e.target.checked)} style={styles.checkbox} />
                <span style={styles.checkboxText}>Запомнить меня</span>
              </label>
              <span style={styles.forgotPassword} onClick={() => openForgotFromLogin('seller')}>Забыли пароль?</span>
            </div>
            <button type="submit" style={{ ...styles.modalSubmitButton, backgroundColor: COLORS.primary }}>Войти</button>
            <div style={styles.switchModalRow}>
              Нет аккаунта? <span style={styles.switchModalLink} onClick={() => { setSellerLoginOpen(false); setSellerRegisterOpen(true); }}>Зарегистрироваться</span>
            </div>
          </form>
        </div>
      )}

      {sellerRegisterOpen && (
        <div style={{ ...styles.modalContainer, maxHeight: '90vh', overflowY: 'auto' }}>
          <div style={styles.modalHeader}>
            <h2 style={styles.modalTitle}>Регистрация продавца</h2>
            <button type="button" style={styles.modalCloseButton} onClick={() => setSellerRegisterOpen(false)}>✕</button>
          </div>
          <form onSubmit={handleSellerRegister} style={styles.modalForm}>
            <div style={styles.inputGroup}><label style={styles.inputLabel}>Имя</label><input required value={sellerRegFirstName} onChange={(e) => setSellerRegFirstName(e.target.value)} style={styles.modalInput} /></div>
            <div style={styles.inputGroup}><label style={styles.inputLabel}>Фамилия</label><input required value={sellerRegLastName} onChange={(e) => setSellerRegLastName(e.target.value)} style={styles.modalInput} /></div>
            <div style={styles.inputGroup}><label style={styles.inputLabel}>Отчество</label><input required value={sellerRegPatronymic} onChange={(e) => setSellerRegPatronymic(e.target.value)} style={styles.modalInput} /></div>
            <div style={styles.inputGroup}><label style={styles.inputLabel}>Email</label><input required value={sellerRegEmail} onChange={(e) => setSellerRegEmail(e.target.value.replace(/[^a-zA-Z0-9@._-]/g, ''))} style={styles.modalInput} /></div>
            <div style={styles.inputGroup}><label style={styles.inputLabel}>Телефон</label><input required type="tel" value={sellerRegPhone} onChange={(e) => setSellerRegPhone(formatRuPhoneInput(e.target.value))} maxLength={18} style={styles.modalInput} placeholder="+7 (999) 000-00-00" /></div>
            <div style={styles.inputGroup}><label style={styles.inputLabel}>Пароль</label><input required type="password" value={sellerRegPassword} onChange={(e) => setSellerRegPassword(e.target.value)} style={styles.modalInput} /></div>
            <div style={styles.inputGroup}>
              <label style={styles.inputLabel}>Форма бизнеса</label>
              <select required value={sellerRegBusinessForm} onChange={(e) => setSellerRegBusinessForm(e.target.value as 'self_employed' | 'individual')} style={styles.modalInput}>
                <option value="">Выберите</option>
                <option value="self_employed">Самозанятый</option>
                <option value="individual">ИП</option>
              </select>
            </div>
            <div style={styles.inputGroup}>
              <label style={styles.inputLabel}>ИНН</label>
              <input required value={sellerRegInn} onChange={(e) => setSellerRegInn(e.target.value.replace(/\D/g, '').slice(0, 12))} maxLength={12} style={styles.modalInput} />
            </div>
            <label style={styles.modalCheckboxLabel}>
              <input type="checkbox" checked={sellerRegAgreement} onChange={(e) => setSellerRegAgreement(e.target.checked)} />
              <span style={styles.checkboxText}>Согласен с условиями</span>
            </label>
            <button type="submit" disabled={!isSellerFormValid} style={{ ...styles.modalSubmitButton, backgroundColor: isSellerFormValid ? COLORS.primary : '#C2CFC6' }}>Создать аккаунт</button>
          </form>
        </div>
      )}

      <ForgotPasswordModals open={forgotOpen} role={forgotRole} onClose={() => setForgotOpen(false)} />
    </AuthModalContext.Provider>
  );
}
