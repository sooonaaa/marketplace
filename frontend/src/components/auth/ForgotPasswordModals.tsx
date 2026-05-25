import React, { useState } from 'react';
import axios from 'axios';
import { COLORS } from '../../constants/colors';
import { API_BASE_URL } from '../../constants/api';
import { formatRuPhoneInput, isPhoneComplete } from '../../utils/phoneMask';
import { validateNewPassword } from '../../utils/passwordValidation';
import { authModalStyles as styles } from './modalStyles';

type AccountRole = 'user' | 'seller';
type Step = 'request' | 'code' | 'newPassword';

interface ForgotPasswordModalsProps {
  open: boolean;
  role: AccountRole;
  onClose: () => void;
}

export default function ForgotPasswordModals({ open, role, onClose }: ForgotPasswordModalsProps) {
  const [step, setStep] = useState<Step>('request');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [patronymic, setPatronymic] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('+7');
  const [code, setCode] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [sending, setSending] = useState(false);
  const [submitHovered, setSubmitHovered] = useState(false);

  const resetAll = () => {
    setStep('request');
    setCode('');
    setResetToken('');
    setPassword('');
    setPassword2('');
    setError('');
    setInfo('');
  };

  const handleClose = () => {
    resetAll();
    onClose();
  };

  if (!open) return null;

  const passwordError = validateNewPassword(password);
  const passwordsMatch = password === password2 && password.length > 0;
  const canSavePassword = !passwordError && passwordsMatch;

  const requestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isPhoneComplete(phone)) {
      setError('Введите телефон полностью');
      return;
    }
    setSending(true);
    setError('');
    setInfo('');
    try {
      const res = await axios.post(`${API_BASE_URL}/api/auth/password-reset/request/`, {
        first_name: firstName,
        last_name: lastName,
        patronymic: role === 'seller' ? patronymic : '',
        email,
        phone,
        role,
      });
      setResetToken(res.data.reset_token);
      setStep('code');
      let msg = 'Код отправлен на указанный email.';
      if (res.data.dev_code) {
        msg += ` (режим разработки: ${res.data.dev_code})`;
      }
      setInfo(msg);
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.error || 'Не удалось отправить код');
      } else {
        setError('Ошибка сети');
      }
    } finally {
      setSending(false);
    }
  };

  const verifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length !== 6) {
      setError('Введите 6 цифр кода');
      return;
    }
    setSending(true);
    setError('');
    try {
      await axios.post(`${API_BASE_URL}/api/auth/password-reset/verify/`, {
        reset_token: resetToken,
        code,
      });
      setStep('newPassword');
      setInfo('');
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.error || 'Неверный код');
      }
    } finally {
      setSending(false);
    }
  };

  const savePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSavePassword) return;
    setSending(true);
    setError('');
    try {
      await axios.post(`${API_BASE_URL}/api/auth/password-reset/confirm/`, {
        reset_token: resetToken,
        password,
      });
      handleClose();
      alert('Пароль успешно изменён. Войдите с новым паролем.');
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.error || 'Не удалось сохранить пароль');
      }
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <div style={overlayStyle} onClick={handleClose} />
      <div style={styles.modalContainer}>
        <div style={styles.modalHeader}>
          <h2 style={styles.modalTitle}>
            {step === 'newPassword' ? 'Новый пароль' : 'Восстановление пароля'}
          </h2>
          <button type="button" style={styles.modalCloseButton} onClick={handleClose}>✕</button>
        </div>

        {step === 'request' && (
          <form onSubmit={requestCode} style={styles.modalForm}>
            <div style={styles.inputGroup}>
              <label style={styles.inputLabel}>Имя</label>
              <input required value={firstName} onChange={(e) => setFirstName(e.target.value)} style={styles.modalInput} />
            </div>
            <div style={styles.inputGroup}>
              <label style={styles.inputLabel}>Фамилия</label>
              <input required value={lastName} onChange={(e) => setLastName(e.target.value)} style={styles.modalInput} />
            </div>
            {role === 'seller' && (
              <div style={styles.inputGroup}>
                <label style={styles.inputLabel}>Отчество</label>
                <input required value={patronymic} onChange={(e) => setPatronymic(e.target.value)} style={styles.modalInput} />
              </div>
            )}
            <div style={styles.inputGroup}>
              <label style={styles.inputLabel}>Электронная почта</label>
              <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} style={styles.modalInput} />
            </div>
            <div style={styles.inputGroup}>
              <label style={styles.inputLabel}>Номер телефона</label>
              <input
                required
                type="tel"
                value={phone}
                onChange={(e) => setPhone(formatRuPhoneInput(e.target.value))}
                maxLength={18}
                style={styles.modalInput}
                placeholder="+7 (999) 000-00-00"
              />
            </div>
            {info && <p style={{ ...styles.hintText, color: COLORS.primary }}>{info}</p>}
            {error && <p style={styles.errorText}>{error}</p>}
            <button
              type="submit"
              disabled={sending}
              style={{
                ...styles.modalSubmitButton,
                backgroundColor: submitHovered ? COLORS.primaryHover : COLORS.primary,
              }}
              onMouseEnter={() => setSubmitHovered(true)}
              onMouseLeave={() => setSubmitHovered(false)}
            >
              {sending ? 'Отправка...' : 'Отправить'}
            </button>
          </form>
        )}

        {step === 'code' && (
          <form onSubmit={verifyCode} style={styles.modalForm}>
            <p style={styles.hintText}>Введите 6-значный код из письма. Новый код — не чаще 1 раза в минуту.</p>
            <div style={styles.inputGroup}>
              <label style={styles.inputLabel}>Код подтверждения</label>
              <input
                required
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                style={{ ...styles.modalInput, letterSpacing: '4px', fontSize: '18px' }}
                placeholder="000000"
                maxLength={6}
                inputMode="numeric"
              />
            </div>
            {info && <p style={{ ...styles.hintText, color: COLORS.primary }}>{info}</p>}
            {error && <p style={styles.errorText}>{error}</p>}
            <button type="submit" disabled={sending} style={{ ...styles.modalSubmitButton, backgroundColor: COLORS.primary }}>
              {sending ? 'Проверка...' : 'Подтвердить'}
            </button>
            <span style={styles.switchModalLink} onClick={() => { setStep('request'); setError(''); }}>
              Запросить код снова
            </span>
          </form>
        )}

        {step === 'newPassword' && (
          <form onSubmit={savePassword} style={styles.modalForm}>
            <p style={styles.hintText}>
              6–20 символов, латиница и цифры, минимум одна заглавная буква и одна цифра.
            </p>
            <div style={styles.inputGroup}>
              <label style={styles.inputLabel}>Придумайте новый пароль</label>
              <input
                required
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={styles.modalInput}
                maxLength={20}
              />
              {password && passwordError && <span style={styles.errorText}>{passwordError}</span>}
            </div>
            <div style={styles.inputGroup}>
              <label style={styles.inputLabel}>Повторите пароль</label>
              <input
                required
                type="password"
                value={password2}
                onChange={(e) => setPassword2(e.target.value)}
                style={styles.modalInput}
                maxLength={20}
              />
              {password2 && !passwordsMatch && <span style={styles.errorText}>Пароли не совпадают</span>}
            </div>
            {error && <p style={styles.errorText}>{error}</p>}
            <button
              type="submit"
              disabled={!canSavePassword || sending}
              style={{
                ...styles.modalSubmitButton,
                backgroundColor: canSavePassword ? COLORS.primary : '#C2CFC6',
                cursor: canSavePassword ? 'pointer' : 'not-allowed',
              }}
            >
              {sending ? 'Сохранение...' : 'Сохранить'}
            </button>
          </form>
        )}
      </div>
    </>
  );
}

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  backgroundColor: 'rgba(78, 96, 83, 0.45)',
  zIndex: 1100,
};
