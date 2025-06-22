import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap, map } from 'rxjs';
import { Router } from '@angular/router';
import { environment } from '../../environments/environment';
import { LoginRequest, LoginResponse, User } from '../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly TOKEN_KEY = 'auth_token';
  private readonly USER_KEY = 'current_user';
  
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();
  
  private isAuthenticatedSubject = new BehaviorSubject<boolean>(false);
  public isAuthenticated$ = this.isAuthenticatedSubject.asObservable();

  constructor(
    private http: HttpClient,
    private router: Router
  ) {
    this.checkToken();
  }

  login(credentials: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${environment.apiUrl}/users/login`, credentials)
      .pipe(
        tap(response => {
          this.setSession(response);
        })
      );
  }

  logout(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    this.currentUserSubject.next(null);
    this.isAuthenticatedSubject.next(false);
    this.router.navigate(['/login']);
  }

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  getUserRole(): string | null {
    const user = this.getCurrentUser();
    return user ? user.role : null;
  }

  isLoggedIn(): boolean {
    return !!this.getToken() && this.isAuthenticatedSubject.value;
  }

  isSuperAdmin(): boolean {
    return this.getUserRole() === 'superadmin';
  }

  isAdmin(): boolean {
    return this.getUserRole() === 'admin';
  }

  isTeacher(): boolean {
    return this.getUserRole() === 'teacher';
  }

  isStudent(): boolean {
    return this.getUserRole() === 'student';
  }

  isAdminOrHigher(): boolean {
    const role = this.getUserRole();
    return role === 'superadmin' || role === 'admin';
  }

  isTeacherOrHigher(): boolean {
    const role = this.getUserRole();
    return role === 'superadmin' || role === 'admin' || role === 'teacher';
  }

  hasRole(requiredRoles: string[]): boolean {
    const userRole = this.getUserRole();
    return userRole ? requiredRoles.includes(userRole) : false;
  }

  refreshUserProfile(): Observable<User> {
    return this.http.get<{ user: User }>(`${environment.apiUrl}/users/profile`)
      .pipe(
        map(response => response.user),
        tap(user => {
          this.currentUserSubject.next(user);
          localStorage.setItem(this.USER_KEY, JSON.stringify(user));
        })
      );
  }

  private setSession(authResult: LoginResponse): void {
    localStorage.setItem(this.TOKEN_KEY, authResult.token);
    localStorage.setItem(this.USER_KEY, JSON.stringify(authResult.user));
    this.currentUserSubject.next(authResult.user);
    this.isAuthenticatedSubject.next(true);
  }

  private checkToken(): void {
    const token = this.getToken();
    const userStr = localStorage.getItem(this.USER_KEY);
    
    if (token && userStr) {
      try {
        const user = JSON.parse(userStr) as User;
        this.currentUserSubject.next(user);
        this.isAuthenticatedSubject.next(true);
      } catch (error) {
        this.logout();
      }
    }
  }
}