import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { BaseService } from './base.service';
import {
    Charge,
    ChargeResponse,
    ChargesListResponse,
    ChargeSummary
} from '../models/charge.model';
import { map } from 'rxjs/operators';

@Injectable({
    providedIn: 'root'
})
export class ChargeService extends BaseService {
    private endpoint = '/charges';

    constructor(http: HttpClient) {
        super(http);
    }

    // Charge CRUD operations
    createCharge(charge: Partial<Charge>): Observable<Charge> {
        return this.http.post<ChargeResponse>(
            `${this.apiUrl}${this.endpoint}`,
            charge
        ).pipe(map(response => response.charge));
    }

    getCharges(page: number = 1, limit: number = 10, category?: string, startDate?: string, endDate?: string): Observable<ChargesListResponse> {
        let url = `${this.apiUrl}${this.endpoint}?page=${page}&limit=${limit}`;
        if (category && category !== '') {
            url += `&category=${category}`;
        }
        if (startDate) {
            url += `&startDate=${startDate}`;
        }
        if (endDate) {
            url += `&endDate=${endDate}`;
        }
        return this.http.get<ChargesListResponse>(url);
    }

    updateCharge(id: string, updates: Partial<Charge>): Observable<Charge> {
        return this.http.put<ChargeResponse>(
            `${this.apiUrl}${this.endpoint}/${id}`,
            updates
        ).pipe(map(response => response.charge));
    }

    deleteCharge(id: string): Observable<{ message: string }> {
        return this.http.delete<{ message: string }>(
            `${this.apiUrl}${this.endpoint}/${id}`
        );
    }

    // Analytics and summary
    getChargeSummary(category?: string, startDate?: string, endDate?: string): Observable<ChargeSummary> {
        let url = `${this.apiUrl}${this.endpoint}/summary`;
        const params = new URLSearchParams();

        if (category && category !== '') {
            params.append('category', category);
        }
        if (startDate) {
            params.append('startDate', startDate);
        }
        if (endDate) {
            params.append('endDate', endDate);
        }

        if (params.toString()) {
            url += `?${params.toString()}`;
        }

        return this.http.get<ChargeSummary>(url);
    }
}
