import {OrderItem} from './OrderItem';

export interface CreateOrderPayload {
  items: OrderItem[];
  currency: string;
  shippingAddress?: any;
  notes?: string;
}
