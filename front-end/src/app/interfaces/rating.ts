export interface Rating {
    _id?: string;
    productId: string;
    user?: { id: string; name?: string; email?: string };
    stars: number;
    comment?: string;
    status?: 'pending'|'approved'|'rejected';
    createdAt?: string;
    updatedAt?: string;
}

export interface ProductRatingsResponse {
    items: Rating[];
    count: number;
    avg: number;
}
