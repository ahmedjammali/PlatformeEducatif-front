import { User } from "./user.model";

export interface School {
  _id?: string;
  name: string;
  admin: User | string;
  isActive: boolean;
  blockedReason?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CreateSchoolRequest {
  schoolName: string;
  adminName: string;
  adminEmail: string;
  adminPassword: string;
}

export interface ToggleSchoolAccessRequest {
  block: boolean;
  reason?: string;
}

export interface UpdateSchoolNameRequest {
  name: string;
}
