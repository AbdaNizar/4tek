export interface Slide {
  id: string;
  imageUrl: string;
  title?: string;
  subtitle?: string;
  ctaLabel?: string;
  ctaLink?: string | any[]; // router link ou URL
  align?: 'left' | 'center' | 'right';
}

