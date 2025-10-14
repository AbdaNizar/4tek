import {Brand} from './brand';

export interface Product {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  price: number;
  oldPrice?: number;
  currency: string;
  stock: number;
  sku?: string;
  isActive: boolean;
  category: string;
  subCategory: string;
  imageUrl?: string;
  gallery?: string[];
  tags?: string[];
  createdAt: string;
  updatedAt: string;
  brandId?: string;
  specs?: string[];
  brand?: string;
  brands?: Brand;

}

