export interface OrderItemInput {
  productId: string;
  name: string;
  price: number;
  qty: number;
  imageUrl?: string;
}

export interface CreateOrderInput {
  items: OrderItemInput[];
  currency: string;         // 'TND'
  subtotal?: number;         // cart subtotal (client calc — server will re-check)
  shippingFee?: number;      // 8
  total?: number;            // subtotal + shipping (server will re-check)
  address?: string;
  note?: string;
}

export interface OrderItem extends OrderItemInput {
  lineTotal: number;
}
export type OrderStatus = 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';
export interface Order {
  _id: string;
  user: { id: string; email: string; phone: string; address: string; name?: string };
  items: OrderItemInput[];
  currency: string;
  subtotal: number;
  shippingFee: number;
  total: number;
  status: OrderStatus;
  note?: string;
  shippedAt?: string;
  deliveredAt?: string;
  canceledAt?: string;
  createdAt: string;
  updatedAt: string;
  confirmedAt: string;
}
