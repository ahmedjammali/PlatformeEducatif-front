import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { BaseService } from './base.service';
import { School, CreateSchoolRequest, ToggleSchoolAccessRequest, UpdateSchoolNameRequest } from '../models/school.model';

@Injectable({
  providedIn: 'root'
})
export class SchoolService extends BaseService {
  private endpoint = '/schools';

  constructor(http: HttpClient) {
    super(http);
  }

  createSchool(request: CreateSchoolRequest): Observable<{ school: School; admin: any }> {
    return this.http.post<{ school: School; admin: any }>(
      `${this.apiUrl}${this.endpoint}`,
      request
    );
  }

  getSchool(): Observable<{ school: School; statistics: any }> {
    return this.http.get<{ school: School; statistics: any }>(
      `${this.apiUrl}${this.endpoint}`
    );
  }

  toggleAccess(request: ToggleSchoolAccessRequest): Observable<{ message: string; school: School }> {
    return this.http.put<{ message: string; school: School }>(
      `${this.apiUrl}${this.endpoint}/access`,
      request
    );
  }

  updateSchoolName(request: UpdateSchoolNameRequest): Observable<{ 
    message: string; 
    school: {
      id: string;
      name: string;
      oldName: string;
      isActive: boolean;
      updatedAt: string;
    }
  }> {
    return this.http.put<{ 
      message: string; 
      school: {
        id: string;
        name: string;
        oldName: string;
        isActive: boolean;
        updatedAt: string;
      }
    }>(
      `${this.apiUrl}${this.endpoint}/name`,
      request
    );
  }



}
