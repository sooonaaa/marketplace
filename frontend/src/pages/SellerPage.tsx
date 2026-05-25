import React, { useCallback, useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { COLORS } from '../constants/colors';
import { apiClient } from '../api/client';
import { API_BASE_URL } from '../constants/api';
import AccountLayout, { accountStyles } from '../components/AccountLayout';
import SupportSection from '../components/SupportSection';

type Section = 'profile' | 'orders' | 'products' | 'returns' | 'promotions' | 'reports' | 'support';
type SpecFieldTemplate = {
  key: string;
  label: string;
  type: 'text' | 'number';
  unit?: string;
  required?: boolean;
};
type PromoType = 'bogo_1_2' | 'bogo_2_3' | 'discount' | 'promo_code';

interface SellerProfile {
  name: string;
  first_name?: string;
  last_name?: string;
  patronymic: string;
  email: string;
  phone: string;
  business_form_label: string;
  inn: string;
  reg_date: string;
}

interface SellerProduct {
  id: number;
  title: string;
  price: number;
  category: string;
  description: string;
  specs: { label: string; value: string }[];
  image?: string;
  images?: string[];
  status?: string;
  status_label?: string;
  status_reason?: string;
}

interface SellerOrder {
  id: number;
  orderNumber: string;
  date: string;
  receivedAt: string | null;
  status: string;
  statusKey: string;
  buyerName: string;
  total: number;
  allowedStatuses: string[];
}

interface ReturnItem {
  id: number;
  orderId: number;
  status: string;
  createdAt: string;
  buyerName: string;
  items: { productTitle: string; reason: string; photos: { type: string; url: string }[] }[];
}

interface Promotion {
  id: number;
  title: string;
  promotion_type: string;
  promotion_type_label: string;
  promo_code: string;
  discount_percent: number | null;
  is_active: boolean;
}

const SELLER_MENU = [
  { id: 'profile', label: 'Личные данные', icon: '👤' },
  { id: 'orders', label: 'Список заказов', icon: '📦' },
  { id: 'products', label: 'Товары', icon: '🏷️' },
  { id: 'returns', label: 'Заявки на возврат', icon: '↩️' },
  { id: 'promotions', label: 'Акции', icon: '🎁' },
  { id: 'reports', label: 'Отчёты', icon: '📊' },
  { id: 'support', label: 'Поддержка', icon: '✉️' },
];

function parseSpecValueForField(value: string, field: SpecFieldTemplate): string {
  if (field.type === 'number' && field.unit) {
    return value.replace(field.unit, '').trim();
  }
  return value;
}

function buildSpecsPayload(templates: SpecFieldTemplate[], values: Record<string, string>) {
  const specs: { label: string; value: string }[] = [];
  for (const field of templates) {
    const raw = (values[field.key] || '').trim();
    if (!raw) {
      if (field.required) return null;
      continue;
    }
    const val = field.type === 'number' && field.unit ? `${raw} ${field.unit}` : raw;
    specs.push({ label: field.label, value: val });
  }
  return specs;
}

const STATUS_LABELS: Record<string, string> = {
  placed: 'Оформлен',
  assembling: 'Собирается',
  awaiting_shipment: 'Ожидает отправки',
  in_delivery: 'В службе доставки',
  awaiting_seller: 'Ожидает у продавца',
  received: 'Получен',
};

const PROMO_OPTIONS: { value: PromoType; label: string }[] = [
  { value: 'bogo_1_2', label: 'Акция 1 = 2' },
  { value: 'bogo_2_3', label: 'Акция 2 = 3' },
  { value: 'discount', label: 'Скидка на товар' },
  { value: 'promo_code', label: 'Промокод' },
];

function ProductCheckboxPicker({
  products,
  selectedIds,
  onChange,
}: {
  products: SellerProduct[];
  selectedIds: number[];
  onChange: (ids: number[]) => void;
}) {
  const allSelected = products.length > 0 && products.every((p) => selectedIds.includes(p.id));
  return (
    <div style={styles.checkList}>
      <label style={styles.checkRow}>
        <input
          type="checkbox"
          checked={allSelected}
          onChange={() => {
            if (allSelected) onChange([]);
            else onChange(products.map((p) => p.id));
          }}
        />
        <span>Выбрать все товары</span>
      </label>
      {products.map((p) => (
        <label key={p.id} style={styles.checkRow}>
          <input
            type="checkbox"
            checked={selectedIds.includes(p.id)}
            onChange={() => {
              if (selectedIds.includes(p.id)) onChange(selectedIds.filter((id) => id !== p.id));
              else onChange([...selectedIds, p.id]);
            }}
          />
          <span>{p.title}</span>
        </label>
      ))}
    </div>
  );
}

function AutoResizeTextarea({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const resize = () => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  };
  useEffect(() => {
    resize();
  }, [value]);
  return (
    <textarea
      ref={ref}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      onInput={resize}
      rows={2}
      style={styles.autoTextarea}
    />
  );
}

export default function SellerPage() {
  const [section, setSection] = useState<Section>('profile');
  const [profile, setProfile] = useState<SellerProfile | null>(null);
  const [products, setProducts] = useState<SellerProduct[]>([]);
  const [orders, setOrders] = useState<SellerOrder[]>([]);
  const [returns, setReturns] = useState<ReturnItem[]>([]);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [selectedReturn, setSelectedReturn] = useState<ReturnItem | null>(null);
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [promoModalOpen, setPromoModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<SellerProduct | null>(null);
  const [productError, setProductError] = useState('');

  const [pTitle, setPTitle] = useState('');
  const [pPrice, setPPrice] = useState('');
  const [pCategory, setPCategory] = useState('');
  const [pDescription, setPDescription] = useState('');
  const [specTemplates, setSpecTemplates] = useState<SpecFieldTemplate[]>([]);
  const [specValues, setSpecValues] = useState<Record<string, string>>({});
  const [pImages, setPImages] = useState<File[]>([]);
  const [pImagePreviews, setPImagePreviews] = useState<string[]>([]);

  const [promoType, setPromoType] = useState<PromoType>('bogo_1_2');
  const [promoPercent, setPromoPercent] = useState('');
  const [promoCode, setPromoCode] = useState('');
  const [promoProductIds, setPromoProductIds] = useState<number[]>([]);
  const [promoError, setPromoError] = useState('');
  const [promoSaving, setPromoSaving] = useState(false);

  const loadProfile = useCallback(() => {
    apiClient.get<SellerProfile & { patronymic?: string; business_form_label?: string; inn?: string }>('/api/auth/me/')
      .then((r) => setProfile(r.data as SellerProfile))
      .catch(() => {});
  }, []);

  const loadProducts = useCallback(() => {
    apiClient.get<SellerProduct[]>('/api/auth/seller/products/').then((r) => setProducts(r.data)).catch(() => {});
  }, []);

  const loadOrders = useCallback(() => {
    apiClient.get<SellerOrder[]>('/api/auth/seller/orders/').then((r) => setOrders(r.data)).catch(() => {});
  }, []);

  const loadReturns = useCallback(() => {
    apiClient.get<ReturnItem[]>('/api/auth/seller/returns/').then((r) => setReturns(r.data)).catch(() => {});
  }, []);

  const loadPromotions = useCallback(() => {
    apiClient.get<Promotion[]>('/api/auth/seller/promotions/').then((r) => setPromotions(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    loadProfile();
    loadProducts();
    loadOrders();
    loadReturns();
    loadPromotions();
    axios.get(`${API_BASE_URL}/api/categories/`).then((r) => setCategories(r.data));
  }, [loadProfile, loadProducts, loadOrders, loadReturns, loadPromotions]);

  const loadSpecFields = async (categoryId: string, keepSpecs?: { label: string; value: string }[]) => {
    if (!categoryId) return;
    try {
      const res = await axios.get<SpecFieldTemplate[]>(`${API_BASE_URL}/api/categories/${categoryId}/spec_fields/`);
      const templates = res.data;
      setSpecTemplates(templates);
      const values: Record<string, string> = {};
      templates.forEach((field) => {
        const existing = keepSpecs?.find((s) => s.label === field.label);
        values[field.key] = existing ? parseSpecValueForField(existing.value, field) : '';
      });
      setSpecValues(values);
    } catch {
      setSpecTemplates([{ key: 'spec', label: 'Характеристика', type: 'text', required: true }]);
      setSpecValues({ spec: '' });
    }
  };

  const openAddProduct = () => {
    const cat = categories[0]?.id || '';
    setEditingProduct(null);
    setPTitle('');
    setPPrice('');
    setPCategory(cat);
    setPDescription('');
    setPImages([]);
    setPImagePreviews([]);
    setProductError('');
    setProductModalOpen(true);
    if (cat) loadSpecFields(cat);
  };

  const openEditProduct = (p: SellerProduct) => {
    setEditingProduct(p);
    setPTitle(p.title);
    setPPrice(String(Math.round(p.price)));
    setPCategory(p.category);
    setPDescription(p.description || '');
    setPImages([]);
    setPImagePreviews(p.images || (p.image ? [p.image] : []));
    setProductError('');
    setProductModalOpen(true);
    loadSpecFields(p.category, p.specs);
  };

  const onCategoryChange = (catId: string) => {
    setPCategory(catId);
    loadSpecFields(catId);
  };

  const onImagesPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const combined = [...pImages, ...files].slice(0, 10);
    setPImages(combined);
    setPImagePreviews((prev) => {
      const newPreviews = files.map((f) => URL.createObjectURL(f));
      return [...prev.filter((u) => !u.startsWith('blob:')), ...newPreviews].slice(0, 10);
    });
    e.target.value = '';
  };

  const removeImageAt = (index: number) => {
    setPImages((prev) => prev.filter((_, i) => i !== index));
    setPImagePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const saveProduct = async () => {
    if (!pTitle.trim() || !pCategory) {
      setProductError('Заполните название и категорию');
      return;
    }
    const priceInt = parseInt(pPrice, 10);
    if (!pPrice || Number.isNaN(priceInt) || priceInt <= 1) {
      setProductError('Цена — целое число больше 1');
      return;
    }
    if (!editingProduct && pImages.length < 1) {
      setProductError('Добавьте минимум 1 фото');
      return;
    }
    const specsPayload = buildSpecsPayload(specTemplates, specValues);
    if (!specsPayload || specsPayload.length === 0) {
      setProductError('Заполните обязательные характеристики');
      return;
    }
    setProductError('');
    const form = new FormData();
    form.append('title', pTitle.trim());
    form.append('price', String(priceInt));
    form.append('category', pCategory);
    form.append('description', pDescription);
    form.append('specs', JSON.stringify(specsPayload));
    if (!editingProduct) {
      pImages.forEach((img) => form.append('images', img));
    }
    try {
      if (editingProduct) {
        await apiClient.patch(`/api/auth/seller/products/${editingProduct.id}/`, form);
      } else {
        await apiClient.post('/api/auth/seller/products/', form);
      }
      setProductModalOpen(false);
      loadProducts();
      if (!editingProduct) {
        alert('Товар отправлен на модерацию. После одобрения администратором он появится в каталоге.');
      }
    } catch {
      setProductError('Не удалось сохранить товар');
    }
  };

  const deleteProduct = async (id: number) => {
    if (!confirm('Удалить товар?')) return;
    await apiClient.delete(`/api/auth/seller/products/${id}/`);
    loadProducts();
  };

  const updateOrderStatus = async (orderId: number, status: string) => {
    await apiClient.patch(`/api/auth/seller/orders/${orderId}/status/`, { status });
    loadOrders();
  };

  const openPromoModal = () => {
    setPromoType('bogo_1_2');
    setPromoPercent('');
    setPromoCode('');
    setPromoProductIds([]);
    setPromoError('');
    setPromoModalOpen(true);
  };

  const promoNeedsProducts = promoType === 'bogo_1_2' || promoType === 'bogo_2_3' || promoType === 'discount' || promoType === 'promo_code';
  const canCreatePromo = () => {
    if (promoNeedsProducts && promoProductIds.length < 1) return false;
    if (promoType === 'discount') {
      const p = parseInt(promoPercent, 10);
      return p >= 1 && p <= 100;
    }
    if (promoType === 'promo_code') {
      const code = promoCode.trim();
      const p = parseInt(promoPercent, 10);
      return code.length >= 3 && /^[a-zA-Z0-9]+$/.test(code) && p >= 1 && p <= 100;
    }
    return true;
  };

  const savePromotion = async () => {
    if (!canCreatePromo()) {
      setPromoError('Заполните все обязательные поля и выберите товары');
      return;
    }
    setPromoSaving(true);
    setPromoError('');
    try {
      const body: Record<string, unknown> = {
        promotion_type: promoType,
        product_ids: promoProductIds,
      };
      if (promoType === 'discount' || promoType === 'promo_code') {
        body.discount_percent = parseInt(promoPercent, 10);
      }
      if (promoType === 'promo_code') {
        body.promo_code = promoCode.trim().toUpperCase();
      }
      await apiClient.post('/api/auth/seller/promotions/', body);
      setPromoModalOpen(false);
      loadPromotions();
    } catch (err: unknown) {
      const msg = axios.isAxiosError(err) && err.response?.data?.error
        ? String(err.response.data.error)
        : 'Не удалось создать акцию';
      setPromoError(msg);
    } finally {
      setPromoSaving(false);
    }
  };

  const downloadReport = async () => {
    const res = await apiClient.get('/api/auth/seller/reports/sales/', { responseType: 'blob' });
    const url = URL.createObjectURL(res.data);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sales_report.pdf';
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!profile) {
    return <div style={styles.loading}>Загрузка...</div>;
  }

  return (
    <>
      <AccountLayout
        userName={profile.name}
        userSubtitle={profile.email}
        menuItems={SELLER_MENU}
        activeId={section}
        onSelect={(id) => setSection(id as Section)}
      >
        {section === 'profile' && (
          <>
            <h2 style={accountStyles.panelTitle}>Личные данные</h2>
            <div style={styles.infoGrid}>
              <div style={styles.infoBlock}><span style={styles.infoLabel}>Имя</span><span style={styles.infoValue}>{profile.first_name || '—'}</span></div>
              <div style={styles.infoBlock}><span style={styles.infoLabel}>Фамилия</span><span style={styles.infoValue}>{profile.last_name || '—'}</span></div>
              <div style={styles.infoBlock}><span style={styles.infoLabel}>Отчество</span><span style={styles.infoValue}>{profile.patronymic || '—'}</span></div>
              <div style={styles.infoBlock}><span style={styles.infoLabel}>Email</span><span style={styles.infoValue}>{profile.email}</span></div>
              <div style={styles.infoBlock}><span style={styles.infoLabel}>Телефон</span><span style={styles.infoValue}>{profile.phone || '—'}</span></div>
              <div style={styles.infoBlock}><span style={styles.infoLabel}>Форма бизнеса</span><span style={styles.infoValue}>{profile.business_form_label || '—'}</span></div>
              <div style={styles.infoBlock}><span style={styles.infoLabel}>ИНН</span><span style={styles.infoValue}>{profile.inn || '—'}</span></div>
              <div style={styles.infoBlock}><span style={styles.infoLabel}>Дата регистрации</span><span style={styles.infoValue}>{profile.reg_date}</span></div>
            </div>
          </>
        )}

        {section === 'orders' && (
          <>
            <h2 style={accountStyles.panelTitle}>Список заказов</h2>
            {orders.length === 0 ? (
              <p style={accountStyles.emptyText}>Нет заказов</p>
            ) : (
              <div style={styles.cardList}>
                {orders.map((o) => (
                  <div key={o.id} style={styles.card}>
                    <div style={{ flex: 1 }}>
                      <strong>{o.orderNumber}</strong> — {o.status}
                      <div style={styles.muted}>{o.buyerName} · {o.date}</div>
                      {o.receivedAt && <div style={styles.muted}>Получен: {o.receivedAt}</div>}
                    </div>
                    <select value={o.statusKey} onChange={(e) => updateOrderStatus(o.id, e.target.value)} style={styles.select}>
                      {o.allowedStatuses.map((s) => (
                        <option key={s} value={s}>{STATUS_LABELS[s] || s}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {section === 'products' && (
          <>
            <div style={accountStyles.panelHeader}>
              <h2 style={accountStyles.panelTitle}>Мои товары</h2>
              <button type="button" style={accountStyles.addBtn} onClick={openAddProduct}>Добавить</button>
            </div>
            {products.length === 0 ? (
              <p style={accountStyles.emptyText}>Нет добавленных товаров</p>
            ) : (
              <div style={styles.cardList}>
                {products.map((p) => (
                  <div key={p.id} style={styles.card}>
                    {(p.image || p.images?.[0]) && (
                      <img src={p.image || p.images?.[0]} alt="" style={styles.thumb} />
                    )}
                    <div style={{ flex: 1 }}>
                      <strong>{p.title}</strong>
                      <div style={styles.muted}>{Math.round(p.price)} ₽ · {p.status_label || p.status}</div>
                      {p.status_reason && <div style={styles.statusReason}>{p.status_reason}</div>}
                    </div>
                    <button type="button" style={styles.smallBtn} onClick={() => openEditProduct(p)}>Изменить</button>
                    <button type="button" style={styles.dangerBtn} onClick={() => deleteProduct(p.id)}>Удалить</button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {section === 'returns' && (
          <>
            <h2 style={accountStyles.panelTitle}>Заявки на возврат</h2>
            {returns.length === 0 ? (
              <p style={accountStyles.emptyText}>Нет заявок на возврат</p>
            ) : (
              <div style={styles.cardList}>
                {returns.map((r) => (
                  <div key={r.id} style={styles.card}>
                    <div style={{ flex: 1 }}>
                      <strong>Заявка #{r.id}</strong> — заказ №{r.orderId}
                      <div style={styles.muted}>{r.buyerName} · {r.createdAt}</div>
                    </div>
                    <button type="button" style={styles.smallBtn} onClick={() => setSelectedReturn(r)}>Открыть</button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {section === 'promotions' && (
          <>
            <div style={accountStyles.panelHeader}>
              <h2 style={accountStyles.panelTitle}>Мои акции</h2>
              <button type="button" style={accountStyles.addBtn} onClick={openPromoModal}>Добавить акцию</button>
            </div>
            {promotions.length === 0 ? (
              <p style={accountStyles.emptyText}>Нет созданных акций</p>
            ) : (
              <div style={styles.cardList}>
                {promotions.map((p) => (
                  <div key={p.id} style={styles.card}>
                    <div style={{ flex: 1 }}>
                      <strong>{p.promotion_type_label || p.title}</strong>
                      {p.promo_code && <div style={styles.muted}>Код: {p.promo_code}</div>}
                      {p.discount_percent != null && <div style={styles.muted}>Скидка: {p.discount_percent}%</div>}
                    </div>
                    <button
                      type="button"
                      style={styles.dangerBtn}
                      onClick={() => apiClient.delete(`/api/auth/seller/promotions/${p.id}/`).then(loadPromotions)}
                    >
                      Удалить
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {section === 'support' && profile && (
          <SupportSection
            defaultFirstName={profile.first_name}
            defaultLastName={profile.last_name}
            defaultPhone={profile.phone}
            defaultEmail={profile.email}
          />
        )}

        {section === 'reports' && (
          <>
            <h2 style={accountStyles.panelTitle}>Отчёты</h2>
            <p style={styles.muted}>Отчёт по продажам ваших товаров в статусе «Получен» (PDF).</p>
            <button type="button" style={accountStyles.addBtn} onClick={downloadReport}>Скачать PDF-отчёт</button>
          </>
        )}
      </AccountLayout>

      {productModalOpen && (
        <>
          <div style={styles.overlay} onClick={() => setProductModalOpen(false)} />
          <div style={styles.modal}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>{editingProduct ? 'Редактировать товар' : 'Добавить товар'}</h3>
              <button type="button" style={styles.closeBtn} onClick={() => setProductModalOpen(false)}>✕</button>
            </div>
            <div style={styles.modalBody}>
              <label style={styles.label}>Название товара</label>
              <input value={pTitle} onChange={(e) => setPTitle(e.target.value)} style={styles.input} placeholder="Название" />

              <label style={styles.label}>Цена</label>
              <div style={styles.suffixRow}>
                <input
                  value={pPrice}
                  onChange={(e) => setPPrice(e.target.value.replace(/\D/g, ''))}
                  style={{ ...styles.input, flex: 1 }}
                  placeholder="1"
                  inputMode="numeric"
                />
                <span style={styles.suffix}>₽</span>
              </div>

              <label style={styles.label}>Категория</label>
              <select value={pCategory} onChange={(e) => onCategoryChange(e.target.value)} style={styles.input}>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>

              {specTemplates.map((field) => (
                <div key={field.key}>
                  <label style={styles.label}>{field.label}{field.required ? ' *' : ''}</label>
                  {field.type === 'number' ? (
                    <div style={styles.suffixRow}>
                      <input
                        value={specValues[field.key] || ''}
                        onChange={(e) => setSpecValues({ ...specValues, [field.key]: e.target.value.replace(/\D/g, '') })}
                        style={{ ...styles.input, flex: 1 }}
                        inputMode="numeric"
                      />
                      {field.unit && <span style={styles.suffix}>{field.unit}</span>}
                    </div>
                  ) : (
                    <input
                      value={specValues[field.key] || ''}
                      onChange={(e) => setSpecValues({ ...specValues, [field.key]: e.target.value })}
                      style={styles.input}
                    />
                  )}
                </div>
              ))}

              <label style={styles.label}>Описание</label>
              <AutoResizeTextarea value={pDescription} onChange={setPDescription} placeholder="Описание товара" />

              <label style={styles.label}>Фото товара ({pImagePreviews.length}/10)</label>
              <input type="file" accept="image/*" multiple onChange={onImagesPick} style={styles.fileInput} />
              {pImagePreviews.length > 0 && (
                <div style={styles.previewRow}>
                  {pImagePreviews.map((src, i) => (
                    <div key={i} style={styles.previewWrap}>
                      <img src={src} alt="" style={styles.previewImg} />
                      <button type="button" style={styles.previewRemove} onClick={() => removeImageAt(i)}>✕</button>
                    </div>
                  ))}
                </div>
              )}
              {!editingProduct && <p style={styles.hint}>Минимум 1, не более 10 фотографий</p>}

              {productError && <p style={styles.errorText}>{productError}</p>}
              <button type="button" style={styles.saveBtn} onClick={saveProduct}>Сохранить</button>
            </div>
          </div>
        </>
      )}

      {promoModalOpen && (
        <>
          <div style={styles.overlay} onClick={() => setPromoModalOpen(false)} />
          <div style={styles.modal}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>Добавить акцию</h3>
              <button type="button" style={styles.closeBtn} onClick={() => setPromoModalOpen(false)}>✕</button>
            </div>
            <div style={styles.modalBody}>
              <label style={styles.label}>Вид акции</label>
              <select value={promoType} onChange={(e) => setPromoType(e.target.value as PromoType)} style={styles.input}>
                {PROMO_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>

              {(promoType === 'discount' || promoType === 'promo_code') && (
                <>
                  {promoType === 'promo_code' && (
                    <>
                      <label style={styles.label}>Промокод</label>
                      <input
                        value={promoCode}
                        onChange={(e) => setPromoCode(e.target.value.replace(/[^a-zA-Z0-9]/g, '').slice(0, 32))}
                        style={styles.input}
                        placeholder="ABC123"
                      />
                    </>
                  )}
                  <label style={styles.label}>Скидка</label>
                  <div style={styles.suffixRow}>
                    <input
                      value={promoPercent}
                      onChange={(e) => {
                        const v = e.target.value.replace(/\D/g, '').slice(0, 3);
                        if (v === '' || (parseInt(v, 10) >= 1 && parseInt(v, 10) <= 100)) setPromoPercent(v);
                      }}
                      style={{ ...styles.input, flex: 1 }}
                      placeholder="1–100"
                    />
                    <span style={styles.suffix}>%</span>
                  </div>
                </>
              )}

              {promoNeedsProducts && (
                products.length === 0 ? (
                  <p style={styles.hint}>Сначала добавьте товары</p>
                ) : (
                  <ProductCheckboxPicker
                    products={products.filter((p) => p.status === 'published')}
                    selectedIds={promoProductIds}
                    onChange={setPromoProductIds}
                  />
                )
              )}

              {promoError && <p style={styles.errorText}>{promoError}</p>}
              <button
                type="button"
                disabled={!canCreatePromo() || promoSaving}
                style={{ ...styles.saveBtn, opacity: canCreatePromo() ? 1 : 0.5 }}
                onClick={savePromotion}
              >
                {promoSaving ? 'Создание...' : 'Создать акцию'}
              </button>
            </div>
          </div>
        </>
      )}

      {selectedReturn && (
        <>
          <div style={styles.overlay} onClick={() => setSelectedReturn(null)} />
          <div style={styles.modal}>
            <h3>Заявка на возврат #{selectedReturn.id}</h3>
            <p><strong>Покупатель:</strong> {selectedReturn.buyerName}</p>
            <p><strong>Заказ:</strong> №{selectedReturn.orderId}</p>
            {selectedReturn.items.map((item, idx) => (
              <div key={idx} style={{ marginBottom: '16px', borderTop: `1px solid ${COLORS.border}`, paddingTop: '12px' }}>
                <strong>{item.productTitle}</strong>
                <p style={styles.muted}>Причина: {item.reason}</p>
                <div style={styles.photoRow}>
                  {item.photos.map((ph, i) => (
                    <img key={i} src={ph.url} alt={ph.type} style={styles.photo} />
                  ))}
                </div>
              </div>
            ))}
            <button type="button" style={styles.smallBtn} onClick={() => setSelectedReturn(null)}>Закрыть</button>
          </div>
        </>
      )}
    </>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  loading: { padding: '40px', textAlign: 'center', color: COLORS.textMuted },
  infoGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '16px', marginTop: '8px' },
  infoBlock: { display: 'flex', flexDirection: 'column', gap: '4px', backgroundColor: '#FAFBF9', padding: '12px 14px', borderRadius: '10px', border: `1px solid ${COLORS.border}` },
  infoLabel: { fontSize: '12px', fontWeight: '600', color: COLORS.textMuted },
  infoValue: { fontSize: '15px', fontWeight: '700', color: COLORS.textDark },
  cardList: { display: 'flex', flexDirection: 'column', gap: '12px' },
  card: { display: 'flex', gap: '12px', alignItems: 'center', padding: '14px 16px', backgroundColor: '#FAFBF9', borderRadius: '12px', border: `1px solid ${COLORS.border}` },
  thumb: { width: '56px', height: '56px', borderRadius: '8px', objectFit: 'cover' },
  muted: { fontSize: '13px', color: COLORS.textMuted },
  statusReason: { fontSize: '12px', color: '#FF4D4F', marginTop: '4px' },
  smallBtn: { padding: '8px 12px', borderRadius: '8px', border: `1px solid ${COLORS.border}`, backgroundColor: '#FFF', cursor: 'pointer', fontWeight: '600' },
  dangerBtn: { padding: '8px 12px', borderRadius: '8px', border: 'none', backgroundColor: '#FFF2F0', color: '#FF4D4F', cursor: 'pointer', fontWeight: '600' },
  select: { padding: '8px 10px', borderRadius: '8px', border: `1px solid ${COLORS.border}` },
  overlay: { position: 'fixed', inset: 0, backgroundColor: 'rgba(78,96,83,0.45)', zIndex: 1100 },
  modal: { position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', backgroundColor: '#FFF', borderRadius: '16px', zIndex: 1101, width: 'min(520px,92vw)', maxHeight: '88vh', overflow: 'auto', boxShadow: '0 20px 40px rgba(78,96,83,0.25)' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 22px', borderBottom: `1px solid ${COLORS.border}` },
  modalTitle: { margin: 0, fontSize: '18px', fontWeight: '800' },
  closeBtn: { background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: COLORS.textMuted },
  modalBody: { padding: '22px', display: 'flex', flexDirection: 'column', gap: '8px' },
  label: { fontSize: '12px', fontWeight: '600', color: COLORS.textMuted, marginTop: '4px' },
  input: { width: '100%', padding: '10px 12px', borderRadius: '8px', border: `1px solid ${COLORS.border}`, fontSize: '14px', boxSizing: 'border-box', outline: 'none' },
  suffixRow: { display: 'flex', alignItems: 'center', gap: '8px' },
  suffix: { fontSize: '16px', fontWeight: '700', color: COLORS.textMuted, flexShrink: 0 },
  autoTextarea: {
    width: '100%',
    padding: '10px 12px',
    borderRadius: '8px',
    border: `1px solid ${COLORS.border}`,
    fontSize: '14px',
    boxSizing: 'border-box',
    resize: 'none',
    overflow: 'hidden',
    minHeight: '60px',
    fontFamily: 'inherit',
    outline: 'none',
  },
  fileInput: { fontSize: '13px' },
  previewRow: { display: 'flex', flexWrap: 'wrap', gap: '8px' },
  previewWrap: { position: 'relative' },
  previewImg: { width: '72px', height: '72px', objectFit: 'cover', borderRadius: '8px' },
  previewRemove: { position: 'absolute', top: -6, right: -6, width: '22px', height: '22px', borderRadius: '50%', border: 'none', backgroundColor: '#FF4D4F', color: '#FFF', cursor: 'pointer', fontSize: '12px' },
  hint: { fontSize: '12px', color: COLORS.textMuted, margin: '4px 0 0' },
  errorText: { color: '#FF4D4F', fontSize: '13px', margin: 0 },
  saveBtn: { marginTop: '12px', padding: '12px', borderRadius: '10px', border: 'none', backgroundColor: COLORS.primary, color: '#FFF', fontWeight: '700', cursor: 'pointer' },
  checkList: { display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px', maxHeight: '220px', overflowY: 'auto' },
  checkRow: { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', cursor: 'pointer' },
  photoRow: { display: 'flex', gap: '8px', flexWrap: 'wrap' },
  photo: { width: '80px', height: '80px', objectFit: 'cover', borderRadius: '8px' },
};
