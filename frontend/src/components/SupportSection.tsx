import React, { useState } from 'react';
import { COLORS } from '../constants/colors';
import { apiClient } from '../api/client';

interface SupportSectionProps {
  defaultFirstName?: string;
  defaultLastName?: string;
  defaultPhone?: string;
  defaultEmail?: string;
}

export default function SupportSection({
  defaultFirstName = '',
  defaultLastName = '',
  defaultPhone = '',
  defaultEmail = '',
}: SupportSectionProps) {
  const [firstName, setFirstName] = useState(defaultFirstName);
  const [lastName, setLastName] = useState(defaultLastName);
  const [phone, setPhone] = useState(defaultPhone);
  const [email, setEmail] = useState(defaultEmail);
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');
    try {
      await apiClient.post('/api/auth/support/', {
        first_name: firstName,
        last_name: lastName,
        phone,
        email,
        description,
      });
      setMessage('Обращение отправлено. Мы свяжемся с вами.');
      setDescription('');
    } catch {
      setError('Не удалось отправить обращение');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} style={styles.form}>
      <h2 style={styles.title}>Обращение в поддержку</h2>
      <div style={styles.row}>
        <div style={styles.field}>
          <label style={styles.label}>Имя</label>
          <input required value={firstName} onChange={(e) => setFirstName(e.target.value)} style={styles.input} />
        </div>
        <div style={styles.field}>
          <label style={styles.label}>Фамилия</label>
          <input required value={lastName} onChange={(e) => setLastName(e.target.value)} style={styles.input} />
        </div>
      </div>
      <div style={styles.field}>
        <label style={styles.label}>Телефон</label>
        <input required value={phone} onChange={(e) => setPhone(e.target.value)} style={styles.input} />
      </div>
      <div style={styles.field}>
        <label style={styles.label}>Электронная почта</label>
        <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} style={styles.input} />
      </div>
      <div style={styles.field}>
        <label style={styles.label}>Описание проблемы</label>
        <textarea required value={description} onChange={(e) => setDescription(e.target.value)} rows={5} style={styles.textarea} />
      </div>
      {error && <p style={styles.error}>{error}</p>}
      {message && <p style={styles.success}>{message}</p>}
      <button type="submit" disabled={saving} style={styles.btn}>{saving ? 'Отправка...' : 'Отправить'}</button>
    </form>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  form: { display: 'flex', flexDirection: 'column', gap: '14px' },
  title: { margin: '0 0 8px 0', fontSize: '22px', fontWeight: '800' },
  row: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' },
  field: { display: 'flex', flexDirection: 'column', gap: '6px' },
  label: { fontSize: '12px', fontWeight: '600', color: COLORS.textMuted },
  input: { padding: '10px 12px', borderRadius: '8px', border: `1px solid ${COLORS.border}`, fontSize: '14px' },
  textarea: { padding: '10px 12px', borderRadius: '8px', border: `1px solid ${COLORS.border}`, fontSize: '14px', resize: 'vertical' },
  btn: { padding: '12px', borderRadius: '10px', border: 'none', backgroundColor: COLORS.primary, color: '#FFF', fontWeight: '700', cursor: 'pointer' },
  error: { color: '#FF4D4F', margin: 0, fontSize: '13px' },
  success: { color: COLORS.primary, margin: 0, fontSize: '13px' },
};
