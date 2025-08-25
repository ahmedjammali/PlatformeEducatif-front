import { Class } from "./class.model";
import { School } from "./school.model";
import { Subject } from "./subject.model";

export interface User {
  _id: string; // Make _id required since backend always returns it
  name: string;
  email: string;
  password?: string;
  role: 'superadmin' | 'admin' | 'teacher' | 'student';
  school?: School | string;
  teachingClasses?: TeachingClass[];
  studentClass?: Class | string;
  createdBy?: User | string;
  createdAt?: Date;
  updatedAt?: Date;
  phoneNumber?: string;
  parentName?: string;
  parentCin   ?: string;
  parentPhoneNumber?: string;
}

export interface TeachingClass {
  class: Class | string;
  subjects: Subject[] | string[];
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  message: string;
  token: string;
  user: User;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}