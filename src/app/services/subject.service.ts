import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { BaseService } from './base.service';
import { Subject } from '../models/subject.model';
import { map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class SubjectService extends BaseService {
  private endpoint = '/subjects';

  constructor(http: HttpClient) {
    super(http);
  }

  createSubject(subject: Partial<Subject>): Observable<Subject> {
    return this.http.post<{ message: string; subject: Subject }>(
      `${this.apiUrl}${this.endpoint}`,
      subject
    ).pipe(map(response => response.subject));
  }

  getSubjects(): Observable<Subject[]> {
    return this.http.get<{ subjects: Subject[]; total: number }>(
      `${this.apiUrl}${this.endpoint}`
    ).pipe(map(response => response.subjects));
  }

  getSubjectById(id: string): Observable<{ subject: Subject; statistics: any }> {
    return this.http.get<{ subject: Subject; statistics: any }>(
      `${this.apiUrl}${this.endpoint}/${id}`
    );
  }

  updateSubject(id: string, updates: Partial<Subject>): Observable<Subject> {
    return this.http.put<{ message: string; subject: Subject }>(
      `${this.apiUrl}${this.endpoint}/${id}`,
      updates
    ).pipe(map(response => response.subject));
  }

  deleteSubject(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(
      `${this.apiUrl}${this.endpoint}/${id}`
    );
  }

  getSubjectsByIds(ids: string[]): Observable<Subject[]> {
  const params = this.buildParams({ ids: ids.join(',') });
  return this.http.get<{ subjects: Subject[] }>(
    `${this.apiUrl}${this.endpoint}/bulk`,
    { params }
  ).pipe(map(response => response.subjects));
}
}
