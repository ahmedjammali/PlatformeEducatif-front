// services/export.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface CombinedExportFilters {
  // Income filters
  schoolId?: string;
  grade?: string;
  component?: string;
  category?: string;
  startDate?: string;
  endDate?: string;
  academicYear?: string;
  // Outcome filters
  userRole?: string;
  chargeCategory?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ExportService {
  private apiUrl = `${environment.apiUrl}/exports`;

  constructor(private http: HttpClient) { }

  /**
   * Export combined analytics to Excel
   */
  exportCombinedExcel(filters: CombinedExportFilters = {}): Observable<Blob> {
    let params = new HttpParams();

    Object.keys(filters).forEach(key => {
      const value = filters[key as keyof CombinedExportFilters];
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, value.toString());
      }
    });

    return this.http.get(`${this.apiUrl}/combined/excel`, {
      params,
      responseType: 'blob'
    }).pipe(catchError(this.handleError));
  }

  /**
   * Export combined analytics to PDF
   */
  exportCombinedPDF(filters: CombinedExportFilters = {}): Observable<Blob> {
    let params = new HttpParams();

    Object.keys(filters).forEach(key => {
      const value = filters[key as keyof CombinedExportFilters];
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, value.toString());
      }
    });

    return this.http.get(`${this.apiUrl}/combined/pdf`, {
      params,
      responseType: 'blob'
    }).pipe(catchError(this.handleError));
  }

  /**
   * Download blob as file
   */
  downloadFile(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  /**
   * Handle HTTP errors
   */
  private handleError(error: any): Observable<never> {
    console.error('An error occurred:', error);
    return throwError(error);
  }
}
