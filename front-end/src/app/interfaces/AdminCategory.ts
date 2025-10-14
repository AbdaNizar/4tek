export type AdminCategory = {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  isActive: boolean;
  iconUrl?: string;
  imageUrl?: string;
  bannerUrls?: string[];
  createdAt?: string;
  updatedAt?: string;
};
