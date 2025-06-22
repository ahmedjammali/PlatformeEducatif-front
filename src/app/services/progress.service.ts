import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { BaseService } from './base.service';
import { StudentProgress, ProgressStatistics } from '../models/progress.model';

@Injectable({
  providedIn: 'root'
})
export class ProgressService extends BaseService {
  private endpoint = '/progress';

  constructor(http: HttpClient) {
    super(http);
  }

  getStudentProgressOverview(studentId: string, filters?: {
    subject?: string;
    classId?: string;
    dateFrom?: string;
    dateTo?: string;
  }): Observable<{ progress: StudentProgress[]; statistics: ProgressStatistics }> {
    const params = this.buildParams(filters || {});
    return this.http.get<{ progress: StudentProgress[]; statistics: ProgressStatistics }>(
      `${this.apiUrl}${this.endpoint}/student/${studentId}`,
      { params }
    );
  }

  getClassProgress(classId: string, filters?: {
    subject?: string;
    exerciseId?: string;
    dateFrom?: string;
    dateTo?: string;
  }): Observable<{ classProgress: any[]; totalStudents: number; totalExercisesCompleted: number }> {
    const params = this.buildParams(filters || {});
    return this.http.get<{ classProgress: any[]; totalStudents: number; totalExercisesCompleted: number }>(
      `${this.apiUrl}${this.endpoint}/class/${classId}`,
      { params }
    );
  }

  getExerciseAnalytics(exerciseId: string): Observable<{ exercise: any; analytics: any }> {
    return this.http.get<{ exercise: any; analytics: any }>(
      `${this.apiUrl}${this.endpoint}/exercise/${exerciseId}/analytics`
    );
  }

  deleteProgress(progressId: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(
      `${this.apiUrl}${this.endpoint}/${progressId}`
    );
  }
}