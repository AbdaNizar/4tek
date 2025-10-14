export interface AdminProductPayload {
  name: string;            // Nom du produit (obligatoire)
  slug: string;            // Slug unique pour l’URL (obligatoire)
  price: number;           // Prix en TND (obligatoire)
  brand?: string;          // Marque (optionnel)
  imageUrl?: string;       // Image principale
  oldPrice?: number;       // Ancien prix (si promo)
  inStock?: boolean;       // Disponible en stock
  images?: string[];       // Galerie d’images supplémentaires
  shortSpecs?: string[];   // Spécifications courtes (liste)
  description?: string;    // Description longue (optionnel)
  featured?: boolean;      // Mise en avant sur la page d’accueil
  categoryId?: string;     // Référence à une catégorie
  subCategoryId?: string;  // Référence à une sous-catégorie
}
