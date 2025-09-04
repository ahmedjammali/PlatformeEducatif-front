// notification.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpHeaders, HttpEvent } from '@angular/common/http';
import { Observable, Subject, BehaviorSubject } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import {
  Notification,
  NotificationResponse,
  CreateNotificationDTO,
  UpdateNotificationDTO,
  NotificationFilters,
  NotificationStats
} from '../models/notification.model';


@Injectable({
  providedIn: 'root'
})


export class NotificationService {
  private apiUrl = `${environment.apiUrl}/notifications`;
  
  // Subject for real-time notification updates
  private notificationUpdate$ = new Subject<Notification>();
  
  // BehaviorSubject to track unread count
  private unreadCount$ = new BehaviorSubject<number>(0);

  constructor(private http: HttpClient) {
    // Initialize unread count on service creation
    this.updateUnreadCount();
  }

  // Get observable for notification updates
  getNotificationUpdates(): Observable<Notification> {
    return this.notificationUpdate$.asObservable();
  }

  // Get observable for unread count
  getUnreadCount(): Observable<number> {
    return this.unreadCount$.asObservable();
  }

  // Create a new notification
  createNotification(data: CreateNotificationDTO): Observable<NotificationResponse> {
    const formData = new FormData();
    
    // Append text fields
    formData.append('title', data.title);
    formData.append('content', data.content);
    formData.append('targetAudience', data.targetAudience);
    
    if (data.type) formData.append('type', data.type);
    if (data.priority) formData.append('priority', data.priority);
    if (data.targetClass) formData.append('targetClass', data.targetClass);
    if (data.publishDate) formData.append('publishDate', data.publishDate.toString());
    if (data.expiryDate) formData.append('expiryDate', data.expiryDate.toString());
    
    // Append files if any
    if (data.attachments && data.attachments.length > 0) {
      data.attachments.forEach((file, index) => {
        formData.append('attachments', file, file.name);
      });
    }
    
    return this.http.post<NotificationResponse>(this.apiUrl, formData).pipe(
      tap(response => {
        if (response.success && response.notification) {
          this.notificationUpdate$.next(response.notification);
        }
      })
    );
  }

  // Get notifications with filters
  getNotifications(filters: NotificationFilters = {}): Observable<NotificationResponse> {
    let params = new HttpParams();
    
    if (filters.page) params = params.set('page', filters.page.toString());
    if (filters.limit) params = params.set('limit', filters.limit.toString());
    if (filters.unreadOnly !== undefined) params = params.set('unreadOnly', filters.unreadOnly.toString());
    if (filters.type) params = params.set('type', filters.type);
    if (filters.priority) params = params.set('priority', filters.priority);
    
    return this.http.get<NotificationResponse>(this.apiUrl, { params }).pipe(
      tap(response => {
        // Update unread count if fetching all notifications
        if (!filters.unreadOnly && response.notifications) {
          const unreadCount = response.notifications.filter(n => !n.isRead).length;
          this.unreadCount$.next(unreadCount);
        }
      })
    );
  }

  // Get a single notification
  getNotification(id: string): Observable<NotificationResponse> {
    return this.http.get<NotificationResponse>(`${this.apiUrl}/${id}`).pipe(
      tap(response => {
        if (response.success && response.notification) {
          this.notificationUpdate$.next(response.notification);
          // Update unread count after reading
          this.updateUnreadCount();
        }
      })
    );
  }

  // Mark notification as read
  markAsRead(id: string): Observable<NotificationResponse> {
    return this.http.patch<NotificationResponse>(`${this.apiUrl}/${id}/read`, {}).pipe(
      tap(() => {
        // Update unread count after marking as read
        this.updateUnreadCount();
      })
    );
  }

  // Update notification
  updateNotification(id: string, data: UpdateNotificationDTO): Observable<NotificationResponse> {
    return this.http.put<NotificationResponse>(`${this.apiUrl}/${id}`, data).pipe(
      tap(response => {
        if (response.success && response.notification) {
          this.notificationUpdate$.next(response.notification);
        }
      })
    );
  }

  // Delete notification
  deleteNotification(id: string): Observable<NotificationResponse> {
    return this.http.delete<NotificationResponse>(`${this.apiUrl}/${id}`);
  }

  // Get notification statistics (admin only)
  getNotificationStats(): Observable<{ success: boolean; stats: NotificationStats }> {
    return this.http.get<{ success: boolean; stats: NotificationStats }>(`${this.apiUrl}/stats`);
  }

  // Download attachment
  downloadAttachment(notificationId: string, filename: string): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/${notificationId}/attachments/${filename}/download`, {
      responseType: 'blob',
      observe: 'response'
    }).pipe(
      map(response => {
        // Extract filename from content-disposition header if available
        const contentDisposition = response.headers.get('content-disposition');
        let extractedFilename = filename;
        
        if (contentDisposition) {
          const matches = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(contentDisposition);
          if (matches != null && matches[1]) {
            extractedFilename = matches[1].replace(/['"]/g, '');
          }
        }
        
        // Create a download link
        const blob = response.body!;
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = extractedFilename;
        link.click();
        
        // Clean up
        window.URL.revokeObjectURL(url);
        
        return blob;
      })
    );
  }

  // View attachment (returns URL for inline viewing)
  getAttachmentUrl(notificationId: string, filename: string): string {
    return `${this.apiUrl}/${notificationId}/attachments/${filename}`;
  }

  // Upload attachment with progress tracking
  uploadNotificationWithProgress(data: CreateNotificationDTO): Observable<HttpEvent<NotificationResponse>> {
    const formData = new FormData();
    
    // Append text fields
    formData.append('title', data.title);
    formData.append('content', data.content);
    formData.append('targetAudience', data.targetAudience);
    
    if (data.type) formData.append('type', data.type);
    if (data.priority) formData.append('priority', data.priority);
    if (data.targetClass) formData.append('targetClass', data.targetClass);
    if (data.publishDate) formData.append('publishDate', data.publishDate.toString());
    if (data.expiryDate) formData.append('expiryDate', data.expiryDate.toString());
    
    // Append files if any
    if (data.attachments && data.attachments.length > 0) {
      data.attachments.forEach((file) => {
        formData.append('attachments', file, file.name);
      });
    }
    
    return this.http.post<NotificationResponse>(this.apiUrl, formData, {
      reportProgress: true,
      observe: 'events'
    });
  }

  // Mark multiple notifications as read
  markMultipleAsRead(notificationIds: string[]): Observable<any> {
    const requests = notificationIds.map(id => this.markAsRead(id));
    return new Observable(observer => {
      Promise.all(requests.map(req => req.toPromise()))
        .then(results => {
          this.updateUnreadCount();
          observer.next(results);
          observer.complete();
        })
        .catch(error => observer.error(error));
    });
  }

  // Get unread notifications count
  getUnreadNotificationsCount(): Observable<number> {
    return this.getNotifications({ unreadOnly: true, limit: 1 }).pipe(
      map(response => response.pagination?.total || 0),
      tap(count => this.unreadCount$.next(count))
    );
  }

  // Update unread count
  private updateUnreadCount(): void {
    this.getUnreadNotificationsCount().subscribe();
  }

  // Clear all notifications (for current user)
  clearAllRead(): Observable<any> {
    return this.getNotifications({ limit: 1000 }).pipe(
      map(response => response.notifications?.filter(n => n.isRead).map(n => n._id) || []),
      map(readIds => {
        // This is a placeholder - you might want to implement a bulk delete endpoint

        return readIds;
      })
    );
  }

  // Search notifications
  searchNotifications(searchTerm: string, filters: NotificationFilters = {}): Observable<NotificationResponse> {
    const params = new HttpParams()
      .set('search', searchTerm)
      .set('page', (filters.page || 1).toString())
      .set('limit', (filters.limit || 20).toString());
    
    return this.http.get<NotificationResponse>(this.apiUrl, { params });
  }
}