export interface Contact {
  _id?: string; // optional, only present when received from backend
  name: string;
  email: string;
  phone: number;
  message: string;
  createdAt?: string; // optional timestamp fields
  updatedAt?: string;
}
