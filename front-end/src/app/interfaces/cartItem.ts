export interface CartItem {
  _id?: string;
  product: string;
  name: string;
  price: number;
  imageUrl?: string;
  subCategory?: string;
  variantId?: string;
  user?:string;
  qty: number;
}
