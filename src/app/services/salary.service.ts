// services/salary.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
    SalaryConfiguration,
    TeacherAdminSalary,
    SalarySummary,
    CreateSalaryConfigurationRequest,
    UpdateExtraHoursRequest,
    RecordPaymentRequest
} from '../models/salary.model';
import { User } from '../models/user.model';

@Injectable({
    providedIn: 'root'
})
export class SalaryService {
    private apiUrl = `${environment.apiUrl}/salary`;

    constructor(private http: HttpClient) { }

    // Get all teachers and admins
    getTeachersAndAdmins(): Observable<User[]> {
        return this.http.get<User[]>(`${this.apiUrl}/users`);
    }

    // Create salary configuration
    createSalaryConfiguration(data: CreateSalaryConfigurationRequest): Observable<any> {
        return this.http.post(`${this.apiUrl}/configurations`, data);
    }

    // Get salary configurations
    getSalaryConfigurations(academicYear?: string): Observable<SalaryConfiguration[]> {
        let params = new HttpParams();
        if (academicYear) {
            params = params.set('academicYear', academicYear);
        }
        return this.http.get<SalaryConfiguration[]>(`${this.apiUrl}/configurations`, { params });
    }

    // Update salary configuration
    updateSalaryConfiguration(configId: string, data: Partial<SalaryConfiguration>): Observable<any> {
        return this.http.put(`${this.apiUrl}/configurations/${configId}`, data);
    }

    // Delete salary configuration
    deleteSalaryConfiguration(configurationId: string): Observable<any> {
        return this.http.delete(`${this.apiUrl}/configurations/${configurationId}`);
    }

    // Get salary records
    getSalaryRecords(academicYear?: string, userId?: string, status?: string): Observable<TeacherAdminSalary[]> {
        let params = new HttpParams();
        if (academicYear) {
            params = params.set('academicYear', academicYear);
        }
        if (userId) {
            params = params.set('userId', userId);
        }
        if (status) {
            params = params.set('status', status);
        }
        return this.http.get<TeacherAdminSalary[]>(`${this.apiUrl}/records`, { params });
    }

    // Update extra hours
    updateExtraHours(salaryId: string, data: UpdateExtraHoursRequest): Observable<any> {
        return this.http.put(`${this.apiUrl}/records/${salaryId}/extra-hours`, data);
    }

    // Update payment hours (both regular and extra hours)
    updatePaymentHours(data: { userId: string, month: number, actualHoursWorked?: number, extraHours?: number }): Observable<any> {
        return this.http.put(`${this.apiUrl}/payment-hours`, data);
    }

    // Record payment
    recordPayment(salaryId: string, data: RecordPaymentRequest): Observable<any> {
        return this.http.put(`${this.apiUrl}/records/${salaryId}/payment`, data);
    }

    // Get salary summary
    getSalarySummary(academicYear?: string): Observable<SalarySummary> {
        let params = new HttpParams();
        if (academicYear) {
            params = params.set('academicYear', academicYear);
        }
        return this.http.get<SalarySummary>(`${this.apiUrl}/summary`, { params });
    }
}
