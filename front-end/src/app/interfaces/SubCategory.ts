import {ParentCategoryRef} from './ParentCategoryRef';
import {Category} from './category';

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
  category: Category;
}
