import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { BaseService } from './base.service';
import { User, ChangePasswordRequest } from '../models/user.model';
import { map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class UserService extends BaseService {
  private endpoint = '/users';

  constructor(http: HttpClient) {
    super(http);
  }

  createUser(user: Partial<User>): Observable<User> {
    return this.http.post<{ message: string; user: User }>(
      `${this.apiUrl}${this.endpoint}`,
      user
    ).pipe(map(response => response.user));
  }

  getUsers(filters?: { role?: string; page?: number; limit?: number }): Observable<{ users: User[]; pagination: any }> {
    const params = this.buildParams(filters || {});
    return this.http.get<{ users: User[]; pagination: any }>(
      `${this.apiUrl}${this.endpoint}`,
      { params }
    );
  }

  getUserById(id: string): Observable<User> {
    return this.http.get<{ user: User }>(
      `${this.apiUrl}${this.endpoint}/${id}`
    ).pipe(map(response => response.user));
  }

  updateUser(id: string, updates: Partial<User>): Observable<User> {
    return this.http.put<{ message: string; user: User }>(
      `${this.apiUrl}${this.endpoint}/${id}`,
      updates
    ).pipe(map(response => response.user));
  }

  deleteUser(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(
      `${this.apiUrl}${this.endpoint}/${id}`
    );
  }

  changePassword(id: string, passwords: ChangePasswordRequest): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(
      `${this.apiUrl}${this.endpoint}/${id}/password`,
      passwords
    );
  }

  getProfile(): Observable<User> {
    return this.http.get<{ user: User }>(
      `${this.apiUrl}${this.endpoint}/profile`
    ).pipe(map(response => response.user));
  }
}
