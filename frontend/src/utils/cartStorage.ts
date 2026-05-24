import type { CartItem } from '../types/cart';

const CART_KEY = 'chuvashmp_cart';

export function loadCart(): CartItem[] {
  try {
    const raw = localStorage.getItem(CART_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CartItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveCart(items: CartItem[]): void {
  localStorage.setItem(CART_KEY, JSON.stringify(items));
}

export function getCartCount(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + item.quantity, 0);
}

export function getProductQuantity(items: CartItem[], productId: number): number {
  return items.find((i) => i.productId === productId)?.quantity ?? 0;
}

export function addToCart(items: CartItem[], item: Omit<CartItem, 'quantity'>, delta = 1): CartItem[] {
  const existing = items.find((i) => i.productId === item.productId);
  if (existing) {
    return items.map((i) =>
      i.productId === item.productId ? { ...i, quantity: i.quantity + delta } : i
    );
  }
  return [...items, { ...item, quantity: delta }];
}

export function updateProductQuantity(
  items: CartItem[],
  productId: number,
  quantity: number
): CartItem[] {
  if (quantity <= 0) {
    return items.filter((i) => i.productId !== productId);
  }
  return items.map((i) => (i.productId === productId ? { ...i, quantity } : i));
}
