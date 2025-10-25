export type ContactRequest = {
  _id?: string;
  fullName: string;
  email: string;
  phone?: string;
  message: string;
  createdAt?: string;
  status?: 'new' | 'in_progress' | 'done';
  notes?: string;
  userId?: { id?: string; email?: string; name?: string; avatar?: string };
};
