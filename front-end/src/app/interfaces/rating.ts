export interface Rating {
    _id?: string;
    productId: string;
    user?: { id: string; name?: string; email?: string };
    stars: number;
    comment?: string;
    status?: RatingStatus;
    createdAt?: string;
    updatedAt?: string;
    product?: { _id: string; name?: string; imageUrl?: string; slug?: string };

}

export interface ProductRatingsResponse {
    items: Rating[];
    count: number;
    avg: number;
}
export type RatingStatus = 'pending'|'approved'|'rejected';
