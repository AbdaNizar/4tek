import {ParentCategoryRef} from './ParentCategoryRef';

export interface SubCategory {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  isActive: boolean;
  isExpanded: boolean;
  parent: ParentCategoryRef ;
  iconUrl?: string;
  imageUrl?: string;
  banners?: string[];
  createdAt?: string;
  updatedAt?: string;
  productsCount?:Number;
}
