// src/app/interfaces/category.ts
export interface Category {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  isActive: boolean;
  imageUrl?: string;
  iconUrl?: string;
  bannerUrl?: string;     // legacy
  banners?: string[];     // actuel
  createdAt?: string;
  updatedAt?: string;
  isExpanded?: boolean;

}
