import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { BaseService } from './base.service';
import { Grade, CreateGradeRequest, StudentReport } from '../models/grader.model';
import { map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class GradeService extends BaseService {
  private endpoint = '/grades';

  constructor(http: HttpClient) {
    super(http);
  }

  createGrade(grade: CreateGradeRequest): Observable<Grade> {
    return this.http.post<{ message: string; grade: Grade }>(
      `${this.apiUrl}${this.endpoint}`,
      grade
    ).pipe(map(response => response.grade));
  }

  getGradesByStudent(studentId: string, filters?: {
    academicYear?: string;
    trimester?: string;
    subject?: string;
  }): Observable<{ grades: Grade[]; statistics: any }> {
    const params = this.buildParams(filters || {});
    return this.http.get<{ grades: Grade[]; statistics: any }>(
      `${this.apiUrl}${this.endpoint}/student/${studentId}`,
      { params }
    );
  }

  getGradesByClass(classId: string, filters?: {
    academicYear?: string;
    trimester?: string;
    subject?: string;
    examType?: string;
  }): Observable<{ grades: Grade[]; total: number }> {
    const params = this.buildParams(filters || {});
    return this.http.get<{ grades: Grade[]; total: number }>(
      `${this.apiUrl}${this.endpoint}/class/${classId}`,
      { params }
    );
  }

  updateGrade(id: string, updates: { grade?: number; comments?: string }): Observable<Grade> {
    return this.http.put<{ message: string; grade: Grade }>(
      `${this.apiUrl}${this.endpoint}/${id}`,
      updates
    ).pipe(map(response => response.grade));
  }

  deleteGrade(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(
      `${this.apiUrl}${this.endpoint}/${id}`
    );
  }

  getStudentReport(studentId: string, filters?: {
    academicYear?: string;
    trimester?: string;
  }): Observable<StudentReport> {
    const params = this.buildParams(filters || {});
    return this.http.get<StudentReport>(
      `${this.apiUrl}${this.endpoint}/student/${studentId}/report`,
      { params }
    );
  }
}
