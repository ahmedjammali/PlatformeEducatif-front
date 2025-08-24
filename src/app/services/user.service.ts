import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { BaseService } from './base.service';
import { User, ChangePasswordRequest } from '../models/user.model';
import { map } from 'rxjs/operators';

// Response interfaces to match backend
interface CreateUserResponse {
  message: string;
  user: User;
}

interface GetUserResponse {
  user: User;
}

interface GetUsersResponse {
  users: User[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalUsers: number;
    total?: number; // Add total for backward compatibility
  };
}

interface UpdateUserResponse {
  message: string;
  user: User;
}

interface DeleteUserResponse {
  message: string;
}

interface ChangePasswordResponse {
  message: string;
}

@Injectable({
  providedIn: 'root'
})
export class UserService extends BaseService {
  private endpoint = '/users';

  constructor(http: HttpClient) {
    super(http);
  }

  createUser(user: Partial<User>): Observable<CreateUserResponse> {
    return this.http.post<CreateUserResponse>(
      `${this.apiUrl}${this.endpoint}`,
      user
    );
  }

  // Renamed from getUsers to match the backend controller method name
  getAllUsers(filters?: { role?: string; page?: number; limit?: number }): Observable<GetUsersResponse> {
    const params = this.buildParams(filters || {});
    return this.http.get<GetUsersResponse>(
      `${this.apiUrl}${this.endpoint}`,
      { params }
    ).pipe(
      map(response => ({
        ...response,
        pagination: {
          ...response.pagination,
          total: response.pagination.totalUsers // Map totalUsers to total for backward compatibility
        }
      }))
    );
  }

  // Keep getUsers as an alias for compatibility
  getUsers(filters?: { role?: string; page?: number; limit?: number }): Observable<GetUsersResponse> {
    return this.getAllUsers(filters);
  }

  // Keep backward compatibility - return User directly
  getUserById(id: string): Observable<User> {
    return this.http.get<GetUserResponse>(
      `${this.apiUrl}${this.endpoint}/${id}`
    ).pipe(
      map(response => response.user)
    );
  }

  // New method that returns full response (for components that need it)
  getUserByIdWithResponse(id: string): Observable<GetUserResponse> {
    return this.http.get<GetUserResponse>(
      `${this.apiUrl}${this.endpoint}/${id}`
    );
  }

  updateUser(id: string, updates: Partial<User>): Observable<UpdateUserResponse> {
    return this.http.put<UpdateUserResponse>(
      `${this.apiUrl}${this.endpoint}/${id}`,
      updates
    );
  }

  deleteUser(id: string): Observable<DeleteUserResponse> {
    return this.http.delete<DeleteUserResponse>(
      `${this.apiUrl}${this.endpoint}/${id}`
    );
  }

  changePassword(id: string, passwords: ChangePasswordRequest): Observable<ChangePasswordResponse> {
    return this.http.put<ChangePasswordResponse>(
      `${this.apiUrl}${this.endpoint}/${id}/password`,
      passwords
    );
  }

  getProfile(): Observable<User> {
    return this.http.get<GetUserResponse>(
      `${this.apiUrl}${this.endpoint}/profile`
    ).pipe(
      map(response => response.user)
    );
  }

  // New method that returns full response (for components that need it)
  getProfileWithResponse(): Observable<GetUserResponse> {
    return this.http.get<GetUserResponse>(
      `${this.apiUrl}${this.endpoint}/profile`
    );
  }
}