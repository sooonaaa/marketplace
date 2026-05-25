export interface OrderItemData {
  id: number;
  productId: number | null;
  title: string;
  price: number;
  quantity: number;
  image: string;
  reviewed: boolean;
  returned: boolean;
}

export interface OrderData {
  id: number;
  orderNumber: string;
  date: string;
  receivedAt: string | null;
  status: string;
  statusKey: string;
  statusColor: string;
  total: number;
  deliveryType: string;
  deliveryMethod: string;
  deliveryAddress: string;
  paymentMethod: string;
  items: OrderItemData[];
}
