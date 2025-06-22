import { Injectable } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor,
  HttpErrorResponse
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Get token
    const token = this.authService.getToken();

    // Clone request and add token if available
    if (token) {
      request = request.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`
        }
      });
    }

    // Handle response
    return next.handle(request).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === 401) {
          // Unauthorized - logout user
          this.authService.logout();
        } else if (error.status === 403) {
          // Forbidden - check if school is blocked
          if (error.error?.message?.includes('School access has been blocked')) {
            this.router.navigate(['/blocked']);
          } else {
            this.router.navigate(['/unauthorized']);
          }
        }
        
        return throwError(() => error);
      })
    );
  }
}