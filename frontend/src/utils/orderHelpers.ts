import type { OrderData } from '../types/order';

const CANCEL_WITH_REASON: Record<string, string[]> = {
  pickup: ['placed', 'assembling', 'awaiting_seller'],
  courier: ['placed', 'assembling'],
};

const CANCEL_INFO_ONLY: Record<string, string[]> = {
  courier: ['awaiting_shipment', 'in_delivery'],
};

const FINAL_STATUSES: Record<string, string[]> = {
  pickup: ['received'],
  courier: ['received'],
};

export function canCancelWithReason(order: OrderData): boolean {
  return (CANCEL_WITH_REASON[order.deliveryType] || []).includes(order.statusKey);
}

export function canCancelInfoOnly(order: OrderData): boolean {
  return (CANCEL_INFO_ONLY[order.deliveryType] || []).includes(order.statusKey);
}

export function canRateAndReturn(order: OrderData): boolean {
  if (order.statusKey === 'cancelled') return false;
  return (FINAL_STATUSES[order.deliveryType] || []).includes(order.statusKey);
}

export const CANCEL_REASONS = [
  'Нужно поменять способ оплаты',
  'Заказ был оформлен случайно',
  'Не применилась скидка или промокод',
  'Нет нужной причины',
] as const;
