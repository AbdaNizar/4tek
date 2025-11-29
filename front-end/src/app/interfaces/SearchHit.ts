export interface SearchHit {
  _id: string;
  name: string;
  slug?: string;
  imageUrl?: string;
  category?: { _id: string; name: string };
  subCategory?: { _id: string; name: string };
  price?: number;
}
