import {CartItem} from './cartItem';

export interface CartDoc {
  user: string;
  items: CartItem[];
}
