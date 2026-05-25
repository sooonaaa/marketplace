import React, { useEffect, useRef, useState } from 'react';
import { COLORS } from '../constants/colors';
import { apiClient } from '../api/client';
import AccountLayout from '../components/AccountLayout';
import SupportSection from '../components/SupportSection';
import OrdersPage from './OrdersPage';

interface ProfilePageProps {
  isLoggedIn: boolean;
  onLoginRequest: () => void;
  initialSection?: Section;
}

interface UserProfile {
  first_name: string;
  last_name: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  birth_date: string;
  gender: string;
  gender_label: string;
  reg_date: string;
}

type Section = 'profile' | 'orders' | 'support';

const BUYER_MENU = [
  { id: 'profile', label: 'Личные данные', icon: '👤' },
  { id: 'orders', label: 'История заказов', icon: '📦' },
  { id: 'support', label: 'Поддержка', icon: '✉️' },
];

export default function ProfilePage({ isLoggedIn, onLoginRequest, initialSection = 'profile' }: ProfilePageProps) {
  const [section, setSection] = useState<Section>(initialSection);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [fetchError, setFetchError] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editCity, setEditCity] = useState('');
  const [editBirthDate, setEditBirthDate] = useState('');
  const [editGender, setEditGender] = useState<'male' | 'female' | ''>('');
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState('');
  const datePickerRef = useRef<HTMLInputElement>(null);

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
      .catch(() => {
        if (!cancelled) setFetchError(true);
      });
    return () => { cancelled = true; };
  }, [isLoggedIn]);

  const openEdit = () => {
    if (!user) return;
    setEditFirstName(user.first_name);
    setEditLastName(user.last_name);
    setEditPhone(user.phone);
    setEditCity(user.city);
    setEditBirthDate(user.birth_date || '');
    setEditGender((user.gender as 'male' | 'female') || '');
    setEditError('');
    setIsEditOpen(true);
  };

  const handleBirthDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let v = e.target.value.replace(/[^\d.]/g, '');
    if (v.length > 10) v = v.slice(0, 10);
    const digits = v.replace(/\./g, '');
    if (digits.length <= 2) setEditBirthDate(digits);
    else if (digits.length <= 4) setEditBirthDate(`${digits.slice(0, 2)}.${digits.slice(2)}`);
    else setEditBirthDate(`${digits.slice(0, 2)}.${digits.slice(2, 4)}.${digits.slice(4, 8)}`);
  };

  const syncFromNativeDate = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (!val) return;
    const [y, m, d] = val.split('-');
    setEditBirthDate(`${d}.${m}.${y}`);
  };

  const openCalendar = () => {
    const el = datePickerRef.current;
    if (!el) return;
    if (editBirthDate.length === 10) {
      const [d, m, y] = editBirthDate.split('.');
      el.value = `${y}-${m}-${d}`;
    }
    el.showPicker?.();
  };

  const saveProfile = async () => {
    setEditSaving(true);
    setEditError('');
    try {
      const res = await apiClient.patch<UserProfile>('/api/auth/me/', {
        first_name: editFirstName,
        last_name: editLastName,
        phone: editPhone,
        city: editCity,
        birth_date: editBirthDate,
        gender: editGender,
      });
      setUser(res.data);
      setIsEditOpen(false);
    } catch {
      setEditError('Не удалось сохранить изменения');
    } finally {
      setEditSaving(false);
    }
  };

  if (!isLoggedIn) {
    return (
      <div style={styles.emptyState}>
        <h3 style={styles.emptyTitle}>Доступ ограничен</h3>
        <p style={styles.emptyText}>Пожалуйста, войдите в систему, чтобы просмотреть личный кабинет.</p>
        <button type="button" style={styles.primaryButton} onClick={onLoginRequest}>Войти</button>
      </div>
    );
  }

  if (user === null && !fetchError) return <div style={styles.loading}>Загрузка данных...</div>;
  if (!user) {
    return (
      <div style={styles.emptyState}>
        <p style={styles.emptyText}>Не удалось загрузить данные профиля</p>
      </div>
    );
  }

  return (
    <>
      {isEditOpen && (
        <>
          <div style={styles.overlay} onClick={() => setIsEditOpen(false)} />
          <div style={styles.editModal}>
            <div style={styles.editHeader}>
              <h3 style={styles.editTitle}>Изменить данные</h3>
              <button type="button" style={styles.closeBtn} onClick={() => setIsEditOpen(false)}>✕</button>
            </div>
            <div style={styles.editBody}>
              <label style={styles.editLabel}>Имя</label>
              <input value={editFirstName} onChange={(e) => setEditFirstName(e.target.value)} style={styles.editInput} />
              <label style={styles.editLabel}>Фамилия</label>
              <input value={editLastName} onChange={(e) => setEditLastName(e.target.value)} style={styles.editInput} />
              <label style={styles.editLabel}>Номер телефона</label>
              <input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} style={styles.editInput} />
              <label style={styles.editLabel}>Населенный пункт</label>
              <input value={editCity} onChange={(e) => setEditCity(e.target.value)} style={styles.editInput} />
              <label style={styles.editLabel}>Дата рождения</label>
              <div style={styles.dateRow}>
                <input value={editBirthDate} onChange={handleBirthDateChange} placeholder="ДД.ММ.ГГГГ" style={{ ...styles.editInput, flex: 1 }} />
                <button type="button" style={styles.calendarBtn} onClick={openCalendar}>📅</button>
                <input ref={datePickerRef} type="date" onChange={syncFromNativeDate} style={styles.hiddenDate} tabIndex={-1} />
              </div>
              <div style={styles.genderRow}>
                <span style={styles.editLabel}>Пол:</span>
                <label style={styles.genderOption}>
                  <input type="radio" name="gender" checked={editGender === 'male'} onChange={() => setEditGender('male')} style={styles.genderRadio} />
                  Мужской
                </label>
                <label style={styles.genderOption}>
                  <input type="radio" name="gender" checked={editGender === 'female'} onChange={() => setEditGender('female')} style={styles.genderRadio} />
                  Женский
                </label>
              </div>
              {editError && <p style={styles.editError}>{editError}</p>}
              <button type="button" disabled={editSaving} onClick={saveProfile} style={styles.saveBtn}>
                {editSaving ? 'Сохранение...' : 'Сохранить'}
              </button>
            </div>
          </div>
        </>
      )}

      <AccountLayout
        userName={user.name}
        userSubtitle={user.city}
        menuItems={BUYER_MENU}
        activeId={section}
        onSelect={(id) => setSection(id as Section)}
      >
        {section === 'profile' ? (
          <>
            <div style={styles.titleSection}>
              <h2 style={styles.sectionTitle}>Личные данные</h2>
              <button type="button" style={styles.editLink} onClick={openEdit}>Изменить данные</button>
            </div>
            <div style={styles.infoGrid}>
              <div style={styles.infoBlock}><span style={styles.infoLabel}>Имя</span><span style={styles.infoValue}>{user.first_name || '—'}</span></div>
              <div style={styles.infoBlock}><span style={styles.infoLabel}>Фамилия</span><span style={styles.infoValue}>{user.last_name || '—'}</span></div>
              <div style={styles.infoBlock}><span style={styles.infoLabel}>Электронная почта</span><span style={styles.infoValue}>{user.email}</span></div>
              <div style={styles.infoBlock}><span style={styles.infoLabel}>Номер телефона</span><span style={styles.infoValue}>{user.phone || '—'}</span></div>
              <div style={styles.infoBlock}><span style={styles.infoLabel}>Населенный пункт</span><span style={styles.infoValue}>{user.city}</span></div>
              <div style={styles.infoBlock}><span style={styles.infoLabel}>Дата рождения</span><span style={styles.infoValue}>{user.birth_date || '—'}</span></div>
              <div style={styles.infoBlock}><span style={styles.infoLabel}>Пол</span><span style={styles.infoValue}>{user.gender_label || '—'}</span></div>
              <div style={styles.infoBlock}><span style={styles.infoLabel}>Дата регистрации</span><span style={styles.infoValue}>{user.reg_date}</span></div>
            </div>
          </>
        ) : section === 'orders' ? (
          <OrdersPage isLoggedIn={isLoggedIn} onLoginRequest={onLoginRequest} embedded />
        ) : (
          <SupportSection
            defaultFirstName={user.first_name}
            defaultLastName={user.last_name}
            defaultPhone={user.phone}
            defaultEmail={user.email}
          />
        )}
      </AccountLayout>
    </>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  titleSection: { display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '24px' },
  sectionTitle: { margin: 0, fontSize: '22px', fontWeight: '800', color: COLORS.textDark },
  editLink: { background: 'none', border: 'none', padding: 0, fontSize: '14px', color: COLORS.textMuted, cursor: 'pointer', fontWeight: '600', textAlign: 'left', width: 'fit-content' },
  infoGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' },
  infoBlock: { display: 'flex', flexDirection: 'column', gap: '6px', backgroundColor: '#FAFBF9', padding: '14px 16px', borderRadius: '10px', border: `1px solid ${COLORS.border}` },
  infoLabel: { fontSize: '12px', fontWeight: '600', color: COLORS.textMuted },
  infoValue: { fontSize: '15px', fontWeight: '700', color: COLORS.textDark },
  emptyState: { textAlign: 'center', padding: '48px 24px', backgroundColor: COLORS.cardBg, borderRadius: '16px', border: `1px solid ${COLORS.border}` },
  emptyTitle: { margin: '0 0 8px 0', fontSize: '20px', fontWeight: '800' },
  emptyText: { margin: '0 0 16px 0', color: COLORS.textMuted },
  primaryButton: { backgroundColor: COLORS.primary, color: '#FFF', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' },
  loading: { padding: '40px', textAlign: 'center', color: COLORS.textMuted },
  overlay: { position: 'fixed', inset: 0, backgroundColor: 'rgba(78,96,83,0.45)', zIndex: 1100 },
  editModal: { position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', backgroundColor: '#FFF', width: 'min(440px,92vw)', borderRadius: '16px', zIndex: 1101, boxShadow: '0 20px 40px rgba(78,96,83,0.3)', maxHeight: '90vh', overflow: 'auto' },
  editHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 22px', borderBottom: `1px solid ${COLORS.border}` },
  editTitle: { margin: 0, fontSize: '18px', fontWeight: '800' },
  closeBtn: { background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: COLORS.textMuted },
  editBody: { padding: '22px', display: 'flex', flexDirection: 'column', gap: '10px' },
  editLabel: { fontSize: '12px', fontWeight: '600', color: COLORS.textMuted },
  editInput: { padding: '10px 12px', borderRadius: '8px', border: `1px solid ${COLORS.border}`, fontSize: '14px', outline: 'none', boxSizing: 'border-box' },
  dateRow: { display: 'flex', gap: '8px', alignItems: 'center' },
  calendarBtn: { padding: '8px 12px', borderRadius: '8px', border: `1px solid ${COLORS.border}`, backgroundColor: COLORS.accentLight, cursor: 'pointer' },
  hiddenDate: { position: 'absolute', width: 0, height: 0, opacity: 0, pointerEvents: 'none' },
  genderRow: { display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' },
  genderOption: { display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', color: COLORS.textDark, cursor: 'pointer' },
  genderRadio: { accentColor: COLORS.primary, width: '16px', height: '16px', cursor: 'pointer' },
  editError: { color: '#FF4D4F', fontSize: '13px', margin: 0 },
  saveBtn: { marginTop: '8px', padding: '12px 0', borderRadius: '10px', border: 'none', backgroundColor: COLORS.primary, color: '#FFF', fontWeight: '700', cursor: 'pointer' },
};
